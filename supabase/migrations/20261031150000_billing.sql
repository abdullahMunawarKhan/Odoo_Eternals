-- Part 4+5 (smallest version): invoices, lines, payments, billing engine, payment recording,
-- dashboard views (SPEC 3.4, 4.3, 4.5, 4.6, 4.7, 6). All writes go through the functions
-- below; clients only get SELECT. Product-level discounts only (no subscription-level yet).

create type public.inv_status      as enum ('draft', 'confirmed', 'paid', 'cancelled');
create type public.inv_line_kind   as enum ('plan_fee', 'product');
create type public.payment_method  as enum ('cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other');

create sequence public.invoice_number_seq;

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique
                    default ('INV-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0')),
  subscription_id uuid not null references public.subscriptions (id),
  customer_id     uuid not null references public.customers (id),
  period_start    date not null,
  period_end      date not null,
  issue_date      date not null default current_date,
  due_date        date not null,
  status          public.inv_status not null default 'draft',
  subtotal        numeric(12,2) not null default 0,
  discount_total  numeric(12,2) not null default 0,
  tax_total       numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  amount_paid     numeric(12,2) not null default 0,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  -- never billed twice
  constraint invoices_period_unique unique (subscription_id, period_start),
  constraint invoices_amounts_nonneg check (subtotal >= 0 and discount_total >= 0 and tax_total >= 0 and total >= 0),
  constraint invoices_paid_range check (amount_paid >= 0 and amount_paid <= total)
);
create index invoices_status_idx on public.invoices (status);
create index invoices_customer_id_idx on public.invoices (customer_id);
create index invoices_subscription_id_idx on public.invoices (subscription_id);
create index invoices_due_date_idx on public.invoices (due_date) where status = 'confirmed';

create table public.invoice_lines (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices (id) on delete cascade,
  kind            public.inv_line_kind not null,
  product_id      uuid references public.products (id) on delete set null,
  description     text not null,
  quantity        integer not null,
  unit_price      numeric(12,2) not null,
  base_amount     numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  tax_id          uuid references public.taxes (id) on delete set null,
  tax_amount      numeric(12,2) not null default 0,
  line_total      numeric(12,2) not null
);
create index invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id),
  method       public.payment_method not null,
  amount       numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  note         text,
  recorded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_payment_date_idx on public.payments (payment_date);

-- RLS: staff/admin read all, customers read their own; no client writes at all.
alter table public.invoices      enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments      enable row level security;
revoke all on public.invoices, public.invoice_lines, public.payments from anon, authenticated;
grant select on public.invoices, public.invoice_lines, public.payments to authenticated;

create policy invoices_select on public.invoices
  for select to authenticated
  using (public.is_staff_or_admin() or customer_id = public.my_customer_id());

create policy invoice_lines_select on public.invoice_lines
  for select to authenticated
  using (public.is_staff_or_admin()
         or exists (select 1 from public.invoices i
                     where i.id = invoice_id and i.customer_id = public.my_customer_id()));

create policy payments_select on public.payments
  for select to authenticated
  using (public.is_staff_or_admin()
         or exists (select 1 from public.invoices i
                     where i.id = invoice_id and i.customer_id = public.my_customer_id()));

