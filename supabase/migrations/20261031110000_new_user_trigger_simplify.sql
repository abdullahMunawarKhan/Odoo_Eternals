-- Part 1 fix: the app_metadata "provisioned_by" flag is not reliably present when the
-- auth.users row is inserted (GoTrue sets app metadata after the insert), so it cannot
-- skip the customers row. The trigger now always runs the same path; the create-staff
-- Edge Function removes the customers row it does not want.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(new.email);
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  -- Role is ALWAYS customer; nothing from client metadata is used for it.
  insert into public.profiles (id, email, full_name, role)
  values (new.id, v_email, v_name, 'customer');

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
