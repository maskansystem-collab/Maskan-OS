import Link from "next/link";
import { Check, Clock, FileSignature, FileText } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listContracts } from "@/features/contracts/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** Generated from a template, signed on screen or on paper, every version kept. */
export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listContracts(membership.organisationId);
  const rows = await listContracts(membership.organisationId, { status, q });

  const count = (s: string) => all.filter((c) => c.status === s).length;
  const awaiting = all.filter(
    (c) => c.status === "awaiting_signature" || c.status === "partially_signed"
  );
  const outstanding = awaiting.reduce((s, c) => s + c.outstanding, 0);

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Generated from a template, signed on screen or on paper, with every version kept."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/templates">Templates</Link>
          </Button>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Fully signed"
          value={String(count("fully_signed"))}
          icon={Check}
          tone={count("fully_signed") > 0 ? "success" : "default"}
        />
        <StatCard
          label="Awaiting signature"
          value={String(awaiting.length)}
          icon={Clock}
          tone={awaiting.length > 0 ? "warning" : "default"}
          sublabel={`${outstanding} signature${outstanding === 1 ? "" : "s"} outstanding`}
        />
        <StatCard label="Drafts" value={String(count("draft"))} icon={FileText} />
        <StatCard
          label="Void"
          value={String(count("void"))}
          sublabel={count("void") > 0 ? "Superseded or cancelled" : "None"}
        />
      </div>

      <FilterRow>
        <FilterChip href="/contracts" count={all.length} active={!status}>All</FilterChip>
        <FilterChip href="/contracts?status=draft" count={count("draft")} active={status === "draft"}>
          Draft
        </FilterChip>
        <FilterChip
          href="/contracts?status=awaiting_signature"
          count={count("awaiting_signature")}
          active={status === "awaiting_signature"}
        >
          Awaiting signature
        </FilterChip>
        <FilterChip
          href="/contracts?status=partially_signed"
          count={count("partially_signed")}
          active={status === "partially_signed"}
        >
          Partially signed
        </FilterChip>
        <FilterChip
          href="/contracts?status=fully_signed"
          count={count("fully_signed")}
          active={status === "fully_signed"}
        >
          Fully signed
        </FilterChip>
        <FilterChip href="/contracts?status=void" count={count("void")} active={status === "void"}>
          Void
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={status || q ? "Nothing matches that" : "No contracts yet"}
          description={
            status || q
              ? "Clear the filter to see everything."
              : "Generate a contract from a template and it appears here with its signature trail."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>About</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Signatures</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contracts/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                    {c.contract_code}
                  </Link>
                  {c.page_count ? (
                    <span className="block text-xs text-neutral-500">{c.page_count} pages</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {c.templateName ?? <span className="text-neutral-400">Uploaded, not generated</span>}
                  <span className="block text-xs text-neutral-500">
                    {c.locale === "ar" ? "Arabic" : c.locale === "en" ? "English" : c.locale}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-600">{c.subject}</TableCell>
                <TableCell className="text-neutral-600">
                  {c.leaseId ? (
                    <Link href={`/leases/${c.leaseId}`} className="hover:underline">{c.leaseCode}</Link>
                  ) : c.mandateId ? (
                    <Link href={`/mandates/${c.mandateId}`} className="hover:underline">{c.mandateCode}</Link>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-neutral-600">{formatDate(c.created_at)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={c.outstanding > 0 ? "font-medium text-amber-700" : "text-neutral-900"}>
                    {c.signed} of {c.parties.length}
                  </span>
                </TableCell>
                <TableCell className="text-right"><StatusBadge status={c.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
