import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, FileText, Home, Mail, Phone, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getTenant } from "@/features/owners/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Tenant detail.
 *
 * The tenants list has always linked each row to /tenants/{id} and the query
 * behind it was already written — only the page was missing, so every row
 * click returned a 404.
 */
export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const tenant = await getTenant(membership.organisationId, id);
  if (!tenant) notFound();

  const activeLease = tenant.leases.find((l) => l.status === "active") ?? null;
  const currentRent = activeLease?.monthly_rent ?? 0;

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={[tenant.nationality, tenant.employer]}
        breadcrumbs={[{ label: "Tenants", href: "/tenants" }, { label: tenant.name }]}
        actions={activeLease ? <StatusBadge status={activeLease.status} /> : null}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current rent"
          value={currentRent ? formatCurrency(currentRent) : "—"}
          icon={Banknote}
          sublabel={activeLease ? activeLease.unit_label : "No active lease"}
        />
        <StatCard label="Tenancies" value={String(tenant.leases.length)} icon={FileText} sublabel="Past and present" />
        <StatCard label="Occupants" value={String(tenant.occupants.length)} icon={Users} sublabel="Registered with the tenancy" />
        <StatCard
          label="Lease ends"
          value={activeLease ? formatDate(activeLease.end_date) : "—"}
          icon={Home}
          sublabel={activeLease ? activeLease.lease_code : "Not currently letting"}
        />
      </div>

      {/* Detail screens in this app are a tab bar over a full-width table,
          the pattern the lease screen already uses. */}
      <Tabs defaultValue="leases">
        <TabsList>
          <TabsTrigger value="leases">Tenancies</TabsTrigger>
          <TabsTrigger value="occupants">Occupants</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="leases">
            {tenant.leases.length === 0 ? (
              <EmptyState icon={FileText} title="No tenancies yet" description="This tenant has never held a lease." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lease</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.leases.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell>
                        <Link href={`/leases/${lease.id}`} className="font-medium text-neutral-900 hover:underline">
                          {lease.lease_code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-neutral-600">{lease.unit_label || "—"}</TableCell>
                      <TableCell className="text-neutral-600">
                        {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(lease.monthly_rent)}</TableCell>
                      <TableCell className="text-right"><StatusBadge status={lease.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </TabsContent>

        <TabsContent value="occupants">
          {tenant.occupants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No occupants recorded"
              description="Nobody else is registered as living in the unit under this tenancy."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Relationship</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.occupants.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-neutral-900">{o.name}</TableCell>
                    <TableCell className="text-right text-neutral-600">{o.relationship ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Identity and contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="QID or passport" value={tenant.qid_or_passport} />
                <Field label="Nationality" value={tenant.nationality} />
                <Field label="Email" value={tenant.email} icon={Mail} />
                <Field label="Phone" value={tenant.phone} icon={Phone} />
                <Field label="Employer" value={tenant.employer} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency contact</CardTitle>
                <CardDescription>Who to call if the tenant cannot be reached.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="Name" value={tenant.emergency_contact_name} />
                <Field label="Phone" value={tenant.emergency_contact_phone} icon={Phone} />
                {tenant.notes ? (
                  <div className="pt-1">
                    <p className="mb-1 text-neutral-500">Notes</p>
                    <p className="whitespace-pre-line text-neutral-700">{tenant.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-neutral-900">
        {Icon && value ? <Icon className="h-3.5 w-3.5 text-neutral-400" /> : null}
        {value || "—"}
      </span>
    </div>
  );
}
