# Screen conventions

Every screen in this app is one of three shapes. Pick the matching one; do
not invent a fourth. Three different detail layouts once shipped here
because five new screens were built to a layout of their own — they looked
consistent with each other, which is exactly why nobody noticed.

## Detail screen

Breadcrumb, then the title with its identifying facts, then actions on the
right, then **four stat cards**, then a **tab bar over a full-width table**.

```tsx
<PageHeader
  title={thing.name}
  description={[thing.kind, thing.reference]}   // joined with " · "
  breadcrumbs={[{ label: "Things", href: "/things" }, { label: thing.name }]}
  actions={<StatusBadge status={thing.status} />}
/>

<div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard … />   {/* four. not three, not five */}
</div>

<Tabs defaultValue="first">
  <TabsList><TabsTrigger value="first">First</TabsTrigger>…</TabsList>
  <TabsContent value="first"><Table>…</Table></TabsContent>
</Tabs>
```

Reference: `app/(app)/leases/[id]/page.tsx`.

**The first tab may keep an aside; the rest are full width.** The
prototype's property, unit and building screens all do this: the first tab
is `grid gap-5 lg:grid-cols-[1fr_300px]` with the work on the left and
context cards in an `<aside>` on the right, and every other tab is a
full-width table. An earlier version of this file said secondary content
goes in a tab "not a sidebar", which was wrong and would have pulled those
three screens further from the prototype.

A tab holding detail rather than rows uses `Card`s; a tab holding records
uses a `Table`. Never both in one tab.

The four stats should be the four numbers someone opens the screen to find
— usually money, not counts of child records.

## List screen

Header, stat cards, filter chips, full-width table. No tabs.

```tsx
<PageHeader title="Things" description="One line on what this is for." />
<div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">…</div>
{filters}
{rows.length === 0 ? <EmptyState icon={…} … /> : <Table>…</Table>}
```

Reference: `app/(app)/vendors/page.tsx`.

Every row links to its detail screen from the first cell. Filters are
`searchParams`, never client state, so a filtered view can be linked to.

## Settings screen

One page, one tab bar, each tab a `Card` or a small table. Settings that
need their own URL live at `/settings/<thing>` and follow the list shape.

Reference: `app/(app)/settings/page.tsx`.

## Rules that apply everywhere

**Server Components by default.** A page is `async`, calls a guard, calls a
query, renders. `"use client"` only where there is genuine interaction, and
then only on the component that needs it.

**Guards first, then queries.** `requireStaff()`, `requireRole()` or
`requirePlatformSuperAdmin()` on the first line. Permission checks use
`redirect("/forbidden")` — not Next's `forbidden()`, which nothing else
here uses.

**Queries live in `features/<area>/queries.ts`**, never inline in a page.
Batch related lookups with `Promise.all`, and never query per row — a list
of fifty should cost the same as a list of five.

**`notFound()` when a record does not exist**, before touching its fields.

**Empty states always.** `EmptyState` needs an `icon`; say what would put
something here, not just that there is nothing.

**Money through `formatCurrency`, dates through `formatDate` /
`formatDateTime`.** Never `toLocaleString` in a page.

**Nothing clips.** Check a new screen appears in `npx next build` output
and that `npx tsc --noEmit` and `npx eslint` are clean before committing.

## Row level security

**Run `npm run test:rls` after touching a policy.** It applies every
migration to a throwaway local Postgres and asserts 42 access cases. Two
RLS faults shipped without it, and neither was visible from the app: a
superuser and the service-role key both bypass RLS, so only a
non-superuser with a JWT subject set finds them.

**`is_org_staff(org)` for staff access, `is_org_member(org)` only where a
portal user genuinely belongs.** Membership means "has a row in
organisation_members", and tenants, owners and vendors with portal logins
all have one. `is_org_member` on a staff read policy hands a tenant the
whole organisation.

**A child policy must not read a parent that reads the child back.**
That cycle makes Postgres abort the query with "infinite recursion
detected in policy", which takes the table down for everyone, not just
the portal user the policy was for. Resolve the parent through a
`security definer` helper instead — `property_org(uuid)`, `unit_org(uuid)`,
`owns_property(uuid)`, `owns_unit(uuid)` and `tenant_occupies_unit(uuid)`
exist for this, and all five pin `search_path`.

**Every new table needs its portal clause written at the same time as its
staff clause,** plus a case in the access matrix. `owners` went without a
self-select policy for five migrations because the leak made it look like
it worked.

## Before building a screen, check it does not already exist

Four finished features in this codebase were unreachable because the route
file was missing while the query, the component and the action were all
written: the five Slice A detail pages, the ⌘K command menu, the import
wizard, and the platform org detail. Search first:

```bash
grep -rn "getThing\|ThingWizard" features/   # is the query already written?
grep -rn "/things/" --include=*.tsx .        # does anything already link to it?
```
