-- =====================================================================
-- rls-access-matrix.sql — who can read what, asserted
--
-- Run with tools/rls-test.sh. It applies every migration to a throwaway
-- local Postgres, seeds two organisations with one of each kind of user,
-- and asserts the row counts each of them should see.
--
-- This exists because two RLS faults shipped unnoticed and neither was
-- visible from the application:
--
--   1. properties and units were mutually recursive with their ownership
--      join tables, so every signed-in read of them failed outright
--      (fixed in 0019);
--   2. every staff read policy was gated on is_org_member(), which is
--      true for tenant, owner and vendor portal logins too, so a tenant
--      could read the whole organisation (fixed in 0020).
--
-- Both were invisible in development because a superuser and the
-- service-role key bypass RLS. Only a non-superuser with a JWT subject
-- set finds them, which is what this does.
--
-- Add a case here whenever a policy is added or changed.
-- =====================================================================

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------------------------------------------------------------------
-- Fixtures: two organisations, so cross-organisation leaks show up as a
-- count rather than needing a separate test.
-- ---------------------------------------------------------------------
create or replace function test_seed() returns void language plpgsql as $$
begin
  insert into organisations (id, name, slug) values
    ('11111111-1111-1111-1111-111111111111', 'Acme PM', 'acme'),
    ('99999999-9999-9999-9999-999999999999', 'Rival PM', 'rival');

  insert into owners (id, organisation_id, name) values
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Jassim Al-Thani'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'Rival Owner');

  -- Two properties in Acme: one the owner holds, one they do not. A test
  -- with a single property cannot tell "scoped correctly" from "sees all".
  insert into properties (id, organisation_id, name, property_code) values
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'The Pearl Residences', 'P-001'),
    ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Not Theirs Tower', 'P-002');
  insert into property_owners (property_id, owner_id, ownership_percentage) values
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 100);

  insert into units (id, organisation_id, property_id, unit_number) values
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '1204');

  insert into tenants (id, organisation_id, name) values
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Ahmed Hassan'),
    ('f0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Another Tenant');

  insert into leases (id, organisation_id, property_id, unit_id, tenant_id, owner_id, lease_code,
      start_date, end_date, monthly_rent, total_contract_rent)
  values ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'LEASE-0003',
    '2026-02-01', '2027-01-31', 8500, 102000);

  insert into mandates (organisation_id, owner_id, mandate_code, mandate_type, starts_on, ends_on,
      may_sign_lease, may_hold_deposit, may_register_lease, maintenance_spend_cap)
  values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'MD-014',
    'letting_and_management', '2026-01-01', '2026-12-31', true, true, true, 2500);
  insert into mandate_properties (mandate_id, property_id)
  select id, '33333333-3333-3333-3333-333333333333' from mandates where mandate_code = 'MD-014';

  insert into undertakings (organisation_id, lease_id, undertaking_code, payer_name, covers,
      cap_amount, letter_signed_on, letter_expires_on, contract_party_name, cheque_payer_name, status)
  values ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'UN-024',
    'Doha International School', 'rent', 8500, '2026-02-01', '2027-01-31',
    'Ahmed Hassan', 'Doha International School', 'active');

  insert into bank_accounts (organisation_id, bank_name, account_name, account_number)
  values ('11111111-1111-1111-1111-111111111111', 'QNB', 'Acme Client Account', '1234567890');
end;
$$;

-- One signed-in person: an auth user, a profile, a membership, a role.
create or replace function test_user(
  p_id uuid, p_name text, p_org uuid, p_role member_role_key,
  p_owner_id uuid default null, p_tenant_id uuid default null
) returns void language plpgsql as $$
declare m uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (p_id, p_name || '@example.qa');
  insert into profiles (id, full_name, email) values (p_id, p_name, p_name || '@example.qa');
  insert into organisation_members (id, organisation_id, profile_id, owner_id, tenant_id)
  values (m, p_org, p_id, p_owner_id, p_tenant_id);
  insert into member_roles (organisation_member_id, role_id)
  select m, id from roles where key = p_role and organisation_id is null;
end;
$$;

do $$
begin
  perform test_seed();
  perform test_user('77777777-7777-7777-7777-777777777777', 'staff',
    '11111111-1111-1111-1111-111111111111', 'property_manager');
  perform test_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner',
    '11111111-1111-1111-1111-111111111111', 'property_owner',
    p_owner_id => '22222222-2222-2222-2222-222222222222');
  perform test_user('f0000000-0000-0000-0000-0000000000aa', 'tenant',
    '11111111-1111-1111-1111-111111111111', 'tenant',
    p_tenant_id => '55555555-5555-5555-5555-555555555555');
  perform test_user('dddddddd-dddd-dddd-dddd-dddddddddddd', 'rival',
    '99999999-9999-9999-9999-999999999999', 'property_manager');
end;
$$;

-- ---------------------------------------------------------------------
-- The assertion harness
-- ---------------------------------------------------------------------
create table test_results (
  who text, what text, expected bigint, actual bigint, passed boolean
);

