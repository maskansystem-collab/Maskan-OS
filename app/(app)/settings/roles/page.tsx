import { KeyRound, Lock, ShieldCheck, Users } from "lucide-react";
import { requireStaff } from "@/lib/permissions/guards";
import { listRoles } from "@/features/settings/org-queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChip, FilterRow } from "@/components/shared/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

/**
 * Roles and what each one can do.
 *
 * The roles, permissions and role_permissions tables have been in the schema
 * since the first migration with no screen in front of them, so until now the
 * only way to see who could do what was to read the seed data.
 */
export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { membership } = await requireStaff();

  const { roles, permissions } = await listRoles(membership.organisationId);

  const categories = [...new Set(permissions.map((p) => p.category))].sort();
  const shown = category ? permissions.filter((p) => p.category === category) : permissions;
  const custom = roles.filter((r) => !r.is_system);
  const assigned = roles.reduce((sum, r) => sum + r.memberCount, 0);

  return (
    <>
      <PageHeader
        title="Roles"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Roles" }]}
        description="What each role is allowed to do, and how many of your team hold it."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Roles available"
          value={String(roles.length)}
          icon={ShieldCheck}
          sublabel={`${roles.length - custom.length} built in · ${custom.length} your own`}
        />
        <StatCard label="People assigned" value={String(assigned)} icon={Users} sublabel="Across all roles" />
        <StatCard
          label="Permissions"
          value={String(permissions.length)}
          icon={KeyRound}
          sublabel={`${categories.length} areas`}
        />
        <StatCard
          label="Unassigned roles"
          value={String(roles.filter((r) => r.memberCount === 0).length)}
          icon={Lock}
          sublabel="Nobody holds these"
        />
      </div>

      {roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles found"
          description="The built-in roles are created with your organisation. If none are here, reference data has not been loaded."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="text-right">People</TableHead>
              <TableHead className="text-right">Permissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="font-medium text-neutral-900">{r.name}</span>
                  {r.description ? (
                    <span className="block text-xs text-neutral-500">{r.description}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={r.is_system ? "neutral" : "outline"}>
                    {r.is_system ? "Built in" : "Custom"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {r.memberCount > 0 ? (
                    <span className="font-medium text-neutral-900">{r.memberCount}</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-neutral-600">{r.permissions.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold tracking-[-0.03em] text-neutral-900">
          Permissions
        </h2>
        <p className="mt-0.5 text-[13.5px] text-neutral-600">
          Every permission in the system, and which roles grant it.
        </p>

        {categories.length > 0 ? (
          <div className="mt-4">
            <FilterRow>
              <FilterChip href="/settings/roles" active={!category}>All areas</FilterChip>
              {categories.map((c) => (
                <FilterChip
                  key={c}
                  href={`/settings/roles?category=${encodeURIComponent(c)}`}
                  active={category === c}
                >
                  {c}
                </FilterChip>
              ))}
            </FilterRow>
          </div>
        ) : null}

        {shown.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Nothing in that area"
            description="Clear the filter to see every permission."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Granted to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => {
                const holders = roles.filter((r) => r.permissions.includes(p.code));
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-mono text-[12.5px] font-medium text-neutral-900">
                        {p.code}
                      </span>
                      {p.description ? (
                        <span className="block text-xs text-neutral-500">{p.description}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-neutral-600">{p.category}</TableCell>
                    <TableCell>
                      {holders.length === 0 ? (
                        <span className="text-neutral-400">No role</span>
                      ) : (
                        <span className="inline-flex flex-wrap gap-1">
                          {holders.map((r) => (
                            <Badge key={r.id} variant="outline">
                              {r.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
