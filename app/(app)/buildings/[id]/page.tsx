import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building, DoorOpen, FileText, Home, Layers, Receipt, Wallet, Wrench,
} from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getBuildingDetail } from "@/features/properties/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireStaff();

  const building = await getBuildingDetail(membership.organisationId, id);
  if (!building) notFound();

  const { stats } = building;
  const occupancy = stats.units > 0 ? Math.round((stats.occupied / stats.units) * 100) : 0;

  return (
    <>
      <PageHeader
        title={building.name}
        description={[
          building.property?.name,
          building.floors ? `${building.floors} floors` : null,
        ]}
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          ...(building.property
            ? [{ label: building.property.name, href: `/properties/${building.property.id}` }]
            : []),
          { label: "Buildings", href: "/buildings" },
          { label: building.name },
        ]}
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Floors" value={building.floors ?? "—"} icon={Building} />
        <StatCard label="Units" value={String(stats.units)} icon={Home} />
        <StatCard
          label="Occupied"
          value={String(stats.occupied)}
          tone={stats.occupied > 0 ? "success" : "default"}
          icon={DoorOpen}
        />
        <StatCard
          label="Vacant"
          value={String(stats.vacant)}
          tone={stats.vacant > 0 ? "warning" : "default"}
          sublabel={stats.maintenance > 0 ? `${stats.maintenance} under maintenance` : undefined}
        />
        <StatCard
          label="Occupancy"
          value={`${occupancy}%`}
          progress={occupancy}
          tone={occupancy >= 80 ? "success" : occupancy >= 50 ? "default" : "warning"}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="flex min-w-0 flex-col gap-3">
              <Card>
                <CardHeader><CardTitle>Building details</CardTitle></CardHeader>
                <CardContent>
                  <dl className="divide-y divide-neutral-100 text-sm">
                    {([
                      ["Property", building.property
                        ? <Link href={`/properties/${building.property.id}`} className="hover:underline">
                            {building.property.name}
                          </Link>
                        : "—"],
                      ["Address", building.property?.address ?? "—"],
                      ["Floors", building.floors != null ? String(building.floors) : "—"],
                      ["Units", String(stats.units)],
                      ["Rent roll", formatCurrency(stats.rentRoll)],
                    ] as [string, React.ReactNode][]).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                        <dt className="shrink-0 text-neutral-500">{k}</dt>
                        <dd className="text-right text-neutral-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Occupancy by floor</CardTitle>
                  <CardDescription>
                    {stats.units > 0
                      ? `${stats.occupied} of ${stats.units} units let.`
                      : "No units recorded against this building yet."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {building.byFloor.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      Add a floor number to each unit and the breakdown appears here.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {building.byFloor.map((b) => {
                        const pct = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
                        return (
                          <div key={b.band}>
                            <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                              <span className="text-neutral-600">{b.band}</span>
                              <span className="tabular-nums text-neutral-500">
                                {b.occupied} of {b.total}
                              </span>
                            </div>
                            <div className="h-[6px] overflow-hidden rounded-full bg-neutral-100">
                              <div className="h-full rounded-full bg-neutral-900" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside>
              <Card>
                <CardHeader><CardTitle>Ownership</CardTitle></CardHeader>
                <CardContent>
                  {building.owners.length === 0 ? (
                    <p className="text-sm text-neutral-500">No owner is recorded.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {building.owners.map((o) => (
                        <div key={o.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/owners/${o.id}`} className="font-medium text-neutral-900 hover:underline">
                              {o.name}
                            </Link>
                            <p className="text-xs text-neutral-500">
                              {o.level === "unit" ? "Unit level" : "Property level"}
                            </p>
                          </div>
                          <span className="font-medium tabular-nums">{o.ownership_percentage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="units">
          {building.units.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No units in this building"
              description="Units are assigned to a building when they are created or edited."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Floor</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger">
                {building.units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/units/${u.id}`} className="font-medium text-neutral-900 hover:underline">
                        {u.unit_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">{u.floor ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">
                      {[u.unit_type, u.area_sqm ? `${u.area_sqm} m²` : null, u.furnishing]
                        .filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-neutral-600">{u.tenant_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.current_rent ? formatCurrency(u.current_rent) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="leases">
          {building.leases.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leases in this building"
              description="A lease appears here once a unit in the building is let."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lease</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {building.leases.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/leases/${l.id}`} className="font-medium text-neutral-900 hover:underline">
                        {l.lease_code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral-600">{l.tenant_name}</TableCell>
                    <TableCell className="text-neutral-600">{l.unit_number}</TableCell>
                    <TableCell className="text-neutral-600">
                      {formatDate(l.start_date)} → {formatDate(l.end_date)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(l.monthly_rent)}</TableCell>
                    <TableCell><StatusBadge status={l.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          {building.requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nothing reported"
              description="Maintenance raised on any unit in this building appears here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {building.requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/maintenance/${r.id}`} className="font-medium text-neutral-900 hover:underline">
                        {r.request_code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral-600">{r.unit_number ?? "—"}</TableCell>
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

        <TabsContent value="financials">
          <div className="stagger mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Rent roll" value={formatCurrency(stats.rentRoll)} icon={Wallet} />
            <StatCard
              label="Collected this month"
              value={formatCurrency(stats.collected)}
              tone={stats.collected > 0 ? "success" : "default"}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(stats.outstanding)}
              tone={stats.outstanding > 0 ? "warning" : "default"}
            />
            <StatCard label="Expenses this month" value={formatCurrency(stats.monthExpenses)} />
          </div>

          {building.expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Expenses are booked against the property, and the ones for this property appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {building.expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-neutral-600">{formatDate(e.expense_date)}</TableCell>
                    <TableCell className="font-medium text-neutral-900">{e.description ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">{e.category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(e.amount)}</TableCell>
                    <TableCell><StatusBadge status={e.approval_status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState
            icon={FileText}
            title="No documents on the building"
            description="Insurance certificates, lift contracts and fire safety inspections are filed against the property — see its Documents tab."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
