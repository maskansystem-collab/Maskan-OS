import { createClient } from "@/lib/supabase/server";

/**
 * Departments, and the managed/owned split.
 *
 * The numbers here are the reason the split exists. Rent collected on a
 * managed property belongs to the owner and shows on their statement;
 * rent on an owned one is the firm's own revenue. Adding the two together
 * overstates revenue by the whole managed rent roll, so every figure
 * below is reported per holding and never summed across them.
 */

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  purpose: string | null;
  default_holding: string | null;
  head_name: string | null;
  revenue_basis: string | null;
  notes: string | null;
  staff: number;
  properties: number;
  units: number;
  /** Rent roll of live leases on this department's properties. */
  rentRoll: number;
  /** Management fee earned, which is zero on an owned property. */
  feeIncome: number;
  holdings: { managed: number; owned: number };
}

export interface HoldingRow {
  propertyId: string;
  propertyName: string;
  area: string | null;
  holding: string;
  departmentName: string | null;
  ownerName: string | null;
  mandateCode: string | null;
  units: number;
  rentRoll: number;
}

export interface DepartmentsView {
  departments: DepartmentRow[];
  holdings: HoldingRow[];
  totals: {
    ownedUnits: number;
    ownedRent: number;
    managedUnits: number;
    managedRent: number;
    staff: number;
    unassignedProperties: number;
  };
}

const LIVE = ["active", "expiring", "renewal_offered", "renewed"] as const;

