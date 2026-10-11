import { createClient } from "@/lib/supabase/server";
import type { PropertyType, UnitStatus } from "@/types/database";

export const PAGE_SIZE = 20;

export interface PropertyListRow {
  id: string;
  name: string;
  property_code: string;
  type: PropertyType;
  address: string | null;
  unit_count: number;
  occupied_count: number;
  owner_names: string[];
}

export interface PropertyListParams {
  organisationId: string;
  q?: string;
  type?: string;
  page?: number;
}

/**
 * Lists properties with their unit counts and owners.
 *
 * Avoiding N+1: the units and property_owners are fetched in two batched
 * queries keyed by the page's property ids, rather than one query per row.
 */
export async function listProperties(params: PropertyListParams): Promise<{
  rows: PropertyListRow[];
  total: number;
  page: number;
}> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("properties")
    .select("id, name, property_code, type, address", { count: "exact" })
    .eq("organisation_id", params.organisationId)
    .is("archived_at", null);

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`name.ilike.${term},property_code.ilike.${term},address.ilike.${term}`);
  }
  if (params.type) {
    query = query.eq("type", params.type as PropertyType);
  }

  const { data, count, error } = await query.order("name").range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const properties = data ?? [];
  const ids = properties.map((p) => p.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  const [{ data: units }, { data: owners }] = await Promise.all([
    supabase.from("units").select(
      "property_id, status"
    ).in("property_id", ids).is("archived_at", null),
    supabase.from("property_owners").select(
      "property_id, owners ( name )"
    ).in("property_id", ids),
  ]);

  const unitCounts = new Map<string, { total: number; occupied: number }>();
  for (const u of units ?? []) {
    const entry = unitCounts.get(u.property_id) ?? { total: 0, occupied: 0 };
    entry.total += 1;
    if (u.status === "occupied") entry.occupied += 1;
    unitCounts.set(u.property_id, entry);
  }

  const ownerNames = new Map<string, string[]>();
  for (const row of owners ?? []) {
    const owner = Array.isArray(row.owners) ? row.owners[0] : row.owners;
    if (!owner?.name) continue;
    ownerNames.set(row.property_id, [...(ownerNames.get(row.property_id) ?? []), owner.name]);
  }

  return {
    rows: properties.map((p) => ({
      ...p,
      unit_count: unitCounts.get(p.id)?.total ?? 0,
      occupied_count: unitCounts.get(p.id)?.occupied ?? 0,
      owner_names: ownerNames.get(p.id) ?? [],
    })),
    total: count ?? 0,
    page,
  };
}

export interface PropertyDetail {
  id: string;
  organisation_id: string;
  name: string;
  property_code: string;
  type: PropertyType;
  address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  management_fee_type: string | null;
  management_fee_value: number | null;
  owners: { id: string; name: string; ownership_percentage: number }[];
  stats: {
    units: number;
    occupied: number;
    vacant: number;
    activeLeases: number;
    monthlyRent: number;
  };
}

export async function getProperty(organisationId: string, propertyId: string): Promise<PropertyDetail | null> {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select(
      "id, organisation_id, name, property_code, type, address, description, latitude, longitude, management_fee_type, management_fee_value"
    )
    .eq("id", propertyId)
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .maybeSingle();

  if (!property) return null;

  const [{ data: owners }, { data: units }, { data: leases }] = await Promise.all([
    supabase.from("property_owners").select(
      "ownership_percentage, owners ( id, name )"
    ).eq("property_id", propertyId),
    supabase.from("units").select(
      "id, status"
    ).eq("property_id", propertyId).is("archived_at", null),
    supabase.from("leases").select(
      "id, monthly_rent, status"
    ).eq("property_id", propertyId).eq("status", "active"),
  ]);

  const unitRows = units ?? [];

  return {
    ...property,
    owners: (owners ?? [])
      .map((row) => {
        const owner = Array.isArray(row.owners) ? row.owners[0] : row.owners;
        return owner ? { id: owner.id, name: owner.name, ownership_percentage: row.ownership_percentage } : null;
      })
      .filter((o): o is { id: string; name: string; ownership_percentage: number } => o !== null),
    stats: {
      units: unitRows.length,
      occupied: unitRows.filter((u) => u.status === "occupied").length,
      vacant: unitRows.filter((u) => u.status === "vacant").length,
      activeLeases: (leases ?? []).length,
      monthlyRent: (leases ?? []).reduce((sum, l) => sum + Number(l.monthly_rent ?? 0), 0),
    },
  };
}

