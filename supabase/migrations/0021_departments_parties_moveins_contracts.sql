-- =====================================================================
-- 0021_departments_parties_moveins_contracts.sql
--
-- The operational records behind the last of the prototype's screens.
-- Four ideas, in the order they depend on each other.
--
-- 1. DEPARTMENTS, and the managed/owned split.
--    A firm that manages other people's property and also owns some of
--    its own is running two businesses with different books: rent
--    collected on a managed property belongs to the owner and appears on
--    their statement, while rent on an owned one is the firm's revenue.
--    A management fee is income from a managed property and, at most, an
--    internal transfer on an owned one. Getting this wrong overstates
--    revenue by the whole rent roll, so the distinction is a column on
--    the property, not a report-time guess.
--
-- 2. PARTIES, internal and external.
--    The prototype's "people and providers" screen makes the point that
--    an in-house maintenance team and an outside contractor are assigned
--    work the same way: same assignment, same audit trail, different
--    settlement. An internal team costs an internal rate; an external one
--    gets a portal login and sends an invoice. That is two columns on
--    vendors, not a second table — work_orders already assign to a
--    vendor, and splitting them would mean two code paths for one job.
--
-- 3. MOVE-INS.
--    A move-in is the stretch between "offer accepted" and "lease
--    active", and the useful thing to know is where each one is stuck.
--    It holds its own step and blocker while the lease does not exist
--    yet, then points at the lease once it does.
--
-- 4. CONTRACTS.
--    A contract is a document generated from a template and signed by
--    several parties, each with their own method, moment and evidence.
--    lease_documents carries one is_signed boolean, which cannot express
--    "the manager and tenant have signed, the owner has not". Contracts
--    also hang off a mandate, not only a lease, so they are their own
--    record rather than more columns on lease_documents.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Departments and the managed / owned split
-- ---------------------------------------------------------------------

-- How the firm stands in relation to a property. "Managed" is somebody
-- else's asset handled for a fee; "owned" is the firm's own.
create type property_holding as enum ('managed', 'owned');

create table departments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  code text not null,
  purpose text,
  -- The desk's usual holding. A property still carries its own, because
  -- a department can hold both.
  default_holding property_holding,
  head_member_id uuid references organisation_members(id) on delete set null,
  revenue_basis text,
  notes text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);
create trigger trg_departments_updated_at before update on departments
  for each row execute function set_updated_at();
create index idx_departments_org on departments(organisation_id);

alter table properties add column department_id uuid references departments(id) on delete set null;
-- Default managed: the overwhelming majority of rows in a property
-- management system are somebody else's property, and treating an owned
-- one as managed understates revenue rather than overstating it.
alter table properties add column holding property_holding not null default 'managed';
-- The district a property sits in — "The Pearl", "West Bay", "Lusail".
-- Benchmarks are grouped by it, and an address string cannot be grouped.
alter table properties add column area text;

create index idx_properties_department on properties(department_id);
create index idx_properties_holding on properties(holding);
create index idx_properties_area on properties(area);

-- ---------------------------------------------------------------------
-- 2. Parties: an in-house team is a party too
-- ---------------------------------------------------------------------
create type service_function as enum ('leasing', 'maintenance', 'both');

alter table vendors add column is_internal boolean not null default false;
alter table vendors add column service_function service_function not null default 'maintenance';
-- What an hour of in-house time is charged at internally. Meaningless for
-- an external company, which invoices instead.
alter table vendors add column internal_rate_qar numeric(10,2);
alter table vendors add column department_id uuid references departments(id) on delete set null;

create index idx_vendors_function on vendors(service_function);
create index idx_vendors_internal on vendors(is_internal);

-- An internal party has no invoices to chase, so it has no rate to
-- invoice at; an external one has no internal rate.
alter table vendors add constraint chk_vendor_internal_rate
  check (is_internal or internal_rate_qar is null);

-- The agreement behind an external party: the terms a vendor works under.
create table vendor_agreements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  title text not null,
  starts_on date not null,
  ends_on date,
  response_hours integer,
  callout_fee numeric(10,2),
  hourly_rate numeric(10,2),
  payment_terms_days integer not null default 30,
  insurance_expires_on date,
  licence_expires_on date,
  document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_vendor_agreement_dates check (ends_on is null or ends_on > starts_on)
);
create trigger trg_vendor_agreements_updated_at before update on vendor_agreements
  for each row execute function set_updated_at();