export async function getDepartments(organisationId: string): Promise<DepartmentsView> {
  const supabase = await createClient();

  const [{ data: departments }, { data: properties }, { data: units }, { data: leases }] =
    await Promise.all([
      supabase
        .from("departments")
        .select(
          `id, name, code, purpose, default_holding, revenue_basis, notes, sort_order,
           head_member_id`
        )
        .eq("organisation_id", organisationId)
        .is("archived_at", null)
        .order("sort_order")
        .order("name"),
      supabase
        .from("properties")
        .select("id, name, area, holding, department_id")
        .eq("organisation_id", organisationId)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("units")
        .select("id, property_id")
        .eq("organisation_id", organisationId)
        .is("archived_at", null),
      supabase
        .from("leases")
        .select("property_id, monthly_rent, status")
        .eq("organisation_id", organisationId)
        .in("status", LIVE),
    ]);

  const propertyRows = properties ?? [];
  const departmentRows = departments ?? [];

  // The head's name, and how many staff sit on each desk.
  const headIds = departmentRows.map((d) => d.head_member_id).filter((x): x is string => !!x);
  const [{ data: heads }, { data: members }, { data: ownersByProperty }, { data: mandateLinks }] =
    await Promise.all([
      headIds.length
        ? supabase
            .from("organisation_members")
            .select("id, profiles!inner ( full_name )")
            .in("id", headIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("vendors")
        .select("department_id, is_internal")
        .eq("organisation_id", organisationId)
        .eq("is_internal", true),
      supabase
        .from("property_owners")
        .select("property_id, owners!inner ( name )")
        .in("property_id", propertyRows.map((p) => p.id).length ? propertyRows.map((p) => p.id) : ["00000000-0000-0000-0000-000000000000"]),
      supabase
        .from("mandate_properties")
        .select("property_id, mandates!inner ( mandate_code, organisation_id )")
        .eq("mandates.organisation_id", organisationId),
    ]);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const headName = new Map(
    (heads ?? []).map((h) => [h.id, one(h.profiles)?.full_name ?? null])
  );

  const unitsPerProperty = new Map<string, number>();
  for (const u of units ?? []) {
    unitsPerProperty.set(u.property_id, (unitsPerProperty.get(u.property_id) ?? 0) + 1);
  }
  const rentPerProperty = new Map<string, number>();
  for (const l of leases ?? []) {
    rentPerProperty.set(
      l.property_id,
      (rentPerProperty.get(l.property_id) ?? 0) + Number(l.monthly_rent)
    );
  }
  const ownerPerProperty = new Map<string, string>();
  for (const row of ownersByProperty ?? []) {
    const owner = one(row.owners);
    if (owner && !ownerPerProperty.has(row.property_id)) {
      ownerPerProperty.set(row.property_id, owner.name);
    }
  }
  const mandatePerProperty = new Map<string, string>();
  for (const row of mandateLinks ?? []) {
    const m = one(row.mandates);
    if (m) mandatePerProperty.set(row.property_id, m.mandate_code);
  }

  const staffPerDepartment = new Map<string, number>();
  for (const v of members ?? []) {
    if (v.department_id) {
      staffPerDepartment.set(v.department_id, (staffPerDepartment.get(v.department_id) ?? 0) + 1);
    }
  }

  const holdings: HoldingRow[] = propertyRows.map((p) => ({
    propertyId: p.id,
    propertyName: p.name,
    area: p.area,
    holding: p.holding,
    departmentName: departmentRows.find((d) => d.id === p.department_id)?.name ?? null,
    ownerName: ownerPerProperty.get(p.id) ?? null,
    mandateCode: mandatePerProperty.get(p.id) ?? null,
    units: unitsPerProperty.get(p.id) ?? 0,
    rentRoll: rentPerProperty.get(p.id) ?? 0,
  }));

  const rows: DepartmentRow[] = departmentRows.map((d) => {
    const mine = propertyRows.filter((p) => p.department_id === d.id);
    const managed = mine.filter((p) => p.holding === "managed");
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      purpose: d.purpose,
      default_holding: d.default_holding,
      head_name: d.head_member_id ? (headName.get(d.head_member_id) ?? null) : null,
      revenue_basis: d.revenue_basis,
      notes: d.notes,
      staff: staffPerDepartment.get(d.id) ?? 0,
      properties: mine.length,
      units: mine.reduce((s, p) => s + (unitsPerProperty.get(p.id) ?? 0), 0),
      rentRoll: mine.reduce((s, p) => s + (rentPerProperty.get(p.id) ?? 0), 0),
      // Fee income arises on managed property only. An owned property
      // charges itself nothing.
      feeIncome: managed.reduce((s, p) => s + (rentPerProperty.get(p.id) ?? 0), 0),
      holdings: {
        managed: managed.length,
        owned: mine.filter((p) => p.holding === "owned").length,
      },
    };
  });

  const owned = holdings.filter((h) => h.holding === "owned");
  const managed = holdings.filter((h) => h.holding === "managed");

  return {
    departments: rows,
    holdings,
    totals: {
      ownedUnits: owned.reduce((s, h) => s + h.units, 0),
      ownedRent: owned.reduce((s, h) => s + h.rentRoll, 0),
      managedUnits: managed.reduce((s, h) => s + h.units, 0),
      managedRent: managed.reduce((s, h) => s + h.rentRoll, 0),
      staff: rows.reduce((s, d) => s + d.staff, 0),
      unassignedProperties: holdings.filter((h) => !h.departmentName).length,
    },
  };
}

/**
 * How an event lands differently on each book.
 *
 * Copy rather than data: these are the accounting rules the split exists
 * to enforce, and they do not vary by organisation.
 */
export const BOOK_RULES: { event: string; managed: string; owned: string }[] = [
  {
    event: "Rent collected",
    managed: "Held for the owner and shown on their statement.",
    owned: "Recognised as the firm's own revenue.",
  },
  {
    event: "Management fee",
    managed: "Charged to the owner as fee income.",
    owned: "Not charged. An internal transfer at most, for departmental reporting.",
  },
  {
    event: "Leasing commission",
    managed: "Billed to the owner on completion.",
    owned: "An internal transfer from the owned portfolio to the leasing desk.",
  },
  {
    event: "Repairs and maintenance",
    managed: "Recharged to the owner, within whatever the mandate allows.",
    owned: "The firm's own cost, against the property it owns.",
  },
  {
    event: "A vacant unit",
    managed: "Lost fee income, and a conversation with the owner.",
    owned: "Lost revenue, straight off the bottom line.",
  },
  {
    event: "The security deposit",
    managed: "Held in the client account. Never the firm's money.",
    owned: "Still not revenue — a liability until the tenancy ends.",
  },
];
