-- Part 1: on auth.users insert, create the profile (role ALWAYS customer) and
-- link or create the customers row (SPEC 2).
--
-- The role is never read from raw_user_meta_data, which the client controls.
-- Staff created by the create-staff Edge Function carry
-- raw_app_meta_data.provisioned_by = 'create-staff' (app metadata can only be set
-- with the service role); they get a profile but no customers row. The function
-- then promotes the profile to 'staff'.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(new.email);
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, v_email, v_name, 'customer');

  if coalesce(new.raw_app_meta_data ->> 'provisioned_by', '') = 'create-staff' then
    return new;
  end if;

  -- Link an existing, not yet linked customer with the same email.
  update public.customers
     set user_id = new.id
   where lower(email) = v_email
     and user_id is null;

  if not found then
    insert into public.customers (user_id, name, email)
    values (new.id, coalesce(v_name, v_email), v_email)
    on conflict (email) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
