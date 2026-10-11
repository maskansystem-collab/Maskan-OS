-- =====================================================================
-- 0019_fix_recursive_property_policies.sql
--
-- Fixes four tables that no signed-in user could read at all.
--
-- 0015 created a cycle between a parent table and its ownership join
-- table. On `properties`:
--
--   properties.properties_owner_portal_select
--     reads property_owners
--       -> property_owners.property_owners_select
--            reads properties
--              -> properties.properties_owner_portal_select ...
--
-- Postgres detects this and aborts the whole query with "infinite
-- recursion detected in policy for relation", so `select … from
-- properties` failed for *everyone* — staff included, not only owners.
-- The same cycle exists between `units` and `unit_owners`, and because
-- the units owner-portal policy also reads property_owners, it was caught
-- by the properties cycle as well. Four tables were affected:
-- properties, units, property_owners and unit_owners.
--
-- It went unnoticed because a superuser and the service-role key both
-- bypass RLS. The application connects with the anon key through
-- @supabase/ssr, so RLS is live for every real request: the properties
-- list, the units list, both detail screens and everything joining them
-- were failing against any database with these policies applied.
--
-- The fix is the one the rest of this schema already uses: resolve the
-- parent row's organisation through a `security definer` helper, which
-- runs with the function owner's rights and therefore does not re-enter
-- RLS. The cycle is broken on the child side, so the owner-portal
-- policies on the parents keep working unchanged.
--
-- Access is not widened. Each helper returns one organisation_id for one
-- row and nothing else; the policy still gates on is_org_member() or
-- has_permission() exactly as before. search_path is pinned on both, as
-- on every other definer function here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Parent-row organisation lookups, outside RLS
-- ---------------------------------------------------------------------
create or replace function property_organisation(p_property_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.organisation_id from properties p where p.id = p_property_id;
$$;

create or replace function unit_organisation(p_unit_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select u.organisation_id from units u where u.id = p_unit_id;
$$;

-- These are read by RLS policies, so every caller needs to execute them.
grant execute on function property_organisation(uuid) to public;
grant execute on function unit_organisation(uuid) to public;

-- ---------------------------------------------------------------------
-- property_owners: stop reading `properties` under RLS
-- ---------------------------------------------------------------------
drop policy if exists property_owners_select on property_owners;
drop policy if exists property_owners_write on property_owners;

create policy property_owners_select on property_owners for select
  using (is_org_member(property_organisation(property_id)));

create policy property_owners_write on property_owners for all
  using (has_permission(property_organisation(property_id), 'properties.manage'))
  with check (has_permission(property_organisation(property_id), 'properties.manage'));

-- An owner needs to see their own holding, or the owner portal has
-- nothing to show. This reads organisation_members only, so it adds no
-- new path back into properties.
create policy property_owners_owner_select on property_owners for select
  using (exists (
    select 1 from organisation_members om
    where om.owner_id = property_owners.owner_id
      and om.profile_id = auth.uid()
      and om.is_active
  ));

-- ---------------------------------------------------------------------
-- unit_owners: same change, against `units`
-- ---------------------------------------------------------------------
drop policy if exists unit_owners_select on unit_owners;
drop policy if exists unit_owners_write on unit_owners;

create policy unit_owners_select on unit_owners for select
  using (is_org_member(unit_organisation(unit_id)));

create policy unit_owners_write on unit_owners for all
  using (has_permission(unit_organisation(unit_id), 'properties.manage'))
  with check (has_permission(unit_organisation(unit_id), 'properties.manage'));

create policy unit_owners_owner_select on unit_owners for select
  using (exists (
    select 1 from organisation_members om
    where om.owner_id = unit_owners.owner_id
      and om.profile_id = auth.uid()
      and om.is_active
  ));

-- ---------------------------------------------------------------------
-- The same shape, checked across the rest of the schema
--
-- Four other child tables had a policy reading their parent while the
-- parent had no policy reading back, so they never recursed. They are
-- converted anyway: a cycle appears the moment someone adds a portal
-- policy to the parent, and that is precisely how this one arrived.
-- ---------------------------------------------------------------------
drop policy if exists property_documents_select on property_documents;
drop policy if exists property_documents_write on property_documents;

create policy property_documents_select on property_documents for select
  using (is_org_member(property_organisation(property_id)));
create policy property_documents_write on property_documents for all
  using (has_permission(property_organisation(property_id), 'properties.manage'))
  with check (has_permission(property_organisation(property_id), 'properties.manage'));
