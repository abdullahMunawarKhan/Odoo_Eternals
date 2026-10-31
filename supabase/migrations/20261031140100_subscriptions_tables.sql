-- Part 3: subscriptions (SPEC 3.3, 4.1, 4.2, 5): tables, indexes, guard triggers, RLS.
-- Customer "own" access goes through my_customer_id(), which already requires an
-- active profile (is_active_user), so a deactivated customer sees nothing.

create type public.sub_status as enum ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed');

create sequence public.subscription_number_seq;

create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  number                text not null unique
                          default ('SUB-' || lpad(nextval('public.subscription_number_seq')::text, 5, '0')),
  customer_id           uuid not null references public.customers (id),
  plan_id               uuid not null references public.plans (id),
  template_id           uuid references public.quotation_templates (id) on delete set null,
  status                public.sub_status not null default 'draft',
  start_date            date not null default current_date,
  expiry_date           date not null,  -- filled by trigger (start_date + 1 year) when omitted
  next_billing_date     date,
  payment_term_id       uuid references public.payment_terms (id),
  quotation_valid_until date,
  created_by            uuid references public.profiles (id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now(),
  constraint subscriptions_dates_order check (expiry_date >= start_date)
);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_customer_id_idx on public.subscriptions (customer_id);
create index subscriptions_next_billing_idx on public.subscriptions (next_billing_date) where status = 'active';

create table public.subscription_lines (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  product_id      uuid not null references public.products (id),
  variant_id      uuid,
  quantity        integer not null,
  unit_price      numeric(12,2) not null,  -- set by trigger, never from the client
  tax_id          uuid references public.taxes (id),
  amount          numeric(12,2) not null,  -- set by trigger: quantity x unit_price
  created_at      timestamptz not null default now(),
  constraint subscription_lines_quantity_positive check (quantity > 0),
  constraint subscription_lines_variant_fk
    foreign key (variant_id, product_id) references public.product_variants (id, product_id)
);
create index subscription_lines_subscription_id_idx on public.subscription_lines (subscription_id);

create table public.subscription_discounts (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  discount_id     uuid not null references public.discounts (id),
  created_at      timestamptz not null default now(),
  primary key (subscription_id, discount_id)
);

create table public.subscription_status_log (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  from_status     public.sub_status not null,
  to_status       public.sub_status not null,
  changed_by      uuid references public.profiles (id) on delete set null,
  changed_at      timestamptz not null default now()
);
create index subscription_status_log_subscription_id_idx on public.subscription_status_log (subscription_id);

-- The caller's customers.id, or null (not a customer, no customer row, or deactivated).
create function public.my_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from public.customers c
   where c.user_id = auth.uid() and public.is_active_user()
   limit 1
$$;
revoke all on function public.my_customer_id() from public, anon;
grant execute on function public.my_customer_id() to authenticated, service_role;

-- subscriptions guard. Security invoker: current_user is 'authenticated' for a direct
-- client statement and the function owner inside transition_subscription etc.
create function public.subscriptions_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.expiry_date is null then
    new.expiry_date := (new.start_date + interval '1 year')::date;
  end if;

  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.status is distinct from 'draft' then
        raise exception 'A new subscription must start as draft' using errcode = '42501';
      end if;
      new.created_by := auth.uid();
      new.next_billing_date := null;
      new.quotation_valid_until := null;
    else
      if new.status is distinct from old.status then
        raise exception 'Status can only be changed with transition_subscription()' using errcode = '42501';
      end if;
      if new.number is distinct from old.number
         or new.created_by is distinct from old.created_by
         or new.next_billing_date is distinct from old.next_billing_date then
        raise exception 'number, created_by and next_billing_date cannot be changed directly' using errcode = '42501';
      end if;
    end if;
  end if;

  if (tg_op = 'INSERT' or new.plan_id is distinct from old.plan_id)
     and not public.plan_is_available(new.plan_id) then
    raise exception 'Plan "%" is not available today',
      coalesce((select p.name from public.plans p where p.id = new.plan_id), new.plan_id::text)
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger subscriptions_guard
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_before_write();

-- subscription_lines: prices come from the database, quantity must meet the plan minimum,
-- and lines only change while the subscription is draft or quotation.
create function public.subscription_lines_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.sub_status;
  v_min    integer;
  v_plan   text;
begin
  select s.status, p.min_quantity, p.name into v_status, v_min, v_plan
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
   where s.id = new.subscription_id;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  if v_status not in ('draft', 'quotation') then
    raise exception 'Lines can only be changed while the subscription is a draft or quotation'
      using errcode = '22023';
  end if;

  if new.quantity < v_min then
    raise exception 'Quantity % is below the minimum of % for plan "%"', new.quantity, v_min, v_plan
      using errcode = '22023';
  end if;

  new.unit_price := public.effective_price(new.product_id, new.variant_id);
  new.tax_id     := (select pr.tax_id from public.products pr where pr.id = new.product_id);
  new.amount     := new.quantity * new.unit_price;
  return new;
end;
$$;

create trigger subscription_lines_guard
  before insert or update on public.subscription_lines
  for each row execute function public.subscription_lines_before_write();

-- RLS
alter table public.subscriptions          enable row level security;
alter table public.subscription_lines     enable row level security;
alter table public.subscription_discounts enable row level security;
alter table public.subscription_status_log enable row level security;

revoke all on public.subscriptions, public.subscription_lines,
              public.subscription_discounts, public.subscription_status_log from anon;
grant select, insert, update, delete on public.subscriptions, public.subscription_lines to authenticated;
grant select, delete on public.subscription_discounts to authenticated;  -- attach goes through attach_discount()
grant select on public.subscription_status_log to authenticated;         -- written by transition_subscription()
grant usage on sequence public.subscription_number_seq to authenticated;

create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.is_staff_or_admin() or customer_id = public.my_customer_id());

create policy subscriptions_staff_write on public.subscriptions
  for all to authenticated
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create policy subscription_lines_select on public.subscription_lines
  for select to authenticated
  using (
    public.is_staff_or_admin()
    or exists (select 1 from public.subscriptions s
                where s.id = subscription_id and s.customer_id = public.my_customer_id())
  );

create policy subscription_lines_staff_write on public.subscription_lines
  for all to authenticated
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create policy subscription_status_log_select on public.subscription_status_log
  for select to authenticated
  using (
    public.is_staff_or_admin()
    or exists (select 1 from public.subscriptions s
                where s.id = subscription_id and s.customer_id = public.my_customer_id())
  );

create policy subscription_discounts_select on public.subscription_discounts
  for select to authenticated using (public.is_staff_or_admin());

create policy subscription_discounts_delete on public.subscription_discounts
  for delete to authenticated using (public.is_staff_or_admin());
