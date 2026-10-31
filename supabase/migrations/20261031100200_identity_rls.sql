-- Part 1: RLS for profiles and customers (SPEC 5).

alter table public.profiles  enable row level security;
alter table public.customers enable row level security;

-- No access for anon; signed-in clients only get what the policies allow.
revoke all on public.profiles  from anon;
revoke all on public.customers from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.customers to authenticated;

-- profiles: admin all, staff read all, customer own row.
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.is_staff_or_admin() or id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public."current_role"() = 'admin')
  with check (public."current_role"() = 'admin');

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Guard: a client JWT can never change profiles.role, nor id. Only admins may change
-- is_active or email through the API. SQL editor / migrations (no JWT role) and the
-- service role (Edge Function) are not affected, which is how the first admin is
-- promoted (see supabase/seed-admin.sql.example).
create function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() in ('anon', 'authenticated') then
    if new.id is distinct from old.id then
      raise exception 'profiles.id cannot be changed' using errcode = '42501';
    end if;
    if new.role is distinct from old.role then
      raise exception 'profiles.role cannot be changed from the client' using errcode = '42501';
    end if;
    if (new.is_active is distinct from old.is_active or new.email is distinct from old.email)
       and public."current_role"() is distinct from 'admin' then
      raise exception 'only an admin can change is_active or email' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_update() from public, anon, authenticated;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- customers: admin and staff all, customer reads own row only.
create policy customers_select on public.customers
  for select to authenticated
  using (public.is_staff_or_admin() or user_id = auth.uid());

create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.is_staff_or_admin());

create policy customers_update on public.customers
  for update to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

create policy customers_delete on public.customers
  for delete to authenticated
  using (public.is_staff_or_admin());
