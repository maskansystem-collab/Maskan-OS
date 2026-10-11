# Prototype coverage checklist

Every route in `maskan-v2.html`, against what exists in the Next.js app.

**71 of 91 built. 20 remaining.**

Counted against the 91 view definitions in `maskan-v2.html` (every
`V.name=` and `V["name"]=`), cross-checked so that every row below is a
real view and every view has a row. An earlier version of this file said
"72 of 99"; the denominator was wrong.

Of the 20, **none can be built without a schema change** — every screen
that only needed a route file now has one. The remaining work splits into
three groups, listed at the bottom.

> **Slice 1a** (portfolio and letting) and **1b** (money) are in. Four
> letting screens and two finance screens read stub data because this
> schema has no `leads`, `offers`, `viewings`, `brokers`,
> `bank_transactions`, `reconciliation_sessions` or `opening_balances`
> table; each says so on screen and points at the stub file describing the
> migration it needs.
>
> **Portals**: owner 10 of 10, tenant 7 of 7, contractor 2 of 4.
>
> **Platform admin**: `/admin` carries the organisations, plans, users and
> audit tables as tabs, and `/admin/organisations/[id]` is the org detail.
>
> Four finished features in this codebase turned out to be unreachable
> because the route file was missing while the query, the component and the
> action were all written: the five Slice A detail pages, the ⌘K command
> menu, the import wizard and the platform org detail. `CONVENTIONS.md`
> says to search before building for exactly this reason.

| Role | Built | Remaining |
| --- | --- | --- |
| Staff and operator | 46 | 12 |
| Owner portal | 10 | 0 |
| Tenant portal | 7 | 0 |
| Contractor portal | 2 | 2 |
| Platform admin | 6 | 5 |
| Auth and onboarding | 9 | 0 |

## Staff and operator

| Prototype route | Status |
| --- | --- |
| `dashboard` | built, `/dashboard` |
| `today` | built, `/dashboard` |
| `properties` | built, `/properties` |
| `property` | built, `/properties/[id]` |
| `buildings` | built, `/buildings` |
| `building` | built, `/buildings/[id]` |
| `units` | built, `/units` |
| `unit` | built, `/units/[id]` |
| `owners` | built, `/owners` |
| `owner-detail` | built, `/owners/[id]` |
| `tenants` | built, `/tenants` |
| `tenant-detail` | built, `/tenants/[id]` |
| `vacancy` | built, `/vacancy` |
| `leasing` | built, `/leasing`, **stub data** |
| `lead` | built, `/leasing/[id]`, **stub data** |
| `offers` | built, `/offers`, **stub data** |
| `offer` | built, `/offers/builder`, **stub data** |
| `leases` | built, `/leases` |
| `lease` | built, `/leases/[id]` |
| `finance` | built, `/finance` |
| `payments` | built, `/payments` |
| `take-payment` | built, `/take-payment` |
| `record-payment` | built, `/record-payment` |
| `cheques` | built, `/payments/cheques` |
| `cheque` | built, `/payments/cheques/[id]` |
| `ledger` | built, `/ledger` |
| `outstanding` | built, `/outstanding` |
| `statements` | built, `/statements` |
| `expenses` | built, `/expenses` |
| `reconciliation` | built, `/reconciliation`, **stub data** |
| `opening-balances` | built, `/opening-balances`, **stub data** |
| `maintenance` | built, `/maintenance` |
| `maint-detail` | built, `/maintenance/[id]` |
| `vendors` | built, `/vendors` |
| `compliance` | built, `/compliance` |
| `compliance-detail` | built, `/compliance/[id]` |
| `documents` | built, `/documents` |
| `templates` | built, `/settings/templates` |
| `roles` | built, `/settings/roles` |
| `fees` | built, `/settings/fees` |
| `subscription` | built, `/settings/subscription` |
| `settings` | built, `/settings` |
| `reports` | built, `/reports` |
| `migration` | built, `/import` |
| `import` | built, `/import` |
| `departments` | **needs schema** — no `departments` table |
| `mandates` | **schema ready** (0018), screen not built |
| `mandate` | **schema ready** (0018), screen not built |
| `undertakings` | **schema ready** (0018), screen not built |
| `undertaking` | **schema ready** (0018), screen not built |
| `contracts` | **needs schema** — see note below |
| `contract` | **needs schema** — see note below |
| `movein` | **needs schema** — no `movein_checklists` table |
| `movein-track` | **needs schema** — no `movein_checklists` table |
| `brokers` | **needs schema** — no `brokers` table |
| `broker` | **needs schema** — no `brokers` table |
| `renewals` | **needs schema** — `lease_renewal_offers` exists but holds no pipeline |
| `lease-new` | **needs a form**, not a schema change — `/leases/new` |

