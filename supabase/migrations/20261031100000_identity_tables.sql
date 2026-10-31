-- Part 1: identity tables (SPEC 3.1) and RLS helper functions (SPEC 1).

create type public.user_role as enum ('admin', 'staff', 'customer');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       public.user_role not null default 'customer',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references public.profiles (id) on delete set null,
  name       text not null,
  email      text not null unique,
  phone      text,
  company    text,
  address    text,
  created_at timestamptz not null default now()
);

-- Helper functions used inside RLS policies. security definer so they read profiles
-- without re-entering profiles' own policies (avoids infinite recursion).
-- An inactive profile has no role, so it passes no role check.
create function public."current_role"()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public."current_role"() in ('admin', 'staff'), false)
$$;

revoke all on function public."current_role"() from public, anon;
revoke all on function public.is_staff_or_admin() from public, anon;
grant execute on function public."current_role"() to authenticated, service_role;
grant execute on function public.is_staff_or_admin() to authenticated, service_role;
