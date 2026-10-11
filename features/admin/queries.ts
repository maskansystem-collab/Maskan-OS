import { createAdminClient } from "@/lib/supabase/server";

/**
 * Platform administration reads across every organisation, which normal RLS
 * deliberately forbids. These functions therefore use the service-role client
 * — and each one is only ever called from a route already guarded by
 * requirePlatformSuperAdmin(). That guard is the security boundary; the
 * elevated client is explicit here rather than leaking into ordinary flows.
 */

export interface PlatformMetrics {
  organisations: number;
  activeOrganisations: number;
  trials: number;
  suspended: number;
  users: number;
  properties: number;
  units: number;
  occupiedUnits: number;
  activeLeases: number;
  monthlyRentUnderManagement: number;
  collectionRate: number;
  openMaintenance: number;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [orgs, profiles, properties, units, leases, instalments, maintenance] = await Promise.all([
    admin.from("organisations").select(
      "status"
    ),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("properties").select("id", { count: "exact", head: true }).is("archived_at", null),
    admin.from("units").select(
      "status"
    ).is("archived_at", null),
    admin.from("leases").select(
      "monthly_rent"
    ).eq("status", "active"),
    admin
      .from("rent_instalments")
      .select(
      "original_amount, outstanding_amount"
    )
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd),
    admin.from("maintenance_requests").select("id", { count: "exact", head: true })
      .not("status", "in", "(closed,cancelled)"),
  ]);

  const orgRows = orgs.data ?? [];
  const unitRows = units.data ?? [];
  const instalmentRows = instalments.data ?? [];

  const expected = instalmentRows.reduce((s, i) => s + Number(i.original_amount), 0);
  const outstanding = instalmentRows.reduce((s, i) => s + Number(i.outstanding_amount), 0);

  return {
    organisations: orgRows.length,
    activeOrganisations: orgRows.filter((o) => o.status === "active").length,
    trials: orgRows.filter((o) => o.status === "trial").length,
    suspended: orgRows.filter((o) => o.status === "suspended").length,
    users: profiles.count ?? 0,
    properties: properties.count ?? 0,
    units: unitRows.length,
    occupiedUnits: unitRows.filter((u) => u.status === "occupied").length,
    activeLeases: (leases.data ?? []).length,
    monthlyRentUnderManagement: (leases.data ?? []).reduce((s, l) => s + Number(l.monthly_rent), 0),
    collectionRate: expected > 0 ? Math.round(((expected - outstanding) / expected) * 100) : 0,
    openMaintenance: maintenance.count ?? 0,
  };
}

export interface AdminOrganisationRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  email: string | null;
  created_at: string;
  onboarding_step: string;
  planName: string | null;
  members: number;
  units: number;
  activeLeases: number;
}

export async function listAdminOrganisations(q?: string): Promise<AdminOrganisationRow[]> {
  const admin = createAdminClient();

  let query = admin
    .from("organisations")
    .select(
      "id, name, slug, status, email, created_at, onboarding_step"
    );

  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: organisations } = await query.order("created_at", { ascending: false });
  const orgs = organisations ?? [];
  const ids = orgs.map((o) => o.id);
  if (ids.length === 0) return [];

  const [subs, members, units, leases] = await Promise.all([
    admin.from("organisation_subscriptions").select(
      "organisation_id, plans ( name )"
    ).in("organisation_id", ids),
    admin.from("organisation_members").select(
      "organisation_id"
    ).in("organisation_id", ids),
    admin.from("units").select(
      "organisation_id"
    ).in("organisation_id", ids).is("archived_at", null),
    admin.from("leases").select(
      "organisation_id"
    ).in("organisation_id", ids).eq("status", "active"),
  ]);

  function tally(rows: { organisation_id: string }[] | null) {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.organisation_id, (map.get(row.organisation_id) ?? 0) + 1);
    return map;
  }

  const memberCounts = tally(members.data);
  const unitCounts = tally(units.data);
  const leaseCounts = tally(leases.data);

  const planByOrg = new Map<string, string>();
  for (const sub of subs.data ?? []) {
    const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
    if (plan?.name) planByOrg.set(sub.organisation_id, plan.name);
  }

  return orgs.map((o) => ({
    ...o,
    planName: planByOrg.get(o.id) ?? null,
    members: memberCounts.get(o.id) ?? 0,
    units: unitCounts.get(o.id) ?? 0,
    activeLeases: leaseCounts.get(o.id) ?? 0,
  }));
}

