import { FileText, Globe, Layers, Sparkles } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listTemplates } from "@/features/settings/org-queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * The document templates leases are generated from.
 *
 * Each one is HTML with {{placeholders}}; the placeholders are read out of
 * the body rather than stored separately, so what the table shows is always
 * what the template actually asks for.
 */
export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale } = await searchParams;
  const { membership } = await requireStaff();

  const all = await listTemplates(membership.organisationId);
  const locales = [...new Set(all.map((t) => t.locale))].sort();
  const templates = locale ? all.filter((t) => t.locale === locale) : all;

  const samples = all.filter((t) => t.is_sample).length;
  const placeholders = new Set(all.flatMap((t) => t.variables));

  return (
    <>
      <PageHeader
        title="Document templates"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Templates" }]}
        description="The documents Maskan can generate, and the details each one fills in for you."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Templates" value={String(all.length)} icon={FileText} sublabel={`${locales.length} languages`} />
        <StatCard label="Your own" value={String(all.length - samples)} icon={Layers} sublabel="Created by your team" />
        <StatCard label="Supplied by Maskan" value={String(samples)} icon={Sparkles} sublabel="Starting points you can copy" />
        <StatCard
          label="Fields in use"
          value={String(placeholders.size)}
          icon={Globe}
          sublabel="Filled in automatically"
        />
      </div>

      {locales.length > 1 ? (
        <FilterRow>
          <FilterChip href="/settings/templates" active={!locale}>All languages</FilterChip>
          {locales.map((l) => (
            <FilterChip
              key={l}
              href={`/settings/templates?locale=${encodeURIComponent(l)}`}
              count={all.filter((t) => t.locale === l).length}
              active={locale === l}
            >
              {l === "ar" ? "Arabic" : l === "en" ? "English" : l}
            </FilterChip>
          ))}
        </FilterRow>
      ) : null}

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={locale ? "Nothing in that language" : "No templates yet"}
          description={
            locale
              ? "Clear the filter to see every template."
              : "Maskan supplies a starting lease template. If none is here, reference data has not been loaded."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Fills in</TableHead>
              <TableHead className="text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <span className="font-medium text-neutral-900">{t.name}</span>
                  {t.is_sample ? (
                    <Badge variant="outline" className="ml-2">
                      Supplied
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-neutral-600">
                  {t.locale === "ar" ? "Arabic" : t.locale === "en" ? "English" : t.locale}
                </TableCell>
                <TableCell>
                  {t.variables.length === 0 ? (
                    <span className="text-neutral-400">Nothing automatic</span>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1">
                      {t.variables.slice(0, 6).map((v) => (
                        <span
                          key={v}
                          className="rounded-[6px] bg-neutral-100 px-1.5 py-0.5 font-mono text-[11.5px] text-neutral-700"
                        >
                          {v}
                        </span>
                      ))}
                      {t.variables.length > 6 ? (
                        <span className="self-center text-xs text-neutral-500">
                          +{t.variables.length - 6} more
                        </span>
                      ) : null}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-neutral-600">{formatDate(t.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
