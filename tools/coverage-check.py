#!/usr/bin/env python3
"""Check every prototype view has a route, and every mapping points at a real file.

    python3 -I tools/coverage-check.py <path-to-maskan-v2.html>

Fails if a view has no route, if a route named here does not exist, or if
the prototype has a view this map has never heard of. The last case is the
one that matters: a new prototype would otherwise look fully covered.
"""
import pathlib
import re
import sys

# Prototype view -> the route that serves it. A tab inside a page maps to
# that page, with the tab named, because a tab is not a route.
MAP: dict[str, str] = {
    # Staff
    "dashboard": "app/(app)/dashboard/page.tsx",
    "today": "app/(app)/dashboard/page.tsx",
    "properties": "app/(app)/properties/page.tsx",
    "property": "app/(app)/properties/[id]/page.tsx",
    "buildings": "app/(app)/buildings/page.tsx",
    "building": "app/(app)/buildings/[id]/page.tsx",
    "units": "app/(app)/units/page.tsx",
    "unit": "app/(app)/units/[id]/page.tsx",
    "owners": "app/(app)/owners/page.tsx",
    "owner-detail": "app/(app)/owners/[id]/page.tsx",
    "tenants": "app/(app)/tenants/page.tsx",
    "tenant-detail": "app/(app)/tenants/[id]/page.tsx",
    "vacancy": "app/(app)/vacancy/page.tsx",
    "leasing": "app/(app)/leasing/page.tsx",
    "lead": "app/(app)/leasing/[id]/page.tsx",
    "offers": "app/(app)/offers/page.tsx",
    "offer": "app/(app)/offers/builder/page.tsx",
    "leases": "app/(app)/leases/page.tsx",
    "lease": "app/(app)/leases/[id]/page.tsx",
    "lease-new": "app/(app)/leases/new/page.tsx",
    "renewals": "app/(app)/renewals/page.tsx",
    "movein": "app/(app)/move-ins/page.tsx",
    "movein-track": "app/(app)/move-ins/page.tsx",
    "contracts": "app/(app)/contracts/page.tsx",
    "contract": "app/(app)/contracts/[id]/page.tsx",
    "templates": "app/(app)/settings/templates/page.tsx",
    "mandates": "app/(app)/mandates/page.tsx",
    "mandate": "app/(app)/mandates/[id]/page.tsx",
    "undertakings": "app/(app)/undertakings/page.tsx",
    "undertaking": "app/(app)/undertakings/[id]/page.tsx",
    "compliance": "app/(app)/compliance/page.tsx",
    "compliance-detail": "app/(app)/compliance/[id]/page.tsx",
    "documents": "app/(app)/documents/page.tsx",
    "finance": "app/(app)/finance/page.tsx",
    "payments": "app/(app)/payments/page.tsx",
    "take-payment": "app/(app)/take-payment/page.tsx",
    "record-payment": "app/(app)/record-payment/page.tsx",
    "cheques": "app/(app)/payments/cheques/page.tsx",
    "cheque": "app/(app)/payments/cheques/[id]/page.tsx",
    "ledger": "app/(app)/ledger/page.tsx",
    "outstanding": "app/(app)/outstanding/page.tsx",
    "statements": "app/(app)/statements/page.tsx",
    "expenses": "app/(app)/expenses/page.tsx",
    "fees": "app/(app)/settings/fees/page.tsx",
    "reconciliation": "app/(app)/reconciliation/page.tsx",
    "opening-balances": "app/(app)/opening-balances/page.tsx",
    "maintenance": "app/(app)/maintenance/page.tsx",
    "maint-detail": "app/(app)/maintenance/[id]/page.tsx",
    "vendors": "app/(app)/vendors/page.tsx",
    "brokers": "app/(app)/parties/page.tsx",
    "broker": "app/(app)/parties/[id]/page.tsx",
    "departments": "app/(app)/departments/page.tsx",
    "roles": "app/(app)/settings/roles/page.tsx",
    "subscription": "app/(app)/settings/subscription/page.tsx",
    "settings": "app/(app)/settings/page.tsx",
    "reports": "app/(app)/reports/page.tsx",
    "migration": "app/(app)/import/page.tsx",
    "import": "app/(app)/import/page.tsx",
    # Owner portal
    "owner": "app/owner/page.tsx",
    "ownership": "app/owner/ownership/page.tsx",
    "owner-props": "app/owner/properties/page.tsx",
    "owner-vacancy": "app/owner/vacancy/page.tsx",
    "owner-fin": "app/owner/finance/page.tsx",
    "owner-stmt": "app/owner/statements/page.tsx",
    "owner-maint": "app/owner/maintenance/page.tsx",
    "owner-docs": "app/owner/documents/page.tsx",
    "owner-mandate": "app/owner/mandate/page.tsx",
    "owner-offers": "app/owner/offers/page.tsx",
    # Tenant portal
    "tenant": "app/tenant/page.tsx",
    "tenant-pay": "app/tenant/rent/page.tsx",
    "tenant-lease": "app/tenant/lease/page.tsx",
    "tenant-contract": "app/tenant/contract/page.tsx",
    "tenant-docs": "app/tenant/documents/page.tsx",
    "tenant-maint": "app/tenant/maintenance/page.tsx",
    "tenant-msg": "app/tenant/messages/page.tsx",
    # Contractor portal
    "vendor": "app/vendor/page.tsx",
    "vendor-job": "app/vendor/[id]/page.tsx",
    "vendor-done": "app/vendor/completed/page.tsx",
    "vendor-terms": "app/(app)/parties/[id]/page.tsx",
    # Platform admin
    "admin": "app/admin/page.tsx",
    "admin-orgs": "app/admin/page.tsx",
    "admin-org": "app/admin/organisations/[id]/page.tsx",
    "admin-plans": "app/admin/page.tsx",
    "admin-users": "app/admin/page.tsx",
    "admin-audit": "app/admin/page.tsx",
    "admin-subs": "app/admin/subscriptions/page.tsx",
    "admin-int": "app/admin/platform/page.tsx",
    "admin-settings": "app/admin/platform/page.tsx",
    "admin-market": "app/admin/market/page.tsx",
    "admin-support": "app/admin/support/page.tsx",
    # Auth and onboarding
    "onboarding": "app/setup/page.tsx",
    "signin": "app/(auth)/sign-in/page.tsx",
    "auth-create": "app/(auth)/sign-in/page.tsx",
    "auth-forgot": "app/(auth)/forgot-password/page.tsx",
    "auth-reset": "app/(auth)/reset-password/page.tsx",
    "auth-invite": "app/(auth)/invite/[token]/page.tsx",
    "auth-invite-owner": "app/(auth)/invite/[token]/page.tsx",
    "auth-invite-tenant": "app/(auth)/invite/[token]/page.tsx",
    "auth-invite-vendor": "app/(auth)/invite/[token]/page.tsx",
}