> `contracts` may not be a distinct entity at all. In the prototype it
> looks like a view over `leases` plus `lease_documents`; check before
> adding a table.

## Owner portal

All 10 built. `owner-mandate` and `owner-offers` read
`features/portals/owner-stub-data.ts`.

| Prototype route | Status |
| --- | --- |
| `owner` | built, `/owner` |
| `ownership` | built, `/owner/ownership` |
| `owner-props` | built, `/owner/properties` |
| `owner-vacancy` | built, `/owner/vacancy` |
| `owner-fin` | built, `/owner/finance` |
| `owner-stmt` | built, `/owner/statements` |
| `owner-maint` | built, `/owner/maintenance` |
| `owner-docs` | built, `/owner/documents` |
| `owner-mandate` | built, `/owner/mandate`, **stub data** — 0018 can replace it |
| `owner-offers` | built, `/owner/offers`, **stub data** |

## Tenant portal

All 7 built. `tenant-msg` shows real notifications with stubbed
conversations; there is no `messages` or `conversations` table.

| Prototype route | Status |
| --- | --- |
| `tenant` | built, `/tenant` |
| `tenant-pay` | built, `/tenant/rent` |
| `tenant-lease` | built, `/tenant/lease` |
| `tenant-contract` | built, `/tenant/contract` |
| `tenant-docs` | built, `/tenant/documents` |
| `tenant-maint` | built, `/tenant/maintenance` |
| `tenant-msg` | built, `/tenant/messages`, **stub conversations** |

## Contractor portal

| Prototype route | Status |
| --- | --- |
| `vendor` | built, `/vendor` |
| `vendor-job` | built, `/vendor/[id]` — **missing the 11-step checklist and the itemised parts table** |
| `vendor-done` | **needs schema** — completion photos and sign-off |
| `vendor-terms` | **needs schema** — no vendor agreement record |

## Platform admin

| Prototype route | Status |
| --- | --- |
| `admin` | built, `/admin` |
| `admin-orgs` | built, `/admin` → Organisations tab |
| `admin-org` | built, `/admin/organisations/[id]` |
| `admin-plans` | built, `/admin` → Plans tab |
| `admin-users` | built, `/admin` → Users tab |
| `admin-audit` | built, `/admin` → Audit tab |
| `admin-subs` | **needs a screen** — `organisation_subscriptions` across all orgs |
| `admin-int` | **needs schema** — platform-wide integration config |
| `admin-market` | **needs schema** — no marketing or lead tables |
| `admin-settings` | **needs schema** — platform settings beyond `app_settings` |
| `admin-support` | **needs schema** — no support notes table |

## Auth and onboarding

All 9 built: `/setup`, `/sign-in`, `/forgot-password`, `/reset-password`
and `/invite/[token]` (which serves all four invitation variants).

## What is left, grouped

**1. Needs new tables (12 screens).** Departments, move-in checklists,
brokers, renewals pipeline, vendor completion and terms, and five
platform-admin screens. Each needs a migration before a screen is worth
writing.

**1b. Schema ready, screen not built (4).** Mandates list and detail,
undertakings list and detail. Migration 0018 adds `mandates`,
`mandate_properties` and `undertakings`; the four staff screens and the
owner portal's mandate screen can now read real data instead of
`features/portals/owner-stub-data.ts`.

**2. Already has a screen, missing part of it (3).**

- `/tenants/[id]` — the stat cards count child records where the prototype
  shows money (current unit, monthly rent, paid to date, outstanding).
  Needs a payment rollup that `getTenant` does not do yet.
- `/vendor/[id]` — no 11-step checklist (drivable from `work_order_events`)
  and no itemised parts table (needs a line-items table).
- `/compliance/[id]` — no registration reference, date or fee. The `leases`
  table has no columns for them.

**3. Architecture, not pages (1).** Divisions: five desks (Leasing,
Property Management, Facilities, Owned Portfolio, Everything), each with
its own sidebar and work queue. That is a change to navigation and
permissions, not a set of new screens.
