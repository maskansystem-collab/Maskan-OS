import { Building2, CalendarClock, Percent, Receipt } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listFees } from "@/features/settings/org-queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** A percentage fee reads as 5%, a flat one as an amount. */
function feeLabel(type: string, value: number): string {
  if (type === "percentage") return `${value}%`;
  if (type === "flat") return formatCurrency(value);
  return `${value}`;
}

/** Who a fee applies to. Nothing named means it is the house rate. */
function scopeLabel(property: string | null, owner: string | null): string {
  if (property && owner) return `${property} · ${owner}`;
  return property ?? owner ?? "All owners and properties";
}

/**
 * The management fee schedule.
 *
 * A row with neither a property nor an owner is the organisation default;
 * anything else overrides it for that property or that owner. Rows are dated,
 * so a rate change is a new row rather than an edit — which is what makes an
 * old owner statement still reconcile.
 */
export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listFees(membership.organisationId);
  const fees = show === "past" ? all.filter((f) => !f.isCurrent) : show === "all" ? all : all.filter((f) => f.isCurrent);

  const current = all.filter((f) => f.isCurrent);
  const houseRate = current.find((f) => !f.property_name && !f.owner_name);
  const overrides = current.filter((f) => f.property_name || f.owner_name);
  const percentages = current.filter((f) => f.fee_type === "percentage").map((f) => f.fee_value);
  const average =
    percentages.length > 0
      ? percentages.reduce((a, b) => a + b, 0) / percentages.length
      : null;

  return (
    <>
      <PageHeader
        title="Management fees"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Fees" }]}
        description="What you charge owners to manage their property, and any rate agreed with a particular owner."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="House rate"
          value={houseRate ? feeLabel(houseRate.fee_type, houseRate.fee_value) : "Not set"}
          icon={Percent}
          sublabel={houseRate ? `In force since ${formatDate(houseRate.effective_from)}` : "Every owner needs their own rate"}
          tone={houseRate ? "default" : "warning"}
        />
        <StatCard
          label="Agreed exceptions"
          value={String(overrides.length)}
          icon={Building2}
          sublabel="Owners or properties on their own rate"
        />
        <StatCard
          label="Average rate"
          value={average == null ? "—" : `${average.toFixed(1)}%`}
          icon={Receipt}
          sublabel={`Across ${percentages.length} percentage-based fees`}
        />
        <StatCard
          label="Superseded rates"
          value={String(all.length - current.length)}
          icon={CalendarClock}
          sublabel="Kept so old statements still add up"
        />
      </div>

      <FilterRow>
        <FilterChip href="/settings/fees" count={current.length} active={!show}>In force</FilterChip>
        <FilterChip href="/settings/fees?show=past" count={all.length - current.length} active={show === "past"}>
          Superseded
        </FilterChip>
        <FilterChip href="/settings/fees?show=all" count={all.length} active={show === "all"}>
          All
        </FilterChip>
      </FilterRow>

      {fees.length === 0 ? (
        <EmptyState
          icon={Percent}
          title={show ? "Nothing to show here" : "No fee set"}
          description={
            show
              ? "No fees fall into that period."
              : "Set a house rate and owner statements will calculate your fee automatically."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applies to</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>From</TableHead>
              <TableHead className="text-right">Until</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <span className="font-medium text-neutral-900">
                    {scopeLabel(f.property_name, f.owner_name)}
                  </span>
                  {!f.property_name && !f.owner_name ? (
                    <Badge variant="neutral" className="ml-2">
                      House rate
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {f.fee_type === "percentage"
                    ? "Share of rent collected"
                    : f.fee_type === "flat"
                      ? "Fixed amount per month"
                      : f.fee_type}
                </TableCell>
                <TableCell className="text-right font-medium text-neutral-900">
                  {feeLabel(f.fee_type, f.fee_value)}
                </TableCell>
                <TableCell className="text-neutral-600">{formatDate(f.effective_from)}</TableCell>
                <TableCell className="text-right text-neutral-600">
                  {f.effective_to ? formatDate(f.effective_to) : <span className="text-neutral-400">Open ended</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
