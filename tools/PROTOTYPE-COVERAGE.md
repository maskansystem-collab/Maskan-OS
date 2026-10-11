# Prototype coverage

**99 of 99 prototype views have a route. 86 distinct routes serve them.**

Checked, not asserted: `python3 -I tools/coverage-check.py <maskan-v2.html>`
reads the prototype's own view registrations, maps each to a route file,
and fails if a view has no route, a mapped route file is missing, or the
prototype contains a view the map has never heard of. Run it whenever the
prototype changes.

> **The count was wrong twice.** The prototype registers 91 views as
> `V.name=` and eight more in a loop —
> `Object.keys(AUTH_KINDS).forEach(k => { V[k] = … })` — for the sign-in,
> password and four invitation screens. Counting only the static ones gave
> 91 and made coverage look better than it was. The checker now reads both
> forms, which is why it is a script and not a number typed into this file.

## Where a view maps to a tab rather than a page

Thirteen views are served by a page they share with others, because they
answer the same question and splitting them would mean two places to look:

| Views | One route |
| --- | --- |
| `admin-orgs`, `admin-plans`, `admin-users`, `admin-audit` | `/admin` tabs |
| `admin-int`, `admin-settings` | `/admin/platform` tabs |
| `movein`, `movein-track` | `/move-ins` |
| `migration`, `import` | `/import` |
| `today` | `/dashboard` |
| `brokers`, `broker`, `vendor-terms` | `/parties`, and the detail's Terms tab |
| `signin`, `auth-create` | `/sign-in` |
| the four `auth-invite-*` | `/invite/[token]` |

## What is real and what is not

Every screen reads the database. Four still read fixtures, because the
schema has no table behind them:

| Screen | Missing table | Fixtures |
| --- | --- | --- |
| `/leasing`, `/leasing/[id]` | `leads`, `viewings` | `features/leasing/stub-data.ts` |
| `/offers`, `/offers/builder` | `offers` | `features/leasing/stub-data.ts` |
| `/owner/offers` | `offers` | `features/leasing/stub-data.ts` |
| `/reconciliation`, `/opening-balances` | `bank_transactions`, `reconciliation_sessions`, `opening_balances` | `features/finance/stub-data.ts` |
| `/tenant/messages` | `conversations`, `messages` | `features/portals/tenant-stub-data.ts` |

Each says so on screen and names the migration it needs. Everything else
— 22 migrations, 79 tables — is wired to real queries.

## Known gaps inside screens that exist

- **`/mandates/[id]`** records a spend cap but does not enforce it. A
  quote above the cap should pause for the owner rather than be assigned;
  that check is not wired into the maintenance flow yet, and the screen
  says so rather than implying otherwise.
- **`/compliance/[id]`** tracks document readiness but cannot record a
  registration reference, date or fee. `leases` has no columns for them.
- **`/vendor/[id]`** has no itemised parts table. `work_orders.parts_used`
  is free text, which is enough to record what was fitted but not to
  price each line.
- **Divisions** are not built. The prototype's five desks each with their
  own sidebar and work queue is a change to navigation and permissions
  rather than a set of screens, and `/departments` covers the reporting
  side of the same idea.

## Verifying

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm test                # vitest
npm run test:rls        # every migration + 65 access-control assertions
python3 -I tools/coverage-check.py ../maskan-v2.html
npx next build          # needs network for the Google fonts
```
