import Link from "next/link";
import { Hammer, Receipt, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listVendors, getVendorTrades } from "@/features/vendors/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * The vendor directory — "Providers" in the prototype.
 *
 * Named vendors here because that is what the table, the role and the
 * portal are already called; renaming the screen alone would leave the
 * product using two words for one thing.
 */
export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trade?: string }>;
}) {
  const { q, trade } = await searchParams;
  const { membership } = await requireStaff();

  const [vendors, trades] = await Promise.all([
    listVendors(membership.organisationId, { q, trade }),
    getVendorTrades(membership.organisationId),
  ]);

  const openJobs = vendors.reduce((sum, v) => sum + v.openJobs, 0);
  const unpaid = vendors.reduce((sum, v) => sum + v.unpaidValue, 0);

  return (
    <>
      <PageHeader
        title="Vendors"
        description="The contractors who do the work, what they have open, and what is still owed to them."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Vendors" value={String(vendors.length)} icon={Hammer} sublabel={`${trades.length} trades`} />
        <StatCard label="Open jobs" value={String(openJobs)} icon={Wrench} sublabel="Assigned, scheduled or in progress" />
        <StatCard
          label="Unpaid invoices"
          value={formatCurrency(unpaid)}
          icon={Receipt}
          tone={unpaid > 0 ? "warning" : "default"}
          sublabel="Submitted or approved, not yet paid"
        />
      </div>

      {trades.length > 0 ? (
        <FilterRow>
          <FilterChip href="/vendors" active={!trade}>All trades</FilterChip>
          {trades.map((t) => (
            <FilterChip key={t} href={`/vendors?trade=${encodeURIComponent(t)}`} active={trade === t}>
              {t}
            </FilterChip>
          ))}
        </FilterRow>
      ) : null}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title={trade || q ? "No vendors match that" : "No vendors yet"}
          description={
            trade || q
              ? "Try a different trade, or clear the filter."
              : "Vendors are added when a work order is first assigned to one."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">Jobs</TableHead>
              <TableHead className="text-right">Owed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link href={`/vendors/${v.id}`} className="font-medium text-neutral-900 hover:underline">
                    {v.name}
                  </Link>
                  {v.cr_number ? (
                    <span className="block text-xs text-neutral-500">CR {v.cr_number}</span>
                  ) : null}
                </TableCell>
                <TableCell>{v.trade ? <Badge variant="outline">{v.trade}</Badge> : "—"}</TableCell>
                <TableCell className="text-neutral-600">
                  {v.phone || v.email || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {v.openJobs > 0 ? (
                    <span className="font-medium text-neutral-900">{v.openJobs}</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-neutral-600">{v.totalJobs}</TableCell>
                <TableCell className="text-right">
                  {v.unpaidValue > 0 ? formatCurrency(v.unpaidValue) : <span className="text-neutral-400">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
