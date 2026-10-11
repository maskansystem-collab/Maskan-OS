import Link from "next/link";
import { Building2, Home, Scale, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { getDepartments, BOOK_RULES } from "@/features/departments/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Several books under one roof.
 *
 * The owned and managed figures are never added together anywhere on this
 * screen: managed rent belongs to the owners, owned rent is the firm's.
 * A single total would overstate revenue by the whole managed rent roll.
 */
export default async function DepartmentsPage() {
  const { membership } = await requireStaff();
  const { departments, holdings, totals } = await getDepartments(membership.organisationId);

  return (
    <>
      <PageHeader
        title="Departments"
        description="Several books under one roof. Each has its own staff, its own numbers and its own rules."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Departments" value={String(departments.length)} icon={Users} />
        <StatCard
          label="Owned units"
          value={String(totals.ownedUnits)}
          tone={totals.ownedUnits > 0 ? "success" : "default"}
          icon={Home}
          sublabel={`${formatCurrency(totals.ownedRent)} monthly, the firm's revenue`}
        />
        <StatCard
          label="Managed units"
          value={String(totals.managedUnits)}
          icon={Building2}
          sublabel={`${formatCurrency(totals.managedRent)} monthly, held for owners`}
        />
        <StatCard
          label="In-house staff"
          value={String(totals.staff)}
          sublabel={
            totals.unassignedProperties > 0
              ? `${totals.unassignedProperties} properties on no desk`
              : "Every property is on a desk"
          }
          tone={totals.unassignedProperties > 0 ? "warning" : "default"}
        />
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="holdings">Owned and managed</TabsTrigger>
          <TabsTrigger value="books">How the books differ</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          {departments.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No departments yet"
              description="A one-person firm needs none. Add them when different desks start keeping different numbers."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {departments.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-5">
                    <div className="mb-3.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-[15px] font-bold tracking-[-0.03em] text-neutral-900">
                          {d.name}
                        </p>
                        {d.purpose ? (
                          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{d.purpose}</p>
                        ) : null}
                      </div>
                      {d.default_holding ? (
                        <Badge variant={d.default_holding === "owned" ? "success" : "outline"}>
                          {d.default_holding === "owned" ? "Owned" : "Managed"}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mb-3.5 grid grid-cols-3 gap-2">
                      {([
                        ["Head", d.head_name?.split(" ")[0] ?? "—"],
                        ["Units", String(d.units)],
                        ["Staff", String(d.staff)],
                      ] as [string, string][]).map(([k, v]) => (
                        <div key={k} className="rounded-[9px] border border-neutral-200 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                            {k}
                          </p>
                          <p className="mt-0.5 text-[13.5px] font-semibold text-neutral-900">{v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 border-t border-neutral-100 pt-3 text-[12.5px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">
                          {d.holdings.owned > 0 && d.holdings.managed === 0
                            ? "Rent collected"
                            : "Gross through the book"}
                        </span>
                        <span className="font-medium tabular-nums text-neutral-900">
                          {formatCurrency(d.rentRoll)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">Of which fee-earning</span>
                        <span className="tabular-nums text-neutral-600">
                          {formatCurrency(d.feeIncome)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">Properties</span>
                        <span className="tabular-nums text-neutral-600">
                          {d.holdings.managed} managed · {d.holdings.owned} owned
                        </span>
                      </div>
                    </div>

                    {d.notes ? (
                      <p className="mt-3 rounded-[9px] bg-neutral-100 px-3 py-2.5 text-[12px] leading-relaxed text-neutral-600">
                        {d.notes}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="holdings">
          {holdings.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No properties yet"
              description="Each property is either managed for an owner or owned by the firm, and that choice decides which book its rent lands in."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Holding</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Mandate</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Rent roll</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.propertyId}>
                    <TableCell>
                      <Link
                        href={`/properties/${h.propertyId}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {h.propertyName}
                      </Link>
                      {h.area ? <span className="block text-xs text-neutral-500">{h.area}</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.holding === "owned" ? "success" : "outline"}>
                        {h.holding === "owned" ? "Owned" : "Managed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {h.departmentName ?? <span className="text-amber-700">No desk</span>}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {h.holding === "owned" ? (
                        <span className="text-neutral-400">The firm</span>
                      ) : (
                        h.ownerName ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {h.holding === "owned" ? (
                        <span className="text-neutral-400">None needed</span>
                      ) : h.mandateCode ? (
                        h.mandateCode
                      ) : (
                        <span className="text-amber-700">Not recorded</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">{h.units}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(h.rentRoll)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            A managed property needs a mandate — it is what gave the firm the
            authority to act. An owned one needs none, which is the distinction
            that keeps the two books apart.
          </p>
        </TabsContent>

        <TabsContent value="books">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When this happens</TableHead>
                <TableHead>On a managed property</TableHead>
                <TableHead>On one the firm owns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BOOK_RULES.map((r) => (
                <TableRow key={r.event}>
                  <TableCell className="font-medium text-neutral-900">{r.event}</TableCell>
                  <TableCell className="text-neutral-600">{r.managed}</TableCell>
                  <TableCell className="text-neutral-600">{r.owned}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            Nothing on this screen adds owned and managed figures together. A
            single total would overstate revenue by the whole managed rent roll,
            which is money that belongs to the owners.
          </p>
        </TabsContent>
      </Tabs>
    </>
  );
}
