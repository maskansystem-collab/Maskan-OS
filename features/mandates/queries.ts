import { createClient } from "@/lib/supabase/server";

/**
 * Mandates and third-party undertakings.
 *
 * A mandate is the owner's written appointment of the firm; an undertaking
 * records that somebody other than the tenant settles a charge. Both are
 * stored by 0018.
 *
 * Neither the expiring band nor the cheque-name mismatch is stored. They
 * are worked out here from the dates and from the tenant on the lease, so
 * they cannot drift away from the records they describe.
 */

/** A mandate inside 30 days of its end date needs chasing. */
const EXPIRING_WINDOW_DAYS = 30;

export type MandateBand = "draft" | "active" | "expiring" | "expired" | "terminated";

export interface MandateRow {
  id: string;
  mandate_code: string;
  owner_id: string;
  owner_name: string;
  mandate_type: string;
  is_exclusive: boolean;
  starts_on: string;
  ends_on: string;
  notice_days: number;
  status: string;
  band: MandateBand;
  daysLeft: number;
  authority: {
    may_sign_lease: boolean;
    may_accept_offers: boolean;
    may_hold_deposit: boolean;
    may_register_lease: boolean;
    maintenance_spend_cap: number;
  };
  properties: { id: string; name: string }[];
  units: number;
}

export const APPOINTMENT_LABELS: Record<string, string> = {
  letting_only: "Letting only",
  management_only: "Management only",
  letting_and_management: "Letting and management",
};

/** What each authority flag means, in the owner's language. */
export const AUTHORITY_LABELS: { key: string; label: string }[] = [
  { key: "may_sign_lease", label: "Sign a tenancy on the owner's behalf" },
  { key: "may_accept_offers", label: "Accept an offer without asking" },
  { key: "may_hold_deposit", label: "Hold the security deposit" },
  { key: "may_register_lease", label: "Register the lease" },
  { key: "maintenance_spend_cap", label: "Approve repairs up to a cap" },
];

const daysBetween = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

function bandFor(status: string, endsOn: string): MandateBand {
  if (status === "draft") return "draft";
  if (status === "terminated") return "terminated";
  const left = daysBetween(endsOn);
  if (left < 0) return "expired";
  return left <= EXPIRING_WINDOW_DAYS ? "expiring" : "active";
}

export async function listMandates(
  organisationId: string,
  filters: { band?: string } = {}
): Promise<MandateRow[]> {
  const supabase = await createClient();

  const { data: mandates } = await supabase
    .from("mandates")
    .select(
      `id, mandate_code, owner_id, mandate_type, is_exclusive, starts_on, ends_on,
       notice_days, status, may_sign_lease, may_accept_offers, may_hold_deposit,
       may_register_lease, maintenance_spend_cap,
       owners!inner ( id, name )`
    )
    .eq("organisation_id", organisationId)
    .order("ends_on");

  if (!mandates || mandates.length === 0) return [];

  const mandateIds = mandates.map((m) => m.id);

  // Which properties each mandate covers, and how many units those hold —
  // two queries for the whole list rather than two per mandate.
  const { data: links } = await supabase
    .from("mandate_properties")
    .select("mandate_id, property_id, properties!inner ( id, name )")
    .in("mandate_id", mandateIds);

  const propertyIds = [...new Set((links ?? []).map((l) => l.property_id))];
  const { data: units } = propertyIds.length
    ? await supabase
        .from("units")
        .select("property_id")
        .in("property_id", propertyIds)
        .is("archived_at", null)
    : { data: [] as { property_id: string }[] };

  const unitsPerProperty = new Map<string, number>();
  for (const u of units ?? []) {
    unitsPerProperty.set(u.property_id, (unitsPerProperty.get(u.property_id) ?? 0) + 1);
  }

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const rows: MandateRow[] = mandates.map((m) => {
    const mine = (links ?? []).filter((l) => l.mandate_id === m.id);
    const owner = one(m.owners);
    return {
      id: m.id,
      mandate_code: m.mandate_code,
      owner_id: m.owner_id,
      owner_name: owner?.name ?? "—",
      mandate_type: m.mandate_type,
      is_exclusive: m.is_exclusive,
      starts_on: m.starts_on,
      ends_on: m.ends_on,
      notice_days: m.notice_days,
      status: m.status,
      band: bandFor(m.status, m.ends_on),
      daysLeft: daysBetween(m.ends_on),
      authority: {
        may_sign_lease: m.may_sign_lease,
        may_accept_offers: m.may_accept_offers,
        may_hold_deposit: m.may_hold_deposit,
        may_register_lease: m.may_register_lease,
        maintenance_spend_cap: Number(m.maintenance_spend_cap),
      },
      properties: mine
        .map((l) => one(l.properties))
        .filter((p): p is { id: string; name: string } => !!p),
      units: mine.reduce((sum, l) => sum + (unitsPerProperty.get(l.property_id) ?? 0), 0),
    };
  });

  return filters.band ? rows.filter((r) => r.band === filters.band) : rows;
}

