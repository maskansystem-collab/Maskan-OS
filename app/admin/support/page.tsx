import Link from "next/link";
import { ArrowLeft, CalendarClock, Check, Headphones, TriangleAlert } from "lucide-react";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import { listSupportNotes } from "@/features/admin/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * What Maskan did for a customer, and when.
 *
 * Platform-only, both ways: the organisation a note is about cannot read
 * it. A support note may say the customer was confused about something,
 * which is useful internally and insulting to receive, so it has no
 * member policy at all rather than a carefully worded one.
 */
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  await requirePlatformSuperAdmin();

  const all = await listSupportNotes();
  const rows = await listSupportNotes({ show });

  const today = new Date().toISOString().slice(0, 10);
  const open = all.filter((n) => !n.resolved_at);
  const due = open.filter((n) => n.follow_up_on && n.follow_up_on <= today);
  const organisations = new Set(all.map((n) => n.organisationId)).size;

  return (
    <>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Platform
      </Link>

      <PageHeader
        title="Support"
        breadcrumbs={[{ label: "Platform", href: "/admin" }, { label: "Support" }]}
        description="What was done for a customer, and anything still owed to them."
      />

      {due.length > 0 ? (
        <Link
          href="/admin/support?show=due"
          className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900 transition-colors hover:border-amber-300"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {due.length} follow-up{due.length === 1 ? "" : "s"} due or overdue
        </Link>
      ) : null}

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Notes"
          value={String(all.length)}
          icon={Headphones}
          sublabel={`Across ${organisations} organisation${organisations === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Open"
          value={String(open.length)}
          tone={open.length > 0 ? "warning" : "default"}
          sublabel="Nothing recorded as resolved"
        />
        <StatCard
          label="Follow-ups due"
          value={String(due.length)}
          icon={CalendarClock}
          tone={due.length > 0 ? "danger" : "default"}
          sublabel="On or before today"
        />
        <StatCard
          label="Resolved"
          value={String(all.length - open.length)}
          icon={Check}
          tone={all.length - open.length > 0 ? "success" : "default"}
        />
      </div>

      <FilterRow>
        <FilterChip href="/admin/support" count={all.length} active={!show}>All</FilterChip>
        <FilterChip href="/admin/support?show=open" count={open.length} active={show === "open"}>
          Open
        </FilterChip>
        <FilterChip href="/admin/support?show=due" count={due.length} active={show === "due"}>
          Follow-up due
        </FilterChip>
      </FilterRow>

      {rows.length === 0 ? (
        <EmptyState
          icon={Headphones}
          title={show ? "Nothing in that group" : "No support notes"}
          description={
            show
              ? "Clear the filter to see every note."
              : "Record what was done for a customer so the next person picking up the account can see it."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>About</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((n) => (
              <TableRow key={n.id}>
                <TableCell>
                  <Link
                    href={`/admin/organisations/${n.organisationId}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {n.organisationName}
                  </Link>
                  <span className="block text-xs text-neutral-500">{n.author_name}</span>
                </TableCell>
                <TableCell className="max-w-[460px] text-neutral-700">{n.body}</TableCell>
                <TableCell>
                  {n.category ? (
                    <Badge variant="outline">{n.category}</Badge>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {n.resolved_at ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Resolved
                    </span>
                  ) : n.follow_up_on ? (
                    <span
                      className={
                        n.follow_up_on <= today
                          ? "text-[12.5px] font-medium text-red-700"
                          : "text-[12.5px] text-neutral-600"
                      }
                    >
                      {formatDate(n.follow_up_on)}
                    </span>
                  ) : (
                    <span className="text-neutral-400">None set</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-neutral-600">
                  {formatDate(n.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="mt-5 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
        These notes are Maskan&apos;s own. Nobody inside the organisation can
        read them, however senior — the database has no policy that would let
        them.
      </p>
    </>
  );
}
