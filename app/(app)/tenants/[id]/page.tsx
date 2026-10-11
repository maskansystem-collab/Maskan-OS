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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tenancies</CardTitle>
            <CardDescription>Every lease held by this tenant, most recent first.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="QID or passport" value={tenant.qid_or_passport} />
              <Field label="Email" value={tenant.email} icon={Mail} />
              <Field label="Phone" value={tenant.phone} icon={Phone} />
              <Field label="Employer" value={tenant.employer} />
              <Field label="Emergency contact" value={tenant.emergency_contact_name} />
              <Field label="Emergency phone" value={tenant.emergency_contact_phone} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Occupants</CardTitle>
              <CardDescription>Others living in the unit under this tenancy.</CardDescription>
            </CardHeader>
            <CardContent>
              {tenant.occupants.length === 0 ? (
                <p className="text-sm text-neutral-500">None recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {tenant.occupants.map((o) => (
                    <li key={o.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-neutral-900">{o.name}</span>
                      <span className="text-xs text-neutral-500">{o.relationship ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {tenant.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-neutral-600">{tenant.notes}</p>
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
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-neutral-900">
        {Icon && value ? <Icon className="h-3.5 w-3.5 text-neutral-400" /> : null}
        {value || "—"}
      </span>
    </div>
  );
}
