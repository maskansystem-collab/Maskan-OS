import { CalendarClock, CreditCard, DoorOpen, HardDrive, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getSubscription } from "@/features/settings/org-queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** Percentage of an allowance used, or undefined when the allowance is unlimited. */
function pct(used: number, limit: number | null): number | undefined {
  if (limit == null || limit === 0) return undefined;
  return Math.min(100, Math.round((used / limit) * 100));
}

function remaining(used: number, limit: number | null): string {
  if (limit == null) return "Unlimited";
  const left = limit - used;
  return left >= 0 ? `${left} of ${limit} left` : `${Math.abs(left)} over ${limit}`;
}

/**
 * The organisation's plan, what it includes and how much of it is in use.
 *
 * Plans are assigned by Maskan, not bought here — there is no checkout in
 * this product, so this screen reports rather than sells.
 */
export default async function SubscriptionPage() {
  const { membership } = await requireStaff();
  const sub = await getSubscription(membership.organisationId);

  if (!sub) {
    return (
      <>
        <PageHeader
          title="Subscription"
          breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Subscription" }]}
          description="Your plan, its allowances and how much of each you are using."
        />
        <EmptyState
          icon={CreditCard}
          title="No plan on file"
          description="This organisation has no subscription record yet. Maskan assigns one when the account is set up."
        />
      </>
    );
  }

  const features = Object.entries(sub.features);
  const on = features.filter(([, enabled]) => enabled);

  return (
    <>
      <PageHeader
        title="Subscription"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Subscription" }]}
        description={[sub.planName ?? "No plan", `${on.length} of ${features.length} features included`]}
        actions={<StatusBadge status={sub.status} />}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Plan"
          value={sub.planName ?? "—"}
          icon={CreditCard}
          sublabel={
            sub.trial_ends_at
              ? `Trial ends ${formatDate(sub.trial_ends_at)}`
              : sub.current_period_end
                ? `Renews ${formatDate(sub.current_period_end)}`
                : "No renewal date set"
          }
        />
        <StatCard
          label="Units"
          value={String(sub.usage.units)}
          icon={DoorOpen}
          progress={pct(sub.usage.units, sub.limits.maxUnits)}
          sublabel={remaining(sub.usage.units, sub.limits.maxUnits)}
          tone={
            sub.limits.maxUnits != null && sub.usage.units > sub.limits.maxUnits ? "danger" : "default"
          }
        />
        <StatCard
          label="Team members"
          value={String(sub.usage.users)}
          icon={Users}
          progress={pct(sub.usage.users, sub.limits.maxUsers)}
          sublabel={remaining(sub.usage.users, sub.limits.maxUsers)}
          tone={
            sub.limits.maxUsers != null && sub.usage.users > sub.limits.maxUsers ? "danger" : "default"
          }
        />
        <StatCard
          label="Document storage"
          value={sub.limits.storageMb == null ? "Unlimited" : `${sub.limits.storageMb} MB`}
          icon={HardDrive}
          sublabel="Included with this plan"
        />
      </div>

      <div className="mb-10">
        <h2 className="mb-3 font-display text-lg font-bold tracking-[-0.03em] text-neutral-900">
          What this plan includes
        </h2>
        {features.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No features listed"
            description="This plan has no feature flags set, so everything follows the product default."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Included</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map(([key, enabled]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium text-neutral-900">
                    {key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={enabled ? "success" : "outline"}>{enabled ? "Yes" : "No"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold tracking-[-0.03em] text-neutral-900">
          History
        </h2>
        {sub.history.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing recorded yet"
            description="Plan changes, renewals and failed payments appear here as they happen."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sub.history.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-neutral-900">
                    {e.event_type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="text-right text-neutral-600">
                    {formatDateTime(e.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