export interface AdminOrganisationDetail extends AdminOrganisationRow {
  properties: number;
  tenants: number;
  owners: number;
  monthlyRent: number;
  memberList: { full_name: string; email: string; roles: string[] }[];
  recentAudit: { id: string; action: string; entity_table: string; created_at: string }[];
}

export async function getAdminOrganisation(organisationId: string): Promise<AdminOrganisationDetail | null> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organisations")
    .select(
      "id, name, slug, status, email, created_at, onboarding_step"
    )
    .eq("id", organisationId)
    .maybeSingle();
  if (!org) return null;

  const [sub, members, properties, units, tenants, owners, leases, audit] = await Promise.all([
    admin.from("organisation_subscriptions").select(
      "plans ( name )"
    ).eq("organisation_id", organisationId).maybeSingle(),
    admin
      .from("organisation_members")
      .select(
      "id, profiles ( full_name, email ), member_roles ( roles ( name ) )"
    )
      .eq("organisation_id", organisationId),
    admin.from("properties").select("id", { count: "exact", head: true }).eq("organisation_id", organisationId).is("archived_at", null),
    admin.from("units").select("id", { count: "exact", head: true }).eq("organisation_id", organisationId).is("archived_at", null),
    admin.from("tenants").select("id", { count: "exact", head: true }).eq("organisation_id", organisationId).is("archived_at", null),
    admin.from("owners").select("id", { count: "exact", head: true }).eq("organisation_id", organisationId).is("archived_at", null),
    admin.from("leases").select(
      "monthly_rent"
    ).eq("organisation_id", organisationId).eq("status", "active"),
    admin
      .from("audit_logs")
      .select(
      "id, action, entity_table, created_at"
    )
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const plan = sub.data ? (Array.isArray(sub.data.plans) ? sub.data.plans[0] : sub.data.plans) : null;

  return {
    ...org,
    planName: plan?.name ?? null,
    members: (members.data ?? []).length,
    units: units.count ?? 0,
    activeLeases: (leases.data ?? []).length,
    properties: properties.count ?? 0,
    tenants: tenants.count ?? 0,
    owners: owners.count ?? 0,
    monthlyRent: (leases.data ?? []).reduce((s, l) => s + Number(l.monthly_rent), 0),
    memberList: (members.data ?? []).map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const roleRows = (m.member_roles ?? []) as unknown as { roles: { name: string } | null }[];
      return {
        full_name: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        roles: roleRows.map((r) => r.roles?.name).filter((n): n is string => !!n),
      };
    }),
    recentAudit: audit.data ?? [],
  };
}

export async function listPlans() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plans")
    .select(
      "id, key, name, max_units, max_users, storage_mb, monthly_price_qar, features, is_active, sort_order"
    )
    .order("sort_order");
  return data ?? [];
}

export async function listPlatformUsers(q?: string) {
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select(
      "id, full_name, email, is_platform_super_admin, created_at"
    );
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: profiles } = await query.order("created_at", { ascending: false }).limit(200);
  const ids = (profiles ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: memberships } = await admin
    .from("organisation_members")
    .select(
      "profile_id, organisations ( name )"
    )
    .in("profile_id", ids);

  const orgsByProfile = new Map<string, string[]>();
  for (const m of memberships ?? []) {
    const org = Array.isArray(m.organisations) ? m.organisations[0] : m.organisations;
    if (!org?.name) continue;
    orgsByProfile.set(m.profile_id, [...(orgsByProfile.get(m.profile_id) ?? []), org.name]);
  }

  return (profiles ?? []).map((p) => ({ ...p, organisations: orgsByProfile.get(p.id) ?? [] }));
}

