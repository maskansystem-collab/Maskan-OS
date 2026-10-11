import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, FileText, TriangleAlert } from "lucide-react";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import { getMarketIntelligence, MIN_SEGMENT_SIZE } from "@/features/admin/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const CONSENT_LABELS: Record<string, string> = {
  granted: "Granted",
  declined: "Declined",
  not_asked: "Not asked",
};

/**
 * Achieved rents, pooled from organisations that agreed to contribute.
 *
 * Achieved, not asking prices, and not published anywhere else. Every
 * figure is computed from leases that exist, so a benchmark cannot
 * disagree with the leases behind it, and the screen leads with how thin
 * the coverage is rather than a number it cannot stand behind.
 */
export default async function AdminMarketPage() {
  await requirePlatformSuperAdmin();

  const { consent, segments, coverage } = await getMarketIntelligence();
  const publishable = segments.filter((s) => s.n >= MIN_SEGMENT_SIZE);
  const tooThin = coverage.thinSegments > 0 || publishable.length === 0;
  const coveragePct =
    coverage.allUnits > 0 ? Math.round((coverage.contributingUnits / coverage.allUnits) * 100) : 0;

  return (
    <>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Platform
      </Link>

      <PageHeader
        title="Market intelligence"
        breadcrumbs={[{ label: "Platform", href: "/admin" }, { label: "Market" }]}
        description="Achieved rents from consenting organisations. Not asking prices, and not published anywhere else."
      />

      {tooThin ? (
        <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-[12.5px] leading-relaxed text-amber-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="font-semibold">Coverage is too thin to publish.</span>{" "}
            {coverage.contributingUnits} units across {coverage.consentingOrganisations} of{" "}
            {coverage.totalOrganisations} organisations, behind {coverage.leases} leases.{" "}
            {coverage.thinSegments} of {segments.length} segments have fewer than{" "}
            {MIN_SEGMENT_SIZE} data points. These figures are directional at best
            and should not be shown to a customer as a benchmark.
          </span>
        </div>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contributing units"
          value={String(coverage.contributingUnits)}
          icon={Building2}
          progress={coveragePct}
          tone={coveragePct < 50 ? "warning" : "default"}
          sublabel={`of ${coverage.allUnits} on the platform`}
        />
        <StatCard
          label="Consenting organisations"
          value={`${coverage.consentingOrganisations} of ${coverage.totalOrganisations}`}
          tone={coverage.consentingOrganisations < coverage.totalOrganisations ? "warning" : "success"}
        />
        <StatCard
          label="Leases behind the data"
          value={String(coverage.leases)}
          icon={FileText}
          sublabel="Every figure derives from these"
        />
        <StatCard
          label="Publishable segments"
          value={`${publishable.length} of ${segments.length}`}
          icon={BarChart3}
          tone={publishable.length === 0 ? "danger" : publishable.length < segments.length ? "warning" : "success"}
          sublabel={`${MIN_SEGMENT_SIZE} or more data points`}
        />
      </div>

      <Tabs defaultValue="benchmarks">
        <TabsList>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
        </TabsList>

        <TabsContent value="benchmarks">
          {segments.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Nothing to report yet"
              description="A segment appears once a consenting organisation has leases on units with a district and a unit type recorded."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Unit type</TableHead>
                  <TableHead className="text-right">Data points</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                  <TableHead>Standing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((s) => {
                  const thin = s.n < MIN_SEGMENT_SIZE;
                  return (
                    <TableRow key={`${s.area}-${s.unitType}`}>
                      <TableCell className="font-medium text-neutral-900">{s.area}</TableCell>
                      <TableCell className="text-neutral-600">{s.unitType}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={thin ? "font-medium text-amber-700" : "text-neutral-900"}>
                          {s.n}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {thin ? (
                          <span className="text-neutral-400">Withheld</span>
                        ) : (
                          formatCurrency(s.median)
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-neutral-600">
                        {thin ? (
                          <span className="text-neutral-400">—</span>
                        ) : (
                          `${formatCurrency(s.low)} – ${formatCurrency(s.high)}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={thin ? "warning" : "success"}>
                          {thin ? "Too thin" : "Publishable"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            A median is withheld below {MIN_SEGMENT_SIZE} data points rather than
            shown with a caveat. Nothing on this screen is stored: every figure is
            computed from the leases, so it cannot disagree with them.
          </p>
        </TabsContent>

        <TabsContent value="consent">
          {consent.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organisations"
              description="Consent is asked for per organisation."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Answered</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Contributing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consent.map((c) => (
                  <TableRow key={c.organisationId}>
                    <TableCell>
                      <Link
                        href={`/admin/organisations/${c.organisationId}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {c.organisationName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.consent === "granted"
                            ? "success"
                            : c.consent === "declined"
                              ? "danger"
                              : "outline"
                        }
                      >
                        {CONSENT_LABELS[c.consent] ?? c.consent}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {c.consentAt ? formatDate(c.consentAt) : <span className="text-neutral-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">{c.units}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.contributing > 0 ? (
                        <span className="font-medium text-neutral-900">{c.contributing}</span>
                      ) : (
                        <span className="text-neutral-400">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            An organisation that has not been asked contributes nothing. Consent
            is theirs to give and theirs to withdraw, and withdrawing it removes
            their leases from every figure on this screen immediately.
          </p>
        </TabsContent>
      </Tabs>
    </>
  );
}
