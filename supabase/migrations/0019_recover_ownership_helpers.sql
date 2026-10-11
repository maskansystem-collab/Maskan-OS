-- =====================================================================
-- 0019_recover_ownership_helpers.sql
--
-- Recovers the missing "0015b".
--
-- 0015 ends with a note dated 2026-09-08 saying the owner-portal policies
-- recursed and were fixed by moving the ownership question into security
-- definer helpers — "owns_property, owns_unit, tenant_occupies_unit,
-- property_org, unit_org. See 0015b". There is no 0015b in this
-- repository. The five functions exist in the live database (they appear
-- in the generated types) but nothing here creates them, so the migrations
-- cannot rebuild the live schema, and a database built from this repo
-- alone still has the recursion:
--
--   properties.properties_owner_portal_select
--     reads property_owners
--       -> property_owners.property_owners_select
--            reads properties ...
--
-- Postgres aborts the whole query with "infinite recursion detected in
-- policy for relation", so `select … from properties` fails for everyone,
-- staff included. Confirmed by applying every migration to a local
-- Postgres and reading as a non-superuser: properties, units,
-- property_owners and unit_owners were all unreadable.
--
-- This file recreates the five helpers under the names the live database
-- already uses, rather than inventing parallel ones, so applying it there
-- is a no-op for the functions and the two schemas converge. Everything is
-- `create or replace` / `drop policy if exists`, so it is safe to run on a
-- database that already has 0015b.
--
-- Access is not widened. Each helper answers one question about one row
-- and runs outside RLS only so that the answer does not re-enter the
-- policy asking it. search_path is pinned on all five, as on every other
-- definer function in 0002.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Parent-row organisation lookups
-- ---------------------------------------------------------------------
create or replace function property_org(p_property_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.organisation_id from properties p where p.id = p_property_id;
$$;

create or replace function unit_org(p_unit_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select u.organisation_id from units u where u.id = p_unit_id;
$$;

-- ---------------------------------------------------------------------
-- "Does the signed-in portal user hold this?"
--
-- A unit is owned either in its own right or through its property: most
-- units are not separately titled, and an owner who holds the building
-- must still see the units in it.
-- ---------------------------------------------------------------------
create or replace function owns_property(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from property_owners po
    join organisation_members om on om.owner_id = po.owner_id
    where po.property_id = p_property_id
      and om.profile_id = auth.uid()
      and om.is_active = true
  );
$$;

create or replace function owns_unit(p_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from unit_owners uo
    join organisation_members om on om.owner_id = uo.owner_id
    where uo.unit_id = p_unit_id
      and om.profile_id = auth.uid()
      and om.is_active = true
  ) or exists (
    select 1
    from units u
    join property_owners po on po.property_id = u.property_id
    join organisation_members om on om.owner_id = po.owner_id
    where u.id = p_unit_id
      and om.profile_id = auth.uid()
      and om.is_active = true
  );
$$;

create or replace function tenant_occupies_unit(p_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from leases l
    join organisation_members om on om.tenant_id = l.tenant_id
    where l.unit_id = p_unit_id
      and om.profile_id = auth.uid()
      and om.is_active = true
      and l.status in ('pending', 'active', 'expiring', 'renewal_offered', 'renewed')
  );
$$;

-- RLS policies call these, so every caller needs execute.
grant execute on function property_org(uuid) to public;
grant execute on function unit_org(uuid) to public;
grant execute on function owns_property(uuid) to public;
grant execute on function owns_unit(uuid) to public;
grant execute on function tenant_occupies_unit(uuid) to public;

-- ---------------------------------------------------------------------
-- properties / units: ask the helper instead of reading the join table
-- ---------------------------------------------------------------------
drop policy if exists properties_owner_portal_select on properties;
create policy properties_owner_portal_select on properties for select
  using (owns_property(id));

drop policy if exists units_owner_portal_select on units;
create policy units_owner_portal_select on units for select
  using (owns_unit(id));

drop policy if exists units_tenant_portal_select on units;
create policy units_tenant_portal_select on units for select
  using (tenant_occupies_unit(id));

-- ---------------------------------------------------------------------
-- The join tables: resolve the parent's organisation outside RLS
-- ---------------------------------------------------------------------
drop policy if exists property_owners_select on property_owners;
drop policy if exists property_owners_write on property_owners;

create policy property_owners_select on property_owners for select
  using (is_org_member(property_org(property_id)));
create policy property_owners_write on property_owners for all
  using (has_permission(property_org(property_id), 'properties.manage'))
  with check (has_permission(property_org(property_id), 'properties.manage'));

-- An owner needs to see their own holding, or the owner portal has
-- nothing to show. This reads organisation_members only, so it opens no
-- new path back into properties.
create policy property_owners_owner_select on property_owners for select
  using (exists (
    select 1 from organisation_members om
    where om.owner_id = property_owners.owner_id
      and om.profile_id = auth.uid()
      and om.is_active
  ));

drop policy if exists unit_owners_select on unit_owners;
drop policy if exists unit_owners_write on unit_owners;

create policy unit_owners_select on unit_owners for select
  using (is_org_member(unit_org(unit_id)));
create policy unit_owners_write on unit_owners for all
  using (has_permission(unit_org(unit_id), 'properties.manage'))
  with check (has_permission(unit_org(unit_id), 'properties.manage'));

create policy unit_owners_owner_select on unit_owners for select
  using (exists (
    select 1 from organisation_members om
    where om.owner_id = unit_owners.owner_id
      and om.profile_id = auth.uid()
      and om.is_active
  ));

-- ---------------------------------------------------------------------
-- The tables that cascade off properties
--
-- The 0015 note names buildings and property_documents as cascading off
-- the properties cycle. Both read properties from their own policy, so
-- both go through the helper too.
-- ---------------------------------------------------------------------
drop policy if exists property_documents_select on property_documents;
drop policy if exists property_documents_write on property_documents;

create policy property_documents_select on property_documents for select
  using (is_org_member(property_org(property_id)));
create policy property_documents_write on property_documents for all
  using (has_permission(property_org(property_id), 'properties.manage'))
  with check (has_permission(property_org(property_id), 'properties.manage'));

drop policy if exists buildings_select on buildings;
create policy buildings_select on buildings for select
  using (is_org_member(property_org(property_id)) or owns_property(property_id));
