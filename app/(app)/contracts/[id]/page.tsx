import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Check, Clock, FileSignature, FileText, Globe, X } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getContract, SIGNATURE_METHOD_LABELS } from "@/features/contracts/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** One contract, and who has signed it. */
export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const c = await getContract(membership.organisationId, id);
  if (!c) notFound();

  return (
    <>
      <PageHeader
        title={c.contract_code}
        description={[c.subject, c.templateName]}
        breadcrumbs={[{ label: "Contracts", href: "/contracts" }, { label: c.contract_code }]}
        actions={
          <>
            <StatusBadge status={c.status} />
            {c.leaseId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/leases/${c.leaseId}`}>Open lease</Link>
              </Button>
            ) : c.mandateId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/mandates/${c.mandateId}`}>Open mandate</Link>
              </Button>
            ) : null}
          </>
        }
      />

      {c.status === "void" ? (
        <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-neutral-300 bg-neutral-100 px-4 py-3.5 text-[12.5px] leading-relaxed text-neutral-700">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
          <span>
            <span className="font-semibold">This contract is void.</span>{" "}
            {c.voided_reason}
          </span>
        </div>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Signatures"
          value={`${c.signed} of ${c.parties.length}`}
          icon={FileSignature}
          progress={c.parties.length > 0 ? Math.round((c.signed / c.parties.length) * 100) : 0}
          tone={c.outstanding === 0 && c.parties.length > 0 ? "success" : c.outstanding > 0 ? "warning" : "default"}
          sublabel={c.outstanding === 0 ? "Complete" : `${c.outstanding} outstanding`}
        />
        <StatCard
          label="Created"
          value={formatDate(c.created_at)}
          icon={Clock}
          sublabel={c.page_count ? `${c.page_count} pages` : undefined}
        />
        <StatCard
          label="Language"
          value={c.locale === "ar" ? "Arabic" : c.locale === "en" ? "English" : c.locale}
          icon={Globe}
        />
        <StatCard
          label="Generated from"
          value={c.templateName ?? "Uploaded"}
          icon={FileText}
          sublabel={
            c.templateName
              ? `${c.templateVariables.length} fields filled in`
              : "Not generated from a template"
          }
        />
      </div>

      <Tabs defaultValue="signatures">
        <TabsList>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="document">Document</TabsTrigger>
          <TabsTrigger value="trail">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle>Who signs</CardTitle>
              <CardDescription>
                Each party signs once, on screen or on paper. Both count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {c.parties.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No signing parties recorded, so nothing is being waited on.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {c.parties.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 py-3">
                      <span
                        className={
                          p.signed_at
                            ? "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                            : "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600"
                        }
                      >
                        {p.signed_at ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-neutral-900">
                          {p.party_name}
                          <span className="ml-2 text-xs font-normal text-neutral-500">{p.party_role}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {p.signed_at ? (
                            <>
                              {SIGNATURE_METHOD_LABELS[p.method ?? ""] ?? p.method} ·{" "}
                              {formatDateTime(p.signed_at)}
                              {p.signed_ip ? ` · from ${p.signed_ip}` : ""}
                            </>
                          ) : (
                            "Not signed yet"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {c.outstanding > 0 && c.status !== "void" ? (
            <p className="mt-4 rounded-[10px] bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800">
              {c.outstanding} {c.outstanding === 1 ? "party has" : "parties have"} not
              signed. Until they do, the agreement is not in force however complete
              the rest of the file looks.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="document">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  <Row label="Reference">{c.contract_code}</Row>
                  <Row label="Subject">{c.subject}</Row>
                  <Row label="About">
                    {c.leaseId ? (
                      <Link href={`/leases/${c.leaseId}`} className="hover:underline">{c.leaseCode}</Link>
                    ) : c.mandateId ? (
                      <Link href={`/mandates/${c.mandateId}`} className="hover:underline">{c.mandateCode}</Link>
                    ) : "—"}
                  </Row>
                  <Row label="Template">{c.templateName ?? "Uploaded"}</Row>
                  <Row label="Language">
                    {c.locale === "ar" ? "Arabic" : c.locale === "en" ? "English" : c.locale}
                  </Row>
                  <Row label="Pages">{c.page_count != null ? String(c.page_count) : "—"}</Row>
                  <Row label="File">{c.storage_path ? "On file" : "Not uploaded"}</Row>
                </dl>
              </CardContent>
            </Card>

            {c.templateVariables.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Fields the template fills in</CardTitle>
                <CardDescription>
                  Read from the template body, so this is what it actually asks
                  for rather than a separate list to keep in step.
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {c.templateVariables.map((v) => (
                      <span
                        key={v}
                        className="rounded-[6px] bg-neutral-100 px-1.5 py-0.5 font-mono text-[11.5px] text-neutral-700"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="trail">
          {/* The signature records are the audit trail: each carries its
              method, its moment and where it came from. There is nothing
              separate to show, and inventing a second log would mean two
              accounts of the same event. */}
          {c.parties.filter((p) => p.signed_at).length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nothing signed yet"
              description="Each signature is recorded here with its method, its moment and the address it came from."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead className="text-right">Signed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.parties
                  .filter((p) => p.signed_at)
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-neutral-900">{p.party_name}</TableCell>
                      <TableCell className="text-neutral-600">{p.party_role}</TableCell>
                      <TableCell className="text-neutral-600">
                        {SIGNATURE_METHOD_LABELS[p.method ?? ""] ?? p.method ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-neutral-600">
                        {p.signed_ip ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-neutral-600">
                        {formatDateTime(p.signed_at!)}
                      </TableCell>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-900">{children}</dd>
    </div>
  );
}
