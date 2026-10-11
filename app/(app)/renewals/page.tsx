import Link from "next/link";
import { CalendarClock, Check, Send, TriangleAlert, X } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listRenewals } from "@/features/renewals/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Leases coming up for renewal, and what has been put to each tenant.
 *
 * Nothing here is stored: it is leases and their renewal offers read
 * together, so the pipeline cannot disagree with either.
 */
export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string }>;
}) {
  const { band } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listRenewals(membership.organisationId);
  const rows = band ? all.filter((r) => r.band === band) : all;

  const count = (b: string) => all.filter((r) => r.band === b).length;
  const urgent = all.filter((r) => r.band === "needs_offer" && r.daysLeft <= 60);

  return (
    <>
      <PageHeader
        title="Renewals"
        description="Leases ending within three months, and what has been put to each tenant."
      />

      {urgent.length > 0 ? (
        <Link
          href="/renewals?band=needs_offer"
          className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900 transition-colors hover:border-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {urgent.length} lease{urgent.length === 1 ? "" : "s"} end within 60 days with no offer sent
        </Link>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Need an offer"
          value={String(count("needs_offer"))}
          icon={CalendarClock}
          tone={count("needs_offer") > 0 ? "warning" : "default"}
          sublabel="Nothing sent yet"
        />
        <StatCard
          label="Offer out"
          value={String(count("offer_out"))}
          icon={Send}
          sublabel="Waiting on the tenant"
        />
        <StatCard
          label="Accepted"
          value={String(count("accepted"))}
          icon={Check}
          tone={count("accepted") > 0 ? "success" : "default"}
        />
        <StatCard
          label="Lost"
          value={String(count("declined") + count("lapsed"))}
          icon={X}
          tone={count("declined") + count("lapsed") > 0 ? "danger" : "default"}
          sublabel={`${count("declined")} declined · ${count("lapsed")} lapsed`}
        />
      </div>

      <FilterRow>
        <FilterChip href="/renewals" count={all.length} active={!band}>All</FilterChip>
        <FilterChip href="/renewals?band=needs_offer" count={count("needs_offer")} active={band === "needs_offer"}>
          Need an offer
        </FilterChip>
        <FilterChip href="/renewals?band=offer_out" count={count("offer_out")} active={band === "offer_out"}>
          Offer out
        </FilterChip>
        <FilterChip href="/renewals?band=accepted" count={count("accepted")} active={band === "accepted"}>
          Accepted
        </FilterChip>
        <FilterChip href="/renewals?band=declined" count={count("declined")} active={band === "declined"}>
          Declined
        </FilterChip>
        <FilterChip href="/renewals?band=lapsed" count={count("lapsed")} active={band === "lapsed"}>
          Lapsed
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={band ? "Nothing in that state" : "No renewals due"}
          description={
            band
              ? "Clear the filter to see every lease in the window."
              : "Leases appear here when they are within three months of their end date."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lease</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead className="text-right">Current rent</TableHead>
              <TableHead className="text-right">Offered</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.leaseId}>
                <TableCell>
                  <Link href={`/leases/${r.leaseId}`} className="font-medium text-neutral-900 hover:underline">
                    {r.lease_code}
                  </Link>
                </TableCell>
                <TableCell className="text-neutral-600">{r.tenant_name}</TableCell>
                <TableCell className="text-neutral-600">
                  {r.property_name} · {r.unit_number}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {formatDate(r.end_date)}
                  <span
                    className={
                      r.daysLeft < 0
                        ? "block text-xs text-red-700"
                        : r.daysLeft <= 60
                          ? "block text-xs text-amber-700"
                          : "block text-xs text-neutral-500"
                    }
                  >
                    {r.daysLeft < 0 ? `${Math.abs(r.daysLeft)} days ago` : `${r.daysLeft} days`}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(r.monthly_rent)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.offer ? (
                    <>
                      {formatCurrency(r.offer.new_monthly_rent)}
                      {r.upliftPct != null ? (
                        <span
                          className={
                            r.upliftPct > 0
                              ? "block text-xs text-emerald-700"
                              : r.upliftPct < 0
                                ? "block text-xs text-red-700"
                                : "block text-xs text-neutral-500"
                          }
                        >
                          {r.upliftPct > 0 ? "+" : ""}
                          {r.upliftPct}%
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {r.offer ? formatDate(r.offer.created_at) : <span className="text-neutral-400">Not sent</span>}
                </TableCell>
                <TableCell className="text-right">
                  <StatusBadge status={r.band} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