# Views that are deliberately not their own screen, with the reason.
FOLDED: dict[str, str] = {}


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    html = pathlib.Path(sys.argv[1]).read_text(errors="replace")

    # Views assigned directly: V.name= or V["name"]=
    views = set(
        re.sub(r'^V\.?\[?"?|"?\]?=$', "", m)
        for m in re.findall(r'^V(?:\.[a-z0-9_-]+|\["[a-z0-9_-]+"\])=', html, re.M)
    )

    # Views registered in a loop. The auth screens are all built from one
    # template: `Object.keys(AUTH_KINDS).forEach(k => { V[k] = ... })`, so
    # they never appear as a V.name= assignment. Counting only the static
    # ones undercounts the prototype by eight and makes coverage look
    # better than it is — which is exactly what happened once.
    for table in re.findall(r"forEach\(k\s*=>\s*\{\s*V\[k\]", html):
        pass
    if re.search(r"Object\.keys\((\w+)\)\.forEach\(k\s*=>\s*\{\s*V\[k\]", html):
        name = re.search(
            r"Object\.keys\((\w+)\)\.forEach\(k\s*=>\s*\{\s*V\[k\]", html
        ).group(1)
        block = re.search(
            rf"^const {name}=\{{(.*?)^\}};", html, re.M | re.S
        )
        if block:
            views |= set(re.findall(r'^\s*"([a-z0-9_-]+)":', block.group(1), re.M))

    views = sorted(views)

    root = pathlib.Path(__file__).resolve().parent.parent
    missing_route, missing_file, unknown = [], [], []

    for view in views:
        if view in FOLDED:
            continue
        target = MAP.get(view)
        if target is None:
            unknown.append(view)
        elif not (root / target).exists():
            missing_file.append((view, target))

    for view, target in MAP.items():
        if view not in views:
            missing_route.append(view)

    print(f"prototype views   {len(views)}")
    print(f"mapped            {len(views) - len(unknown)}")
    print(f"distinct routes   {len(set(MAP.values()))}")

    if unknown:
        print(f"\nviews with no route ({len(unknown)}):")
        for v in unknown:
            print(f"  {v}")
    if missing_file:
        print(f"\nmapped to a file that does not exist ({len(missing_file)}):")
        for v, t in missing_file:
            print(f"  {v} -> {t}")
    if missing_route:
        print(f"\nmapped but not in this prototype ({len(missing_route)}):")
        for v in missing_route:
            print(f"  {v}")

    if unknown or missing_file or missing_route:
        return 1
    print("\nEvery prototype view has a route, and every route exists.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
