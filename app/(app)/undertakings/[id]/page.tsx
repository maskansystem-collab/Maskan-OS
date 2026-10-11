import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote, Check, Clock, FileText, Mail, Phone, TriangleAlert, Wallet, X,
} from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import {
  getUndertaking, COVER_LABELS, CAP_PERIOD_LABELS, SETTLEMENT_LABELS,
} from "@/features/mandates/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** One undertaking: who pays what, until when, and whose name is on it. */
export default async function UndertakingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const u = await getUndertaking(membership.organisationId, id);
  if (!u) notFound();

  const names: { label: string; value: string | null; matches: boolean }[] = [
    { label: "On the tenancy contract", value: u.contract_party_name, matches: u.contract_party_name === u.tenant_name },
    { label: "On the cheques", value: u.cheque_payer_name, matches: !u.chequeNameMismatch },
    { label: "QID and compliance file", value: u.tenant_name, matches: true },
  ];

  return (
    <>
      <PageHeader
        title={u.undertaking_code}
        description={[u.tenant_name, u.property_name, u.unit_number]}
        breadcrumbs={[
          { label: "Undertakings", href: "/undertakings" },
          { label: u.undertaking_code },
        ]}
        actions={
          <>
            <StatusBadge status={u.band} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/leases/${u.lease_id}`}>Open lease</Link>
            </Button>
          </>
        }
      />

      {u.chequeNameMismatch ? (
        <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3.5">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-[12.5px] leading-relaxed text-red-900">
            <p className="font-semibold">
              The cheques are drawn in {u.payer_name}&apos;s name, not the tenant&apos;s.
            </p>
            <p className="mt-1.5">
              The tenancy is with {u.tenant_name}, so a cheque from {u.payer_name}{" "}
              does not match the contracting party. It clears perfectly well, but
              if the rent is ever disputed the payment trail does not lead back to
              the person on the lease.
            </p>
            <p className="mt-1.5">
              Either take an assignment letter naming {u.payer_name} as an
              authorised payer for this tenancy, or ask for cheques in the
              tenant&apos;s name. Record whichever you choose here.
            </p>
          </div>
        </div>
      ) : null}

      {u.band === "lapsed" ? (
        <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3.5">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-[12.5px] leading-relaxed text-red-900">
            <p className="font-semibold">This letter has expired.</p>
            <p className="mt-1.5">
              The full liability has reverted to {u.tenant_name}. If they have not
              been told, that conversation comes before the next rent run.
            </p>
          </div>
        </div>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Payer covers"
          value={COVER_LABELS[u.covers] ?? u.covers}
          icon={Wallet}
          sublabel={u.payer_name}
        />
        <StatCard
          label="Up to"
          value={u.cap_amount == null ? "No cap" : formatCurrency(u.cap_amount)}
          icon={Banknote}
          sublabel={u.cap_amount == null ? "Nothing agreed in writing" : CAP_PERIOD_LABELS[u.cap_period]}
        />
        <StatCard
          label="Letter expires"
          value={u.letter_expires_on ? formatDate(u.letter_expires_on) : "—"}
          icon={Clock}
          tone={u.band === "expiring" ? "warning" : u.band === "lapsed" ? "danger" : "default"}
          sublabel={
            u.daysLeft == null
              ? "No expiry recorded"
              : u.daysLeft < 0
                ? `Lapsed ${Math.abs(u.daysLeft)} days ago`
                : `${u.daysLeft} days`
          }
        />
        <StatCard
          label="Settled"
          value={(SETTLEMENT_LABELS[u.settlement] ?? u.settlement).split(" ")[0]}
          sublabel={SETTLEMENT_LABELS[u.settlement] ?? u.settlement}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Who is named where</CardTitle>
              <CardDescription>
                The tenancy stays with the person living there, whoever pays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-neutral-100">
                {names.map((n) => (
                  <div key={n.label} className="flex items-center gap-3 py-2.5">
                    <span
                      className={
                        n.matches
                          ? "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                          : "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-red-50 text-red-600"
                      }
                    >
                      {n.matches ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 text-[13.5px] text-neutral-600">{n.label}</span>
                    <span
                      className={
                        n.matches
                          ? "shrink-0 text-[13px] font-medium text-neutral-900"
                          : "shrink-0 text-[13px] font-semibold text-red-700"
                      }
                    >
                      {n.value ?? "Not recorded"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>The arrangement</CardTitle>
              <CardDescription>
                What was agreed, and what evidences it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-neutral-100 text-sm">
                <Row label="Covers">{COVER_LABELS[u.covers] ?? u.covers}</Row>
                <Row label="Cap">
                  {u.cap_amount == null
                    ? "No cap agreed"
                    : `${formatCurrency(u.cap_amount)} ${CAP_PERIOD_LABELS[u.cap_period] ?? ""}`}
                </Row>
                <Row label="How it settles">{SETTLEMENT_LABELS[u.settlement] ?? u.settlement}</Row>
                <Row label="Letter signed">
                  {u.letter_signed_on ? formatDate(u.letter_signed_on) : "Not recorded"}
                </Row>
                <Row label="Letter expires">
                  {u.letter_expires_on ? formatDate(u.letter_expires_on) : "No expiry recorded"}
                </Row>
                <Row label="Letter on file">{u.letter ? u.letter.title : "Not attached"}</Row>
              </dl>

              {u.lease && u.cap_amount != null && u.covers === "part_of_rent" ? (
                <p className="mt-3.5 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
                  The payer covers {formatCurrency(u.cap_amount)} of a{" "}
                  {formatCurrency(u.lease.monthly_rent)} rent. The tenant pays the
                  remaining {formatCurrency(u.lease.monthly_rent - u.cap_amount)}.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {u.notes ? (
            <Card>
              <CardHeader><CardTitle>Note</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{u.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <Card>
            <CardHeader><CardTitle>The payer</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y divide-neutral-100 text-sm">
                <Row label="Name">{u.payer_name}</Row>
                <Row label="CR number">{u.payer_cr_number ?? "—"}</Row>
                <Row label="Contact">{u.payer_contact_name ?? "—"}</Row>
                <Row label="Email">
                  {u.payer_email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-neutral-400" />
                      {u.payer_email}
                    </span>
                  ) : "—"}
                </Row>
                <Row label="Phone">
                  {u.payer_phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-neutral-400" />
                      {u.payer_phone}
                    </span>
                  ) : "—"}
                </Row>
              </dl>
              <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
                The payer gets no login and no portal. They are recorded here
                rather than as a party to the tenancy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tenancy</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y divide-neutral-100 text-sm">
                <Row label="Lease">
                  <Link href={`/leases/${u.lease_id}`} className="hover:underline">{u.lease_code}</Link>
                </Row>
                <Row label="Tenant">{u.tenant_name}</Row>
                <Row label="Property">{u.property_name}</Row>
                <Row label="Unit">{u.unit_number}</Row>
                {u.lease ? (
                  <>
                    <Row label="Rent">{formatCurrency(u.lease.monthly_rent)}</Row>
                    <Row label="Term">
                      {formatDate(u.lease.start_date)} → {formatDate(u.lease.end_date)}
                    </Row>
                    <Row label="Lease status"><StatusBadge status={u.lease.status} /></Row>
                  </>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {!u.letter ? (
            <p className="flex items-start gap-2 rounded-[10px] bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              No letter is attached. The arrangement is recorded but nothing on
              file evidences it.
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
