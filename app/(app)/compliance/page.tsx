import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileWarning, ShieldCheck } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listCompliance, REQUIREMENTS } from "@/features/compliance/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Every lease that needs registering, and what is still missing.
 *
 * Readiness is worked out from the documents already on file, so this screen
 * stays accurate without anyone keeping a second checklist up to date.
 */
export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const { membership } = await requireStaff();

  const [rows, all] = await Promise.all([
    listCompliance(membership.organisationId, { status, q }),
    listCompliance(membership.organisationId),
  ]);

  const count = (s: string) => all.filter((r) => r.status === s).length;
  const documentsNeeded = all.reduce((sum, r) => sum + r.missing, 0);

  return (
    <>
      <PageHeader
        title="Lease registration"
        description="Which leases have everything needed to register, and which are still waiting on paperwork."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ready to register"
          value={String(count("ready"))}
          icon={CheckCircle2}
          tone={count("ready") > 0 ? "success" : "default"}
          sublabel="Nothing outstanding"
        />
        <StatCard
          label="Missing one document"
          value={String(count("missing_documents"))}
          icon={FileWarning}
          tone={count("missing_documents") > 0 ? "warning" : "default"}
          sublabel="One upload away"
        />
        <StatCard
          label="Action required"
          value={String(count("action_required"))}
          icon={AlertTriangle}
          tone={count("action_required") > 0 ? "danger" : "default"}
          sublabel="Two or more documents short"
        />
        <StatCard
          label="Documents needed"
          value={String(documentsNeeded)}
          icon={ShieldCheck}
          sublabel={`Across ${all.length} leases`}
        />
      </div>

      <FilterRow>
        <FilterChip href="/compliance" count={all.length} active={!status}>All leases</FilterChip>
        <FilterChip
          href="/compliance?status=action_required"
          count={count("action_required")}
          active={status === "action_required"}
        >
          Action required
        </FilterChip>
        <FilterChip
          href="/compliance?status=missing_documents"
          count={count("missing_documents")}
          active={status === "missing_documents"}
        >
          Missing documents
        </FilterChip>
        <FilterChip href="/compliance?status=ready" count={count("ready")} active={status === "ready"}>
          Ready
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={status || q ? "Nothing matches that" : "No leases to register"}
          description={
            status || q
              ? "Try a different filter, or clear it to see every lease."
              : "Leases appear here once they move past draft."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lease</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Lease ends</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.leaseId}>
                <TableCell>
                  <Link
                    href={`/compliance/${r.leaseId}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {r.lease_code}
                  </Link>
                </TableCell>
                <TableCell className="text-neutral-600">{r.tenant_name}</TableCell>
                <TableCell className="text-neutral-600">
                  {r.property_name} · {r.unit_number}
                </TableCell>
                <TableCell>
                  {r.missing === 0 ? (
                    <span className="text-emerald-700">All {REQUIREMENTS.length} on file</span>
                  ) : (
                    <span className="text-red-700">
                      {r.missing} of {REQUIREMENTS.length} missing
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-neutral-600">{formatDate(r.end_date)}</TableCell>
                <TableCell className="text-right">
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
