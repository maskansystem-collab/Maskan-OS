import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote, CalendarClock, FileText, History, Ruler, Sofa, TriangleAlert, Wrench,
} from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { getUnitDetail } from "@/features/properties/queries";
import { UnitFormDialog } from "@/features/properties/components/unit-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * One unit — the record everything else in the product hangs off.
 *
 * Six tabs, as in the prototype. The overview keeps its aside, because
 * who lives here and who owns it is context you glance at while reading
 * the record, not a table you work through.
 */
export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "properties.manage");

  const unit = await getUnitDetail(membership.organisationId, id);
  if (!unit) notFound();

  const { currentLease: lease, stats } = unit;
  const paid = unit.instalments.filter((i) => i.status === "paid").length;
  const partial = unit.instalments.filter((i) => i.status === "partial").length;
  const overdue = unit.instalments.filter((i) => i.status === "overdue").length;
  const upcoming = unit.instalments.filter((i) => i.status === "upcoming").length;

  return (
    <>
      <PageHeader
        title={`Unit ${unit.unit_number}`}
        description={[
          unit.property?.name,
          unit.building?.name,
          unit.floor ? `Floor ${unit.floor}` : null,
        ]}
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          ...(unit.property ? [{ label: unit.property.name, href: `/properties/${unit.property.id}` }] : []),
          { label: unit.unit_number },
        ]}
        actions={
          <>
            <StatusBadge status={unit.status} />
            {lease ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/leases/${lease.id}`}>View lease</Link>
              </Button>
            ) : null}
            {canManage ? <UnitFormDialog propertyId={unit.property?.id ?? ""} /> : null}
          </>
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Current rent"
          value={unit.current_rent ? formatCurrency(unit.current_rent) : "—"}
          icon={Banknote}
          sublabel={unit.market_rent ? `Market ${formatCurrency(unit.market_rent)}` : "No market rent set"}
        />
        <StatCard
          label="Next rent due"
          value={stats.nextDue ? formatDate(stats.nextDue) : "—"}
          icon={CalendarClock}
          sublabel={stats.nextAmount != null ? formatCurrency(stats.nextAmount) : "Nothing scheduled"}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstanding)}
          tone={stats.outstanding > 0 ? "danger" : "default"}
          sublabel={stats.outstanding > 0 ? "Across the schedule" : "Nothing owed"}
        />
        <StatCard
          label="Area"
          value={unit.area_sqm ? `${unit.area_sqm} m²` : "—"}
          icon={Ruler}
          sublabel={[
            unit.bedrooms != null ? `${unit.bedrooms} bed` : null,
            unit.bathrooms != null ? `${unit.bathrooms} bath` : null,
          ].filter(Boolean).join(" · ") || undefined}
        />
        <StatCard
          label="Furnishing"
          value={unit.furnishing ?? "—"}
          icon={Sofa}
          sublabel={unit.unit_type ?? undefined}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lease">Lease</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader>
                <CardTitle>Unit record</CardTitle>
                <CardDescription>
                  The central record everything else in Maskan hangs off.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  {([
                    ["Property", unit.property
                      ? <Link href={`/properties/${unit.property.id}`} className="hover:underline">{unit.property.name}</Link>
                      : "—"],
                    ["Building", unit.building?.name ?? "—"],
                    ["Floor", unit.floor ?? "—"],
                    ["Unit type", unit.unit_type ?? "—"],
                    ["Bedrooms", unit.bedrooms != null ? String(unit.bedrooms) : "—"],
                    ["Bathrooms", unit.bathrooms != null ? String(unit.bathrooms) : "—"],
                    ["Area", unit.area_sqm ? `${unit.area_sqm} m²` : "—"],
                    ["Furnishing", unit.furnishing ?? "—"],
                    ["Market rent", unit.market_rent ? formatCurrency(unit.market_rent) : "—"],
                    ["Current rent", unit.current_rent ? formatCurrency(unit.current_rent) : "—"],
                    ["Reference", unit.internal_code
                      ? <span className="font-mono text-[12px]">{unit.internal_code}</span>
                      : "—"],
                  ] as [string, React.ReactNode][]).map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                      <dt className="shrink-0 text-neutral-500">{k}</dt>
                      <dd className="text-right text-neutral-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <aside className="flex flex-col gap-3">
              <Card>
                <CardHeader><CardTitle>Current occupancy</CardTitle></CardHeader>
                <CardContent>
                  <dl className="divide-y divide-neutral-100 text-sm">
                    <Row label="Status"><StatusBadge status={unit.status} /></Row>
                    <Row label="Tenant">
                      {lease ? (
                        <Link href={`/tenants/${lease.tenant_id}`} className="hover:underline">
                          {lease.tenant_name}
                        </Link>
                      ) : "—"}
                    </Row>
                    <Row label="Lease">
                      {lease ? (
                        <Link href={`/leases/${lease.id}`} className="hover:underline">{lease.lease_code}</Link>
                      ) : "—"}
                    </Row>
                    <Row label="Owner">{lease?.owner_name ?? unit.owners[0]?.name ?? "—"}</Row>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ownership</CardTitle></CardHeader>
                <CardContent>
                  {unit.owners.length === 0 ? (
                    <p className="text-sm text-neutral-500">No owner is recorded.</p>
                  ) : (
                    <>
                      <div className="space-y-2 text-sm">
                        {unit.owners.map((o) => (
                          <div key={o.id} className="flex items-center justify-between gap-3">
                            <Link href={`/owners/${o.id}`} className="font-medium text-neutral-900 hover:underline">
                              {o.name}
                            </Link>
                            <span className="font-medium tabular-nums">{o.ownership_percentage}%</span>
                          </div>
                        ))}
                      </div>
                      {unit.ownedAtPropertyLevel ? (
                        <p className="mt-2.5 text-xs leading-relaxed text-neutral-500">
                          Held at property level — this unit is not separately titled.
                        </p>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="lease">
          {!lease ? (
            <EmptyState
              icon={FileText}
              title="No tenancy on this unit"
              description="The unit is vacant. A lease appears here once one is created against it."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{lease.lease_code}</CardTitle>
                <CardDescription>The tenancy currently on this unit.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-neutral-100 text-sm">
                  <Row label="Start date">{formatDate(lease.start_date)}</Row>
                  <Row label="End date">{formatDate(lease.end_date)}</Row>
                  <Row label="Rent">{formatCurrency(lease.monthly_rent)}</Row>
                  <Row label="Payment frequency">{lease.payment_frequency.replace(/_/g, " ")}</Row>
                  <Row label="Payment method">{lease.payment_method.replace(/_/g, " ")}</Row>
                  <Row label="Lease status"><StatusBadge status={lease.status} /></Row>
                </dl>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={`/leases/${lease.id}`}>Open full lease</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {unit.instalments.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No rent schedule"
              description="A schedule is generated when a lease on this unit is activated."
            />
          ) : (
            <>
              <div className="stagger mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Paid" value={String(paid)} tone={paid > 0 ? "success" : "default"} />
                <StatCard label="Partial" value={String(partial)} tone={partial > 0 ? "warning" : "default"} />
                <StatCard label="Overdue" value={String(overdue)} tone={overdue > 0 ? "danger" : "default"} />
                <StatCard label="Upcoming" value={String(upcoming)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unit.instalments.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-neutral-500">{i.instalment_number}</TableCell>
                      <TableCell className="text-neutral-600">{formatDate(i.due_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(i.original_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {i.outstanding_amount > 0 ? formatCurrency(i.outstanding_amount) : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          {unit.requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nothing reported"
              description="Maintenance raised against this unit appears here, open and closed."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unit.requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/maintenance/${r.id}`} className="font-medium text-neutral-900 hover:underline">
                        {r.request_code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral-600">{r.category ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={r.priority} /></TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">{r.ageDays}d</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {unit.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents"
              description="Handover checklists, inventories and move-in photos for this unit sit here."
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
                {unit.documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-neutral-900">{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{d.category}</Badge></TableCell>
                    <TableCell className="text-right text-neutral-600">{formatDate(d.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {unit.activity.length === 0 ? (
            <EmptyState
              icon={History}
              title="No activity recorded"
              description="Changes to the tenancy on this unit are listed here as they happen."
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
                {unit.activity.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-neutral-900">
                      {a.event_type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
                    </TableCell>
                    <TableCell className="text-neutral-600">{a.notes ?? "—"}</TableCell>
                    <TableCell className="text-right text-neutral-600">{formatDateTime(a.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {unit.status === "occupied" && !lease ? (
        <p className="mt-5 flex items-start gap-2 rounded-[10px] bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          This unit is marked occupied but has no lease on file. Either the lease
          was never created or the status is wrong.
        </p>
      ) : null}
    </>
  );
}

/** A label and value in one of the aside cards. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-900">{children}</dd>
    </div>
  );
}
