import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, Building2, DoorOpen, Users } from "lucide-react";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import { getAdminOrganisation } from "@/features/admin/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * One organisation, from the platform console.
 *
 * getAdminOrganisation was already written and called from nowhere — the
 * fourth finished query in this codebase with no page in front of it.
 */
export default async function AdminOrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePlatformSuperAdmin();

  const org = await getAdminOrganisation(id);
  if (!org) notFound();

  return (
    <>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Platform
      </Link>

      <PageHeader
        title={org.name}
        description={[org.slug, org.email, org.planName ? `${org.planName} plan` : "No plan"]}
        breadcrumbs={[{ label: "Organisations", href: "/admin" }, { label: org.name }]}
        actions={<StatusBadge status={org.status} />}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Rent under management"
          value={formatCurrency(org.monthlyRent)}
          icon={Banknote}
          sublabel={`${org.activeLeases} active leases`}
        />
        <StatCard
          label="Units"
          value={String(org.units)}
          icon={DoorOpen}
          sublabel={`across ${org.properties} properties`}
        />
        <StatCard
          label="People on the books"
          value={String(org.tenants + org.owners)}
          icon={Users}
          sublabel={`${org.tenants} tenants · ${org.owners} owners`}
        />
        <StatCard
          label="Team"
          value={String(org.members)}
          icon={Building2}
          sublabel={`Joined ${formatDate(org.created_at)}`}
        />
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          {org.memberList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nobody has joined yet"
              description="The organisation exists but no one has accepted an invitation."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.memberList.map((m) => (
                  <TableRow key={m.email}>
                    <TableCell className="font-medium text-neutral-900">{m.full_name}</TableCell>
                    <TableCell className="text-neutral-600">{m.email}</TableCell>
                    <TableCell className="text-right">
                      {m.roles.length === 0 ? (
                        <span className="text-neutral-400">No role</span>
                      ) : (
                        <span className="inline-flex flex-wrap justify-end gap-1">
                          {m.roles.map((r) => (
                            <Badge key={r} variant="outline">{r}</Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {org.recentAudit.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No activity recorded"
              description="Actions taken inside this organisation will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.recentAudit.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-neutral-900">{row.action}</TableCell>
                    <TableCell className="text-neutral-600">{row.entity_table}</TableCell>
                    <TableCell className="text-right text-neutral-600">
                      {formatDateTime(row.created_at)}
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
