import { createClient } from "@/lib/supabase/server";

/**
 * Lease registration readiness.
 *
 * Registering a lease needs a fixed set of documents on file: the tenant's
 * QID and passport, a signed lease, the owner's paperwork and the property's.
 * Each of those already lives in its own table, so readiness is derived
 * rather than stored — nothing here needs a migration.
 *
 * What is *not* here is the registration reference, date and fee the
 * prototype shows on the detail screen. The leases table has no columns for
 * them, so recording them needs a schema change; until then this tracks
 * readiness, which is the part that actually drives work.
 */

/** The five documents a lease needs before it can be registered. */
export const REQUIREMENTS = [
  { key: "tenant_qid", label: "Tenant QID" },
  { key: "tenant_passport", label: "Passport" },
  { key: "signed_lease", label: "Signed lease" },
  { key: "owner_documents", label: "Owner documents" },
  { key: "property_documents", label: "Property documents" },
] as const;

export type RequirementKey = (typeof REQUIREMENTS)[number]["key"];

/** Readiness bands, worst first — the order the filter chips appear in. */
export type ComplianceStatus = "action_required" | "missing_documents" | "ready";

export interface ComplianceRow {
  leaseId: string;
  lease_code: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  lease_status: string;
  onFile: Record<RequirementKey, boolean>;
  missing: number;
  status: ComplianceStatus;
}

function bandFor(missing: number): ComplianceStatus {
  if (missing === 0) return "ready";
  return missing === 1 ? "missing_documents" : "action_required";
}

/** Leases a registration could apply to. Drafts and dead leases are not chased. */
const TRACKED_STATUSES = ["pending", "active", "expiring", "renewal_offered", "renewed"] as const;

/**
 * Every tracked lease with its document readiness.
 *
 * Five queries in total, whatever the portfolio size: the leases, then one
 * batched lookup per document source keyed on the ids just fetched.
 */
export async function listCompliance(
  organisationId: string,
  filters: { status?: string; q?: string } = {}
): Promise<ComplianceRow[]> {
  const supabase = await createClient();

  const { data: leases } = await supabase
    .from("leases")
    .select(
      `id, lease_code, start_date, end_date, monthly_rent, status,
       tenant_id, owner_id, property_id,
       tenants!inner ( name ),
       properties!inner ( name ),
       units!inner ( unit_number )`
    )
    .eq("organisation_id", organisationId)
    .in("status", TRACKED_STATUSES)
    .order("end_date");

  if (!leases || leases.length === 0) return [];

  const leaseIds = leases.map((l) => l.id);
  const tenantIds = [...new Set(leases.map((l) => l.tenant_id))];
  const ownerIds = [...new Set(leases.map((l) => l.owner_id).filter((id): id is string => !!id))];
  const propertyIds = [...new Set(leases.map((l) => l.property_id))];

  const [{ data: tenantDocs }, { data: leaseDocs }, { data: ownerDocs }, { data: propertyDocs }] =
    await Promise.all([
      supabase
        .from("tenant_documents")
        .select("tenant_id, category")
        .in("tenant_id", tenantIds)
        .in("category", ["qid", "passport"]),
      supabase
        .from("lease_documents")
        .select("lease_id, is_signed")
        .in("lease_id", leaseIds)
        .eq("is_signed", true),
      ownerIds.length === 0
        ? Promise.resolve({ data: [] as { related_id: string | null }[] })
        : supabase
            .from("documents")
            .select("related_id")
            .eq("organisation_id", organisationId)
            .eq("related_table", "owners")
            .in("related_id", ownerIds),
      supabase.from("property_documents").select("property_id").in("property_id", propertyIds),
    ]);

  const hasQid = new Set(
    (tenantDocs ?? []).filter((d) => d.category === "qid").map((d) => d.tenant_id)
  );
  const hasPassport = new Set(
    (tenantDocs ?? []).filter((d) => d.category === "passport").map((d) => d.tenant_id)
  );
  const hasSigned = new Set((leaseDocs ?? []).map((d) => d.lease_id));
  const hasOwnerDocs = new Set((ownerDocs ?? []).map((d) => d.related_id));
  const hasPropertyDocs = new Set((propertyDocs ?? []).map((d) => d.property_id));

  const rows: ComplianceRow[] = leases.map((l) => {
    const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
    const property = Array.isArray(l.properties) ? l.properties[0] : l.properties;
    const unit = Array.isArray(l.units) ? l.units[0] : l.units;

    const onFile: Record<RequirementKey, boolean> = {
      tenant_qid: hasQid.has(l.tenant_id),
      tenant_passport: hasPassport.has(l.tenant_id),
      signed_lease: hasSigned.has(l.id),
      owner_documents: !!l.owner_id && hasOwnerDocs.has(l.owner_id),
      property_documents: hasPropertyDocs.has(l.property_id),
    };
    const missing = Object.values(onFile).filter((v) => !v).length;

    return {
      leaseId: l.id,
      lease_code: l.lease_code,
      tenant_name: tenant?.name ?? "—",
      property_name: property?.name ?? "—",
      unit_number: unit?.unit_number ?? "—",
      start_date: l.start_date,
      end_date: l.end_date,
      monthly_rent: Number(l.monthly_rent),
      lease_status: l.status,
      onFile,
      missing,
      status: bandFor(missing),
    };
  });

  const term = filters.q?.trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (term) {
      const haystack = `${r.lease_code} ${r.tenant_name} ${r.property_name} ${r.unit_number}`;
      if (!haystack.toLowerCase().includes(term)) return false;
    }
    return true;
  });
}

