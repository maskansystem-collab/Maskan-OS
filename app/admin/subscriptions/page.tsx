import Link from "next/link";
import { ArrowLeft, CreditCard, DoorOpen, TriangleAlert, Users } from "lucide-react";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import { listAdminSubscriptions } from "@/features/admin/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Plan assignment and usage against plan limits, across every
 * organisation on the platform.
 *
 * Plans are assigned by Maskan rather than bought, so this reports and
 * flags; it does not sell.
 */
export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  await requirePlatformSuperAdmin();

  const all = await listAdminSubscriptions();
  const over = all.filter((s) => s.overUnits || s.overUsers);
  const trialing = all.filter((s) => s.subscriptionStatus === "trialing" || s.trial_ends_at);
  const unassigned = all.filter((s) => !s.planName);

  const rows =
    show === "over" ? over
      : show === "trial" ? trialing
        : show === "unassigned" ? unassigned
          : all;

  return (
    <>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Platform
      </Link>

      <PageHeader
        title="Subscriptions"
        breadcrumbs={[{ label: "Platform", href: "/admin" }, { label: "Subscriptions" }]}
        description="Which plan each organisation is on, and how much of it they are using."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Organisations"
          value={String(all.length)}
          icon={CreditCard}
          sublabel={`${all.length - unassigned.length} on a plan`}
        />
        <StatCard
          label="Over a limit"
          value={String(over.length)}
          icon={TriangleAlert}
          tone={over.length > 0 ? "danger" : "default"}
          sublabel="Outgrown what they pay for"
        />
        <StatCard
          label="On trial"
          value={String(trialing.length)}
          sublabel="Trial end date set"
        />
        <StatCard
          label="No plan assigned"
          value={String(unassigned.length)}
          tone={unassigned.length > 0 ? "warning" : "default"}
          sublabel="Nothing to bill against"
        />
      </div>

      <FilterRow>
        <FilterChip href="/admin/subscriptions" count={all.length} active={!show}>All</FilterChip>
        <FilterChip href="/admin/subscriptions?show=over" count={over.length} active={show === "over"}>
          Over a limit
        </FilterChip>
        <FilterChip href="/admin/subscriptions?show=trial" count={trialing.length} active={show === "trial"}>
          On trial
        </FilterChip>
        <FilterChip
          href="/admin/subscriptions?show=unassigned"
          count={unassigned.length}
          active={show === "unassigned"}
        >
          No plan
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={show ? "Nothing in that group" : "No organisations"}
          description={
            show
              ? "Clear the filter to see every organisation."
              : "Organisations appear here as they are created."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.organisationId}>
                <TableCell>
                  <Link
                    href={`/admin/organisations/${s.organisationId}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {s.organisationName}
                  </Link>
                  <span className="block text-xs">
                    <StatusBadge status={s.status} />
                  </span>
                </TableCell>
                <TableCell>
                  {s.planName ? (
                    <Badge variant="outline">{s.planName}</Badge>
                  ) : (
                    <span className="text-amber-700">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.subscriptionStatus ? <StatusBadge status={s.subscriptionStatus} /> : "—"}
                  {s.trial_ends_at ? (
                    <span className="block text-xs text-neutral-500">
                      Trial ends {formatDate(s.trial_ends_at)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={s.overUnits ? "font-semibold text-red-700" : "text-neutral-900"}>
                    {s.units}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    of {s.maxUnits ?? "unlimited"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={s.overUsers ? "font-semibold text-red-700" : "text-neutral-900"}>
                    {s.users}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    of {s.maxUsers ?? "unlimited"}
                  </span>
                </TableCell>
                <TableCell className="text-right text-neutral-600">
                  {s.current_period_end ? formatDate(s.current_period_end) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="mt-5 flex items-start gap-2 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        <span>
          <DoorOpen className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-neutral-400" />
          Usage counts live units and active members, not what was billed. An
          organisation over its limit keeps working — nothing here blocks them.
        </span>
      </p>
    </>
  );
}
