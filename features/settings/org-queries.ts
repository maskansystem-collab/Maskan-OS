import { createClient } from "@/lib/supabase/server";

/**
 * Queries behind the settings screens that have their own URL.
 *
 * All of these read tables that were in the schema from the start and had
 * no screen in front of them: roles, permissions, document_templates,
 * management_fees, organisation_subscriptions.
 */

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  memberCount: number;
}

export interface PermissionRow {
  id: string;
  code: string;
  category: string;
  description: string | null;
}

/**
 * Roles available to an organisation, with the permissions each grants.
 *
 * A role with a null organisation_id is a system role shared by every
 * organisation, so both are fetched and merged rather than filtering on
 * the organisation alone.
 */
export async function listRoles(organisationId: string): Promise<{
  roles: RoleRow[];
  permissions: PermissionRow[];
}> {
  const supabase = await createClient();

  const [{ data: roles }, { data: permissions }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, name, description, is_system, organisation_id")
      .or(`organisation_id.eq.${organisationId},organisation_id.is.null`)
      .order("is_system", { ascending: false })
      .order("name"),
    supabase.from("permissions").select("id, code, category, description").order("code"),
  ]);

  const roleIds = (roles ?? []).map((r) => r.id);
  if (roleIds.length === 0) return { roles: [], permissions: permissions ?? [] };

  // Two batched lookups rather than two per role.
  //
  // member_roles is scoped by organisation_member_id, not by organisation, so
  // a system role's assignments have to be narrowed to this organisation's
  // members or the count would include every other organisation's staff.
  const { data: members } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", organisationId);
  const memberIds = (members ?? []).map((m) => m.id);

  const [{ data: grants }, { data: assignments }] = await Promise.all([
    supabase.from("role_permissions").select("role_id, permission_id").in("role_id", roleIds),
    memberIds.length === 0
      ? Promise.resolve({ data: [] as { role_id: string }[] })
      : supabase
          .from("member_roles")
          .select("role_id")
          .in("role_id", roleIds)
          .in("organisation_member_id", memberIds),
  ]);

  const codeById = new Map((permissions ?? []).map((p) => [p.id, p.code]));

  return {
    roles: (roles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      is_system: r.is_system,
      permissions: (grants ?? [])
        .filter((g) => g.role_id === r.id)
        .map((g) => codeById.get(g.permission_id))
        .filter((c): c is string => !!c)
        .sort(),
      memberCount: (assignments ?? []).filter((a) => a.role_id === r.id).length,
    })),
    permissions: permissions ?? [],
  };
}

export interface SubscriptionView {
  planName: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  limits: { maxUnits: number | null; maxUsers: number | null; storageMb: number | null };
  usage: { units: number; users: number };
  features: Record<string, boolean>;
  history: { id: string; event_type: string; created_at: string }[];
}

export async function getSubscription(organisationId: string): Promise<SubscriptionView | null> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("organisation_subscriptions")
    .select(
      `id, status, trial_ends_at, current_period_end,
       plans!inner ( name, max_units, max_users, storage_mb, features )`
    )
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!sub) return null;
  const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;

  const [{ count: units }, { count: users }, { data: history }] = await Promise.all([
    supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .is("archived_at", null),
    supabase
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId),
    // Events hang off the subscription, not the organisation.
    supabase
      .from("subscription_events")
      .select("id, event_type, created_at")
      .eq("organisation_subscription_id", sub.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    planName: plan?.name ?? null,
    status: sub.status,
    trial_ends_at: sub.trial_ends_at,
    current_period_end: sub.current_period_end,
    limits: {
      maxUnits: plan?.max_units ?? null,
      maxUsers: plan?.max_users ?? null,
      storageMb: plan?.storage_mb ?? null,
    },
    usage: { units: units ?? 0, users: users ?? 0 },
    features: (plan?.features ?? {}) as Record<string, boolean>,
    history: history ?? [],
  };
}

export interface TemplateRow {
  id: string;
  name: string;
  locale: string;
  is_sample: boolean;
  created_at: string;
  variables: string[];
}

/** Document templates, with the {{placeholders}} each one expects. */
export async function listTemplates(organisationId: string): Promise<TemplateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_templates")
    .select("id, name, locale, is_sample, created_at, body_html")
    .or(`organisation_id.eq.${organisationId},organisation_id.is.null`)
    .order("is_sample")
    .order("name");

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    locale: t.locale,
    is_sample: t.is_sample,
    created_at: t.created_at,
    variables: Array.from(
      new Set(Array.from(t.body_html.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)).map((m) => m[1]))
    ).sort(),
  }));
}

export interface FeeRow {
  id: string;
  fee_type: string;
  fee_value: number;
  effective_from: string;
  effective_to: string | null;
  property_name: string | null;
  owner_name: string | null;
  isCurrent: boolean;
}

/**
 * The management fee schedule.
 *
 * A fee with neither a property nor an owner is the organisation default;
 * one with either is an override for that property or owner.
 */
export async function listFees(organisationId: string): Promise<FeeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("management_fees")
    .select(
      `id, fee_type, fee_value, effective_from, effective_to,
       properties ( name ), owners ( name )`
    )
    .eq("organisation_id", organisationId)
    .order("effective_from", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (data ?? []).map((f) => {
    const property = Array.isArray(f.properties) ? f.properties[0] : f.properties;
    const owner = Array.isArray(f.owners) ? f.owners[0] : f.owners;
    return {
      id: f.id,
      fee_type: f.fee_type,
      fee_value: Number(f.fee_value),
      effective_from: f.effective_from,
      effective_to: f.effective_to,
      property_name: property?.name ?? null,
      owner_name: owner?.name ?? null,
      isCurrent: f.effective_from <= today && (!f.effective_to || f.effective_to >= today),
    };
  });
}