create index idx_vendor_agreements_vendor on vendor_agreements(vendor_id);

-- ---------------------------------------------------------------------
-- 3. Work order completion and sign-off
--
-- The prototype's "job done" screen collects what was done, what it
-- cost, photos, and a signature from whoever accepted the work. Photos
-- already go to maintenance_attachments; the rest had nowhere to live.
-- ---------------------------------------------------------------------
alter table work_orders add column completed_at timestamptz;
alter table work_orders add column completion_notes text;
alter table work_orders add column parts_used text;
-- Who accepted the work on site. Often the tenant, who has no login.
alter table work_orders add column signed_off_name text;
alter table work_orders add column signed_off_at timestamptz;

-- ---------------------------------------------------------------------
-- 4. Move-ins
-- ---------------------------------------------------------------------
create type move_in_step as enum (
  'unit', 'tenant', 'terms', 'payment', 'documents', 'contract', 'activate'
);

create table move_ins (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  move_in_code text not null,
  unit_id uuid not null references units(id) on delete cascade,
  -- Null until the tenant record is created: a move-in can start from a
  -- name and a phone number before anybody is on the books.
  tenant_id uuid references tenants(id) on delete set null,
  -- Set when the lease is finally created, which is what ends the
  -- move-in. Until then the terms live on this row.
  lease_id uuid references leases(id) on delete set null,
  renewal_offer_id uuid references lease_renewal_offers(id) on delete set null,

  step move_in_step not null default 'unit',
  -- Free text rather than an enum: what a move-in is stuck on is usually
  -- a sentence about a person, not one of five states.
  blocked_reason text,

  proposed_rent numeric(12,2),
  proposed_start date,
  term_months integer,
  deposit numeric(12,2),
  rent_free_days integer not null default 0,
  payment_method payment_method,
  instalment_count integer,

  handled_by uuid references organisation_members(id) on delete set null,
  notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organisation_id, move_in_code),
  constraint chk_move_in_term check (term_months is null or term_months > 0),
  -- A finished move-in is one that produced a lease. Recording a
  -- completion with no lease would hide the thing that was supposed to
  -- come out of it.
  constraint chk_move_in_completed check (completed_at is null or lease_id is not null)
);
create trigger trg_move_ins_updated_at before update on move_ins
  for each row execute function set_updated_at();
create index idx_move_ins_org on move_ins(organisation_id);
create index idx_move_ins_unit on move_ins(unit_id);
create index idx_move_ins_step on move_ins(step);
create index idx_move_ins_open on move_ins(organisation_id) where completed_at is null;

-- ---------------------------------------------------------------------
-- 5. Contracts and their signatures
-- ---------------------------------------------------------------------
create type contract_status as enum (
  'draft', 'awaiting_signature', 'partially_signed', 'fully_signed', 'void'
);

create type signature_method as enum ('e_signature', 'wet_signature');

create table contracts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  contract_code text not null,
  template_id uuid references document_templates(id) on delete set null,
  -- A contract is about one thing: a tenancy, or the mandate appointing
  -- the firm. Exactly one of these is set.
  lease_id uuid references leases(id) on delete cascade,
  mandate_id uuid references mandates(id) on delete cascade,

  subject text not null,
  locale text not null default 'en',
  page_count integer,
  storage_path text,
  status contract_status not null default 'draft',
  voided_reason text,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organisation_id, contract_code),
  constraint chk_contract_subject_is_one_thing check (
    (lease_id is not null and mandate_id is null)
    or (lease_id is null and mandate_id is not null)
  ),
  constraint chk_contract_void_has_reason check (
    status <> 'void' or voided_reason is not null
  )
);
create trigger trg_contracts_updated_at before update on contracts
  for each row execute function set_updated_at();
create index idx_contracts_org on contracts(organisation_id);
create index idx_contracts_lease on contracts(lease_id);
create index idx_contracts_mandate on contracts(mandate_id);
create index idx_contracts_status on contracts(status);

