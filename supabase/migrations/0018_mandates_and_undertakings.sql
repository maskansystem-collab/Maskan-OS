-- =====================================================================
-- 0018_mandates_and_undertakings.sql
--
-- Two records the product already assumes exist.
--
-- A **mandate** is the owner's written appointment of the firm. It is the
-- answer to "why are you allowed to do that": every lease signed, deposit
-- held and repair approved traces back to one. Its authority limits are
-- meant to gate workflow, not merely be displayed — a quote above the
-- spend cap should pause for the owner rather than be assigned. Property
-- the firm owns outright has no mandate at all, which is the distinction
-- that keeps the owned and managed books apart.
--
-- An **undertaking** records that someone other than the tenant settles a
-- charge — almost always an employer covering rent or utilities. The
-- tenancy, the QID on file and the name on the cheques all stay with the
-- person living there; what changes is who pays which charge, evidenced by
-- a letter with its own expiry date. Recording the employer as the tenant
-- instead would break lease registration, QID compliance and cheque
-- matching at once, which is exactly why this needs a record of its own.
--
-- Nothing here stores a value that can be worked out from another. In
-- particular:
--   * the "expiring" and "expired" bands come from ends_on /
--     letter_expires_on at read time, so they cannot go stale without a
--     scheduled job to flip them;
--   * the cheque-name mismatch comes from comparing cheque_payer_name with
--     the tenant's name, so it cannot disagree with the records it warns
--     about.
-- Each table therefore stores only a lifecycle status a person sets.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type mandate_type as enum ('letting_only', 'management_only', 'letting_and_management');

-- A person sets these. "expiring" and "expired" are derived from ends_on.
create type mandate_status as enum ('draft', 'active', 'terminated');

create type undertaking_cover as enum ('rent', 'utilities', 'rent_and_utilities', 'part_of_rent');

create type undertaking_cap_period as enum ('month', 'quarter', 'year', 'contract');

-- How the third party actually settles: invoiced in arrears, paid straight
-- to the firm, or reimbursed to the tenant who paid first.
create type undertaking_settlement as enum ('employer_invoiced', 'employer_direct', 'tenant_reimbursed');

-- A person sets these. "expiring" and "lapsed" are derived from the letter.
create type undertaking_status as enum ('draft', 'active', 'revoked');

-- ---------------------------------------------------------------------
-- mandates
-- ---------------------------------------------------------------------
create table mandates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  mandate_code text not null,
  mandate_type mandate_type not null default 'letting_and_management',

  -- An exclusive mandate means no other agency is marketing the same
  -- property. An open one means first to let takes the fee, which changes
  -- how hard the letting team should push.
  is_exclusive boolean not null default true,

  starts_on date not null,
  ends_on date not null,
  notice_days integer not null default 60,
  status mandate_status not null default 'draft',

  -- What the firm may do without going back to the owner. These are the
  -- rows the authority checks read; a false here is a real limit, not a
  -- display preference.
  may_sign_lease boolean not null default false,
  may_accept_offers boolean not null default false,
  may_hold_deposit boolean not null default false,
  may_register_lease boolean not null default false,
  -- Repairs up to this amount may be approved without the owner. 0 means
  -- every repair goes back to them, however urgent.
  maintenance_spend_cap numeric(12,2) not null default 0,

  -- Commercial terms as agreed in the mandate. The live fee schedule stays
  -- in management_fees; these record what this appointment agreed, so an
  -- old mandate still reads correctly after the house rate changes.
  management_fee_pct numeric(5,2),
  letting_fee_months numeric(4,2),
  renewal_fee_months numeric(4,2),

  contract_document_id uuid references documents(id) on delete set null,
  notes text,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organisation_id, mandate_code),
  constraint chk_mandate_dates check (ends_on > starts_on),
  constraint chk_mandate_notice check (notice_days >= 0),
  constraint chk_mandate_spend_cap check (maintenance_spend_cap >= 0),
  -- A letting-only appointment cannot carry management authority, and a
  -- management-only one cannot accept offers. Catching this in the database
  -- means a mandate cannot claim authority its own type does not include.
  constraint chk_mandate_authority_matches_type check (
    case mandate_type
      when 'letting_only' then maintenance_spend_cap = 0 and not may_hold_deposit
      when 'management_only' then not may_accept_offers
      else true
    end
  )
);
create trigger trg_mandates_updated_at before update on mandates
  for each row execute function set_updated_at();
create index idx_mandates_org on mandates(organisation_id);
create index idx_mandates_owner on mandates(owner_id);
create index idx_mandates_status on mandates(status);
create index idx_mandates_ends_on on mandates(ends_on);