export async function listPlatformAudit(q?: string) {
  const admin = createAdminClient();

  let query = admin
    .from("audit_logs")
    .select(
      "id, action, entity_table, entity_id, metadata, created_at, organisation_id, actor_id"
    );
  if (q) query = query.or(`action.ilike.%${q}%,entity_table.ilike.%${q}%`);

  const { data: logs } = await query.order("created_at", { ascending: false }).limit(200);
  const rows = logs ?? [];

  const orgIds = Array.from(new Set(rows.map((r) => r.organisation_id).filter((id): id is string => !!id)));
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((id): id is string => !!id)));

  const [orgs, actors] = await Promise.all([
    orgIds.length > 0 ? admin.from("organisations").select(
      "id, name"
    ).in("id", orgIds) : Promise.resolve({ data: [] }),
    actorIds.length > 0 ? admin.from("profiles").select(
      "id, full_name"
    ).in("id", actorIds) : Promise.resolve({ data: [] }),
  ]);

  const orgNames = new Map((orgs.data ?? []).map((o) => [o.id, o.name]));
  const actorNames = new Map((actors.data ?? []).map((a) => [a.id, a.full_name]));

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity_table: r.entity_table,
    entity_id: r.entity_id,
    created_at: r.created_at,
    organisation_name: r.organisation_id ? (orgNames.get(r.organisation_id) ?? "—") : "Platform",
    actor_name: r.actor_id ? (actorNames.get(r.actor_id) ?? "—") : "System",
    metadata: r.metadata,
  }));
}

export interface AdminSubscriptionRow {
  organisationId: string;
  organisationName: string;
  status: string;
  subscriptionStatus: string | null;
  planName: string | null;
  planKey: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  units: number;
  users: number;
  maxUnits: number | null;
  maxUsers: number | null;
  /** True when the organisation is past a limit its plan sets. */
  overUnits: boolean;
  overUsers: boolean;
}

/**
 * Every organisation's plan and its usage against that plan's limits.
 *
 * The question this screen answers is "who has outgrown what they pay
 * for", so the limits and the usage sit side by side and anything over is
 * marked. Four queries whatever the number of organisations.
 */
