-- =====================================================================
-- tools/dump-schema-facts.sql
--
-- Emits the four fact files tools/generate-types.py reads:
-- tables.txt, fks.txt, enums.txt, fns.txt.
--
-- Run it against any database that has every migration applied — the
-- throwaway local one tools/rls-test.sh builds will do, which means types
-- can be regenerated with no Supabase access and no access token:
--
--   psql -d <db> -f tools/dump-schema-facts.sql
--   cd types && python3 ../tools/generate-types.py
--
-- The column codes match the TYPE map in generate-types.py; the flags are
-- a bitfield, 1 for NOT NULL and 2 for "has a default".
-- =====================================================================

\pset tuples_only on
\pset format unaligned
\pset footer off

\o tables.txt
select t.table_name || '|' || string_agg(
         c.column_name || ':' ||
         case
           when c.data_type = 'uuid' then 'u'
           when c.udt_name in ('int2','int4','int8') then 'i'
           when c.udt_name in ('numeric','float4','float8') then 'n'
           when c.udt_name = 'bool' then 'b'
           when c.udt_name = 'jsonb' or c.udt_name = 'json' then 'j'
           when c.data_type = 'ARRAY' then 'a'
           when c.data_type = 'date' then 'D'
           when c.data_type like 'timestamp%' then 't'
           when c.data_type = 'USER-DEFINED' then 'E' || c.udt_name
           else 's'
         end || ':' ||
         ((case when c.is_nullable = 'NO' then 1 else 0 end)
          + (case when c.column_default is not null then 2 else 0 end))::text,
         ',' order by c.ordinal_position)
from information_schema.tables t
join information_schema.columns c
  on c.table_schema = t.table_schema and c.table_name = t.table_name
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
group by t.table_name
order by t.table_name;
\o

\o fks.txt
select con.conrelid::regclass::text || '|' || con.conname || '|'
       || (select string_agg(a.attname, '+' order by k.ord)
           from unnest(con.conkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum)
       || '|'
       -- One-to-one when the referencing columns are themselves unique.
       || case when exists (
            select 1 from pg_index i
            where i.indrelid = con.conrelid and i.indisunique
              and i.indnatts = array_length(con.conkey, 1)
              and i.indkey::int2[] @> con.conkey and con.conkey @> i.indkey::int2[]
          ) then '1' else '0' end
       || '|' || con.confrelid::regclass::text || '|'
       || (select string_agg(a.attname, '+' order by k.ord)
           from unnest(con.confkey) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum)
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where con.contype = 'f' and n.nspname = 'public'
order by 1;
\o

\o enums.txt
select t.typname || '=' || string_agg(e.enumlabel, ',' order by e.enumsortorder)
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;
\o

\o fns.txt
select p.proname || '|' || pg_get_function_arguments(p.oid) || '|'
       || case when p.proretset then 'SETOF ' else '' end
       || format_type(p.prorettype, null)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  -- Trigger functions are not callable from the client.
  and format_type(p.prorettype, null) <> 'trigger'
  -- pgcrypto and pg_trgm install their functions into public too, and
  -- their overloads collide as duplicate identifiers in TypeScript.
  and not exists (
    select 1 from pg_depend d
    where d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
  )
order by p.proname;
\o
