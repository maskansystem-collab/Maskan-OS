import Link from "next/link";
import { FileSignature, FileText, FolderOpen, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listDocuments } from "@/features/documents/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const TYPES = ["Lease", "Tenant", "Property", "Vendor", "Other"] as const;

/**
 * Every file in the organisation, wherever it was uploaded.
 *
 * Documents are stored next to the record they belong to, which answers
 * "what does this lease have" but not "where is that file". This screen
 * answers the second question without storing anything twice.
 */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; category?: string }>;
}) {
  const { q, type, category } = await searchParams;
  const { membership } = await requireStaff();

  const [rows, all] = await Promise.all([
    listDocuments(membership.organisationId, { q, type, category }),
    listDocuments(membership.organisationId),
  ]);

  const byType = (t: string) => all.filter((d) => d.attachedType === t).length;
  const signedLeases = all.filter((d) => d.category === "Signed lease").length;
  const identity = all.filter((d) => d.category === "QID" || d.category === "Passport").length;
  const categories = [...new Set(all.map((d) => d.category))].sort();

  return (
    <>
      <PageHeader
        title="Documents"
        description="Every file linked to a property, lease, tenant, owner or vendor, in one place."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Files on record"
          value={String(all.length)}
          icon={FolderOpen}
          sublabel={`${categories.length} kinds of document`}
        />
        <StatCard
          label="Signed leases"
          value={String(signedLeases)}
          icon={FileSignature}
          sublabel={`of ${byType("Lease")} lease documents`}
        />
        <StatCard
          label="Identity documents"
          value={String(identity)}
          icon={Users}
          sublabel="QIDs and passports on file"
        />
        <StatCard
          label="Property documents"
          value={String(byType("Property"))}
          icon={FileText}
          sublabel="Title deeds, insurance and the rest"
        />
      </div>

      <FilterRow>
        <FilterChip href="/documents" count={all.length} active={!type && !category}>
          Everything
        </FilterChip>
        {TYPES.filter((t) => byType(t) > 0).map((t) => (
          <FilterChip key={t} href={`/documents?type=${t}`} count={byType(t)} active={type === t}>
            {t}
          </FilterChip>
        ))}
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={type || category || q ? "Nothing matches that" : "No documents yet"}
          description={
            type || category || q
              ? "Try a different filter, or clear it to see everything."
              : "Files uploaded against a lease, tenant, property or vendor all appear here."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Attached to</TableHead>
              <TableHead className="text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={`${d.attachedType}-${d.id}`}>
                <TableCell className="font-medium text-neutral-900">{d.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{d.category}</Badge>
                </TableCell>
                <TableCell>
                  {d.href ? (
                    <Link href={d.href} className="text-neutral-700 hover:underline">
                      {d.attachedTo}
                    </Link>
                  ) : (
                    <span className="text-neutral-600">{d.attachedTo}</span>
                  )}
                  <span className="ml-2 text-xs text-neutral-400">{d.attachedType}</span>
                </TableCell>
                <TableCell className="text-right text-neutral-600">{formatDate(d.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
