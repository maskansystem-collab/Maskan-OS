import { createClient } from "@/lib/supabase/server";
import { REQUIREMENTS, type RequirementKey } from "@/features/compliance/queries";

/**
 * Move-ins: the stretch between an accepted offer and an active lease.
 *
 * The useful thing to know about a move-in is where it is stuck, so the
 * step and the blocker are stored. Everything else is read from the
 * records it points at — the unit, the tenant, the documents — so the
 * board cannot show a document as missing that was uploaded yesterday.
 */

export const STEPS = [
  { key: "unit", label: "Unit" },
  { key: "tenant", label: "Tenant" },
  { key: "terms", label: "Terms" },
  { key: "payment", label: "Payment" },
  { key: "documents", label: "Documents" },
  { key: "contract", label: "Contract" },
  { key: "activate", label: "Activate" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export interface MoveInRow {
  id: string;
  move_in_code: string;
  unitId: string;
  unit_number: string;
  property_name: string;
  tenantId: string | null;
  tenant_name: string | null;
  leaseId: string | null;
  step: StepKey;
  stepIndex: number;
  blocked_reason: string | null;
  proposed_rent: number | null;
  proposed_start: string | null;
  term_months: number | null
  deposit: number | null;
  payment_method: string | null;
  instalment_count: number | null;
  handled_by_name: string | null;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  /** Days this move-in has been open. */
  ageDays: number;
  /** Which of the registration documents are already on file. */
  documents: Record<RequirementKey, boolean>;
  documentsMissing: number;
}

const stepIndex = (key: string) => STEPS.findIndex((s) => s.key === key);

export async function listMoveIns(
  organisationId: string,
  filters: { step?: string; show?: string } = {}
): Promise<MoveInRow[]> {
  const supabase = await createClient();

  const { data: moveIns } = await supabase
    .from("move_ins")
    .select(
      `id, move_in_code, unit_id, tenant_id, lease_id, step, blocked_reason,
       proposed_rent, proposed_start, term_months, deposit, payment_method,
       instalment_count, notes, started_at, completed_at, handled_by,
       units!inner ( unit_number, property_id, properties!inner ( name ) ),
       tenants ( name )`
    )
    .eq("organisation_id", organisationId)
    .order("started_at", { ascending: false });

  if (!moveIns || moveIns.length === 0) return [];

  const tenantIds = moveIns.map((m) => m.tenant_id).filter((x): x is string => !!x);
  const memberIds = moveIns.map((m) => m.handled_by).filter((x): x is string => !!x);
  const propertyIds = [
    ...new Set(
      moveIns
        .map((m) => (Array.isArray(m.units) ? m.units[0] : m.units)?.property_id)
        .filter((x): x is string => !!x)
    ),
  ];

  // Document readiness, read from where the documents actually live.
  const [{ data: tenantDocs }, { data: propertyDocs }, { data: members }] = await Promise.all([
    tenantIds.length
      ? supabase
          .from("tenant_documents")
          .select("tenant_id, category")
          .in("tenant_id", tenantIds)
          .in("category", ["qid", "passport"])
      : Promise.resolve({ data: [] as { tenant_id: string; category: string }[] }),
    propertyIds.length
      ? supabase.from("property_documents").select("property_id").in("property_id", propertyIds)
      : Promise.resolve({ data: [] as { property_id: string }[] }),
    memberIds.length
      ? supabase
          .from("organisation_members")
          .select("id, profiles!inner ( full_name )")
          .in("id", memberIds)
      : Promise.resolve({ data: [] }),
  ]);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const hasQid = new Set(
    (tenantDocs ?? []).filter((d) => d.category === "qid").map((d) => d.tenant_id)
  );
  const hasPassport = new Set(
    (tenantDocs ?? []).filter((d) => d.category === "passport").map((d) => d.tenant_id)
  );
  const hasPropertyDocs = new Set((propertyDocs ?? []).map((d) => d.property_id));
  const handlerName = new Map(
    (members ?? []).map((m) => [m.id, one(m.profiles)?.full_name ?? null])
  );

  const rows: MoveInRow[] = moveIns.map((m) => {
    const unit = one(m.units);
    const property = unit ? one(unit.properties) : null;
    const documents: Record<RequirementKey, boolean> = {
      tenant_qid: !!m.tenant_id && hasQid.has(m.tenant_id),
      tenant_passport: !!m.tenant_id && hasPassport.has(m.tenant_id),
      // A signed lease cannot exist before the lease does.
      signed_lease: !!m.lease_id,
      owner_documents: false,
      property_documents: !!unit?.property_id && hasPropertyDocs.has(unit.property_id),
    };

    return {
      id: m.id,
      move_in_code: m.move_in_code,
      unitId: m.unit_id,
      unit_number: unit?.unit_number ?? "—",
      property_name: property?.name ?? "—",
      tenantId: m.tenant_id,
      tenant_name: one(m.tenants)?.name ?? null,
      leaseId: m.lease_id,
      step: m.step as StepKey,
      stepIndex: stepIndex(m.step),
      blocked_reason: m.blocked_reason,
      proposed_rent: m.proposed_rent == null ? null : Number(m.proposed_rent),
      proposed_start: m.proposed_start,
      term_months: m.term_months,
      deposit: m.deposit == null ? null : Number(m.deposit),
      payment_method: m.payment_method,
      instalment_count: m.instalment_count,
      handled_by_name: m.handled_by ? (handlerName.get(m.handled_by) ?? null) : null,
      notes: m.notes,
      started_at: m.started_at,
      completed_at: m.completed_at,
      ageDays: Math.max(
        0,
        Math.floor((Date.now() - new Date(m.started_at).getTime()) / 86_400_000)
      ),
      documents,
      documentsMissing: Object.values(documents).filter((v) => !v).length,
    };
  });

  return rows.filter((r) => {
    if (filters.show === "open" && r.completed_at) return false;
    if (filters.show === "done" && !r.completed_at) return false;
    if (filters.show === "blocked" && (!r.blocked_reason || r.completed_at)) return false;
    if (filters.step && r.step !== filters.step) return false;
    return true;
  });
}

/** The document labels, shared with the compliance screen so they match. */
export const DOCUMENT_LABELS = REQUIREMENTS;
