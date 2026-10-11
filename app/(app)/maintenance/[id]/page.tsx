import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, CalendarClock, Hammer, MessageSquare, Paperclip, User } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getMaintenanceRequest } from "@/features/maintenance/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Work-order detail.
 *
 * Global search links here. The screen is built around the evidence trail —
 * what was reported, who was sent, what it cost and when it closed — because
 * that trail is what ends up on the owner's statement.
 */
export default async function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const request = await getMaintenanceRequest(membership.organisationId, id);
  if (!request) notFound();

  const order = request.workOrder;
  const cost = order?.actual_amount ?? order?.approved_amount ?? order?.estimated_cost ?? null;
  const costLabel = order?.actual_amount != null
    ? "Final cost"
    : order?.approved_amount != null
      ? "Approved"
      : "Estimated";

  return (
    <>
      <PageHeader
        title={request.request_code}
        description={[
          request.property?.name,
          request.unit ? `Unit ${request.unit.unit_number}` : null,
          request.category_name,
        ]}
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: request.request_code }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{request.priority}</Badge>
            <StatusBadge status={request.status} />
          </div>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reported" value={formatDate(request.created_at)} icon={CalendarClock} sublabel={request.preferred_time ?? "No preferred time"} />
        <StatCard label="Vendor" value={order?.vendor_name ?? "Unassigned"} icon={Hammer} sublabel={order?.scheduled_at ? formatDateTime(order.scheduled_at) : "Not scheduled"} />
        <StatCard label={costLabel} value={cost != null ? formatCurrency(cost) : "—"} icon={Banknote} sublabel={order ? `Work order ${order.status}` : "No work order yet"} />
        <StatCard label="Evidence" value={String(request.attachments.length)} icon={Paperclip} sublabel="Photos and documents" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>What was reported</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-line text-sm text-neutral-700">{request.description}</p>
              {request.access_notes ? (
                <div className="rounded-[10px] bg-neutral-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Access</p>
                  <p className="mt-1 text-sm text-neutral-700">{request.access_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {order ? (
            <Card>
              <CardHeader>
                <CardTitle>Work order</CardTitle>
                <CardDescription>What the vendor was asked to do, and what happened.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.instructions ? (
                  <p className="whitespace-pre-line text-sm text-neutral-700">{order.instructions}</p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <Money label="Estimated" value={order.estimated_cost} />
                  <Money label="Approved" value={order.approved_amount} />
                  <Money label="Actual" value={order.actual_amount} />
                </div>

                {order.events.length > 0 ? (
                  <ol className="relative space-y-4 border-l border-neutral-200 pl-5 pt-1">
                    {order.events.map((event) => (
                      <li key={event.id} className="relative">
                        <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-neutral-900" />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-neutral-900">{event.event_type}</p>
                          <p className="text-xs text-neutral-500">{formatDateTime(event.created_at)}</p>
                        </div>
                        {event.notes ? <p className="mt-1 text-sm text-neutral-600">{event.notes}</p> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Internal notes are not shown to the tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              {request.comments.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-neutral-500">
                  <MessageSquare className="h-4 w-4 text-neutral-400" /> Nothing yet.
                </p>
              ) : (
                <ul className="space-y-4">
                  {request.comments.map((comment) => (
                    <li key={comment.id} className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                          <User className="h-3.5 w-3.5 text-neutral-400" />
                          {comment.author_name ?? "Someone"}
                          {comment.is_internal ? <Badge variant="outline">Internal</Badge> : null}
                        </p>
                        <p className="text-xs text-neutral-500">{formatDateTime(comment.created_at)}</p>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Where</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {request.property ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-neutral-500">Property</span>
                  <Link href={`/properties/${request.property.id}`} className="text-right font-medium text-neutral-900 hover:underline">
                    {request.property.name}
                  </Link>
                </div>
              ) : null}
              {request.unit ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-neutral-500">Unit</span>
                  <Link href={`/units/${request.unit.id}`} className="text-right font-medium text-neutral-900 hover:underline">
                    {request.unit.unit_number}
                  </Link>
                </div>
              ) : null}
              {request.tenant ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-neutral-500">Tenant</span>
                    <Link href={`/tenants/${request.tenant.id}`} className="text-right font-medium text-neutral-900 hover:underline">
                      {request.tenant.name}
                    </Link>
                  </div>
                  <Field label="Phone" value={request.tenant.phone} />
                </>
              ) : null}
              <Field label="Category" value={request.category_name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>Before and after evidence.</CardDescription>
            </CardHeader>
            <CardContent>
              {request.attachments.length === 0 ? (
                <p className="text-sm text-neutral-500">Nothing attached.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {request.attachments.map((file) => (
                    <li key={file.id} className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-1.5 text-neutral-900">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate">{file.storage_path.split("/").pop()}</span>
                      </span>
                      <span className="shrink-0 text-xs text-neutral-500">{file.stage}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="text-right text-neutral-900">{value || "—"}</span>
    </div>
  );
}

function Money({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[10px] border border-neutral-200 px-3 py-2">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-neutral-900">
        {value != null ? formatCurrency(value) : "—"}
      </p>
    </div>
  );
}