-- Counts `relation` as `subject`, with RLS enforced, and records the result.
-- A recursion error or any other failure is caught and recorded as -1 so
-- one broken policy does not hide every case after it.
create or replace function expect_rows(
  p_who text, p_subject uuid, p_relation text, p_expected bigint
) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    perform set_config('request.jwt.claim.sub', p_subject::text, true);
    execute format('select count(*) from %I', p_relation) into n;
  exception when others then
    n := -1;
  end;
  insert into test_results values (p_who, p_relation, p_expected, n, n = p_expected);
end;
$$;

-- Run as a role RLS applies to. A superuser would pass everything.
drop role if exists rls_test_reader;
create role rls_test_reader nologin;
grant usage on schema public, auth to rls_test_reader;
grant select on all tables in schema public to rls_test_reader;
grant select on all tables in schema auth to rls_test_reader;
grant execute on all functions in schema public to rls_test_reader;
-- The matrix records its own results, so the test role needs to write here.
grant insert on test_results to rls_test_reader;

-- Deliberately NOT security definer: the whole point is to be evaluated
-- with the test role's own rights, so that RLS applies.
create or replace function run_access_matrix() returns void
language plpgsql as $$
declare
  staff  uuid := '77777777-7777-7777-7777-777777777777';
  owner  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  tenant uuid := 'f0000000-0000-0000-0000-0000000000aa';
  rival  uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
begin
  -- Staff of Acme see Acme, all of it.
  perform expect_rows('staff', staff, 'properties', 2);
  perform expect_rows('staff', staff, 'units', 1);
  perform expect_rows('staff', staff, 'owners', 1);
  perform expect_rows('staff', staff, 'tenants', 2);
  perform expect_rows('staff', staff, 'leases', 1);
  perform expect_rows('staff', staff, 'mandates', 1);
  perform expect_rows('staff', staff, 'undertakings', 1);
  perform expect_rows('staff', staff, 'bank_accounts', 1);
  perform expect_rows('staff', staff, 'property_owners', 1);

  -- An owner sees the property they hold and nothing else. Not the other
  -- property, not the tenants, not the client account.
  perform expect_rows('owner', owner, 'properties', 1);
  perform expect_rows('owner', owner, 'units', 1);
  perform expect_rows('owner', owner, 'owners', 1);
  perform expect_rows('owner', owner, 'tenants', 0);
  perform expect_rows('owner', owner, 'mandates', 1);
  perform expect_rows('owner', owner, 'bank_accounts', 0);

  -- A tenant sees their own tenancy and nothing about the business.
  -- These nine zeroes are the leak 0020 closed.
  perform expect_rows('tenant', tenant, 'properties', 0);
  perform expect_rows('tenant', tenant, 'owners', 0);
  perform expect_rows('tenant', tenant, 'mandates', 0);
  perform expect_rows('tenant', tenant, 'bank_accounts', 0);
  perform expect_rows('tenant', tenant, 'payments', 0);
  perform expect_rows('tenant', tenant, 'cheques', 0);
  perform expect_rows('tenant', tenant, 'property_owners', 0);
  perform expect_rows('tenant', tenant, 'management_fees', 0);
  perform expect_rows('tenant', tenant, 'property_expenses', 0);
  -- but their own records remain readable
  perform expect_rows('tenant', tenant, 'tenants', 1);
  perform expect_rows('tenant', tenant, 'leases', 1);
  perform expect_rows('tenant', tenant, 'units', 1);
  perform expect_rows('tenant', tenant, 'undertakings', 1);
  perform expect_rows('tenant', tenant, 'organisations', 1);

  -- Another firm sees none of it.
  perform expect_rows('rival', rival, 'properties', 0);
  perform expect_rows('rival', rival, 'units', 0);
  perform expect_rows('rival', rival, 'tenants', 0);
  perform expect_rows('rival', rival, 'leases', 0);
  perform expect_rows('rival', rival, 'mandates', 0);
  perform expect_rows('rival', rival, 'undertakings', 0);
  perform expect_rows('rival', rival, 'bank_accounts', 0);

  -- Signed out: zero rows, and no error. A -1 here means a policy
  -- recursed, which is how the properties fault presented.
  perform expect_rows('anon', null, 'properties', 0);
  perform expect_rows('anon', null, 'units', 0);
  perform expect_rows('anon', null, 'property_owners', 0);
  perform expect_rows('anon', null, 'unit_owners', 0);
  perform expect_rows('anon', null, 'leases', 0);
  perform expect_rows('anon', null, 'mandates', 0);
end;
$$;

-- Switch to a role RLS applies to. As superuser every case would pass.
set role rls_test_reader;
select run_access_matrix();
reset role;
reset request.jwt.claim.sub;

-- ---------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------
\echo ''
\echo 'Failures (empty means every case passed):'
select who, what, expected, actual,
       case when actual = -1 then 'policy error — recursion?' else 'wrong count' end as problem
from test_results where not passed order by who, what;

\echo ''
select count(*) filter (where passed) as passed,
       count(*) filter (where not passed) as failed,
       count(*) as total
from test_results;

-- Non-zero exit for CI when anything failed.
do $$
begin
  if exists (select 1 from test_results where not passed) then
    raise exception 'RLS access matrix: % of % cases failed',
      (select count(*) from test_results where not passed),
      (select count(*) from test_results);
  end if;
end;
$$;
