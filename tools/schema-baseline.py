#!/usr/bin/env python3
"""
What the migrations in this repo say the database should contain.

Run it to produce a fingerprint of the expected schema, then compare that
against a live project. The point is to answer one question before writing
another migration: is the database actually the shape this codebase thinks
it is?

    python3 tools/schema-baseline.py            # human-readable
    python3 tools/schema-baseline.py --json     # machine-readable

To compare against a live project, run the queries printed by --sql in the
Supabase SQL editor (or through the Supabase MCP tools) and diff the two.
"""

from __future__ import annotations

import argparse
import collections
import json
import pathlib
import re
import sys

MIGRATIONS = pathlib.Path(__file__).resolve().parent.parent / "supabase" / "migrations"

# Live-side queries, kept beside the expectations they are compared with so
# the two cannot drift apart.
LIVE_SQL = """
-- tables
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;

-- enums
select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
where t.typtype = 'e' and n.nspname = 'public' order by 1;

-- functions
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by 1;

-- row-level security, per table
select c.relname, c.relrowsecurity from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by 1;

-- policies, per table
select tablename, count(*) from pg_policies
where schemaname = 'public' group by 1 order by 1;

-- applied migrations, if the CLI was used
select version, name from supabase_migrations.schema_migrations order by 1;
"""


def read_sql() -> tuple[list[pathlib.Path], str]:
    files = sorted(MIGRATIONS.glob("*.sql"))
    if not files:
        sys.exit(f"no migrations found in {MIGRATIONS}")
    return files, "\n".join(f.read_text(errors="replace") for f in files)


def baseline() -> dict:
    files, sql = read_sql()

    def grab(pattern: str) -> list[str]:
        return sorted(set(re.findall(pattern, sql, flags=re.I | re.M)))

    tables = grab(r"^create table (?:if not exists )?(\w+)")
    # Policies may target another schema (storage.objects); keep the schema so
    # those are not mistaken for an app table with no CREATE TABLE behind it.
    policies = re.findall(r"^create policy (\S+) on ([\w.]+)", sql, flags=re.I | re.M)
    app_policies = [(n, t) for n, t in policies if "." not in t]
    other_policies = [(n, t) for n, t in policies if "." in t]

    return {
        "migration_files": [f.name for f in files],
        "tables": tables,
        "enums": grab(r"^create type (\w+) as enum"),
        "functions": grab(r"^create (?:or replace )?function (\w+)"),
        "triggers": grab(r"^create (?:or replace )?trigger (\w+)"),
        "indexes": grab(r"^create (?:unique )?index (?:if not exists )?(\w+)"),
        "rls_enabled_on": grab(r"^alter table (\w+) enable row level security"),
        "policies_by_table": dict(collections.Counter(t for _, t in app_policies)),
        "policies_outside_public": [f"{t} ({n})" for n, t in other_policies],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="emit JSON")
    ap.add_argument("--sql", action="store_true", help="print the live-side queries")
    args = ap.parse_args()

    if args.sql:
        print(LIVE_SQL.strip())
        return

    b = baseline()
    if args.json:
        print(json.dumps(b, indent=1))
        return

    tables = set(b["tables"])
    rls = set(b["rls_enabled_on"])
    policed = set(b["policies_by_table"])
    total_policies = sum(b["policies_by_table"].values()) + len(b["policies_outside_public"])

    print(f"migrations      {len(b['migration_files'])}")
    print(f"tables          {len(tables)}")
    print(f"enums           {len(b['enums'])}")
    print(f"functions       {len(b['functions'])}")
    print(f"triggers        {len(b['triggers'])}")
    print(f"indexes         {len(b['indexes'])}")
    print(f"RLS enabled on  {len(rls)} of {len(tables)} tables")
    print(f"policies        {total_policies}"
          f" ({len(b['policies_outside_public'])} outside public)")

    # The three questions worth failing on.
    for label, missing in [
        ("tables with RLS not enabled", tables - rls),
        ("tables with no policy", tables - policed),
        ("policies on a table that is never created", policed - tables),
    ]:
        print(f"\n{label}: {sorted(missing) if missing else 'none'}")


if __name__ == "__main__":
    main()