-- One row per party who has to sign. signed_at null means outstanding,
-- which is what drives "2 signatures outstanding" without a second
-- counter to keep in step.
create table contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  party_role text not null,
  party_name text not null,
  -- Set when the signatory is somebody with a login. A tenant signing on
  -- paper has a name and nothing else, which is fine.
  profile_id uuid references profiles(id) on delete set null,
  method signature_method,
  signed_at timestamptz,
  -- Evidence: the address an e-signature came from, or the scan of a wet
  -- one. Whichever applies.
  signed_ip inet,
  signature_document_id uuid references documents(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint chk_contract_party_signed check (
    (signed_at is null) or (method is not null)
  )
);
create index idx_contract_parties_contract on contract_parties(contract_id);

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
insert into permissions (code, category, description) values
  ('departments.manage', 'settings', 'Create and edit departments and the managed/owned split'),
  ('moveins.manage', 'leases', 'Run move-ins through to an active lease'),
  ('contracts.manage', 'leases', 'Generate contracts and record signatures')
on conflict (code) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.key in ('org_owner', 'org_admin') and r.organisation_id is null
  and p.code in ('departments.manage', 'moveins.manage', 'contracts.manage')
on conflict do nothing;

-- A property manager runs move-ins and contracts; departments are an
-- organisational decision and stay with the owner and admin.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('moveins.manage', 'contracts.manage')
where r.key = 'property_manager' and r.organisation_id is null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Row level security
--
-- is_org_staff for staff reads, per 0020. Each new table gets its portal
-- clause in the same breath as its staff clause, and none of them reads a
-- parent that reads back.
-- ---------------------------------------------------------------------
alter table departments enable row level security;
create policy departments_staff_select on departments for select
  using (is_org_staff(organisation_id));
create policy departments_write on departments for all
  using (has_permission(organisation_id, 'departments.manage'))
  with check (has_permission(organisation_id, 'departments.manage'));

alter table vendor_agreements enable row level security;
create policy vendor_agreements_select on vendor_agreements for select
  using (exists (
    select 1 from vendors v
    where v.id = vendor_id and (is_org_staff(v.organisation_id) or is_vendor_member(v.id))
  ));
create policy vendor_agreements_write on vendor_agreements for all
  using (exists (
    select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')
  ))
  with check (exists (
    select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')
  ));

alter table move_ins enable row level security;
create policy move_ins_staff_select on move_ins for select
  using (is_org_staff(organisation_id));
create policy move_ins_write on move_ins for all
  using (has_permission(organisation_id, 'moveins.manage'))
  with check (has_permission(organisation_id, 'moveins.manage'));

alter table contracts enable row level security;
create policy contracts_staff_select on contracts for select
  using (is_org_staff(organisation_id));
create policy contracts_write on contracts for all
  using (has_permission(organisation_id, 'contracts.manage'))
  with check (has_permission(organisation_id, 'contracts.manage'));

-- A tenant reads the contract for their own tenancy, and an owner the
-- contract behind their own mandate. Both read through the party record
-- only, so neither opens a path back into contracts.
create policy contracts_tenant_select on contracts for select
  using (lease_id is not null and exists (
    select 1 from leases l
    join organisation_members om on om.tenant_id = l.tenant_id
    where l.id = contracts.lease_id and om.profile_id = auth.uid() and om.is_active
  ));
create policy contracts_owner_select on contracts for select
  using (mandate_id is not null and exists (
    select 1 from mandates m
    join organisation_members om on om.owner_id = m.owner_id
    where m.id = contracts.mandate_id and om.profile_id = auth.uid() and om.is_active
  ));

alter table contract_parties enable row level security;
create policy contract_parties_select on contract_parties for select
  using (exists (
    select 1 from contracts c where c.id = contract_id and is_org_staff(c.organisation_id)
  ) or profile_id = auth.uid());
create policy contract_parties_write on contract_parties for all
  using (exists (
    select 1 from contracts c
    where c.id = contract_id and has_permission(c.organisation_id, 'contracts.manage')
  ))
  with check (exists (
    select 1 from contracts c
    where c.id = contract_id and has_permission(c.organisation_id, 'contracts.manage')
  ));

-- ---------------------------------------------------------------------
-- Default departments
--
-- The five desks the prototype shows, created per organisation on demand
-- rather than seeded globally: a one-person firm should not be handed an
-- org chart it did not ask for. Nothing is inserted here.
-- ---------------------------------------------------------------------