export interface MandateDetail extends MandateRow {
  management_fee_pct: number | null;
  letting_fee_months: number | null;
  renewal_fee_months: number | null;
  notes: string | null;
  contract: { id: string; title: string } | null;
  /** The fee rows that apply to this owner or their properties. */
  fees: {
    id: string;
    fee_type: string;
    fee_value: number;
    effective_from: string;
    effective_to: string | null;
    scope: string;
  }[];
}

export async function getMandate(
  organisationId: string,
  mandateId: string
): Promise<MandateDetail | null> {
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("mandates")
    .select(
      `id, mandate_code, owner_id, mandate_type, is_exclusive, starts_on, ends_on,
       notice_days, status, may_sign_lease, may_accept_offers, may_hold_deposit,
       may_register_lease, maintenance_spend_cap, management_fee_pct,
       letting_fee_months, renewal_fee_months, notes, contract_document_id,
       owners!inner ( id, name )`
    )
    .eq("organisation_id", organisationId)
    .eq("id", mandateId)
    .maybeSingle();

  if (!m) return null;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const { data: links } = await supabase
    .from("mandate_properties")
    .select("property_id, properties!inner ( id, name )")
    .eq("mandate_id", mandateId);

  const propertyIds = (links ?? []).map((l) => l.property_id);

  const [{ data: units }, { data: fees }, { data: contract }] = await Promise.all([
    propertyIds.length
      ? supabase.from("units").select("id").in("property_id", propertyIds).is("archived_at", null)
      : Promise.resolve({ data: [] as { id: string }[] }),
    supabase
      .from("management_fees")
      .select(
        `id, fee_type, fee_value, effective_from, effective_to, property_id, owner_id,
         properties ( name ), owners ( name )`
      )
      .eq("organisation_id", organisationId)
      .order("effective_from", { ascending: false }),
    m.contract_document_id
      ? supabase
          .from("documents")
          .select("id, title")
          .eq("id", m.contract_document_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const owner = one(m.owners);

  // Only the fees that could actually be charged against this owner: their
  // own overrides, overrides on the properties this mandate covers, and the
  // house rate that applies when neither is set.
  const relevant = (fees ?? []).filter(
    (f) =>
      f.owner_id === m.owner_id ||
      (f.property_id && propertyIds.includes(f.property_id)) ||
      (!f.owner_id && !f.property_id)
  );

  return {
    id: m.id,
    mandate_code: m.mandate_code,
    owner_id: m.owner_id,
    owner_name: owner?.name ?? "—",
    mandate_type: m.mandate_type,
    is_exclusive: m.is_exclusive,
    starts_on: m.starts_on,
    ends_on: m.ends_on,
    notice_days: m.notice_days,
    status: m.status,
    band: bandFor(m.status, m.ends_on),
    daysLeft: daysBetween(m.ends_on),
    authority: {
      may_sign_lease: m.may_sign_lease,
      may_accept_offers: m.may_accept_offers,
      may_hold_deposit: m.may_hold_deposit,
      may_register_lease: m.may_register_lease,
      maintenance_spend_cap: Number(m.maintenance_spend_cap),
    },
    properties: (links ?? [])
      .map((l) => one(l.properties))
      .filter((p): p is { id: string; name: string } => !!p),
    units: (units ?? []).length,
    management_fee_pct: m.management_fee_pct == null ? null : Number(m.management_fee_pct),
    letting_fee_months: m.letting_fee_months == null ? null : Number(m.letting_fee_months),
    renewal_fee_months: m.renewal_fee_months == null ? null : Number(m.renewal_fee_months),
    notes: m.notes,
    contract: contract ?? null,
    fees: relevant.map((f) => ({
      id: f.id,
      fee_type: f.fee_type,
      fee_value: Number(f.fee_value),
      effective_from: f.effective_from,
      effective_to: f.effective_to,
      scope:
        one(f.owners)?.name ??
        one(f.properties)?.name ??
        "All owners and properties",
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Undertakings                                                        */
/* ------------------------------------------------------------------ */

export type UndertakingBand = "draft" | "active" | "expiring" | "lapsed" | "revoked";

export interface UndertakingRow {
  id: string;
  undertaking_code: string;
  lease_id: string;
  lease_code: string;
  tenant_name: string;
  unit_number: string;
  property_name: string;
  payer_name: string;
  payer_cr_number: string | null;
  covers: string;
  cap_amount: number | null;
  cap_period: string;
  settlement: string;
  letter_signed_on: string | null;
  letter_expires_on: string | null;
  contract_party_name: string | null;
  cheque_payer_name: string | null;
  status: string;
  band: UndertakingBand;
  daysLeft: number | null;
  /** True when the cheques are drawn in a name that is not the tenant's. */
  chequeNameMismatch: boolean;
}

export const COVER_LABELS: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  rent_and_utilities: "Rent and utilities",
  part_of_rent: "Part of the rent",
};

export const SETTLEMENT_LABELS: Record<string, string> = {
  employer_invoiced: "Invoiced to the payer",
  employer_direct: "Paid directly by the payer",
  tenant_reimbursed: "Tenant pays, then is reimbursed",
};

export const CAP_PERIOD_LABELS: Record<string, string> = {
  month: "a month",
  quarter: "a quarter",
  year: "a year",
  contract: "over the contract",
};

/** A letter inside 60 days of expiry is worth chasing: liability reverts. */
const LETTER_WARNING_DAYS = 60;

function undertakingBand(status: string, expires: string | null): UndertakingBand {
  if (status === "draft") return "draft";
  if (status === "revoked") return "revoked";
  if (!expires) return "active";
  const left = daysBetween(expires);
  if (left < 0) return "lapsed";
  return left <= LETTER_WARNING_DAYS ? "expiring" : "active";
}

export async function listUndertakings(
  organisationId: string,
  filters: { band?: string } = {}
): Promise<UndertakingRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("undertakings")
    .select(
      `id, undertaking_code, lease_id, payer_name, payer_cr_number, covers,
       cap_amount, cap_period, settlement, letter_signed_on, letter_expires_on,
       contract_party_name, cheque_payer_name, status,
       leases!inner ( lease_code, tenants!inner ( name ), units!inner ( unit_number ),
                      properties!inner ( name ) )`
    )
    .eq("organisation_id", organisationId)
    .order("letter_expires_on", { nullsFirst: false });

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const rows: UndertakingRow[] = (data ?? []).map((u) => {
    const lease = one(u.leases);
    const tenantName = one(lease?.tenants ?? null)?.name ?? "—";
    return {
      id: u.id,
      undertaking_code: u.undertaking_code,
      lease_id: u.lease_id,
      lease_code: lease?.lease_code ?? "—",
      tenant_name: tenantName,
      unit_number: one(lease?.units ?? null)?.unit_number ?? "—",
      property_name: one(lease?.properties ?? null)?.name ?? "—",
      payer_name: u.payer_name,
      payer_cr_number: u.payer_cr_number,
      covers: u.covers,
      cap_amount: u.cap_amount == null ? null : Number(u.cap_amount),
      cap_period: u.cap_period,
      settlement: u.settlement,
      letter_signed_on: u.letter_signed_on,
      letter_expires_on: u.letter_expires_on,
      contract_party_name: u.contract_party_name,
      cheque_payer_name: u.cheque_payer_name,
      status: u.status,
      band: undertakingBand(u.status, u.letter_expires_on),
      daysLeft: u.letter_expires_on ? daysBetween(u.letter_expires_on) : null,
      // Derived, never stored: the warning cannot disagree with the lease.
      chequeNameMismatch: !!u.cheque_payer_name && u.cheque_payer_name !== tenantName,
    };
  });

  return filters.band ? rows.filter((r) => r.band === filters.band) : rows;
}

export interface UndertakingDetail extends UndertakingRow {
  payer_contact_name: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  notes: string | null;
  letter: { id: string; title: string } | null;
  lease: { monthly_rent: number; start_date: string; end_date: string; status: string } | null;
}

export async function getUndertaking(
  organisationId: string,
  undertakingId: string
): Promise<UndertakingDetail | null> {
  const supabase = await createClient();

  const { data: u } = await supabase
    .from("undertakings")
    .select(
      `id, undertaking_code, lease_id, payer_name, payer_cr_number, payer_contact_name,
       payer_email, payer_phone, covers, cap_amount, cap_period, settlement,
       letter_signed_on, letter_expires_on, letter_document_id, contract_party_name,
       cheque_payer_name, status, notes,
       leases!inner ( lease_code, monthly_rent, start_date, end_date, status,
                      tenants!inner ( name ), units!inner ( unit_number ),
                      properties!inner ( name ) )`
    )
    .eq("organisation_id", organisationId)
    .eq("id", undertakingId)
    .maybeSingle();

  if (!u) return null;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const lease = one(u.leases);
  const tenantName = one(lease?.tenants ?? null)?.name ?? "—";

  const { data: letter } = u.letter_document_id
    ? await supabase.from("documents").select("id, title").eq("id", u.letter_document_id).maybeSingle()
    : { data: null };

  return {
    id: u.id,
    undertaking_code: u.undertaking_code,
    lease_id: u.lease_id,
    lease_code: lease?.lease_code ?? "—",
    tenant_name: tenantName,
    unit_number: one(lease?.units ?? null)?.unit_number ?? "—",
    property_name: one(lease?.properties ?? null)?.name ?? "—",
    payer_name: u.payer_name,
    payer_cr_number: u.payer_cr_number,
    payer_contact_name: u.payer_contact_name,
    payer_email: u.payer_email,
    payer_phone: u.payer_phone,
    covers: u.covers,
    cap_amount: u.cap_amount == null ? null : Number(u.cap_amount),
    cap_period: u.cap_period,
    settlement: u.settlement,
    letter_signed_on: u.letter_signed_on,
    letter_expires_on: u.letter_expires_on,
    contract_party_name: u.contract_party_name,
    cheque_payer_name: u.cheque_payer_name,
    status: u.status,
    notes: u.notes,
    band: undertakingBand(u.status, u.letter_expires_on),
    daysLeft: u.letter_expires_on ? daysBetween(u.letter_expires_on) : null,
    chequeNameMismatch: !!u.cheque_payer_name && u.cheque_payer_name !== tenantName,
    letter: letter ?? null,
    lease: lease
      ? {
          monthly_rent: Number(lease.monthly_rent),
          start_date: lease.start_date,
          end_date: lease.end_date,
          status: lease.status,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Owner portal                                                        */
/* ------------------------------------------------------------------ */

export interface OwnerAuthority {
  key: string;
  label: string;
  granted: boolean;
  /** What it means for the owner, in their terms. */
  detail: string;
}

export interface OwnerMandateView extends MandateDetail {
  authorities: OwnerAuthority[];
}

/**
 * The mandate as the owner sees it.
 *
 * Same record, different voice: an owner wants to know what happens
 * without them and what waits for them, not which boolean is set.
 */
export async function getOwnerMandate(ownerId: string): Promise<OwnerMandateView | null> {
  const supabase = await createClient();

  // The owner's own RLS policy scopes this to their mandate, so no
  // organisation argument is needed or wanted here.
  const { data: row } = await supabase
    .from("mandates")
    .select("id, organisation_id")
    .eq("owner_id", ownerId)
    .neq("status", "draft")
    .order("ends_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  const m = await getMandate(row.organisation_id, row.id);
  if (!m) return null;

  const cap = m.authority.maintenance_spend_cap;

  return {
    ...m,
    authorities: [
      {
        key: "may_sign_lease",
        label: "Sign a tenancy on your behalf",
        granted: m.authority.may_sign_lease,
        detail: m.authority.may_sign_lease
          ? "At the asking rent. Anything below it comes back to you."
          : "Every tenancy is signed by you.",
      },
      {
        key: "may_accept_offers",
        label: "Accept an offer without asking",
        granted: m.authority.may_accept_offers,
        detail: m.authority.may_accept_offers
          ? "Offers at or above the asking rent are accepted on your behalf."
          : "Every offer is put to you, whatever the amount.",
      },
      {
        key: "may_hold_deposit",
        label: "Hold the security deposit",
        granted: m.authority.may_hold_deposit,
        detail: m.authority.may_hold_deposit
          ? "Held in the client account and returned at the end of the tenancy."
          : "The deposit is held by you, not by us.",
      },
      {
        key: "may_register_lease",
        label: "Register the lease",
        granted: m.authority.may_register_lease,
        detail: m.authority.may_register_lease
          ? "Done within the statutory window after signing."
          : "Registration is handled by you.",
      },
      {
        key: "maintenance_spend_cap",
        label: cap > 0 ? `Approve repairs up to ${cap.toLocaleString("en-QA")} QAR` : "Approve repairs",
        granted: cap > 0,
        detail: cap > 0
          ? "Anything above that waits for you, however urgent."
          : "Every repair waits for your approval, however urgent.",
      },
    ],
  };
}