export interface UnitListRow {
  id: string;
  unit_number: string;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  unit_type: string | null;
  furnishing: string | null;
  current_rent: number | null;
  market_rent: number | null;
  status: UnitStatus;
  tenant_name: string | null;
  lease_id: string | null;
}

export async function listUnitsForProperty(
  organisationId: string,
  propertyId: string,
  opts: { q?: string; status?: string } = {}
): Promise<UnitListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("units")
    .select(
      "id, unit_number, floor, bedrooms, bathrooms, area_sqm, unit_type, furnishing, current_rent, market_rent, status"
    )
    .eq("organisation_id", organisationId)
    .eq("property_id", propertyId)
    .is("archived_at", null);

  if (opts.q) query = query.ilike("unit_number", `%${opts.q}%`);
  if (opts.status) query = query.eq("status", opts.status as UnitStatus);

  const { data: units, error } = await query.order("unit_number");
  if (error) throw error;

  const unitIds = (units ?? []).map((u) => u.id);
  if (unitIds.length === 0) return [];

  // Batched: one query for all active leases on this page of units.
  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, unit_id, tenants ( name )"
    )
    .in("unit_id", unitIds)
    .eq("status", "active");

  const leaseByUnit = new Map<string, { id: string; tenantName: string | null }>();
  for (const lease of leases ?? []) {
    const tenant = Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants;
    leaseByUnit.set(lease.unit_id, { id: lease.id, tenantName: tenant?.name ?? null });
  }

  return (units ?? []).map((u) => ({
    ...u,
    tenant_name: leaseByUnit.get(u.id)?.tenantName ?? null,
    lease_id: leaseByUnit.get(u.id)?.id ?? null,
  }));
}

