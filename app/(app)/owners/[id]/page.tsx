import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, Building2, DoorOpen, Mail, Percent, Phone } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getOwner } from "@/features/owners/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Owner detail.
 *
 * Linked from the owners list and from each property's ownership panel, both
 * of which pointed at a page that did not exist.
 */
export default async function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const owner = await getOwner(membership.organisationId, id);
  if (!owner) notFound();

  const { stats } = owner;
  const occupancy = stats.units > 0 ? Math.round((stats.occupiedUnits / stats.units) * 100) : 0;

  return (
    <>
      <PageHeader
        title={owner.name}
        description={[owner.kind === "company" ? "Company" : "Individual", owner.qid_or_cr]}
        breadcrumbs={[{ label: "Owners", href: "/owners" }, { label: owner.name }]}
        actions={<Badge variant="outline">{owner.kind === "company" ? "Company" : "Individual"}</Badge>}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={String(stats.properties)} icon={Building2} sublabel="Held under mandate or owned" />
        <StatCard label="Units" value={String(stats.units)} icon={DoorOpen} sublabel={`${stats.occupiedUnits} occupied`} />
        <StatCard
          label="Occupancy"
          value={`${occupancy}%`}
          tone={occupancy >= 90 ? "success" : "default"}
          progress={occupancy}
          sublabel={`${stats.units - stats.occupiedUnits} vacant`}
        />
        <StatCard
          label="Rent under management"
          value={formatCurrency(stats.monthlyRent)}
          icon={Banknote}
          sublabel="Monthly, active leases"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
            <CardDescription>What this owner holds, and how much of each.</CardDescription>
          </CardHeader>
          <CardContent>
            {owner.properties.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No properties linked"
                description="This owner is not recorded against any property yet."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owner.properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <Link href={`/properties/${property.id}`} className="font-medium text-neutral-900 hover:underline">
                          {property.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-neutral-600">{property.property_code}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-900">
                          {Number(property.ownership_percentage)}
                          <Percent className="h-3 w-3 text-neutral-400" />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label={owner.kind === "company" ? "CR number" : "QID"} value={owner.qid_or_cr} />
              <Field label="Email" value={owner.email} icon={Mail} />
              <Field label="Phone" value={owner.phone} icon={Phone} />
              <Field label="Address" value={owner.address} />
            </CardContent>
          </Card>

          {owner.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-neutral-600">{owner.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-neutral-900">
        {Icon && value ? <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> : null}
        {value || "—"}
      </span>
    </div>
  );
}
