"""Build the Maskan OS deck."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from kit import new_deck
import slides_a as a
import slides_b as b

OUT = str(Path(__file__).parent / "Maskan-OS-deck.pptx")

BUILDERS = [
    a.s01_title, a.s02_problem, a.s03_idea, a.s04_owner_sees, a.s05_rent,
    a.s06_payments, a.s07_statements, a.s08_maintenance, a.s09_leases,
    a.s10_compliance, a.s11_roles, a.s12_manager,
    b.s13_owner_portal, b.s14_tenant_portal, b.s15_ownership, b.s16_migration,
    b.s17_built, b.s18_plans, b.s19_why_now, b.s20_scope, b.s21_roadmap,
    b.s22_pilot, b.s23_next, b.s24_close,
]


def main():
    prs = new_deck()
    for i, fn in enumerate(BUILDERS, 1):
        fn(prs)
        print(f"  {i:2d}  {fn.__name__}")
    prs.save(OUT)
    print(f"\n{len(BUILDERS)} slides -> {OUT}")


if __name__ == "__main__":
    main()
