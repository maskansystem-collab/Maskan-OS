import { createClient } from "@/lib/supabase/server";

/**
 * People and providers — whoever does the work.
 *
 * An in-house team and an outside contractor are the same kind of record
 * here, because they are assigned work the same way: same assignment,
 * same audit trail. What differs is settlement. An internal party costs
 * an internal rate and has nothing to invoice; an external one gets a
 * portal login and sends an invoice.
 */

export interface PartyRow {
  id: string;
  name: string;
  trade: string | null;
  service_function: string;
  is_internal: boolean;
  internal_rate_qar: number | null;
  department_name: string | null;
  email: string | null;
  phone: string | null;
  cr_number: string | null;
  /** Jobs not yet closed. */
  openJobs: number;
  totalJobs: number;
  /** Cost of work this year: invoiced for external, rate-based for internal. */
  valueThisYear: number;
  unpaidValue: number;
  /** An external party with no agreement on file is working on nothing. */
  hasAgreement: boolean;
  agreementExpiresOn: string | null;
}

const OPEN_STATUSES = ["assigned", "scheduled", "in_progress", "waiting"] as const;

export async function listParties(
  organisationId: string,
  filters: { fn?: string; kind?: string } = {}
): Promise<PartyRow[]> {
  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select(
      `id, name, trade, service_function, is_internal, internal_rate_qar,
       email, phone, cr_number, department_id,
       departments ( name )`
    )
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("is_internal", { ascending: false })
    .order("name");

  if (!vendors || vendors.length === 0) return [];

  const ids = vendors.map((v) => v.id);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  // Three batched lookups for the whole directory, so cost does not scale
  // with the number of parties.
  const [{ data: jobs }, { data: invoices }, { data: agreements }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, vendor_id, status, actual_amount, created_at")
      .in("vendor_id", ids),
    supabase
      .from("vendor_invoices")
      .select("vendor_id, amount, status, created_at")
      .in("vendor_id", ids),
    supabase
      .from("vendor_agreements")
      .select("vendor_id, ends_on, starts_on")
      .in("vendor_id", ids)
      .order("starts_on", { ascending: false }),
  ]);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const agreementByVendor = new Map<string, { ends_on: string | null }>();
  for (const a of agreements ?? []) {
    if (!agreementByVendor.has(a.vendor_id)) agreementByVendor.set(a.vendor_id, { ends_on: a.ends_on });
  }

  const rows: PartyRow[] = vendors.map((v) => {
    const mine = (jobs ?? []).filter((j) => j.vendor_id === v.id);
    const myInvoices = (invoices ?? []).filter((i) => i.vendor_id === v.id);
    const agreement = agreementByVendor.get(v.id);

    return {
      id: v.id,
      name: v.name,
      trade: v.trade,
      service_function: v.service_function,
      is_internal: v.is_internal,
      internal_rate_qar: v.internal_rate_qar == null ? null : Number(v.internal_rate_qar),
      department_name: one(v.departments)?.name ?? null,
      email: v.email,
      phone: v.phone,
      cr_number: v.cr_number,
      openJobs: mine.filter((j) => (OPEN_STATUSES as readonly string[]).includes(j.status)).length,
      totalJobs: mine.length,
      // An internal team raises no invoices, so its cost is the work
      // itself. Showing zero would read as "this team costs nothing".
      valueThisYear: v.is_internal
        ? mine
            .filter((j) => j.created_at >= yearStart)
            .reduce((s, j) => s + Number(j.actual_amount ?? 0), 0)
        : myInvoices
            .filter((i) => i.created_at >= yearStart)
            .reduce((s, i) => s + Number(i.amount), 0),
      unpaidValue: v.is_internal
        ? 0
        : myInvoices
            .filter((i) => i.status === "submitted" || i.status === "approved")
            .reduce((s, i) => s + Number(i.amount), 0),
      hasAgreement: v.is_internal || !!agreement,
      agreementExpiresOn: agreement?.ends_on ?? null,
    };
  });

  return rows.filter((r) => {
    if (filters.fn && r.service_function !== filters.fn && r.service_function !== "both") return false;
    if (filters.kind === "internal" && !r.is_internal) return false;
    if (filters.kind === "external" && r.is_internal) return false;
    return true;
  });
}

export interface PartyAgreement {
  id: string;
  title: string;
  starts_on: string;
  ends_on: string | null;
  response_hours: number | null;
  callout_fee: number | null;
  hourly_rate: number | null;
  payment_terms_days: number;
  insurance_expires_on: string | null;
  licence_expires_on: string | null;
  notes: string | null;
  isCurrent: boolean;
}

/** The terms a party works under — the "vendor terms" screen. */
export async function listPartyAgreements(
  organisationId: string,
  vendorId: string
): Promise<PartyAgreement[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendor_agreements")
    .select(
      `id, title, starts_on, ends_on, response_hours, callout_fee, hourly_rate,
       payment_terms_days, insurance_expires_on, licence_expires_on, notes,
       vendors!inner ( organisation_id )`
    )
    .eq("vendor_id", vendorId)
    .eq("vendors.organisation_id", organisationId)
    .order("starts_on", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    starts_on: a.starts_on,
    ends_on: a.ends_on,
    response_hours: a.response_hours,
    callout_fee: a.callout_fee == null ? null : Number(a.callout_fee),
    hourly_rate: a.hourly_rate == null ? null : Number(a.hourly_rate),
    payment_terms_days: a.payment_terms_days,
    insurance_expires_on: a.insurance_expires_on,
    licence_expires_on: a.licence_expires_on,
    notes: a.notes,
    isCurrent: a.starts_on <= today && (!a.ends_on || a.ends_on >= today),
  }));
}
