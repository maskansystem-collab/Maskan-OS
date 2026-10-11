import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, CalendarClock, Landmark, Receipt } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getCheque } from "@/features/payments/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Cheque detail.
 *
 * The cheque register and the global search both link here. The status
 * timeline is the point of the screen: a post-dated cheque moves through
 * received → stored → due → submitted → cleared or bounced, and the chain
 * is what makes a replacement traceable to the cheque it replaced.
 */
export default async function ChequeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const cheque = await getCheque(membership.organisationId, id);
  if (!cheque) notFound();

  return (
    <>
      <PageHeader
        title={cheque.cheque_number}
        description={[cheque.bank_name, cheque.payer_name]}
        breadcrumbs={[
          { label: "Cheques", href: "/payments/cheques" },
          { label: cheque.cheque_number },
        ]}
        actions={<StatusBadge status={cheque.status} />}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Amount" value={formatCurrency(cheque.amount)} icon={Banknote} />
        <StatCard label="Cheque date" value={formatDate(cheque.cheque_date)} icon={CalendarClock} sublabel="When it can be banked" />
        <StatCard label="Received" value={formatDate(cheque.received_date)} icon={Receipt} sublabel="When it reached the office" />
        <StatCard
          label="Still owed on the instalment"
          value={cheque.instalment ? formatCurrency(cheque.instalment.outstanding_amount) : "—"}
          icon={Landmark}
          tone={cheque.instalment && cheque.instalment.outstanding_amount > 0 ? "warning" : "default"}
          sublabel={cheque.instalment ? `Instalment ${cheque.instalment.instalment_number}` : "Not allocated"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status history</CardTitle>
            <CardDescription>Every move this cheque has made, in order.</CardDescription>
          </CardHeader>
          <CardContent>
            {cheque.timeline.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nothing recorded since it was received.
              </p>
            ) : (
              <ol className="relative space-y-5 border-l border-neutral-200 pl-5">
                {cheque.timeline.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-neutral-900" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm text-neutral-900">
                        {event.from_status ? (
                          <>
                            <span className="text-neutral-500">{event.from_status}</span>
                            <span className="px-1.5 text-neutral-300">→</span>
                          </>
                        ) : null}
                        <span className="font-medium">{event.to_status}</span>
                      </p>
                      <p className="text-xs text-neutral-500">{formatDateTime(event.created_at)}</p>
                    </div>
                    {event.notes ? (
                      <p className="mt-1 text-sm text-neutral-600">{event.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Against</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-neutral-500">Lease</span>
                <Link href={`/leases/${cheque.lease_id}`} className="font-medium text-neutral-900 hover:underline">
                  {cheque.lease_code}
                </Link>
              </div>
              <Field label="Tenant" value={cheque.tenant_name} />
              <Field label="Payer on the cheque" value={cheque.payer_name} />
              <Field label="Bank" value={cheque.bank_name} />
              {cheque.instalment ? (
                <Field label="Instalment due" value={formatDate(cheque.instalment.due_date)} />
              ) : null}
            </CardContent>
          </Card>

          {cheque.internal_notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Internal notes</CardTitle>
                <CardDescription>Not visible to the tenant.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-neutral-600">{cheque.internal_notes}</p>
              </CardContent>
            </Card>
          ) : null}
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