export interface ComplianceDetail extends ComplianceRow {
  security_deposit: number;
  owner_name: string | null;
  documents: { id: string; title: string; source: string; created_at: string }[];
  events: { id: string; event_type: string; notes: string | null; created_at: string }[];
}

/** One lease's registration file: the checklist, what is on file, and its history. */
export async function getComplianceDetail(
  organisationId: string,
  leaseId: string
): Promise<ComplianceDetail | null> {
  const supabase = await createClient();

  const { data: lease } = await supabase
    .from("leases")
    .select(
      `id, lease_code, start_date, end_date, monthly_rent, security_deposit, status,
       tenant_id, owner_id, property_id,
       tenants!inner ( name ),
       owners ( name ),
       properties!inner ( name ),
       units!inner ( unit_number )`
    )
    .eq("organisation_id", organisationId)
    .eq("id", leaseId)
    .maybeSingle();

  if (!lease) return null;

  const [
    { data: tenantDocs },
    { data: leaseDocs },
    { data: ownerDocs },
    { data: propertyDocs },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("tenant_documents")
      .select("id, title, category, created_at")
      .eq("tenant_id", lease.tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lease_documents")
      .select("id, title, is_signed, created_at")
      .eq("lease_id", leaseId)
      .order("created_at", { ascending: false }),
    lease.owner_id
      ? supabase
          .from("documents")
          .select("id, title, created_at")
          .eq("organisation_id", organisationId)
          .eq("related_table", "owners")
          .eq("related_id", lease.owner_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; title: string; created_at: string }[] }),
    supabase
      .from("property_documents")
      .select("id, title, created_at")
      .eq("property_id", lease.property_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lease_events")
      .select("id, event_type, notes, created_at")
      .eq("lease_id", leaseId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const tenant = Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants;
  const owner = Array.isArray(lease.owners) ? lease.owners[0] : lease.owners;
  const property = Array.isArray(lease.properties) ? lease.properties[0] : lease.properties;
  const unit = Array.isArray(lease.units) ? lease.units[0] : lease.units;

  const onFile: Record<RequirementKey, boolean> = {
    tenant_qid: (tenantDocs ?? []).some((d) => d.category === "qid"),
    tenant_passport: (tenantDocs ?? []).some((d) => d.category === "passport"),
    signed_lease: (leaseDocs ?? []).some((d) => d.is_signed),
    owner_documents: (ownerDocs ?? []).length > 0,
    property_documents: (propertyDocs ?? []).length > 0,
  };
  const missing = Object.values(onFile).filter((v) => !v).length;

  const documents = [
    ...(tenantDocs ?? []).map((d) => ({ id: d.id, title: d.title, source: "Tenant", created_at: d.created_at })),
    ...(leaseDocs ?? []).map((d) => ({ id: d.id, title: d.title, source: "Lease", created_at: d.created_at })),
    ...(ownerDocs ?? []).map((d) => ({ id: d.id, title: d.title, source: "Owner", created_at: d.created_at })),
    ...(propertyDocs ?? []).map((d) => ({ id: d.id, title: d.title, source: "Property", created_at: d.created_at })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    leaseId: lease.id,
    lease_code: lease.lease_code,
    tenant_name: tenant?.name ?? "—",
    owner_name: owner?.name ?? null,
    property_name: property?.name ?? "—",
    unit_number: unit?.unit_number ?? "—",
    start_date: lease.start_date,
    end_date: lease.end_date,
    monthly_rent: Number(lease.monthly_rent),
    security_deposit: Number(lease.security_deposit),
    lease_status: lease.status,
    onFile,
    missing,
    status: bandFor(missing),
    documents,
    events: events ?? [],
  };
}