export async function listAdminSubscriptions(): Promise<AdminSubscriptionRow[]> {
  const admin = createAdminClient();

  const { data: organisations } = await admin
    .from("organisations")
    .select("id, name, status")
    .order("name");

  const orgs = organisations ?? [];
  const ids = orgs.map((o) => o.id);
  if (ids.length === 0) return [];

  const [subs, units, members] = await Promise.all([
    admin
      .from("organisation_subscriptions")
      .select(
        `organisation_id, status, trial_ends_at, current_period_end,
         plans ( key, name, max_units, max_users )`
      )
      .in("organisation_id", ids),
    admin.from("units").select("organisation_id").in("organisation_id", ids).is("archived_at", null),
    admin.from("organisation_members").select("organisation_id").in("organisation_id", ids),
  ]);

  function tally(rows: { organisation_id: string }[] | null) {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.organisation_id, (map.get(row.organisation_id) ?? 0) + 1);
    return map;
  }

  const unitCounts = tally(units.data);
  const userCounts = tally(members.data);
  const subByOrg = new Map((subs.data ?? []).map((s) => [s.organisation_id, s]));

  return orgs.map((o) => {
    const sub = subByOrg.get(o.id);
    const plan = sub ? (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) : null;
    const unitCount = unitCounts.get(o.id) ?? 0;
    const userCount = userCounts.get(o.id) ?? 0;
    return {
      organisationId: o.id,
      organisationName: o.name,
      status: o.status,
      subscriptionStatus: sub?.status ?? null,
      planName: plan?.name ?? null,
      planKey: plan?.key ?? null,
      trial_ends_at: sub?.trial_ends_at ?? null,
      current_period_end: sub?.current_period_end ?? null,
      units: unitCount,
      users: userCount,
      maxUnits: plan?.max_units ?? null,
      maxUsers: plan?.max_users ?? null,
      overUnits: plan?.max_units != null && unitCount > plan.max_units,
      overUsers: plan?.max_users != null && userCount > plan.max_users,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Platform screens: integrations, settings, support, market          */
/* ------------------------------------------------------------------ */

export interface PlatformIntegrationRow {
  providerType: string;
  /** Organisations with this provider connected and active. */
  connected: number;
  inactive: number;
  totalOrganisations: number;
  /** Whether the server has credentials configured for it at all. */
  configuredOnServer: boolean;
}

/**
 * Which integrations are actually in use across the platform.
 *
 * Read from integration_connections rather than a separate registry, so
 * "connected" means a row exists, not that somebody ticked a box.
 */
export async function listPlatformIntegrations(
  configured: Record<string, boolean>
): Promise<PlatformIntegrationRow[]> {
  const admin = createAdminClient();

  const [{ count: orgCount }, { data: connections }] = await Promise.all([
    admin.from("organisations").select("id", { count: "exact", head: true }),
    admin.from("integration_connections").select("provider_type, is_active"),
  ]);

  const types = [
    ...new Set([...(connections ?? []).map((c) => c.provider_type), ...Object.keys(configured)]),
  ].sort();

  return types.map((type) => {
    const mine = (connections ?? []).filter((c) => c.provider_type === type);
    return {
      providerType: type,
      connected: mine.filter((c) => c.is_active).length,
      inactive: mine.filter((c) => !c.is_active).length,
      totalOrganisations: orgCount ?? 0,
      configuredOnServer: configured[type] ?? false,
    };
  });
}

export interface PlatformSettingRow {
  id: string;
  key: string;
  value: unknown;
  /** Null organisation_id means it applies to the whole platform. */
  isGlobal: boolean;
  organisationName: string | null;
}

/**
 * Platform settings.
 *
 * app_settings takes a null organisation_id for exactly this, so there is
 * no separate platform settings table: a global row is one with no
 * organisation, and an override is the same key with one.
 */
export async function listPlatformSettings(): Promise<PlatformSettingRow[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("app_settings")
    .select("id, key, value, organisation_id, organisations ( name )")
    .order("key");

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  return (data ?? []).map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    isGlobal: row.organisation_id === null,
    organisationName: one(row.organisations)?.name ?? null,
  }));
}

export interface PlatformFeatureFlagRow {
  key: string;
  globalDefault: boolean | null;
  enabledFor: number;
  disabledFor: number;
}

export async function listPlatformFeatureFlags(): Promise<PlatformFeatureFlagRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("feature_flags").select("key, is_enabled, organisation_id");

  const keys = [...new Set((data ?? []).map((f) => f.key))].sort();
  return keys.map((key) => {
    const mine = (data ?? []).filter((f) => f.key === key);
    const global = mine.find((f) => f.organisation_id === null);
    const scoped = mine.filter((f) => f.organisation_id !== null);
    return {
      key,
      globalDefault: global ? global.is_enabled : null,
      enabledFor: scoped.filter((f) => f.is_enabled).length,
      disabledFor: scoped.filter((f) => !f.is_enabled).length,
    };
  });
}

export interface SupportNoteRow {
  id: string;
  organisationId: string;
  organisationName: string;
  author_name: string;
  body: string;
  category: string | null;
  follow_up_on: string | null;
  resolved_at: string | null;
  created_at: string;
}

export async function listSupportNotes(
  filters: { show?: string } = {}
): Promise<SupportNoteRow[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("support_notes")
    .select(
      `id, organisation_id, author_name, body, category, follow_up_on, resolved_at,
       created_at, organisations!inner ( name )`
    )
    .order("created_at", { ascending: false });

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const today = new Date().toISOString().slice(0, 10);

  const rows: SupportNoteRow[] = (data ?? []).map((n) => ({
    id: n.id,
    organisationId: n.organisation_id,
    organisationName: one(n.organisations)?.name ?? "—",
    author_name: n.author_name,
    body: n.body,
    category: n.category,
    follow_up_on: n.follow_up_on,
    resolved_at: n.resolved_at,
    created_at: n.created_at,
  }));

  if (filters.show === "open") return rows.filter((n) => !n.resolved_at);
  if (filters.show === "due") {
    return rows.filter((n) => !n.resolved_at && n.follow_up_on && n.follow_up_on <= today);
  }
  return rows;
}

