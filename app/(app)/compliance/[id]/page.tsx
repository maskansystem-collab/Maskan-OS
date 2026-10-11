import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, Check, CheckCircle2, Clock, FileText, History, X } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getComplianceDetail, REQUIREMENTS } from "@/features/compliance/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysUntil, formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * One lease's registration file.
 *
 * The checklist is the screen: everything else is context for the person
 * chasing the missing document.
 */
export default async function ComplianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const file = await getComplianceDetail(membership.organisationId, id);
  if (!file) notFound();

  const daysLeft = daysUntil(file.end_date);

  return (
    <>
      <PageHeader
        title={file.lease_code}
        description={[file.tenant_name, file.property_name, file.unit_number]}
        breadcrumbs={[
          { label: "Lease registration", href: "/compliance" },
          { label: file.lease_code },
        ]}
        actions={
          <>
            <StatusBadge status={file.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/leases/${file.leaseId}`}>Open lease</Link>
            </Button>
          </>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Documents on file"
          value={`${REQUIREMENTS.length - file.missing} of ${REQUIREMENTS.length}`}
          icon={CheckCircle2}
          progress={Math.round(((REQUIREMENTS.length - file.missing) / REQUIREMENTS.length) * 100)}
          tone={file.missing === 0 ? "success" : file.missing === 1 ? "warning" : "danger"}
          sublabel={file.missing === 0 ? "Ready to register" : `${file.missing} still needed`}
        />
        <StatCard
          label="Monthly rent"
          value={formatCurrency(file.monthly_rent)}
          icon={Banknote}
          sublabel={`Deposit ${formatCurrency(file.security_deposit)}`}
        />
        <StatCard
          label="Lease ends"
          value={formatDate(file.end_date)}
          icon={Clock}
          tone={daysLeft <= 60 ? "warning" : "default"}
          sublabel={daysLeft > 0 ? `${daysLeft} days to run` : `Ended ${Math.abs(daysLeft)} days ago`}
        />
        <StatCard
          label="Lease status"
          value={file.lease_status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
          icon={FileText}
          sublabel={file.owner_name ? `Owner ${file.owner_name}` : "No owner recorded"}
        />
      </div>

      <Tabs defaultValue="required">
        <TabsList>
          <TabsTrigger value="required">Required documents</TabsTrigger>
          <TabsTrigger value="onfile">On file</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="required">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Where it lives</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REQUIREMENTS.map((req) => {
                const present = file.onFile[req.key];
                return (
                  <TableRow key={req.key}>
                    <TableCell>
                      <span className="flex items-center gap-2.5 font-medium text-neutral-900">
                        <span
                          className={
                            present
                              ? "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                              : "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-red-50 text-red-600"
                          }
                        >
                          {present ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </span>
                        {req.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-600">{WHERE[req.key]}</TableCell>
                    <TableCell className="text-right">
                      {present ? (
                        <Badge variant="success">On file</Badge>
                      ) : (
                        <Badge variant="danger">Needed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-4 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            Maskan records what you hold. It is not connected to any government
            system and nothing here is submitted anywhere.
          </p>
        </TabsContent>

        <TabsContent value="onfile">
          {file.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing uploaded yet"
              description="Documents added to the tenant, lease, owner or property all show up here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Attached to</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {file.documents.map((doc) => (
                  <TableRow key={`${doc.source}-${doc.id}`}>
                    <TableCell className="font-medium text-neutral-900">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.source}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-neutral-600">
                      {formatDate(doc.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="history">
          {file.events.length === 0 ? (
            <EmptyState
              icon={History}
              title="No history recorded"
              description="Changes to this lease will be listed here as they happen."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {file.events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-neutral-900">
                      {e.event_type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
                    </TableCell>
                    <TableCell className="text-neutral-600">{e.notes ?? "—"}</TableCell>
                    <TableCell className="text-right text-neutral-600">
                      {formatDateTime(e.created_at)}
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

/** Where each required document is uploaded, so the chase goes to the right screen. */
const WHERE: Record<string, string> = {
  tenant_qid: "Tenant record",
  tenant_passport: "Tenant record",
  signed_lease: "Lease documents",
  owner_documents: "Owner record",
  property_documents: "Property record",
};
