-- =====================================================================
-- 0022_platform_support_and_market_consent.sql
--
-- The last two platform-console screens, and deliberately the smallest
-- migration that serves them.
--
-- SUPPORT NOTES. What Maskan's own staff did for a customer and when.
-- Visible only to the platform, never to the organisation it is about,
-- which is why it cannot live in that organisation's audit log.
--
-- MARKET CONSENT. The market-intelligence screen reports achieved rents
-- by district and unit type. Every figure on it — median, range,
-- year-on-year movement, void days, renewal rate, and the count of data
-- points behind each — is computed from leases that already exist. None
-- of it is stored, and storing it would mean a benchmark that disagrees
-- with the leases it came from.
--
-- The one thing that must be stored is permission: whether an
-- organisation has agreed that its achieved rents may be pooled. That is
-- two columns on organisations, not a table. A firm that has not been
-- asked contributes nothing, and the screen says how thin the coverage
-- is rather than publishing a number it cannot stand behind.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Support notes
-- ---------------------------------------------------------------------
create table support_notes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  -- The Maskan person who wrote it.
  author_id uuid references profiles(id) on delete set null,
  author_name text not null,
  body text not null,
  -- What it was about: onboarding, migration, a billing question.
  category text,
  -- Set while something is still owed to the customer.
  follow_up_on date,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_support_notes_updated_at before update on support_notes
  for each row execute function set_updated_at();
create index idx_support_notes_org on support_notes(organisation_id);
create index idx_support_notes_open on support_notes(follow_up_on)
  where resolved_at is null;

alter table support_notes enable row level security;

-- Platform only, both ways. An organisation must not read what support
-- wrote about it, so there is deliberately no member policy here: the
-- note may say "the customer was confused about X", which is useful
-- internally and insulting to receive.
create policy support_notes_platform_select on support_notes for select
  using (is_platform_super_admin());
create policy support_notes_platform_write on support_notes for all
  using (is_platform_super_admin())
  with check (is_platform_super_admin());

-- ---------------------------------------------------------------------
-- Market consent
-- ---------------------------------------------------------------------
create type market_consent as enum ('not_asked', 'granted', 'declined');

alter table organisations add column market_consent market_consent not null default 'not_asked';
alter table organisations add column market_consent_at timestamptz;
alter table organisations add column market_consent_by uuid references profiles(id) on delete set null;

-- Answered, so there is a moment to record; not asked, so there is not.
alter table organisations add constraint chk_market_consent_answered
  check ((market_consent = 'not_asked') = (market_consent_at is null));

create index idx_organisations_market_consent on organisations(market_consent)
  where market_consent = 'granted';

-- The organisation's own admins decide. 0015 already lets an admin update
-- their organisation, so nothing new is needed for them to answer; the
-- platform can see the answer because it bypasses RLS entirely.
