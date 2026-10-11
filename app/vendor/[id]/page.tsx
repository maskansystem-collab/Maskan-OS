import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Banknote, CalendarClock, KeyRound, MapPin } from "lucide-react";
import { requireVendor } from "@/features/portals/vendor-guard";
import { getVendorJob } from "@/features/maintenance/queries";
import { VendorJobCard } from "@/features/maintenance/components/vendor-job-card";
import PortalLayout from "@/components/layout/portal-layout";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * One job, full width.
 *
 * The portal lists jobs as cards, which is right for scanning but cramped on
 * a phone once there is a long description and access notes to read on site.
 * This is the same card — so the stage actions behave identically — with the
 * detail that does not fit in a list underneath it.
 */
export default async function VendorJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const job = await getVendorJob(vendorId, id);
  if (!job) notFound();

  return (
    <PortalLayout title="Contractor">
      <Link
        href="/vendor"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> All jobs
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">{job.request_code}</h1>
        <Badge variant="outline">{job.priority}</Badge>
      </div>
      <p className="mb-6 flex items-center gap-1.5 text-sm text-neutral-500">
        <MapPin className="h-3.5 w-3.5 text-neutral-400" />
        {job.property_name} · Unit {job.unit_number}
      </p>

      <div className="mb-5">
        <VendorJobCard job={job} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>The job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="whitespace-pre-line text-neutral-700">{job.description || "No description given."}</p>
            {job.instructions ? (
              <div className="rounded-[10px] bg-neutral-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Instructions</p>
                <p className="mt-1 whitespace-pre-line text-neutral-700">{job.instructions}</p>
              </div>
            ) : null}
            {job.access_notes ? (
              <div className="rounded-[10px] bg-neutral-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <KeyRound className="h-3.5 w-3.5" /> Access
                </p>
                <p className="mt-1 whitespace-pre-line text-neutral-700">{job.access_notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Money and timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="Scheduled"
              value={job.scheduled_at ? formatDateTime(job.scheduled_at) : "Not scheduled"}
              icon={CalendarClock}
            />
            <Row
              label="Estimated"
              value={job.estimated_cost != null ? formatCurrency(job.estimated_cost) : "—"}
              icon={Banknote}
            />
            <Row
              label="Approved"
              value={job.approved_amount != null ? formatCurrency(job.approved_amount) : "Awaiting approval"}
            />
            <Row
              label="Invoiced"
              value={job.actual_amount != null ? formatCurrency(job.actual_amount) : "—"}
            />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-center gap-1.5 text-neutral-500">
        {Icon ? <Icon className="h-3.5 w-3.5 text-neutral-400" /> : null}
        {label}
      </span>
      <span className="text-right font-medium text-neutral-900">{value}</span>
    </div>
  );
}
