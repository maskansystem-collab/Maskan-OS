import Link from "next/link";
import { Check, DoorOpen, FileText, TriangleAlert, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listMoveIns, STEPS, DOCUMENT_LABELS } from "@/features/moveins/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Every move-in in flight, and where each one is stuck.
 *
 * The prototype's two screens in one: the board and the tracker show the
 * same rows, and splitting them would mean two places to look for the
 * same question.
 */
export default async function MoveInsPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; show?: string }>;
}) {
  const { step, show } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listMoveIns(membership.organisationId);
  const rows = await listMoveIns(membership.organisationId, { step, show: show ?? "open" });

  const open = all.filter((m) => !m.completed_at);
  const blocked = open.filter((m) => m.blocked_reason);
  const stalled = open.filter((m) => m.ageDays >= 14);
  const atStep = (key: string) => open.filter((m) => m.step === key).length;

  return (
    <>
      <PageHeader
        title="Move-ins"
        description="Between an accepted offer and an active lease. What is left, and what is holding each one up."
      />

      {blocked.length > 0 ? (
        <Link
          href="/move-ins?show=blocked"
          className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900 transition-colors hover:border-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {blocked.length} move-in{blocked.length === 1 ? "" : "s"} blocked on somebody else
        </Link>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="In flight"
          value={String(open.length)}
          icon={DoorOpen}
          sublabel={`${all.length - open.length} completed`}
        />
        <StatCard
          label="Blocked"
          value={String(blocked.length)}
          tone={blocked.length > 0 ? "warning" : "default"}
          sublabel="Waiting on someone"
        />
        <StatCard
          label="Open two weeks or more"
          value={String(stalled.length)}
          tone={stalled.length > 0 ? "danger" : "default"}
          icon={Users}
          sublabel="Worth a chase"
        />
        <StatCard
          label="Ready to activate"
          value={String(atStep("activate"))}
          tone={atStep("activate") > 0 ? "success" : "default"}
          icon={Check}
          sublabel="Everything else is done"
        />
      </div>

      {/* The step bar doubles as the filter: where the work sits is the
          first thing you want, and clicking a stage is the second. */}
      <div className="mb-5 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((s) => {
          const n = atStep(s.key);
          const active = step === s.key;
          return (
            <Link
              key={s.key}
              href={active ? "/move-ins" : `/move-ins?step=${s.key}`}
              className={
                active
                  ? "rounded-[10px] border border-neutral-900 bg-neutral-900 px-3 py-2.5 text-paper"
                  : "rounded-[10px] border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-neutral-300"
              }
            >
              <p className={active ? "text-[11px] font-medium text-paper/70" : "text-[11px] font-medium text-neutral-500"}>
                {s.label}
              </p>
              <p className={active ? "text-[17px] font-bold tabular-nums" : "text-[17px] font-bold tabular-nums text-neutral-900"}>
                {n}
              </p>
            </Link>
          );
        })}
      </div>

      <FilterRow>
        <FilterChip href="/move-ins" count={open.length} active={!show || show === "open"}>
          In flight
        </FilterChip>
        <FilterChip href="/move-ins?show=blocked" count={blocked.length} active={show === "blocked"}>
          Blocked
        </FilterChip>
        <FilterChip
          href="/move-ins?show=done"
          count={all.length - open.length}
          active={show === "done"}
        >
          Completed
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title={step || show ? "Nothing at that stage" : "No move-ins in flight"}
          description={
            step || show
              ? "Clear the filter to see everything open."
              : "A move-in starts when an offer is accepted and ends when the lease goes active."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Holding it up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <span className="font-medium text-neutral-900">{m.move_in_code}</span>
                  <span className="block text-xs text-neutral-500">
                    {m.ageDays === 0 ? "Started today" : `${m.ageDays} days open`}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-600">
                  <Link href={`/units/${m.unitId}`} className="hover:underline">
                    {m.unit_number}
                  </Link>
                  <span className="block text-xs text-neutral-500">{m.property_name}</span>
                </TableCell>
                <TableCell className="text-neutral-600">
                  {m.tenantId && m.tenant_name ? (
                    <Link href={`/tenants/${m.tenantId}`} className="hover:underline">
                      {m.tenant_name}
                    </Link>
                  ) : (
                    <span className="text-neutral-400">Not yet on the books</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-[13px] font-medium text-neutral-900">
                    {STEPS[m.stepIndex]?.label ?? m.step}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {m.stepIndex + 1} of {STEPS.length}
                  </span>
                </TableCell>
                <TableCell>
                  {m.documentsMissing === 0 ? (
                    <span className="text-emerald-700">All on file</span>
                  ) : (
                    <span className="text-amber-700">
                      {m.documentsMissing} of {DOCUMENT_LABELS.length} missing
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.proposed_rent != null ? formatCurrency(m.proposed_rent) : "—"}
                  {m.instalment_count ? (
                    <span className="block text-xs text-neutral-500">
                      {m.instalment_count} instalments
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {m.proposed_start ? formatDate(m.proposed_start) : "—"}
                </TableCell>
                <TableCell>
                  {m.blocked_reason ? (
                    <span className="text-[12.5px] text-amber-800">{m.blocked_reason}</span>
                  ) : m.completed_at ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Done
                    </span>
                  ) : (
                    <span className="text-neutral-400">Nothing</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="mt-5 flex items-start gap-2 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        Document readiness is read from the tenant and property records, not
        kept here, so a file uploaded anywhere in the product shows up on this
        board immediately.
      </p>
    </>
  );
}
