-- Part 1: the hosted project had hand-made identity objects created in the dashboard
-- (text role, customers.profile_id, no is_active, ...) that do not match SPEC 3.1 and
-- were never in a migration. Remove them so the migrations that follow define the schema.
-- Safe on a fresh database (everything is guarded) and refuses to run if the old tables hold rows.

do $$
declare
  n bigint;
  f record;
begin
  if to_regclass('public.profiles') is not null then
    execute 'select count(*) from public.profiles' into n;
    if n > 0 then
      raise exception 'public.profiles has % rows; refusing to drop it', n;
    end if;
  end if;
  if to_regclass('public.customers') is not null then
    execute 'select count(*) from public.customers' into n;
    if n > 0 then
      raise exception 'public.customers has % rows; refusing to drop it', n;
    end if;
  end if;

  drop trigger if exists on_auth_user_created on auth.users;

  drop table if exists public.customers cascade;
  drop table if exists public.profiles cascade;

  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.proname in (
         'get_user_role', 'is_admin', 'is_admin_or_staff', 'is_staff',
         'protect_role_and_timestamp', 'handle_new_user'
       )
  loop
    execute 'drop function ' || f.sig || ' cascade';
  end loop;
end
$$;
