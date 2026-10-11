import Link from "next/link";
import { AlertCircle, Banknote, CheckCircle2, Clock, Hammer } from "lucide-react";
import { requireVendor } from "@/features/portals/vendor-guard";
import { listVendorJobs } from "@/features/maintenance/queries";
import PortalLayout from "@/components/layout/portal-layout";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const DONE = ["completed", "closed"];

/**
 * A contractor's own record of finished work.
 *
 * Their money and their track record, from their side. Nothing here is
 * about other vendors, and nothing is about the organisation's internal
 * view of them.
 */
export default async function VendorCompletedPage() {
  const { vendorId } = await requireVendor();

  if (!vendorId) {
    return (
      <PortalLayout title="Contractor">
        <EmptyState
          icon={AlertCircle}
          title="Your account is not linked to a vendor"
          description="The vendor role is set, but no vendor record is attached. An administrator needs to link it."
        />
      </PortalLayout>
    );
  }

  const jobs = await listVendorJobs(vendorId);
  const finished = jobs
    .filter((j) => DONE.includes(j.status))
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  const billed = finished.reduce((s, j) => s + (j.actual_amount ?? j.approved_amount ?? 0), 0);
  const withValue = finished.filter((j) => (j.actual_amount ?? j.approved_amount ?? 0) > 0);
  const average = withValue.length > 0 ? billed / withValue.length : 0;
  const signedOff = finished.filter((j) => j.signed_off_at).length;

  // This month, so the figure moves rather than only growing.
  const monthStart = new Date();
  monthStart.setDate(1);
  const since = monthStart.toISOString().slice(0, 10);
  const thisMonth = finished
    .filter((j) => (j.completed_at ?? "") >= since)
    .reduce((s, j) => s + (j.actual_amount ?? j.approved_amount ?? 0), 0);

  return (
    <PortalLayout title="Contractor">
      <PageHeader
        title="Completed work"
        description={`${finished.length} job${finished.length === 1 ? "" : "s"} finished${
          billed > 0 ? ` · ${formatCurrency(billed)} billed` : ""
        }`}
      />

      <div className="stagger mb-6 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Jobs finished"
          value={String(finished.length)}
          icon={Hammer}
          sublabel={`${jobs.length - finished.length} still open`}
        />
        <StatCard
          label="Billed, all time"
          value={formatCurrency(billed)}
          icon={Banknote}
          tone={billed > 0 ? "success" : "default"}
          sublabel={thisMonth > 0 ? `${formatCurrency(thisMonth)} this month` : "Nothing this month"}
        />
        <StatCard
          label="Average job"
          value={average > 0 ? formatCurrency(average) : "—"}
          sublabel={`Across ${withValue.length} priced job${withValue.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Signed off on site"
          value={finished.length > 0 ? `${signedOff} of ${finished.length}` : "—"}
          icon={CheckCircle2}
          progress={finished.length > 0 ? Math.round((signedOff / finished.length) * 100) : undefined}
          tone={signedOff < finished.length ? "warning" : "default"}
          sublabel={
            signedOff < finished.length
              ? "The rest have no signature on file"
              : "Every job has a signature"
          }
        />
      </div>

      {finished.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing finished yet"
          description="A job moves here once you mark it complete. Your open work is on the jobs page."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Signed off by</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finished.map((j) => (
              <TableRow key={j.workOrderId}>
                <TableCell>
                  <Link href={`/vendor/${j.workOrderId}`} className="font-medium text-neutral-900 hover:underline">
                    {j.request_code}
                  </Link>
                  {j.category ? (
                    <span className="block text-xs text-neutral-500">{j.category}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {j.property_name}
                  <span className="block text-xs text-neutral-500">{j.unit_number}</span>
                </TableCell>
                <TableCell className="text-neutral-600">
                  {j.completed_at ? formatDate(j.completed_at) : "—"}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {j.signed_off_name ?? <span className="text-amber-700">No signature</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {j.actual_amount != null
                    ? formatCurrency(j.actual_amount)
                    : j.approved_amount != null
                      ? formatCurrency(j.approved_amount)
                      : "—"}
                </TableCell>
                <TableCell className="text-right"><StatusBadge status={j.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PortalLayout>
  );
}