export interface MarketSegment {
  area: string;
  unitType: string;
  /** How many leases the figures rest on. Under ten is not a benchmark. */
  n: number;
  median: number;
  low: number;
  high: number;
}

export interface MarketIntelligence {
  consent: {
    organisationId: string;
    organisationName: string;
    consent: string;
    consentAt: string | null;
    units: number;
    contributing: number;
  }[];
  segments: MarketSegment[];
  coverage: {
    contributingUnits: number;
    allUnits: number;
    consentingOrganisations: number;
    totalOrganisations: number;
    leases: number;
    thinSegments: number;
  };
}

/** Below this, a segment is too thin to show anybody as a benchmark. */
export const MIN_SEGMENT_SIZE = 10;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Achieved rents, pooled from organisations that agreed to contribute.
 *
 * Every figure is computed from leases that already exist — nothing is
 * stored, so a benchmark cannot disagree with the leases behind it. Only
 * consent is stored, and an organisation that has not been asked
 * contributes nothing.
 */
export async function getMarketIntelligence(): Promise<MarketIntelligence> {
  const admin = createAdminClient();

  const [{ data: organisations }, { data: units }] = await Promise.all([
    admin.from("organisations").select("id, name, market_consent, market_consent_at").order("name"),
    admin
      .from("units")
      .select("id, organisation_id, unit_type, property_id, properties!inner ( area )")
      .is("archived_at", null),
  ]);

  const orgs = organisations ?? [];
  const consenting = orgs.filter((o) => o.market_consent === "granted").map((o) => o.id);

  const { data: leases } = consenting.length
    ? await admin
        .from("leases")
        .select("unit_id, monthly_rent, organisation_id, status")
        .in("organisation_id", consenting)
        .in("status", ["active", "expiring", "renewal_offered", "renewed"])
    : { data: [] as { unit_id: string; monthly_rent: number }[] };

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const unitById = new Map(
    (units ?? []).map((u) => [
      u.id,
      { area: one(u.properties)?.area ?? null, unitType: u.unit_type, orgId: u.organisation_id },
    ])
  );

  // Group the contributing leases by district and unit type.
  const buckets = new Map<string, number[]>();
  let contributingUnits = 0;
  for (const l of leases ?? []) {
    const u = unitById.get(l.unit_id);
    if (!u || !u.area || !u.unitType) continue;
    contributingUnits += 1;
    const key = `${u.area}||${u.unitType}`;
    const list = buckets.get(key) ?? [];
    list.push(Number(l.monthly_rent));
    buckets.set(key, list);
  }

  const segments: MarketSegment[] = [...buckets.entries()]
    .map(([key, rents]) => {
      const [area, unitType] = key.split("||");
      return {
        area,
        unitType,
        n: rents.length,
        median: median(rents),
        low: Math.min(...rents),
        high: Math.max(...rents),
      };
    })
    .sort((a, b) => a.area.localeCompare(b.area) || a.unitType.localeCompare(b.unitType));

  const unitsPerOrg = new Map<string, number>();
  for (const u of units ?? []) {
    unitsPerOrg.set(u.organisation_id, (unitsPerOrg.get(u.organisation_id) ?? 0) + 1);
  }

  return {
    consent: orgs.map((o) => ({
      organisationId: o.id,
      organisationName: o.name,
      consent: o.market_consent,
      consentAt: o.market_consent_at,
      units: unitsPerOrg.get(o.id) ?? 0,
      contributing: o.market_consent === "granted" ? (unitsPerOrg.get(o.id) ?? 0) : 0,
    })),
    segments,
    coverage: {
      contributingUnits,
      allUnits: (units ?? []).length,
      consentingOrganisations: consenting.length,
      totalOrganisations: orgs.length,
      leases: (leases ?? []).length,
      thinSegments: segments.filter((s) => s.n < MIN_SEGMENT_SIZE).length,
    },
  };
}