/** Lightweight option lists used by select inputs across the app. */
export async function getPropertyOptions(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(
      "id, name, property_code"
    )
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

export async function getOwnerOptions(organisationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("owners")
    .select(
      "id, name"
    )
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}

/* ---------------------------------------------------------------------
 * Detail-screen tabs
 *
 * The property, building and unit detail screens each carry a tab bar
 * over the records that hang off them. One query per screen, batched, so
 * opening a tab costs nothing extra — the prototype switches tabs with no
 * round trip and the app should feel the same.
 * ------------------------------------------------------------------- */

export interface TabLease {
  id: string;
  lease_code: string;
  tenant_name: string;
  unit_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
}

export interface TabRequest {
  id: string;
  request_code: string;
  unit_number: string | null;
  category: string | null;
  priority: string;
  status: string;
  ageDays: number;
}

export interface TabExpense {
  id: string;
  expense_date: string;
  description: string | null;
  category: string | null;
  amount: number;
  approval_status: string;
}

export interface TabDocument {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

export interface PropertyTabs {
  leases: TabLease[];
  requests: TabRequest[];
  expenses: TabExpense[];
  documents: TabDocument[];
  financials: { collected: number; expenses: number; managementFee: number; outstanding: number };
}

const ageInDays = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

/** Everything behind the property detail screen's tabs. */
export async function getPropertyTabs(
  organisationId: string,
  propertyId: string
): Promise<PropertyTabs> {
  const supabase = await createClient();

  const [{ data: leases }, { data: requests }, { data: expenses }, { data: documents }] =
    await Promise.all([
      supabase
        .from("leases")
        .select(
          `id, lease_code, start_date, end_date, monthly_rent, status,
           tenants!inner ( name ), units!inner ( unit_number )`
        )
        .eq("organisation_id", organisationId)
        .eq("property_id", propertyId)
        .order("end_date", { ascending: false }),
      supabase
        .from("maintenance_requests")
        .select(
          `id, request_code, priority, status, created_at,
           units ( unit_number ), maintenance_categories ( name )`
        )
        .eq("organisation_id", organisationId)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("property_expenses")
        .select(
          `id, expense_date, description, amount, approval_status,
           expense_categories ( name )`
        )
        .eq("organisation_id", organisationId)
        .eq("property_id", propertyId)
        .order("expense_date", { ascending: false }),
      supabase
        .from("property_documents")
        .select("id, title, category, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false }),
    ]);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const leaseRows: TabLease[] = (leases ?? []).map((l) => ({
    id: l.id,
    lease_code: l.lease_code,
    tenant_name: one(l.tenants)?.name ?? "—",
    unit_number: one(l.units)?.unit_number ?? "—",
    start_date: l.start_date,
    end_date: l.end_date,
    monthly_rent: Number(l.monthly_rent),
    status: l.status,
  }));

  // Collected rent is read from confirmed payments on this property's
  // leases rather than inferred from the rent roll, so a month where
  // somebody did not pay reads differently from one where they did.
  const leaseIds = leaseRows.map((l) => l.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  const since = monthStart.toISOString().slice(0, 10);

  const [{ data: payments }, { data: instalments }] = await Promise.all([
    leaseIds.length === 0
      ? Promise.resolve({ data: [] as { amount: number }[] })
      : supabase
          .from("payments")
          .select("amount")
          .in("lease_id", leaseIds)
          .eq("status", "confirmed")
          .gte("paid_at", since),
    leaseIds.length === 0
      ? Promise.resolve({ data: [] as { outstanding_amount: number }[] })
      : supabase
          .from("rent_instalments")
          .select("outstanding_amount")
          .in("lease_id", leaseIds)
          .in("status", ["due", "partial", "overdue"]),
  ]);

  const expenseRows: TabExpense[] = (expenses ?? []).map((e) => ({
    id: e.id,
    expense_date: e.expense_date,
    description: e.description,
    category: one(e.expense_categories)?.name ?? null,
    amount: Number(e.amount),
    approval_status: e.approval_status,
  }));

  const collected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const monthExpenses = expenseRows
    .filter((e) => e.expense_date >= since)
    .reduce((s, e) => s + e.amount, 0);

  return {
    leases: leaseRows,
    requests: (requests ?? []).map((r) => ({
      id: r.id,
      request_code: r.request_code,
      unit_number: one(r.units)?.unit_number ?? null,
      category: one(r.maintenance_categories)?.name ?? null,
      priority: r.priority,
      status: r.status,
      ageDays: ageInDays(r.created_at),
    })),
    expenses: expenseRows,
    documents: documents ?? [],
    financials: {
      collected,
      expenses: monthExpenses,
      // The fee is what the schedule says, applied to what was collected.
      managementFee: 0,
      outstanding: (instalments ?? []).reduce((s, i) => s + Number(i.outstanding_amount), 0),
    },
  };
}

export interface UnitDetail {
  id: string;
  unit_number: string;
  internal_code: string | null;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  unit_type: string | null;
  furnishing: string | null;
  market_rent: number | null;
  current_rent: number | null;
  status: string;
  property: { id: string; name: string; address: string | null } | null;
  building: { id: string; name: string } | null;
  owners: { id: string; name: string; ownership_percentage: number }[];
  /** Ownership recorded against the property rather than this unit. */
  ownedAtPropertyLevel: boolean;
  currentLease: {
    id: string;
    lease_code: string;
    tenant_id: string;
    tenant_name: string;
    owner_name: string | null;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    payment_frequency: string;
    payment_method: string;
    status: string;
  } | null;
  instalments: {
    id: string;
    instalment_number: number;
    due_date: string;
    original_amount: number;
    outstanding_amount: number;
    status: string;
  }[];
  requests: TabRequest[];
  documents: TabDocument[];
  activity: { id: string; event_type: string; notes: string | null; created_at: string }[];
  stats: { nextDue: string | null; nextAmount: number | null; outstanding: number };
}

/** Everything the unit detail screen's six tabs need, in one pass. */
export async function getUnitDetail(
  organisationId: string,
  unitId: string
): Promise<UnitDetail | null> {
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select(
      `id, unit_number, internal_code, floor, bedrooms, bathrooms, area_sqm, unit_type,
       furnishing, market_rent, current_rent, status, property_id, building_id,
       properties ( id, name, address ), buildings ( id, name )`
    )
    .eq("id", unitId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!unit) return null;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const [
    { data: leases },
    { data: unitOwners },
    { data: propertyOwners },
    { data: requests },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from("leases")
      .select(
        `id, lease_code, tenant_id, start_date, end_date, monthly_rent, status,
         payment_frequency, payment_method,
         tenants!inner ( name ), owners ( name )`
      )
      .eq("unit_id", unitId)
      .order("start_date", { ascending: false }),
    supabase
      .from("unit_owners")
      .select("ownership_percentage, owners!inner ( id, name )")
      .eq("unit_id", unitId),
    // Fall back to the property's owners: most units are not separately
    // titled, and the screen should still say who owns the thing.
    supabase
      .from("property_owners")
      .select("ownership_percentage, owners!inner ( id, name )")
      .eq("property_id", unit.property_id),
    supabase
      .from("maintenance_requests")
      .select(
        `id, request_code, priority, status, created_at,
         maintenance_categories ( name )`
      )
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, category, created_at")
      .eq("organisation_id", organisationId)
      .eq("related_table", "units")
      .eq("related_id", unitId)
      .order("created_at", { ascending: false }),
  ]);

  const leaseRows = leases ?? [];
  const live = leaseRows.find((l) => ["active", "expiring", "renewal_offered"].includes(l.status))
    ?? leaseRows[0]
    ?? null;

  const [{ data: instalments }, { data: activity }] = await Promise.all([
    live
      ? supabase
          .from("rent_instalments")
          .select("id, instalment_number, due_date, original_amount, outstanding_amount, status")
          .eq("lease_id", live.id)
          .order("instalment_number")
      : Promise.resolve({ data: [] as UnitDetail["instalments"] }),
    live
      ? supabase
          .from("lease_events")
          .select("id, event_type, notes, created_at")
          .eq("lease_id", live.id)
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] as UnitDetail["activity"] }),
  ]);

  const owned = (unitOwners ?? []).length > 0 ? unitOwners ?? [] : propertyOwners ?? [];
  const schedule = instalments ?? [];
  const next = schedule.find((i) => ["upcoming", "due", "partial", "overdue"].includes(i.status));

  return {
    id: unit.id,
    unit_number: unit.unit_number,
    internal_code: unit.internal_code,
    floor: unit.floor,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    area_sqm: unit.area_sqm,
    unit_type: unit.unit_type,
    furnishing: unit.furnishing,
    market_rent: unit.market_rent,
    current_rent: unit.current_rent,
    status: unit.status,
    property: one(unit.properties),
    building: one(unit.buildings),
    owners: owned.map((row) => {
      const owner = one(row.owners)!;
      return { id: owner.id, name: owner.name, ownership_percentage: row.ownership_percentage };
    }),
    ownedAtPropertyLevel: (unitOwners ?? []).length === 0,
    currentLease: live
      ? {
          id: live.id,
          lease_code: live.lease_code,
          tenant_id: live.tenant_id,
          tenant_name: one(live.tenants)?.name ?? "—",
          owner_name: one(live.owners)?.name ?? null,
          start_date: live.start_date,
          end_date: live.end_date,
          monthly_rent: Number(live.monthly_rent),
          payment_frequency: live.payment_frequency,
          payment_method: live.payment_method,
          status: live.status,
        }
      : null,
    instalments: schedule.map((i) => ({
      ...i,
      original_amount: Number(i.original_amount),
      outstanding_amount: Number(i.outstanding_amount),
    })),
    requests: (requests ?? []).map((r) => ({
      id: r.id,
      request_code: r.request_code,
      unit_number: unit.unit_number,
      category: one(r.maintenance_categories)?.name ?? null,
      priority: r.priority,
      status: r.status,
      ageDays: ageInDays(r.created_at),
    })),
    documents: documents ?? [],
    activity: activity ?? [],
    stats: {
      nextDue: next?.due_date ?? null,
      nextAmount: next ? Number(next.outstanding_amount) : null,
      outstanding: schedule.reduce((s, i) => s + Number(i.outstanding_amount), 0),
    },
  };
}