-- generate_invoice: builds one invoice (SPEC 4.3) in one transaction. Idempotent: an
-- existing (subscription, period_start) invoice is returned untouched.
create function public.generate_invoice(sub_id uuid, period_start date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub     public.subscriptions;
  v_plan    public.plans;
  v_days    integer;
  v_end     date;
  v_id      uuid;
  v_src     record;
  v_disc    record;
  v_tax     record;
  v_base    numeric(12,2);
  v_dsc     numeric(12,2);
  v_net     numeric(12,2);
  v_tax_amt numeric(12,2);
  v_used    uuid[] := '{}';
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can generate invoices' using errcode = '42501';
  end if;

  select * into v_sub from public.subscriptions s where s.id = generate_invoice.sub_id;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  -- already billed: return it, change nothing (no lines, no discount usage)
  select i.id into v_id from public.invoices i
   where i.subscription_id = v_sub.id and i.period_start = generate_invoice.period_start;
  if found then
    return v_id;
  end if;

  select * into v_plan from public.plans p where p.id = v_sub.plan_id;
  select coalesce(t.days, 0) into v_days from (select 1) x
    left join public.payment_terms t on t.id = v_sub.payment_term_id;

  v_end := (generate_invoice.period_start + case v_plan.billing_period
              when 'daily'   then interval '1 day'
              when 'weekly'  then interval '7 days'
              when 'monthly' then interval '1 month'
              else interval '1 year' end)::date - 1;

  insert into public.invoices (subscription_id, customer_id, period_start, period_end, issue_date, due_date)
  values (v_sub.id, v_sub.customer_id, generate_invoice.period_start, v_end,
          current_date, current_date + v_days)
  on conflict on constraint invoices_period_unique do nothing
  returning id into v_id;

  if v_id is null then  -- lost a race with a concurrent call
    select i.id into v_id from public.invoices i
     where i.subscription_id = v_sub.id and i.period_start = generate_invoice.period_start;
    return v_id;
  end if;

  for v_src in
    select 0 as ord, 'plan_fee'::public.inv_line_kind as kind, null::uuid as product_id,
           v_plan.name || ' (' || v_plan.billing_period || ')' as description,
           1 as quantity, v_plan.price as unit_price, v_plan.price as base_amount, v_plan.tax_id as tax_id
     where v_plan.price > 0
    union all
    select 1, 'product'::public.inv_line_kind, l.product_id,
           pr.name || coalesce(' (' || pv.value || ')', ''),
           l.quantity, l.unit_price, l.amount, l.tax_id
      from public.subscription_lines l
      join public.products pr on pr.id = l.product_id
      left join public.product_variants pv on pv.id = l.variant_id
     where l.subscription_id = v_sub.id
     order by 1
  loop
    v_base := v_src.base_amount;
    v_dsc  := 0;

    -- best eligible product-level discount for product lines (one per line)
    if v_src.kind = 'product' then
      select d.id,
             least(v_base, round(case d.type when 'percent' then v_base * d.value / 100 else d.value end, 2)) as amt
        into v_disc
        from public.discounts d
       where d.applies_to = 'product' and d.product_id = v_src.product_id
         and d.is_active
         and (d.start_date is null or d.start_date <= current_date)
         and (d.end_date   is null or d.end_date   >= current_date)
         and (d.usage_limit is null or d.times_used < d.usage_limit)
         and v_src.quantity >= d.min_quantity
         and v_base >= d.min_purchase
       order by 2 desc
       limit 1;
      if found then
        v_dsc := v_disc.amt;
        if not (v_disc.id = any (v_used)) then v_used := v_used || v_disc.id; end if;
      end if;
    end if;

    v_net := v_base - v_dsc;
    v_tax_amt := 0;
    if v_src.tax_id is not null then
      select tx.rate_type, tx.rate into v_tax from public.taxes tx where tx.id = v_src.tax_id;
      if found then
        v_tax_amt := round(case v_tax.rate_type when 'percent' then v_net * v_tax.rate / 100 else v_tax.rate end, 2);
      end if;
    end if;

    insert into public.invoice_lines
      (invoice_id, kind, product_id, description, quantity, unit_price, base_amount,
       discount_amount, tax_id, tax_amount, line_total)
    values
      (v_id, v_src.kind, v_src.product_id, v_src.description, v_src.quantity, v_src.unit_price, v_base,
       v_dsc, v_src.tax_id, v_tax_amt, v_net + v_tax_amt);
  end loop;

  -- totals are exactly the sums of the lines
  update public.invoices i
     set subtotal       = coalesce(x.base, 0),
         discount_total = coalesce(x.dsc, 0),
         tax_total      = coalesce(x.tax, 0),
         total          = coalesce(x.tot, 0)
    from (select sum(base_amount) base, sum(discount_amount) dsc, sum(tax_amount) tax, sum(line_total) tot
            from public.invoice_lines where invoice_id = v_id) x
   where i.id = v_id;

  -- each discount used counts once per invoice
  if cardinality(v_used) > 0 then
    update public.discounts d set times_used = d.times_used + 1 where d.id = any (v_used);
  end if;

  return v_id;
end;
$$;

-- run_billing: invoices every due active subscription, catching up missed periods. A failure
-- on one subscription rolls back only that subscription and is counted.
create function public.run_billing(as_of date default current_date)
returns table (created integer, skipped integer, errors integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r      record;
  v_next date;
  lc     integer;
  ls     integer;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can run billing' using errcode = '42501';
  end if;

  created := 0; skipped := 0; errors := 0;

  for r in
    select s.id, s.next_billing_date, s.expiry_date, p.billing_period
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
     where s.status = 'active'
       and s.next_billing_date is not null
       and s.next_billing_date <= run_billing.as_of
       and s.next_billing_date <= s.expiry_date
  loop
    begin
      v_next := r.next_billing_date; lc := 0; ls := 0;
      while v_next <= run_billing.as_of and v_next <= r.expiry_date loop
        if exists (select 1 from public.invoices i where i.subscription_id = r.id and i.period_start = v_next) then
          ls := ls + 1;
        else
          perform public.generate_invoice(r.id, v_next);
          lc := lc + 1;
        end if;
        v_next := (v_next + case r.billing_period
                     when 'daily'   then interval '1 day'
                     when 'weekly'  then interval '7 days'
                     when 'monthly' then interval '1 month'
                     else interval '1 year' end)::date;
      end loop;
      update public.subscriptions s set next_billing_date = v_next where s.id = r.id;
      created := created + lc; skipped := skipped + ls;
    exception when others then
      errors := errors + 1;
    end;
  end loop;

  return next;
end;
$$;

-- Invoice lifecycle (SPEC 4.5)
create function public.invoice_confirm(invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare v_inv public.invoices;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can confirm invoices' using errcode = '42501';
  end if;
  select * into v_inv from public.invoices i where i.id = invoice_confirm.invoice_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if v_inv.status <> 'draft' then
    raise exception 'Only a draft invoice can be confirmed (this one is %)', v_inv.status using errcode = '22023';
  end if;
  update public.invoices i set status = 'confirmed' where i.id = v_inv.id returning i.* into v_inv;
  return v_inv;
end;
$$;

create function public.invoice_cancel(invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare v_inv public.invoices;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can cancel invoices' using errcode = '42501';
  end if;
  select * into v_inv from public.invoices i where i.id = invoice_cancel.invoice_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if v_inv.status = 'paid' then
    raise exception 'A paid invoice cannot be cancelled' using errcode = '22023';
  end if;
  if v_inv.status = 'cancelled' then
    raise exception 'Invoice is already cancelled' using errcode = '22023';
  end if;
  if v_inv.amount_paid > 0 then
    raise exception 'An invoice with payments cannot be cancelled' using errcode = '22023';
  end if;
  update public.invoices i set status = 'cancelled' where i.id = v_inv.id returning i.* into v_inv;
  return v_inv;
end;
$$;

create function public.invoice_send(invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare v_inv public.invoices;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can send invoices' using errcode = '42501';
  end if;
  select * into v_inv from public.invoices i where i.id = invoice_send.invoice_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if v_inv.status = 'cancelled' then
    raise exception 'A cancelled invoice cannot be sent' using errcode = '22023';
  end if;
  update public.invoices i set sent_at = now() where i.id = v_inv.id returning i.* into v_inv;
  return v_inv;
end;
$$;

-- record_payment (SPEC 4.7): partial payments allowed, never more than outstanding.
create function public.record_payment(
  invoice_id   uuid,
  method       public.payment_method,
  amount       numeric,
  payment_date date default current_date,
  note         text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invoices;
  v_pay public.payments;
  v_out numeric(12,2);
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can record payments' using errcode = '42501';
  end if;

  select * into v_inv from public.invoices i where i.id = record_payment.invoice_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if v_inv.status <> 'confirmed' then
    raise exception 'Payments can only be recorded on a confirmed invoice (this one is %)', v_inv.status
      using errcode = '22023';
  end if;
  if record_payment.amount is null or record_payment.amount <= 0 then
    raise exception 'Payment amount must be greater than 0' using errcode = '22023';
  end if;
  if record_payment.amount <> round(record_payment.amount, 2) then
    raise exception 'Payment amount can have at most 2 decimals' using errcode = '22023';
  end if;
  v_out := v_inv.total - v_inv.amount_paid;
  if record_payment.amount > v_out then
    raise exception 'Payment of % is more than the outstanding amount of %', record_payment.amount, v_out
      using errcode = '22023';
  end if;

  insert into public.payments (invoice_id, method, amount, payment_date, note, recorded_by)
  values (v_inv.id, record_payment.method, record_payment.amount,
          coalesce(record_payment.payment_date, current_date), record_payment.note, auth.uid())
  returning * into v_pay;

  update public.invoices i
     set amount_paid = i.amount_paid + record_payment.amount,
         status = case when i.amount_paid + record_payment.amount >= i.total
                       then 'paid'::public.inv_status else i.status end
   where i.id = v_inv.id;

  return v_pay;
end;
$$;

revoke all on function public.generate_invoice(uuid, date) from public, anon;
revoke all on function public.run_billing(date) from public, anon;
revoke all on function public.invoice_confirm(uuid) from public, anon;
revoke all on function public.invoice_cancel(uuid) from public, anon;
revoke all on function public.invoice_send(uuid) from public, anon;
revoke all on function public.record_payment(uuid, public.payment_method, numeric, date, text) from public, anon;
grant execute on function public.generate_invoice(uuid, date) to authenticated, service_role;
grant execute on function public.run_billing(date) to authenticated, service_role;
grant execute on function public.invoice_confirm(uuid) to authenticated, service_role;
grant execute on function public.invoice_cancel(uuid) to authenticated, service_role;
grant execute on function public.invoice_send(uuid) to authenticated, service_role;
grant execute on function public.record_payment(uuid, public.payment_method, numeric, date, text) to authenticated, service_role;

-- Views run with the caller's RLS (security_invoker): staff see everything, a customer
-- only their own invoices.
create view public.v_invoice_summary with (security_invoker = true) as
  select i.id, i.number, i.status, i.subscription_id, s.number as subscription_number,
         i.customer_id, c.name as customer_name, c.email as customer_email,
         i.period_start, i.period_end, i.issue_date, i.due_date,
         i.subtotal, i.discount_total, i.tax_total, i.total, i.amount_paid,
         (i.total - i.amount_paid) as outstanding,
         (i.status = 'confirmed' and i.due_date < current_date and i.amount_paid < i.total) as is_overdue,
         i.sent_at, i.created_at
    from public.invoices i
    join public.customers c on c.id = i.customer_id
    left join public.subscriptions s on s.id = i.subscription_id;

create view public.v_overdue_invoices with (security_invoker = true) as
  select v.id, v.number, v.customer_id, v.customer_name, v.subscription_number, v.due_date,
         (current_date - v.due_date) as days_overdue, v.outstanding
    from public.v_invoice_summary v
   where v.is_overdue;

create view public.v_dashboard_summary with (security_invoker = true) as
  select (select count(*) from public.subscriptions s where s.status = 'active')::integer as active_subscriptions,
         (select coalesce(sum(p.amount), 0) from public.payments p)::numeric(12,2) as total_revenue,
         (select coalesce(sum(i.total - i.amount_paid), 0) from public.invoices i where i.status = 'confirmed')::numeric(12,2) as outstanding_amount,
         (select count(*) from public.v_overdue_invoices)::integer as overdue_count,
         (select coalesce(sum(o.outstanding), 0) from public.v_overdue_invoices o)::numeric(12,2) as overdue_amount;

revoke all on public.v_invoice_summary, public.v_overdue_invoices, public.v_dashboard_summary from public, anon;
grant select on public.v_invoice_summary, public.v_overdue_invoices, public.v_dashboard_summary to authenticated;
