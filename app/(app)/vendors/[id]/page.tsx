import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, FileText, Hammer, Mail, Phone, Receipt, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getVendor } from "@/features/vendors/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const vendor = await getVendor(membership.organisationId, id);
  if (!vendor) notFound();

  const { stats } = vendor;

  return (
    <>
      <PageHeader
        title={vendor.name}
        description={[vendor.trade, vendor.cr_number ? `CR ${vendor.cr_number}` : null]}
        breadcrumbs={[{ label: "Vendors", href: "/vendors" }, { label: vendor.name }]}
        actions={vendor.trade ? <Badge variant="outline">{vendor.trade}</Badge> : null}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open jobs" value={String(stats.openJobs)} icon={Wrench} sublabel="Not yet closed" />
        <StatCard label="Jobs all time" value={String(stats.totalJobs)} icon={Hammer} />
        <StatCard label="Spend" value={formatCurrency(stats.spend)} icon={Banknote} sublabel="Invoiced work, all time" />
        <StatCard
          label="Owed"
          value={formatCurrency(stats.unpaidValue)}
          icon={Receipt}
          tone={stats.unpaidValue > 0 ? "warning" : "default"}
          sublabel="Not yet paid"
        />
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          {vendor.jobs.length === 0 ? (
            <EmptyState icon={Wrench} title="No jobs yet" description="This vendor has not been assigned any work." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Where</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-neutral-900">{job.request_code}</TableCell>
                    <TableCell className="text-neutral-600">
                      {job.property_name} · {job.unit_number}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {job.scheduled_at ? formatDateTime(job.scheduled_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.actual_amount != null ? formatCurrency(job.actual_amount) : "—"}
                    </TableCell>
                    <TableCell className="text-right"><StatusBadge status={job.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {vendor.invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices" description="This vendor has not submitted an invoice." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-neutral-900">
                      {inv.invoice_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-neutral-600">{formatDate(inv.created_at)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.amount)}</TableCell>
                    <TableCell className="text-right"><StatusBadge status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="contacts">
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Main contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="Email" value={vendor.email} icon={Mail} />
                <Field label="Phone" value={vendor.phone} icon={Phone} />
                <Field label="CR number" value={vendor.cr_number} />
                {vendor.notes ? (
                  <div className="pt-1">
                    <p className="mb-1 text-neutral-500">Notes</p>
                    <p className="whitespace-pre-line text-neutral-700">{vendor.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
                <CardDescription>Named contacts at this vendor.</CardDescription>
              </CardHeader>
              <CardContent>
                {vendor.contacts.length === 0 ? (
                  <p className="text-sm text-neutral-500">None recorded.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {vendor.contacts.map((c) => (
                      <li key={c.id}>
                        <p className="font-medium text-neutral-900">
                          {c.name}
                          {c.role ? <span className="ml-1.5 text-xs text-neutral-500">{c.role}</span> : null}
                        </p>
                        <p className="text-neutral-600">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          {vendor.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents"
              description="Trade licence, insurance and any agreement would sit here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-neutral-900">{doc.title}</TableCell>
                    <TableCell><Badge variant="outline">{doc.category}</Badge></TableCell>
                    <TableCell className="text-right text-neutral-600">{formatDate(doc.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-neutral-900">
        {Icon && value ? <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" /> : null}
        {value || "—"}
      </span>
    </div>
  );
}