-- Which properties an appointment covers. An owner can appoint the firm
-- for some of their portfolio and not the rest, and one mandate can cover
-- several properties, so this is a join table rather than a column.
create table mandate_properties (
  mandate_id uuid not null references mandates(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  primary key (mandate_id, property_id)
);
create index idx_mandate_properties_property on mandate_properties(property_id);

-- ---------------------------------------------------------------------
-- undertakings
-- ---------------------------------------------------------------------
create table undertakings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  undertaking_code text not null,

  -- The third party. Not a tenant, not an owner, not a vendor — a company
  -- that has agreed to settle part of someone's bill. It gets no login and
  -- no portal, so it is recorded here rather than as a party record.
  payer_name text not null,
  payer_cr_number text,
  payer_contact_name text,
  payer_email text,
  payer_phone text,

  covers undertaking_cover not null,
  cap_amount numeric(12,2),
  cap_period undertaking_cap_period not null default 'month',
  settlement undertaking_settlement not null default 'employer_invoiced',

  -- The letter is the evidence. When it expires the liability reverts to
  -- the tenant, which is the single most useful thing this table knows.
  letter_signed_on date,
  letter_expires_on date,
  letter_document_id uuid references documents(id) on delete set null,

  -- The names actually written on the tenancy and on the cheques. Stored
  -- rather than assumed, because the whole point of the screen is to find
  -- where they do not match the tenant on the lease.
  contract_party_name text,
  cheque_payer_name text,

  status undertaking_status not null default 'draft',
  notes text,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organisation_id, undertaking_code),
  constraint chk_undertaking_letter_dates check (
    letter_expires_on is null or letter_signed_on is null
      or letter_expires_on > letter_signed_on
  ),
  constraint chk_undertaking_cap check (cap_amount is null or cap_amount >= 0),
  -- A partial contribution without an amount says nothing at all.
  constraint chk_undertaking_part_needs_cap check (
    covers <> 'part_of_rent' or cap_amount is not null
  )
);
create trigger trg_undertakings_updated_at before update on undertakings
  for each row execute function set_updated_at();
create index idx_undertakings_org on undertakings(organisation_id);
create index idx_undertakings_lease on undertakings(lease_id);
create index idx_undertakings_status on undertakings(status);
create index idx_undertakings_expires on undertakings(letter_expires_on);

-- ---------------------------------------------------------------------
-- Permissions
--
-- A mandate governs what the firm may do on an owner's behalf, so editing
-- one is an owner-relationship decision rather than a settings one. An
-- undertaking changes who owes what, so it sits with leases.
-- ---------------------------------------------------------------------
insert into permissions (code, category, description) values
  ('mandates.manage', 'owners', 'Create and edit management mandates and their authority limits'),
  ('undertakings.manage', 'leases', 'Record and edit third-party undertakings')
on conflict (code) do nothing;

-- Org owners and admins get everything, as in 0017.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.key in ('org_owner', 'org_admin') and r.organisation_id is null
  and p.code in ('mandates.manage', 'undertakings.manage')
on conflict do nothing;

-- A property manager already manages owners and leases, so both follow.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('mandates.manage', 'undertakings.manage')
where r.key = 'property_manager' and r.organisation_id is null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Row level security
--
-- Same pattern as every other organisation-scoped table in 0015: staff
-- read within their organisation, writes need the permission, and the
-- portal user whose record it is gets a SELECT of their own rows.
--
-- The portal policies read organisation_members directly and never
-- reference mandates or undertakings back, so there is no cycle between
-- these policies and the ones on owners, properties or leases.
-- ---------------------------------------------------------------------
alter table mandates enable row level security;

create policy mandates_staff_select on mandates for select
  using (is_org_member(organisation_id));
create policy mandates_staff_write on mandates for all
  using (has_permission(organisation_id, 'mandates.manage'))
  with check (has_permission(organisation_id, 'mandates.manage'));

-- The owner sees their own appointment. They cannot change its terms from
-- the portal: a mandate is varied in writing, not by clicking.
create policy mandates_owner_select on mandates for select
  using (exists (
    select 1 from organisation_members om
    where om.owner_id = mandates.owner_id
      and om.profile_id = auth.uid()
      and om.is_active
  ));

alter table mandate_properties enable row level security;

create policy mandate_properties_select on mandate_properties for select
  using (exists (
    select 1 from mandates m where m.id = mandate_id and is_org_member(m.organisation_id)
  ));
create policy mandate_properties_owner_select on mandate_properties for select
  using (exists (
    select 1 from mandates m
    join organisation_members om on om.owner_id = m.owner_id
    where m.id = mandate_id and om.profile_id = auth.uid() and om.is_active
  ));
create policy mandate_properties_write on mandate_properties for all
  using (exists (
    select 1 from mandates m
    where m.id = mandate_id and has_permission(m.organisation_id, 'mandates.manage')
  ))
  with check (exists (
    select 1 from mandates m
    where m.id = mandate_id and has_permission(m.organisation_id, 'mandates.manage')
  ));

alter table undertakings enable row level security;

create policy undertakings_staff_select on undertakings for select
  using (is_org_member(organisation_id));
create policy undertakings_staff_write on undertakings for all
  using (has_permission(organisation_id, 'undertakings.manage'))
  with check (has_permission(organisation_id, 'undertakings.manage'));

-- The tenant sees who is covering what on their own tenancy. They would
-- otherwise have no way to know the letter is about to expire and the bill
-- is about to become theirs.
create policy undertakings_tenant_select on undertakings for select
  using (exists (
    select 1 from leases l
    join organisation_members om on om.tenant_id = l.tenant_id
    where l.id = undertakings.lease_id
      and om.profile_id = auth.uid()
      and om.is_active
  ));
