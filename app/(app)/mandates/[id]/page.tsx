import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, FileSignature, FileText, Home, Scale, X } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getMandate, APPOINTMENT_LABELS, AUTHORITY_LABELS } from "@/features/mandates/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** One mandate: the appointment, its limits, and the fees it allows. */
export default async function MandateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const m = await getMandate(membership.organisationId, id);
  if (!m) notFound();

  const current = m.fees.filter(
    (f) => f.effective_from <= new Date().toISOString().slice(0, 10) && !f.effective_to
  );

  return (
    <>
      <PageHeader
        title={m.mandate_code}
        description={[
          m.owner_name,
          m.properties.length === 1
            ? m.properties[0].name
            : m.properties.length > 1
              ? `${m.properties.length} properties`
              : null,
        ]}
        breadcrumbs={[{ label: "Mandates", href: "/mandates" }, { label: m.mandate_code }]}
        actions={
          <>
            <StatusBadge status={m.band} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/owners/${m.owner_id}`}>Open owner</Link>
            </Button>
          </>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Appointment"
          value={APPOINTMENT_LABELS[m.mandate_type] ?? m.mandate_type}
          icon={FileSignature}
        />
        <StatCard label="Units covered" value={String(m.units)} icon={Home} />
        <StatCard
          label="Runs to"
          value={formatDate(m.ends_on)}
          tone={m.band === "expiring" ? "warning" : m.band === "expired" ? "danger" : "default"}
          sublabel={
            m.band === "expired"
              ? `Ended ${Math.abs(m.daysLeft)} days ago`
              : `${m.daysLeft} days · ${m.notice_days} days notice`
          }
        />
        <StatCard
          label="Basis"
          value={m.is_exclusive ? "Exclusive" : "Open"}
          icon={Scale}
          sublabel={
            m.is_exclusive
              ? "No other agent may market these"
              : "Other agents may compete for the let"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>What you may do without asking</CardTitle>
              <CardDescription>
                Anything not permitted here goes back to the owner for a decision.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-neutral-100">
                {AUTHORITY_LABELS.map(({ key, label }) => {
                  const cap = m.authority.maintenance_spend_cap;
                  const allowed =
                    key === "maintenance_spend_cap"
                      ? cap > 0
                      : (m.authority[key as keyof typeof m.authority] as boolean);
                  return (
                    <div key={key} className="flex items-center gap-3 py-2.5">
                      <span
                        className={
                          allowed
                            ? "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                            : "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-400"
                        }
                      >
                        {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] text-neutral-900">{label}</span>
                      <span
                        className={
                          allowed
                            ? "shrink-0 text-xs font-medium text-emerald-700"
                            : "shrink-0 text-xs font-medium text-neutral-400"
                        }
                      >
                        {key === "maintenance_spend_cap"
                          ? cap > 0
                            ? `Up to ${formatCurrency(cap)}`
                            : "Not permitted"
                          : allowed
                            ? "Permitted"
                            : "Not permitted"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-500">
                These limits are recorded, not yet enforced in the maintenance
                flow: a quote above the cap should pause for the owner rather
                than be assigned, and that check is still to be wired in.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fees this mandate allows</CardTitle>
              <CardDescription>
                Only these may be charged against this owner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {m.fees.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No fee applies to this owner or their properties. Set a house
                  rate on the fee schedule and owner statements can calculate it.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {m.fees.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="text-[13.5px] font-medium text-neutral-900">
                          {f.fee_type === "percentage"
                            ? "Management fee"
                            : f.fee_type === "flat"
                              ? "Fixed monthly fee"
                              : f.fee_type}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {f.scope} · from {formatDate(f.effective_from)}
                          {f.effective_to ? ` to ${formatDate(f.effective_to)}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                        {f.fee_type === "percentage" ? `${f.fee_value}%` : formatCurrency(f.fee_value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/settings/fees">Open the fee schedule</Link>
              </Button>
            </CardContent>
          </Card>

          {m.properties.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Properties covered</CardTitle>
                <CardDescription>
                  An owner can appoint you for part of their portfolio and keep
                  the rest.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-neutral-100">
                  {m.properties.map((p) => (
                    <div key={p.id} className="py-2">
                      <Link href={`/properties/${p.id}`} className="text-sm font-medium text-neutral-900 hover:underline">
                        {p.name}
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <Card>
            <CardHeader><CardTitle>Terms</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y divide-neutral-100 text-sm">
                <Row label="Owner">
                  <Link href={`/owners/${m.owner_id}`} className="hover:underline">{m.owner_name}</Link>
                </Row>
                <Row label="Appointment">{APPOINTMENT_LABELS[m.mandate_type] ?? m.mandate_type}</Row>
                <Row label="From">{formatDate(m.starts_on)}</Row>
                <Row label="To">{formatDate(m.ends_on)}</Row>
                <Row label="Notice">{m.notice_days} days</Row>
                <Row label="Basis">{m.is_exclusive ? "Exclusive" : "Open"}</Row>
                <Row label="Management fee">
                  {m.management_fee_pct == null ? "—" : `${m.management_fee_pct}%`}
                </Row>
                <Row label="Letting fee">
                  {m.letting_fee_months == null ? "—" : `${m.letting_fee_months} months rent`}
                </Row>
                <Row label="Renewal fee">
                  {m.renewal_fee_months == null ? "—" : `${m.renewal_fee_months} months rent`}
                </Row>
                <Row label="Signed agreement">
                  {m.contract ? m.contract.title : "Not on file"}
                </Row>
              </dl>
            </CardContent>
          </Card>

          {m.notes ? (
            <Card>
              <CardHeader><CardTitle>Note</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{m.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          {!m.contract ? (
            <p className="flex items-start gap-2 rounded-[10px] bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              No signed agreement is attached. The authority above is recorded
              but nothing on file evidences it.
            </p>
          ) : null}

          {current.length === 0 && m.fees.length > 0 ? (
            <p className="rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
              Every fee listed has an end date. Check the schedule before the
              next owner statement runs.
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-900">{children}</dd>
    </div>
  );
}
