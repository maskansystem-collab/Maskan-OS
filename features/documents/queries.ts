import { createClient } from "@/lib/supabase/server";

/**
 * The document library.
 *
 * Documents in this schema live next to whatever they belong to —
 * tenant_documents, lease_documents, property_documents, vendor_documents,
 * plus the generic documents table for anything else. That is the right
 * shape for every detail screen and the wrong one for the question "where is
 * that file", so this reads all five and merges them.
 *
 * Nothing new is stored. The union is built per request, which costs five
 * queries whatever the size of the library.
 */

export interface LibraryDoc {
  id: string;
  title: string;
  /** What the file is: a lease, a QID, a title deed. */
  category: string;
  /** Which record it hangs off — the lease code, tenant name, property name. */
  attachedTo: string;
  /** The kind of record, used for the filter chips. */
  attachedType: "Lease" | "Tenant" | "Property" | "Vendor" | "Other";
  href: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  qid: "QID",
  passport: "Passport",
  lease: "Lease",
  ownership: "Ownership",
  cr: "Commercial registration",
  bank_document: "Bank document",
  receipt: "Receipt",
  invoice: "Invoice",
  maintenance: "Maintenance",
  other: "Other",
};

function label(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export async function listDocuments(
  organisationId: string,
  filters: { q?: string; type?: string; category?: string } = {}
): Promise<LibraryDoc[]> {
  const supabase = await createClient();

  // Scope every per-entity table to this organisation by going through the
  // parent record, so nothing leaks across organisations even where the
  // document table has no organisation column of its own.
  const [
    { data: leaseDocs },
    { data: tenantDocs },
    { data: propertyDocs },
    { data: vendorDocs },
    { data: generic },
  ] = await Promise.all([
    supabase
      .from("lease_documents")
      .select("id, title, is_signed, created_at, leases!inner ( id, lease_code, organisation_id )")
      .eq("leases.organisation_id", organisationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_documents")
      .select("id, title, category, created_at, tenants!inner ( id, name, organisation_id )")
      .eq("tenants.organisation_id", organisationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("property_documents")
      .select("id, title, category, created_at, properties!inner ( id, name, organisation_id )")
      .eq("properties.organisation_id", organisationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("vendor_documents")
      .select("id, title, category, created_at, vendors!inner ( id, name, organisation_id )")
      .eq("vendors.organisation_id", organisationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, category, related_table, related_id, created_at")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false }),
  ]);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const rows: LibraryDoc[] = [
    ...(leaseDocs ?? []).map((d) => {
      const lease = one(d.leases);
      return {
        id: d.id,
        title: d.title,
        category: d.is_signed ? "Signed lease" : "Lease",
        attachedTo: lease?.lease_code ?? "—",
        attachedType: "Lease" as const,
        href: lease ? `/leases/${lease.id}` : null,
        created_at: d.created_at,
      };
    }),
    ...(tenantDocs ?? []).map((d) => {
      const tenant = one(d.tenants);
      return {
        id: d.id,
        title: d.title,
        category: label(d.category),
        attachedTo: tenant?.name ?? "—",
        attachedType: "Tenant" as const,
        href: tenant ? `/tenants/${tenant.id}` : null,
        created_at: d.created_at,
      };
    }),
    ...(propertyDocs ?? []).map((d) => {
      const property = one(d.properties);
      return {
        id: d.id,
        title: d.title,
        category: label(d.category),
        attachedTo: property?.name ?? "—",
        attachedType: "Property" as const,
        href: property ? `/properties/${property.id}` : null,
        created_at: d.created_at,
      };
    }),
    ...(vendorDocs ?? []).map((d) => {
      const vendor = one(d.vendors);
      return {
        id: d.id,
        title: d.title,
        category: label(d.category),
        attachedTo: vendor?.name ?? "—",
        attachedType: "Vendor" as const,
        href: vendor ? `/vendors/${vendor.id}` : null,
        created_at: d.created_at,
      };
    }),
    ...(generic ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      category: label(d.category),
      attachedTo: d.related_table
        ? d.related_table.replace(/_/g, " ").replace(/^./, (c: string) => c.toUpperCase())
        : "Nothing in particular",
      attachedType: "Other" as const,
      href: null,
      created_at: d.created_at,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const term = filters.q?.trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.type && r.attachedType !== filters.type) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (term && !`${r.title} ${r.attachedTo}`.toLowerCase().includes(term)) return false;
    return true;
  });
}
