-- Demo data (SPEC 9): 10 customers, 20 subscriptions in mixed statuses, billing run, invoices
-- confirmed, about half paid (some partially), some left overdue. Idempotent: skipped when
-- any DEMO- customer exists. Needs supabase/seed/catalog.sql first and one active admin.
-- Run:  npx supabase db query --linked -f supabase/seed/demo.sql
--
-- It runs as the database owner and sets the JWT claims to the first admin, so the real
-- functions (create_subscription_from_template, transition_subscription, run_billing,
-- invoice_confirm, record_payment) are used. Seed-only step: invoice issue/due dates are
-- moved back to each period start so some invoices are genuinely overdue. Clients cannot
-- do that (they have no UPDATE on invoices).

do $$
declare
  v_admin  uuid;
  v_tpl_m  uuid := (select id from public.quotation_templates where name = 'Starter Monthly Bundle');
  v_tpl_y  uuid := (select id from public.quotation_templates where name = 'ERP Yearly Package');
  v_plan_w uuid := (select id from public.plans where name = 'Weekly Trial');
  v_prod   uuid := (select id from public.products where name = 'Training Pack');
  v_term   uuid := (select id from public.payment_terms where name = 'Net 15');
  v_custs  uuid[] := '{}';
  v_cust   uuid;
  v_sub    uuid;
  v_row    public.subscriptions;
  v_start  date;
  v_steps  text[];
  v_step   text;
  v_res    record;
  r        record;
  i        integer;
begin
  if exists (select 1 from public.customers where name like 'DEMO-%') then
    raise notice 'Demo data already present, nothing to do';
    return;
  end if;
  if v_tpl_m is null or v_tpl_y is null or v_plan_w is null or v_prod is null then
    raise exception 'Run supabase/seed/catalog.sql first';
  end if;

  select p.id into v_admin from public.profiles p where p.role = 'admin' and p.is_active order by p.created_at limit 1;
  if v_admin is null then raise exception 'Need one active admin profile'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  for i in 1..10 loop
    insert into public.customers (name, email, company, phone)
    values ('DEMO-Customer ' || lpad(i::text, 2, '0'), 'demo-customer-' || lpad(i::text, 2, '0') || '@example.com',
            'DEMO Company ' || i, '+91 90000 000' || lpad(i::text, 2, '0'))
    returning id into v_cust;
    v_custs := v_custs || v_cust;
  end loop;

  for i in 1..20 loop
    v_cust  := v_custs[1 + (i - 1) % 10];
    v_start := current_date - (20 + (i * 13) % 130);

    if i in (15, 16) then  -- paused: a pausable plan, no template for it
      insert into public.subscriptions (customer_id, plan_id, start_date, expiry_date, payment_term_id, created_by)
      values (v_cust, v_plan_w, v_start, v_start + 365, v_term, v_admin) returning id into v_sub;
      insert into public.subscription_lines (subscription_id, product_id, quantity) values (v_sub, v_prod, 1);
    else
      v_row := public.create_subscription_from_template(case when i in (11, 12) then v_tpl_y else v_tpl_m end, v_cust, v_start);
      v_sub := v_row.id;
    end if;

    v_steps := case
      when i <= 12            then array['quotation', 'confirmed', 'active']             -- active
      when i in (13, 14)      then array['quotation', 'confirmed', 'active', 'closed']   -- closed
      when i in (15, 16)      then array['quotation', 'confirmed', 'active', 'paused']   -- paused
      when i = 17             then array[]::text[]                                       -- draft
      when i = 18             then array['quotation']                                    -- quotation
      else                         array['quotation', 'confirmed']                       -- confirmed
    end;
    foreach v_step in array v_steps loop
      perform public.transition_subscription(v_sub, v_step::public.sub_status);
    end loop;
  end loop;

  select * into v_res from public.run_billing(current_date);
  raise notice 'run_billing: created %, skipped %, errors %', v_res.created, v_res.skipped, v_res.errors;

  -- seed-only: back-date issue and due dates to each period start
  update public.invoices i
     set issue_date = i.period_start, due_date = i.period_start + coalesce(pt.days, 0)
    from public.subscriptions s
    join public.customers c on c.id = s.customer_id
    left join public.payment_terms pt on pt.id = s.payment_term_id
   where s.id = i.subscription_id and c.name like 'DEMO-%';

  for r in
    select i.id, i.total, i.period_start,
           row_number() over (order by i.period_start, i.number) as n
      from public.invoices i
      join public.customers c on c.id = i.customer_id
     where c.name like 'DEMO-%' and i.status = 'draft'
  loop
    if r.n % 7 <> 0 then                       -- most are confirmed, every 7th stays draft
      perform public.invoice_confirm(r.id);
      if r.n % 4 = 0 then                      -- paid in full
        perform public.record_payment(r.id, 'bank_transfer', r.total, least(current_date, r.period_start + 2), 'DEMO full payment');
      elsif r.n % 4 = 2 and r.total > 0 then   -- partial
        perform public.record_payment(r.id, 'upi', round(r.total / 2, 2), least(current_date, r.period_start + 2), 'DEMO partial payment');
      end if;
    end if;
  end loop;
end
$$;

select * from public.v_dashboard_summary;
