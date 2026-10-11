import { createClient } from "@/lib/supabase/server";

const OPEN_STATUSES = ["assigned", "scheduled", "in_progress", "waiting"];

export interface VendorListRow {
  id: string;
  name: string;
  trade: string | null;
  email: string | null;
  phone: string | null;
  cr_number: string | null;
  openJobs: number;
  totalJobs: number;
  unpaidInvoices: number;
  unpaidValue: number;
}

export interface VendorDetail {
  id: string;
  name: string;
  trade: string | null;
  email: string | null;
  phone: string | null;
  cr_number: string | null;
  notes: string | null;
  contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null }[];
  documents: { id: string; title: string; category: string; created_at: string }[];
  invoices: {
    id: string;
    invoice_number: string | null;
    amount: number;
    status: string;
    created_at: string;
    work_order_id: string | null;
  }[];
  jobs: {
    id: string;
    status: string;
    scheduled_at: string | null;
    actual_amount: number | null;
    request_code: string;
    property_name: string;
    unit_number: string;
  }[];
  stats: { openJobs: number; totalJobs: number; spend: number; unpaidValue: number };
}

/**
 * The vendor directory.
 *
 * Job and invoice counts are gathered in two batched queries rather than
 * one per vendor, so the page cost does not grow with the directory.
 */
export async function listVendors(
  organisationId: string,
  opts: { q?: string; trade?: string } = {}
): Promise<VendorListRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vendors")
    .select("id, name, trade, email, phone, cr_number")
    .eq("organisation_id", organisationId)
    .is("archived_at", null);

  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  if (opts.trade) query = query.eq("trade", opts.trade);

  const { data: vendors, error } = await query.order("name");
  if (error) throw error;

  const ids = (vendors ?? []).map((v) => v.id);
  if (ids.length === 0) return [];

  const [{ data: jobs }, { data: invoices }] = await Promise.all([
    supabase.from("work_orders").select("vendor_id, status").in("vendor_id", ids),
    supabase.from("vendor_invoices").select("vendor_id, amount, status").in("vendor_id", ids),
  ]);

  return (vendors ?? []).map((v) => {
    const mine = (jobs ?? []).filter((j) => j.vendor_id === v.id);
    const bills = (invoices ?? []).filter((i) => i.vendor_id === v.id && i.status !== "paid");
    return {
      ...v,
      openJobs: mine.filter((j) => OPEN_STATUSES.includes(j.status)).length,
      totalJobs: mine.length,
      unpaidInvoices: bills.length,
      unpaidValue: bills.reduce((sum, i) => sum + Number(i.amount ?? 0), 0),
    };
  });
}

export async function getVendor(
  organisationId: string,
  vendorId: string
): Promise<VendorDetail | null> {
  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, trade, email, phone, cr_number, notes")
    .eq("id", vendorId)
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .maybeSingle();

  if (!vendor) return null;

  const [{ data: contacts }, { data: documents }, { data: invoices }, { data: jobs }] =
    await Promise.all([
      supabase.from("vendor_contacts").select("id, name, role, email, phone").eq("vendor_id", vendorId),
      supabase
        .from("vendor_documents")
        .select("id, title, category, created_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("vendor_invoices")
        .select("id, invoice_number, amount, status, created_at, work_order_id")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("work_orders")
        .select(
          `id, status, scheduled_at, actual_amount,
           maintenance_requests ( request_code, properties ( name ), units ( unit_number ) )`
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
    ]);

  const jobRows = (jobs ?? []).map((wo) => {
    const req = Array.isArray(wo.maintenance_requests)
      ? wo.maintenance_requests[0]
      : wo.maintenance_requests;
    const property = req && "properties" in req
      ? (Array.isArray(req.properties) ? req.properties[0] : req.properties)
      : null;
    const unit = req && "units" in req
      ? (Array.isArray(req.units) ? req.units[0] : req.units)
      : null;
    return {
      id: wo.id,
      status: wo.status,
      scheduled_at: wo.scheduled_at,
      actual_amount: wo.actual_amount === null ? null : Number(wo.actual_amount),
      request_code: req?.request_code ?? "—",
      property_name: property?.name ?? "—",
      unit_number: unit?.unit_number ?? "—",
    };
  });

  const invoiceRows = (invoices ?? []).map((i) => ({ ...i, amount: Number(i.amount) }));

  return {
    ...vendor,
    contacts: contacts ?? [],
    documents: documents ?? [],
    invoices: invoiceRows,
    jobs: jobRows,
    stats: {
      openJobs: jobRows.filter((j) => OPEN_STATUSES.includes(j.status)).length,
      totalJobs: jobRows.length,
      // What the work actually cost, which is only known once invoiced.
      spend: jobRows.reduce((sum, j) => sum + (j.actual_amount ?? 0), 0),
      unpaidValue: invoiceRows
        .filter((i) => i.status !== "paid")
        .reduce((sum, i) => sum + i.amount, 0),
    },
  };
}

/** The trades present in this organisation, for the directory filter. */
export async function getVendorTrades(organisationId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("trade")
    .eq("organisation_id", organisationId)
    .is("archived_at", null);
  return Array.from(
    new Set((data ?? []).map((v) => v.trade).filter((t): t is string => !!t))
  ).sort();
}