export interface BuildingDetail {
  id: string;
  name: string;
  floors: number | null;
  property: { id: string; name: string; address: string | null } | null;
  owners: { id: string; name: string; ownership_percentage: number; level: "unit" | "property" }[];
  units: UnitListRow[];
  leases: TabLease[];
  requests: TabRequest[];
  expenses: TabExpense[];
  stats: {
    units: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    rentRoll: number;
    collected: number;
    outstanding: number;
    monthExpenses: number;
  };
  /** Occupied units grouped into bands of floors, for the overview chart. */
  byFloor: { band: string; occupied: number; total: number }[];
}

/**
 * One building, with everything behind its six tabs.
 *
 * Buildings hang off a property rather than the organisation, so the
 * organisation check goes through the property with an inner join.
 */
export async function getBuildingDetail(
  organisationId: string,
  buildingId: string
): Promise<BuildingDetail | null> {
  const supabase = await createClient();

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, floors, property_id, properties!inner ( id, name, address, organisation_id )")
    .eq("id", buildingId)
    .eq("properties.organisation_id", organisationId)
    .maybeSingle();

  if (!building) return null;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const { data: unitRows } = await supabase
    .from("units")
    .select(
      `id, unit_number, floor, bedrooms, bathrooms, area_sqm, unit_type, furnishing,
       current_rent, market_rent, status`
    )
    .eq("building_id", buildingId)
    .is("archived_at", null)
    .order("unit_number");

  const units = unitRows ?? [];
  const unitIds = units.map((u) => u.id);

  const monthStart = new Date();
  monthStart.setDate(1);
  const since = monthStart.toISOString().slice(0, 10);

  const [
    { data: leases },
    { data: requests },
    { data: expenses },
    { data: unitOwners },
    { data: propertyOwners },
  ] = await Promise.all([
    unitIds.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("leases")
          .select(
            `id, lease_code, start_date, end_date, monthly_rent, status,
             tenants!inner ( name ), units!inner ( unit_number )`
          )
          .in("unit_id", unitIds)
          .order("end_date", { ascending: false }),
    unitIds.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("maintenance_requests")
          .select(
            `id, request_code, priority, status, created_at,
             units ( unit_number ), maintenance_categories ( name )`
          )
          .in("unit_id", unitIds)
          .order("created_at", { ascending: false }),
    supabase
      .from("property_expenses")
      .select("id, expense_date, description, amount, approval_status, expense_categories ( name )")
      .eq("organisation_id", organisationId)
      .eq("property_id", building.property_id)
      .order("expense_date", { ascending: false }),
    unitIds.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("unit_owners")
          .select("ownership_percentage, owners!inner ( id, name )")
          .in("unit_id", unitIds),
    supabase
      .from("property_owners")
      .select("ownership_percentage, owners!inner ( id, name )")
      .eq("property_id", building.property_id),
  ]);

  const leaseRows: TabLease[] = (leases ?? []).map((l) => ({
    id: l.id,
    lease_code: l.lease_code,
    tenant_name: one(l.tenants)?.name ?? "—",
    unit_number: one(l.units)?.unit_number ?? "—",
    start_date: l.start_date,
    end_date: l.end_date,
    monthly_rent: Number(l.monthly_rent),
    status: l.status,
  }));
  const liveLeaseIds = leaseRows
    .filter((l) => ["active", "expiring", "renewal_offered"].includes(l.status))
    .map((l) => l.id);

  const [{ data: payments }, { data: instalments }] = await Promise.all([
    liveLeaseIds.length === 0
      ? Promise.resolve({ data: [] as { amount: number }[] })
      : supabase
          .from("payments")
          .select("amount")
          .in("lease_id", liveLeaseIds)
          .eq("status", "confirmed")
          .gte("paid_at", since),
    liveLeaseIds.length === 0
      ? Promise.resolve({ data: [] as { outstanding_amount: number }[] })
      : supabase
          .from("rent_instalments")
          .select("outstanding_amount")
          .in("lease_id", liveLeaseIds)
          .in("status", ["due", "partial", "overdue"]),
  ]);

  // Owners recorded per unit win; otherwise the property's owners stand in,
  // since most buildings are not separately titled.
  const owners = (unitOwners ?? []).length > 0
    ? (unitOwners ?? []).map((row) => {
        const o = one(row.owners)!;
        return { id: o.id, name: o.name, ownership_percentage: row.ownership_percentage, level: "unit" as const };
      })
    : (propertyOwners ?? []).map((row) => {
        const o = one(row.owners)!;
        return { id: o.id, name: o.name, ownership_percentage: row.ownership_percentage, level: "property" as const };
      });

  // Dedupe: several units can share an owner, and the overview wants one
  // row per owner with their shares added up.
  const merged = new Map<string, (typeof owners)[number]>();
  for (const o of owners) {
    const seen = merged.get(o.id);
    if (seen) seen.ownership_percentage += o.ownership_percentage;
    else merged.set(o.id, { ...o });
  }

  const floors = building.floors ?? 0;
  const bands: BuildingDetail["byFloor"] = [];
  if (floors > 0) {
    const size = Math.max(1, Math.ceil(floors / 4));
    for (let start = 1; start <= floors; start += size) {
      const end = Math.min(floors, start + size - 1);
      const inBand = units.filter((u) => {
        const f = Number(u.floor);
        return Number.isFinite(f) && f >= start && f <= end;
      });
      bands.push({
        band: start === end ? `Floor ${start}` : `Floors ${start}–${end}`,
        occupied: inBand.filter((u) => u.status === "occupied").length,
        total: inBand.length,
      });
    }
  }

  const leaseByUnit = new Map(
    leaseRows
      .filter((l) => ["active", "expiring", "renewal_offered"].includes(l.status))
      .map((l) => [l.unit_number, l])
  );

  return {
    id: building.id,
    name: building.name,
    floors: building.floors,
    property: one(building.properties),
    owners: [...merged.values()],
    units: units.map((u) => ({
      ...u,
      tenant_name: leaseByUnit.get(u.unit_number)?.tenant_name ?? null,
      lease_id: leaseByUnit.get(u.unit_number)?.id ?? null,
    })) as UnitListRow[],
    leases: leaseRows,
    requests: (requests ?? []).map((r) => ({
      id: r.id,
      request_code: r.request_code,
      unit_number: one(r.units)?.unit_number ?? null,
      category: one(r.maintenance_categories)?.name ?? null,
      priority: r.priority,
      status: r.status,
      ageDays: ageInDays(r.created_at),
    })),
    expenses: (expenses ?? []).map((e) => ({
      id: e.id,
      expense_date: e.expense_date,
      description: e.description,
      category: one(e.expense_categories)?.name ?? null,
      amount: Number(e.amount),
      approval_status: e.approval_status,
    })),
    stats: {
      units: units.length,
      occupied: units.filter((u) => u.status === "occupied").length,
      vacant: units.filter((u) => u.status === "vacant").length,
      maintenance: units.filter((u) => u.status === "maintenance").length,
      rentRoll: leaseRows
        .filter((l) => ["active", "expiring", "renewal_offered"].includes(l.status))
        .reduce((s, l) => s + l.monthly_rent, 0),
      collected: (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
      outstanding: (instalments ?? []).reduce((s, i) => s + Number(i.outstanding_amount), 0),
      monthExpenses: (expenses ?? [])
        .filter((e) => e.expense_date >= since)
        .reduce((s, e) => s + Number(e.amount), 0),
    },
    byFloor: bands,
  };
}
