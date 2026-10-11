import Link from "next/link";
import { Banknote, Hammer, Info, TriangleAlert, Users, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listParties } from "@/features/parties/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Whoever does the work, in-house or outsourced, on the same terms.
 *
 * "Providers" in the prototype. Called parties here because the point of
 * the screen is that an internal team and an external company are the
 * same kind of thing to the assignment flow.
 */
export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ fn?: string; kind?: string }>;
}) {
  const { fn, kind } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listParties(membership.organisationId);
  const rows = await listParties(membership.organisationId, { fn, kind });

  const internal = all.filter((p) => p.is_internal);
  const external = all.filter((p) => !p.is_internal);
  const noAgreement = external.filter((p) => !p.hasAgreement);
  const liveJobs = all.reduce((s, p) => s + p.openJobs, 0);

  return (
    <>
      <PageHeader
        title="People and providers"
        description="Whoever does the work, in-house or outsourced, appears here on the same terms."
      />

      <p className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-sky-200 bg-sky-50 px-4 py-3 text-[12.5px] leading-relaxed text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Internal and external work the same way.</span>{" "}
          A job is assigned to a party. An in-house team gets it in their queue
          and the cost is charged at your internal rate. An outside company gets
          a portal login and sends an invoice. Same assignment, same audit
          trail, different settlement.
        </span>
      </p>

      {noAgreement.length > 0 ? (
        <Link
          href="/parties?kind=external"
          className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900 transition-colors hover:border-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {noAgreement.length} outside {noAgreement.length === 1 ? "company has" : "companies have"} no agreement on file
        </Link>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="In-house"
          value={String(internal.length)}
          icon={Users}
          tone={internal.length > 0 ? "success" : "default"}
          sublabel="Teams on your own payroll"
        />
        <StatCard
          label="External"
          value={String(external.length)}
          icon={Hammer}
          sublabel="Companies with portal access"
        />
        <StatCard label="Live jobs" value={String(liveJobs)} icon={Wrench} sublabel="Not yet closed" />
        <StatCard
          label="Value this year"
          value={formatCurrency(all.reduce((s, p) => s + p.valueThisYear, 0))}
          icon={Banknote}
          sublabel="Invoiced, plus in-house work at cost"
        />
      </div>

      <FilterRow>
        <FilterChip href="/parties" count={all.length} active={!fn && !kind}>Everyone</FilterChip>
        <FilterChip href="/parties?fn=leasing" active={fn === "leasing"}>Leasing</FilterChip>
        <FilterChip href="/parties?fn=maintenance" active={fn === "maintenance"}>Maintenance</FilterChip>
        <FilterChip href="/parties?kind=internal" count={internal.length} active={kind === "internal"}>
          In-house
        </FilterChip>
        <FilterChip href="/parties?kind=external" count={external.length} active={kind === "external"}>
          External
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title={fn || kind ? "Nobody matches that" : "No parties yet"}
          description={
            fn || kind
              ? "Clear the filter to see everyone."
              : "Add the teams and companies who do the work, and jobs can be assigned to them."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Party</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Does</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">Jobs</TableHead>
              <TableHead className="text-right">This year</TableHead>
              <TableHead className="text-right">Owed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/parties/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                    {p.name}
                  </Link>
                  <span className="block text-xs text-neutral-500">
                    {p.is_internal
                      ? p.department_name ?? "No desk"
                      : p.cr_number
                        ? `CR ${p.cr_number}`
                        : p.phone ?? p.email ?? "No contact"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.is_internal ? "success" : "info"}>
                    {p.is_internal ? "In-house" : "External"}
                  </Badge>
                  {!p.is_internal && !p.hasAgreement ? (
                    <span className="block text-xs text-amber-700">No agreement</span>
                  ) : !p.is_internal && p.agreementExpiresOn ? (
                    <span className="block text-xs text-neutral-500">
                      to {formatDate(p.agreementExpiresOn)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {p.service_function === "both" ? "Leasing and maintenance" : p.service_function}
                  {p.trade ? <span className="block text-xs text-neutral-500">{p.trade}</span> : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.openJobs > 0 ? (
                    <span className="font-medium text-neutral-900">{p.openJobs}</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-neutral-600">{p.totalJobs}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.valueThisYear > 0 ? formatCurrency(p.valueThisYear) : <span className="text-neutral-400">—</span>}
                  {p.is_internal && p.internal_rate_qar != null ? (
                    <span className="block text-xs text-neutral-500">
                      at {formatCurrency(p.internal_rate_qar)}/hr
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.is_internal ? (
                    <span className="text-neutral-400">n/a</span>
                  ) : p.unpaidValue > 0 ? (
                    formatCurrency(p.unpaidValue)
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
