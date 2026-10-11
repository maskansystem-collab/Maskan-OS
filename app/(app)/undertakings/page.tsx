import Link from "next/link";
import { Building2, FileText, TriangleAlert, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listUndertakings, COVER_LABELS, CAP_PERIOD_LABELS } from "@/features/mandates/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Where someone other than the tenant settles a charge.
 *
 * The employer is not the tenant. When a company covers an employee's rent
 * or bills, the tenancy, the QID on file and the name on the cheques all
 * stay with the person living there. Recording the company as the tenant
 * instead would break lease registration, QID compliance and cheque
 * matching at once.
 */
export default async function UndertakingsPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; flag?: string }>;
}) {
  const { band, flag } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listUndertakings(membership.organisationId);
  let rows = band ? all.filter((u) => u.band === band) : all;
  if (flag === "mismatch") rows = rows.filter((u) => u.chequeNameMismatch);

  const count = (b: string) => all.filter((u) => u.band === b).length;
  const mismatched = all.filter((u) => u.chequeNameMismatch);
  const payers = new Set(all.map((u) => u.payer_name)).size;

  return (
    <>
      <PageHeader
        title="Undertakings"
        description="Where someone other than the tenant settles a charge, and the letter that proves it."
      />

      {count("expiring") > 0 || mismatched.length > 0 ? (
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          {count("expiring") > 0 ? (
            <Link
              href="/undertakings?band=expiring"
              className="flex flex-1 items-center gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900 transition-colors hover:border-amber-300"
            >
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {count("expiring")} letter{count("expiring") === 1 ? "" : "s"} expiring — liability reverts to the tenant
            </Link>
          ) : null}
          {mismatched.length > 0 ? (
            <Link
              href="/undertakings?flag=mismatch"
              className="flex flex-1 items-center gap-2.5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-900 transition-colors hover:border-red-300"
            >
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {mismatched.length} cheque{mismatched.length === 1 ? "" : "s"} drawn in a name that is not the tenant&apos;s
            </Link>
          ) : null}
        </div>
      ) : null}

      <p className="mb-5 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
        <span className="font-medium text-neutral-900">The payer is not the tenant.</span>{" "}
        When a company covers an employee&apos;s rent or bills, the tenancy, the
        QID on file and the name on the cheques all stay with the person living
        there. What changes is who settles which charge, evidenced by a letter
        with its own expiry date.
      </p>

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live undertakings"
          value={String(count("active") + count("expiring"))}
          icon={FileText}
          sublabel={`${count("draft")} draft · ${count("lapsed")} lapsed`}
        />
        <StatCard label="Payers involved" value={String(payers)} icon={Building2} />
        <StatCard
          label="Expiring soon"
          value={String(count("expiring"))}
          tone={count("expiring") > 0 ? "warning" : "default"}
          sublabel="Liability reverts to the tenant"
        />
        <StatCard
          label="Name mismatches"
          value={String(mismatched.length)}
          tone={mismatched.length > 0 ? "danger" : "default"}
          icon={Users}
          sublabel="Cheque name is not the tenant"
        />
      </div>

      <FilterRow>
        <FilterChip href="/undertakings" count={all.length} active={!band && !flag}>All</FilterChip>
        <FilterChip href="/undertakings?band=active" count={count("active")} active={band === "active"}>
          Active
        </FilterChip>
        <FilterChip href="/undertakings?band=expiring" count={count("expiring")} active={band === "expiring"}>
          Expiring
        </FilterChip>
        <FilterChip href="/undertakings?band=lapsed" count={count("lapsed")} active={band === "lapsed"}>
          Lapsed
        </FilterChip>
        <FilterChip href="/undertakings?flag=mismatch" count={mismatched.length} active={flag === "mismatch"}>
          Name mismatch
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={band || flag ? "Nothing matches that" : "No undertakings recorded"}
          description={
            band || flag
              ? "Clear the filter to see everything."
              : "Record an undertaking when an employer or anyone else agrees to settle part of a tenant's bill."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Covers</TableHead>
              <TableHead className="text-right">Cap</TableHead>
              <TableHead>On the cheques</TableHead>
              <TableHead>Letter expires</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/undertakings/${u.id}`} className="font-medium text-neutral-900 hover:underline">
                    {u.undertaking_code}
                  </Link>
                  <span className="block text-xs text-neutral-500">{u.lease_code}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-neutral-900">{u.tenant_name}</span>
                  <span className="block text-xs text-neutral-500">
                    {u.property_name} · {u.unit_number}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-600">
                  {u.payer_name}
                  {u.payer_cr_number ? (
                    <span className="block text-xs text-neutral-500">CR {u.payer_cr_number}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">{COVER_LABELS[u.covers] ?? u.covers}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {u.cap_amount == null ? (
                    <span className="text-neutral-400">No cap</span>
                  ) : (
                    <>
                      {formatCurrency(u.cap_amount)}
                      <span className="block text-xs text-neutral-500">
                        {CAP_PERIOD_LABELS[u.cap_period] ?? u.cap_period}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  {u.chequeNameMismatch ? (
                    <span className="font-medium text-red-700">{u.cheque_payer_name}</span>
                  ) : (
                    <span className="text-neutral-600">{u.cheque_payer_name ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {u.letter_expires_on ? formatDate(u.letter_expires_on) : "—"}
                  {u.band === "expiring" && u.daysLeft != null ? (
                    <span className="block text-xs text-amber-700">{u.daysLeft} days</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right"><StatusBadge status={u.band} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
