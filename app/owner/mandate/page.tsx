import { CalendarClock, Check, ShieldCheck, X } from "lucide-react";
import { requireOwner } from "@/features/portals/owner-guard";
import { getOwnerMandate, APPOINTMENT_LABELS } from "@/features/mandates/queries";
import { OWNER_NAV } from "@/features/portals/owner-nav";
import PortalLayout from "@/components/layout/portal-layout";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * The owner's own copy of the agreement.
 *
 * Reads the mandates table added in 0018 — this screen used to show the
 * fixtures in owner-stub-data.ts, because there was no table to read.
 */
export default async function OwnerMandatePage() {
  const { ownerId } = await requireOwner();
  const m = ownerId ? await getOwnerMandate(ownerId) : null;

  if (!m) {
    return (
      <PortalLayout title="Owner" nav={OWNER_NAV}>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-neutral-900">Our agreement</h1>
          <p className="text-sm text-neutral-500">
            What you have appointed us to do, and what we may do without asking you.
          </p>
        </div>
        <EmptyState
          icon={ShieldCheck}
          title="No agreement on file"
          description="Once your management agreement is recorded, this page shows what it allows us to do and what waits for you."
        />
      </PortalLayout>
    );
  }

  const granted = m.authorities.filter((a) => a.granted);
  const withheld = m.authorities.filter((a) => !a.granted);
  const feeLine = (() => {
    const pct = m.fees.find((f) => f.fee_type === "percentage");
    if (m.management_fee_pct != null) return `${m.management_fee_pct}% of rent collected`;
    if (pct) return `${pct.fee_value}% of rent collected`;
    const flat = m.fees.find((f) => f.fee_type === "flat");
    return flat ? `${formatCurrency(flat.fee_value)} per month` : "Not recorded";
  })();

  return (
    <PortalLayout title="Owner" nav={OWNER_NAV}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Our agreement</h1>
        <p className="text-sm text-neutral-500">
          What you have appointed us to do, and what we may do without asking you.
        </p>
      </div>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Agreement"
          value={m.mandate_code}
          icon={ShieldCheck}
          sublabel={m.is_exclusive ? "Exclusive" : "Open — other agents may market"}
        />
        <StatCard label="Type" value={APPOINTMENT_LABELS[m.mandate_type] ?? m.mandate_type} />
        <StatCard
          label="Runs to"
          value={formatDate(m.ends_on)}
          icon={CalendarClock}
          tone={m.band === "expiring" ? "warning" : m.band === "expired" ? "danger" : "default"}
          sublabel={
            m.daysLeft < 0 ? `Ended ${Math.abs(m.daysLeft)} days ago` : `${m.daysLeft} days left`
          }
        />
        <StatCard
          label="Notice period"
          value={`${m.notice_days} days`}
          sublabel="Either side, in writing"
        />
      </div>

      {/* The distinction that matters to an owner: what happens without
          them, and what waits for them. */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              We may do this without asking
            </h2>
            {granted.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nothing. Every decision on your property comes back to you.
              </p>
            ) : (
              <ul className="space-y-3">
                {granted.map((a) => (
                  <li key={a.key} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm text-neutral-900">{a.label}</p>
                      <p className="text-xs text-neutral-500">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">We must ask you first</h2>
            {withheld.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nothing is withheld. Every authority above has been granted.
              </p>
            ) : (
              <ul className="space-y-3">
                {withheld.map((a) => (
                  <li key={a.key} className="flex gap-2.5">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-900">{a.label}</p>
                      <p className="text-xs text-neutral-500">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">What we charge</h2>
          <dl className="divide-y divide-neutral-100 text-sm">
            {([
              ["Management fee", feeLine],
              [
                "Letting fee",
                m.letting_fee_months == null
                  ? "Not recorded"
                  : `${m.letting_fee_months} month${m.letting_fee_months === 1 ? "" : "s"} rent per new tenancy`,
              ],
              [
                "Renewal fee",
                m.renewal_fee_months == null
                  ? "Not recorded"
                  : `${m.renewal_fee_months} month${m.renewal_fee_months === 1 ? "" : "s"} rent per renewal`,
              ],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-right text-neutral-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-neutral-500">
            The management fee is charged on rent actually collected, not rent
            due. A month that is not paid is not charged for.
          </p>
        </CardContent>
      </Card>

      {m.properties.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">Covers:</span>
          {m.properties.map((p) => (
            <Badge key={p.id} variant="outline">{p.name}</Badge>
          ))}
        </div>
      ) : null}

      {m.notes ? (
        <p className="mt-5 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
          {m.notes}
        </p>
      ) : null}
    </PortalLayout>
  );
}
