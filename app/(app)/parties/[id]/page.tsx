import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote, Clock, FileText, Hammer, Receipt, ShieldCheck, TriangleAlert, Wrench,
} from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getVendor } from "@/features/vendors/queries";
import { listParties, listPartyAgreements } from "@/features/parties/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * One party: their work, their money, and the terms they work under.
 *
 * The "terms" tab is the prototype's vendor-terms screen. It is a tab
 * rather than a page of its own because nobody opens an agreement
 * without first opening the party it belongs to.
 */
export default async function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const [vendor, parties, agreements] = await Promise.all([
    getVendor(membership.organisationId, id),
    listParties(membership.organisationId),
    listPartyAgreements(membership.organisationId, id),
  ]);

  if (!vendor) notFound();

  const party = parties.find((p) => p.id === id);
  const internal = party?.is_internal ?? false;
  const current = agreements.find((a) => a.isCurrent) ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const expired = [
    current?.insurance_expires_on && current.insurance_expires_on < today ? "Insurance" : null,
    current?.licence_expires_on && current.licence_expires_on < today ? "Trade licence" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title={vendor.name}
        description={[
          internal ? "In-house team" : "External company",
          party?.department_name,
          vendor.trade,
          vendor.cr_number ? `CR ${vendor.cr_number}` : null,
        ]}
        breadcrumbs={[{ label: "People and providers", href: "/parties" }, { label: vendor.name }]}
        actions={
          <Badge variant={internal ? "success" : "info"}>
            {internal ? "In-house" : "External"}
          </Badge>
        }
      />

      {expired.length > 0 ? (
        <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3.5 text-[12.5px] leading-relaxed text-red-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <span>
            <span className="font-semibold">{expired.join(" and ")} has expired.</span> Work
            assigned now is being done by a company whose cover is out of date.
          </span>
        </div>
      ) : null}

      {!internal && agreements.length === 0 ? (
        <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-[12.5px] leading-relaxed text-amber-900">
          <FileText className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="font-semibold">No agreement on file.</span> Response times,
            rates and payment terms are whatever was agreed verbally.
          </span>
        </div>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open jobs" value={String(vendor.stats.openJobs)} icon={Wrench} sublabel="Not yet closed" />
        <StatCard label="Jobs all time" value={String(vendor.stats.totalJobs)} icon={Hammer} />
        <StatCard
          label={internal ? "Cost of work" : "Spend"}
          value={formatCurrency(internal ? (party?.valueThisYear ?? 0) : vendor.stats.spend)}
          icon={Banknote}
          sublabel={internal ? "This year, at the internal rate" : "Invoiced work, all time"}
        />
        {internal ? (
          <StatCard
            label="Internal rate"
            value={party?.internal_rate_qar != null ? `${formatCurrency(party.internal_rate_qar)}/hr` : "Not set"}
            icon={Clock}
            tone={party?.internal_rate_qar == null ? "warning" : "default"}
            sublabel="What a job is charged at internally"
          />
        ) : (
          <StatCard
            label="Owed"
            value={formatCurrency(vendor.stats.unpaidValue)}
            icon={Receipt}
            tone={vendor.stats.unpaidValue > 0 ? "warning" : "default"}
            sublabel="Submitted or approved, not paid"
          />
        )}
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          {internal ? null : <TabsTrigger value="invoices">Invoices</TabsTrigger>}
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          {vendor.jobs.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No jobs yet"
              description={internal ? "Nothing has been put in this team's queue." : "This company has not been assigned any work."}
            />
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
                    <TableCell className="text-right tabular-nums">
                      {job.actual_amount != null ? formatCurrency(job.actual_amount) : "—"}
                    </TableCell>
                    <TableCell className="text-right"><StatusBadge status={job.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="terms">
          {internal ? (
            <Card>
              <CardHeader><CardTitle>How this team is costed</CardTitle></CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  <Row label="Internal rate">
                    {party?.internal_rate_qar != null
                      ? `${formatCurrency(party.internal_rate_qar)} per hour`
                      : "Not set"}
                  </Row>
                  <Row label="Desk">{party?.department_name ?? "No desk"}</Row>
                  <Row label="Does">
                    {party?.service_function === "both"
                      ? "Leasing and maintenance"
                      : party?.service_function ?? "—"}
                  </Row>
                  <Row label="Invoices">None — in-house work is not invoiced</Row>
                </dl>
                <p className="mt-3.5 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
                  An in-house job still carries a cost, charged at the internal
                  rate so a department&apos;s numbers show what its work actually
                  consumed. Nothing is billed to anyone.
                </p>
              </CardContent>
            </Card>
          ) : agreements.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No agreement recorded"
              description="Record the response time, rates and payment terms, and the product can tell you when cover lapses."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {agreements.map((a) => (
                <Card key={a.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {a.title}
                      {a.isCurrent ? (
                        <Badge variant="success">In force</Badge>
                      ) : (
                        <Badge variant="outline">Superseded</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="divide-y divide-neutral-100 text-sm">
                      <Row label="Runs">
                        {formatDate(a.starts_on)}
                        {a.ends_on ? ` → ${formatDate(a.ends_on)}` : " → open ended"}
                      </Row>
                      <Row label="Response time">
                        {a.response_hours != null ? `${a.response_hours} hours` : "Not agreed"}
                      </Row>
                      <Row label="Callout fee">
                        {a.callout_fee != null ? formatCurrency(a.callout_fee) : "None"}
                      </Row>
                      <Row label="Hourly rate">
                        {a.hourly_rate != null ? `${formatCurrency(a.hourly_rate)} per hour` : "Quoted per job"}
                      </Row>
                      <Row label="Payment terms">{a.payment_terms_days} days</Row>
                      <Row label="Insurance">
                        {a.insurance_expires_on ? (
                          <span className={a.insurance_expires_on < today ? "font-semibold text-red-700" : undefined}>
                            {a.insurance_expires_on < today ? "Expired " : "Valid to "}
                            {formatDate(a.insurance_expires_on)}
                          </span>
                        ) : (
                          <span className="text-amber-700">Not recorded</span>
                        )}
                      </Row>
                      <Row label="Trade licence">
                        {a.licence_expires_on ? (
                          <span className={a.licence_expires_on < today ? "font-semibold text-red-700" : undefined}>
                            {a.licence_expires_on < today ? "Expired " : "Valid to "}
                            {formatDate(a.licence_expires_on)}
                          </span>
                        ) : (
                          <span className="text-amber-700">Not recorded</span>
                        )}
                      </Row>
                    </dl>
                    {a.notes ? (
                      <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-neutral-600">
                        {a.notes}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {internal ? null : (
          <TabsContent value="invoices">
            {vendor.invoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices" description="Nothing has been submitted." />
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
                      <TableCell className="font-medium text-neutral-900">{inv.invoice_number ?? "—"}</TableCell>
                      <TableCell className="text-neutral-600">{formatDate(inv.created_at)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                      <TableCell className="text-right"><StatusBadge status={inv.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        )}

        <TabsContent value="contacts">
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Main contact</CardTitle></CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  <Row label="Email">{vendor.email ?? "—"}</Row>
                  <Row label="Phone">{vendor.phone ?? "—"}</Row>
                  <Row label="CR number">{vendor.cr_number ?? "—"}</Row>
                </dl>
                {vendor.notes ? (
                  <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-neutral-600">
                    {vendor.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>People</CardTitle></CardHeader>
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
                        <p className="text-neutral-600">
                          {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                        </p>
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
              icon={ShieldCheck}
              title="No documents"
              description="Trade licence, insurance certificate and the signed agreement sit here."
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

      <p className="mt-5 text-[12.5px] text-neutral-500">
        Also reachable as <Link href={`/vendors/${id}`} className="hover:underline">the vendor record</Link>,
        which is the same party seen from the maintenance side.
      </p>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-900">{children}</dd>
    </div>
  );
}
