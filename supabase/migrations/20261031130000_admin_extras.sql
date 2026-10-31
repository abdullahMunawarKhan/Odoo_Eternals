-- Admin extras: deactivation (SPEC 1, role rules).
--   1. A deactivated user has no access anywhere, including "own row" access.
--   2. profiles.is_active can only be changed by public.set_user_active (admin only).
--
-- current_role() and is_staff_or_admin() already treat is_active = false as no access
-- (current_role() filters on p.is_active, is_staff_or_admin() builds on it), so every
-- policy that uses them already denies inactive staff/admins. What was missing: policies
-- that grant "own row" access by auth.uid() alone, which let an inactive customer keep
-- reading their own rows. Those now also require is_active_user().

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
$$;

revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated, service_role;

-- Own-row policies now also need an active profile.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.is_staff_or_admin() or (id = auth.uid() and public.is_active_user()));

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid() and public.is_active_user());

drop policy customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using (public.is_staff_or_admin() or (user_id = auth.uid() and public.is_active_user()));

-- Guard: replace the Part 1 trigger function. Now security INVOKER, so current_user is
-- the role running the UPDATE: 'authenticated'/'anon' for a direct client statement,
-- the function owner inside set_user_active (security definer), service_role for the
-- Edge Function, and postgres for the SQL editor / migrations. Only direct client
-- statements are restricted:
--   id, role, is_active: never changeable by a client
--   email: admins only
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id then
      raise exception 'profiles.id cannot be changed' using errcode = '42501';
    end if;
    if new.role is distinct from old.role then
      raise exception 'profiles.role cannot be changed from the client' using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'profiles.is_active can only be changed with set_user_active()' using errcode = '42501';
    end if;
    if new.email is distinct from old.email and public."current_role"() is distinct from 'admin' then
      raise exception 'only an admin can change email' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Admin only. Changes is_active and nothing else; returns the updated profile.
create function public.set_user_active(user_id uuid, active boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
begin
  if public."current_role"() is distinct from 'admin' then
    raise exception 'Only an admin can activate or deactivate accounts' using errcode = '42501';
  end if;

  if user_id = auth.uid() and not active then
    raise exception 'You cannot deactivate your own account' using errcode = '22023';
  end if;

  update public.profiles p
     set is_active = active
   where p.id = user_id
  returning p.* into v_row;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.set_user_active(uuid, boolean) from public, anon;
grant execute on function public.set_user_active(uuid, boolean) to authenticated, service_role;
