import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, FileText, Home, Layers, Receipt, Wallet, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import {
  getProperty, listUnitsForProperty, getOwnerOptions, getPropertyTabs,
} from "@/features/properties/queries";
import { PropertyForm } from "@/features/properties/components/property-form";
import { UnitFormDialog } from "@/features/properties/components/unit-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PROPERTY_TYPES } from "@/lib/validation/entities";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, membership } = await requireStaff();
  const canManage = hasPermission(ctx, membership.organisationId, "properties.manage");

  const property = await getProperty(membership.organisationId, id);
  if (!property) notFound();

  const [units, owners, tabs] = await Promise.all([
    listUnitsForProperty(membership.organisationId, id),
    canManage ? getOwnerOptions(membership.organisationId) : Promise.resolve([]),
    getPropertyTabs(membership.organisationId, id),
  ]);

  // The fee the schedule agreed, and what it comes to on what was
  // collected this month. A percentage fee of nothing is nothing, which is
  // the honest figure to show.
  const feeLabel =
    property.management_fee_value == null
      ? "—"
      : property.management_fee_type === "percentage"
        ? `${property.management_fee_value}% of rent collected`
        : `${formatCurrency(property.management_fee_value)} per month`;
  const managementFee =
    property.management_fee_value == null
      ? null
      : property.management_fee_type === "percentage"
        ? (tabs.financials.collected * Number(property.management_fee_value)) / 100
        : Number(property.management_fee_value);

  const occupancyPct =
    property.stats.units > 0 ? Math.round((property.stats.occupied / property.stats.units) * 100) : 0;

  return (
    <>
      <PageHeader
        title={property.name}
        breadcrumbs={[{ label: "Properties", href: "/properties" }, { label: property.name }]}
        description={[property.property_code, property.address].filter(Boolean).join(" · ")}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <PropertyForm
                owners={owners}
                mode="edit"
                initial={{
                  id: property.id,
                  name: property.name,
                  property_code: property.property_code,
                  type: property.type,
                  address: property.address ?? "",
                }}
              />
              <UnitFormDialog propertyId={property.id} />
            </div>
          ) : undefined
        }
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          icon={Home}
          progress={occupancyPct}
          sublabel={`${property.stats.occupied} of ${property.stats.units} let`}
        />
        <StatCard label="Units" value={property.stats.units} icon={Layers} sublabel={`${property.stats.vacant} vacant`} />
        <StatCard label="Active leases" value={property.stats.activeLeases} icon={Building2} />
        <StatCard
          label="Monthly rent"
          value={formatCurrency(property.stats.monthlyRent)}
          icon={Wallet}
          tone="success"
          sublabel="From let units"
        />
      </div>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* The units tab keeps the aside the prototype has: the table is the
            work, the owners and the fee are the context you glance at. */}
        <TabsContent value="units">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              {units.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No units yet"
                  description="Add units to this property before letting them."
                  action={canManage ? <UnitFormDialog propertyId={property.id} /> : undefined}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead className="text-right">Market</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="stagger">
                    {units.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <Link href={`/units/${u.id}`} className="font-medium text-neutral-900 hover:underline">
                            {u.unit_number}
                          </Link>
                          {u.floor ? <span className="ml-1.5 text-xs text-neutral-500">Fl {u.floor}</span> : null}
                        </TableCell>
                        <TableCell className="text-neutral-600">
                          {[u.unit_type, u.bedrooms != null ? `${u.bedrooms} bed` : null,
                            u.area_sqm ? `${u.area_sqm} m²` : null, u.furnishing]
                            .filter(Boolean).join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-neutral-600">
                          {u.lease_id && u.tenant_name ? (
                            <Link href={`/leases/${u.lease_id}`} className="hover:underline">{u.tenant_name}</Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-neutral-600">
                          {u.market_rent ? formatCurrency(u.market_rent) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {u.current_rent ? formatCurrency(u.current_rent) : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={u.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <aside className="flex flex-col gap-3">
              <Card>
                <CardHeader><CardTitle>Owners</CardTitle></CardHeader>
                <CardContent>
                  {property.owners.length === 0 ? (
                    <p className="text-sm text-neutral-500">No owner is recorded against this property.</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {property.owners.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-3">
                          <Link href={`/owners/${o.id}`} className="font-medium text-neutral-900 hover:underline">
                            {o.name}
                          </Link>
                          <span className="tabular-nums text-neutral-500">{o.ownership_percentage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent>
                  <dl className="divide-y divide-neutral-100 text-sm">
                    {([
                      ["Management fee", feeLabel],
                      ["Property code", property.property_code],
                      ["Type", PROPERTY_TYPES.find((t) => t.value === property.type)?.label ?? property.type],
                      ["Address", property.address ?? "—"],
                      [
                        "Coordinates",
                        property.latitude != null && property.longitude != null
                          ? `${property.latitude}, ${property.longitude}`
                          : "—",
                      ],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 py-2">
                        <dt className="shrink-0 text-neutral-500">{k}</dt>
                        <dd className="text-right text-neutral-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="leases">
          {tabs.leases.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leases on this property"
              description="A lease appears here once a unit is let."
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
                {tabs.leases.map((l) => (
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
          {tabs.requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nothing reported"
              description="Maintenance raised on any unit in this property appears here."
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
                {tabs.requests.map((r) => (
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
            <StatCard
              label="Collected this month"
              value={formatCurrency(tabs.financials.collected)}
              tone={tabs.financials.collected > 0 ? "success" : "default"}
              icon={Wallet}
            />
            <StatCard label="Outstanding" value={formatCurrency(tabs.financials.outstanding)}
              tone={tabs.financials.outstanding > 0 ? "warning" : "default"} />
            <StatCard label="Expenses this month" value={formatCurrency(tabs.financials.expenses)} />
            <StatCard label="Management fee" value={managementFee == null ? "—" : formatCurrency(managementFee)}
              sublabel={feeLabel === "—" ? "No fee set" : feeLabel} />
          </div>

          {tabs.expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Repairs, utilities and service charges booked against this property appear here."
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
                {tabs.expenses.map((e) => (
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
          {tabs.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents uploaded"
              description="Title deeds, insurance certificates and inspection reports for this property sit here."
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
                {tabs.documents.map((d) => (
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
      </Tabs>
    </>
  );
}
