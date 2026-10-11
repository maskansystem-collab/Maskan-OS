import Link from "next/link";
import { Building2, FileSignature, Home, TriangleAlert } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listMandates, APPOINTMENT_LABELS } from "@/features/mandates/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * What each owner has appointed the firm to do.
 *
 * Every lease signed, deposit held and repair approved traces back to a
 * mandate. Without one recorded, nothing in the product explains what gave
 * the firm the authority — which is the first question asked when an owner
 * disputes something.
 */
export default async function MandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string }>;
}) {
  const { band } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listMandates(membership.organisationId);
  const rows = band ? all.filter((m) => m.band === band) : all;

  const count = (b: string) => all.filter((m) => m.band === b).length;
  const live = all.filter((m) => m.band === "active" || m.band === "expiring");
  const exclusive = live.filter((m) => m.is_exclusive).length;

  return (
    <>
      <PageHeader
        title="Mandates"
        description="What each owner has appointed you to do, and what you may do without asking them."
      />

      {count("expiring") > 0 ? (
        <Link
          href="/mandates?band=expiring"
          className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900 transition-colors hover:border-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {count("expiring")} mandate{count("expiring") === 1 ? "" : "s"} expiring within 30 days
        </Link>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live mandates"
          value={String(live.length)}
          icon={FileSignature}
          sublabel={`${count("draft")} draft · ${count("terminated")} ended`}
        />
        <StatCard
          label="Units under mandate"
          value={String(live.reduce((sum, m) => sum + m.units, 0))}
          icon={Home}
        />
        <StatCard
          label="Exclusive"
          value={String(exclusive)}
          icon={Building2}
          sublabel={`${live.length - exclusive} open to other agents`}
        />
        <StatCard
          label="Expiring soon"
          value={String(count("expiring"))}
          tone={count("expiring") > 0 ? "warning" : "default"}
          sublabel="Within 30 days"
        />
      </div>

      <FilterRow>
        <FilterChip href="/mandates" count={all.length} active={!band}>All</FilterChip>
        <FilterChip href="/mandates?band=active" count={count("active")} active={band === "active"}>
          Active
        </FilterChip>
        <FilterChip href="/mandates?band=expiring" count={count("expiring")} active={band === "expiring"}>
          Expiring
        </FilterChip>
        <FilterChip href="/mandates?band=expired" count={count("expired")} active={band === "expired"}>
          Expired
        </FilterChip>
        <FilterChip href="/mandates?band=draft" count={count("draft")} active={band === "draft"}>
          Draft
        </FilterChip>
        <FilterChip href="/mandates?band=terminated" count={count("terminated")} active={band === "terminated"}>
          Ended
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={band ? "Nothing in that state" : "No mandates recorded"}
          description={
            band
              ? "Clear the filter to see every mandate."
              : "Record the appointment each owner has given you, and the product can tell you what you are allowed to do on their behalf."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>What you may do</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead>Runs to</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link href={`/mandates/${m.id}`} className="font-medium text-neutral-900 hover:underline">
                    {m.mandate_code}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/owners/${m.owner_id}`} className="font-medium text-neutral-900 hover:underline">
                    {m.owner_name}
                  </Link>
                </TableCell>
                <TableCell className="text-neutral-600">
                  {APPOINTMENT_LABELS[m.mandate_type] ?? m.mandate_type}
                  <span className="block text-xs text-neutral-500">
                    {m.authority.may_sign_lease ? "May sign tenancies" : "Owner signs"}
                    {m.authority.maintenance_spend_cap > 0
                      ? ` · spend to ${formatCurrency(m.authority.maintenance_spend_cap)}`
                      : " · no spend authority"}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-600">
                  {m.properties.length === 0
                    ? "No property named"
                    : m.properties.length === 1
                      ? m.properties[0].name
                      : `${m.properties.length} properties`}
                </TableCell>
                <TableCell className="text-right tabular-nums text-neutral-600">{m.units}</TableCell>
                <TableCell>
                  <Badge variant={m.is_exclusive ? "outline" : "warning"}>
                    {m.is_exclusive ? "Exclusive" : "Open"}
                  </Badge>
                </TableCell>
                <TableCell className="text-neutral-600">
                  {formatDate(m.ends_on)}
                  {m.band === "expiring" ? (
                    <span className="block text-xs text-amber-700">{m.daysLeft} days</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right"><StatusBadge status={m.band} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="mt-5 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
        <span className="font-medium text-neutral-900">Why this matters.</span>{" "}
        Every lease signed, deposit held and repair approved traces back to a
        mandate. Property the firm owns outright has none, which is what keeps
        the owned and managed books apart.
      </p>
    </>
  );
}
