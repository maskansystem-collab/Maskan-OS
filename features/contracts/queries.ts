import { createClient } from "@/lib/supabase/server";

/**
 * Contracts and their signatures.
 *
 * A contract's status is stored, but how many signatures are outstanding
 * is not: that is counted from the party rows, so the count cannot fall
 * out of step with who has actually signed.
 */

export interface ContractParty {
  id: string;
  party_role: string;
  party_name: string;
  method: string | null;
  signed_at: string | null;
  signed_ip: string | null;
}

export interface ContractRow {
  id: string;
  contract_code: string;
  subject: string;
  templateName: string | null;
  locale: string;
  page_count: number | null;
  status: string;
  created_at: string;
  leaseId: string | null;
  leaseCode: string | null;
  mandateId: string | null;
  mandateCode: string | null;
  parties: ContractParty[];
  signed: number;
  outstanding: number;
}

export async function listContracts(
  organisationId: string,
  filters: { status?: string; q?: string } = {}
): Promise<ContractRow[]> {
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select(
      `id, contract_code, subject, locale, page_count, status, created_at,
       lease_id, mandate_id,
       document_templates ( name ),
       leases ( lease_code ),
       mandates ( mandate_code )`
    )
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (!contracts || contracts.length === 0) return [];

  const { data: parties } = await supabase
    .from("contract_parties")
    .select("id, contract_id, party_role, party_name, method, signed_at, signed_ip")
    .in("contract_id", contracts.map((c) => c.id))
    .order("sort_order");

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const rows: ContractRow[] = contracts.map((c) => {
    const mine = (parties ?? []).filter((p) => p.contract_id === c.id);
    const signed = mine.filter((p) => p.signed_at).length;
    return {
      id: c.id,
      contract_code: c.contract_code,
      subject: c.subject,
      templateName: one(c.document_templates)?.name ?? null,
      locale: c.locale,
      page_count: c.page_count,
      status: c.status,
      created_at: c.created_at,
      leaseId: c.lease_id,
      leaseCode: one(c.leases)?.lease_code ?? null,
      mandateId: c.mandate_id,
      mandateCode: one(c.mandates)?.mandate_code ?? null,
      parties: mine.map((p) => ({
        id: p.id,
        party_role: p.party_role,
        party_name: p.party_name,
        method: p.method,
        signed_at: p.signed_at,
        signed_ip: p.signed_ip,
      })),
      signed,
      outstanding: mine.length - signed,
    };
  });

  const term = filters.q?.trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (term) {
      const hay = `${r.contract_code} ${r.subject} ${r.templateName ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

export interface ContractDetail extends ContractRow {
  storage_path: string | null;
  voided_reason: string | null;
  /** The placeholders the template expects, so a gap is visible. */
  templateVariables: string[];
}

export async function getContract(
  organisationId: string,
  contractId: string
): Promise<ContractDetail | null> {
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("contracts")
    .select(
      `id, contract_code, subject, locale, page_count, status, created_at,
       storage_path, voided_reason, lease_id, mandate_id, template_id,
       document_templates ( name, body_html ),
       leases ( lease_code ),
       mandates ( mandate_code )`
    )
    .eq("organisation_id", organisationId)
    .eq("id", contractId)
    .maybeSingle();

  if (!c) return null;

  const { data: parties } = await supabase
    .from("contract_parties")
    .select("id, party_role, party_name, method, signed_at, signed_ip")
    .eq("contract_id", contractId)
    .order("sort_order");

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const template = one(c.document_templates);
  const rows = parties ?? [];
  const signed = rows.filter((p) => p.signed_at).length;

  return {
    id: c.id,
    contract_code: c.contract_code,
    subject: c.subject,
    templateName: template?.name ?? null,
    locale: c.locale,
    page_count: c.page_count,
    status: c.status,
    created_at: c.created_at,
    storage_path: c.storage_path,
    voided_reason: c.voided_reason,
    leaseId: c.lease_id,
    leaseCode: one(c.leases)?.lease_code ?? null,
    mandateId: c.mandate_id,
    mandateCode: one(c.mandates)?.mandate_code ?? null,
    parties: rows.map((p) => ({
      id: p.id,
      party_role: p.party_role,
      party_name: p.party_name,
      method: p.method,
      signed_at: p.signed_at,
      signed_ip: p.signed_ip,
    })),
    signed,
    outstanding: rows.length - signed,
    templateVariables: template?.body_html
      ? Array.from(
          new Set(
            Array.from(template.body_html.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)).map((m) => m[1])
          )
        ).sort()
      : [],
  };
}

export const SIGNATURE_METHOD_LABELS: Record<string, string> = {
  e_signature: "E-signature",
  wet_signature: "Wet signature",
};
