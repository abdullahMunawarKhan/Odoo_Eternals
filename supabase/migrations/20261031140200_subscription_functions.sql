-- Part 3: subscription functions (SPEC 4.2, 4.4). All business writes go through these.

-- Creates a Draft subscription from a template (admin/staff).
create function public.create_subscription_from_template(
  p_template_id uuid,
  p_customer_id uuid,
  p_start_date  date default current_date
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tpl public.quotation_templates;
  v_sub public.subscriptions;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can create subscriptions' using errcode = '42501';
  end if;

  select * into v_tpl from public.quotation_templates where id = p_template_id;
  if not found then
    raise exception 'Template not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.customers c where c.id = p_customer_id) then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;

  -- plan availability and created_by are enforced by the subscriptions trigger
  insert into public.subscriptions
    (customer_id, plan_id, template_id, start_date, expiry_date, payment_term_id, created_by)
  values
    (p_customer_id, v_tpl.plan_id, v_tpl.id, p_start_date,
     (p_start_date + interval '1 year')::date, v_tpl.payment_term_id, auth.uid())
  returning * into v_sub;

  -- unit_price, tax_id and amount are filled by the lines trigger; quantity below the
  -- plan minimum is rejected there
  insert into public.subscription_lines (subscription_id, product_id, variant_id, quantity)
  select v_sub.id, l.product_id, l.variant_id, l.quantity
    from public.quotation_template_lines l
   where l.template_id = v_tpl.id;

  return v_sub;
end;
$$;

-- The only way to change subscriptions.status (SPEC 4.2).
create function public.transition_subscription(sub_id uuid, new_status public.sub_status)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role  public.user_role := public."current_role"();
  v_staff boolean := coalesce(v_role in ('admin', 'staff'), false);
  v_sub   public.subscriptions;
  v_plan  public.plans;
  v_from  public.sub_status;
  v_days  integer;
  v_qvu   date;
  v_nbd   date;
  v_exp   date;
begin
  if v_role is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_sub from public.subscriptions where id = sub_id for update;
  -- customers get "not found" for subscriptions that are not theirs
  if not found or (not v_staff and v_sub.customer_id is distinct from public.my_customer_id()) then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;

  select * into v_plan from public.plans where id = v_sub.plan_id;
  v_from := v_sub.status;
  v_qvu  := v_sub.quotation_valid_until;
  v_nbd  := v_sub.next_billing_date;
  v_exp  := v_sub.expiry_date;

  if v_from = 'draft' and new_status = 'quotation' then
    if not v_staff then
      raise exception 'Only staff or admin can send a quotation' using errcode = '42501';
    end if;
    if not exists (select 1 from public.subscription_lines l where l.subscription_id = sub_id) then
      raise exception 'Add at least one line before sending a quotation' using errcode = '22023';
    end if;
    select coalesce(t.validity_days, 30) into v_days
      from (select 1) x
      left join public.quotation_templates t on t.id = v_sub.template_id;
    v_qvu := current_date + v_days;

  elsif v_from = 'quotation' and new_status = 'confirmed' then
    if not v_staff then
      raise exception 'Only staff or admin can confirm a quotation' using errcode = '42501';
    end if;
    if v_qvu is not null and v_qvu < current_date then
      raise exception 'Quotation has expired' using errcode = '22023';
    end if;

  elsif v_from = 'confirmed' and new_status = 'active' then
    if not v_staff then
      raise exception 'Only staff or admin can activate a subscription' using errcode = '42501';
    end if;
    v_nbd := v_sub.start_date;

  elsif (v_from = 'active' and new_status = 'paused') or (v_from = 'paused' and new_status = 'active') then
    if not v_plan.pausable then
      raise exception 'This plan does not allow pausing' using errcode = '42501';
    end if;

  elsif v_from in ('active', 'paused') and new_status = 'closed' then
    if not v_staff and not v_plan.closable then
      raise exception 'This plan does not allow early closing' using errcode = '42501';
    end if;

  elsif v_from = 'active' and new_status = 'active' then  -- renew
    if not v_plan.renewable then
      raise exception 'This plan does not allow renewal' using errcode = '42501';
    end if;
    v_exp := v_sub.expiry_date + (v_sub.expiry_date - v_sub.start_date);

  else
    raise exception 'Invalid transition from % to %', v_from, new_status using errcode = '22023';
  end if;

  update public.subscriptions s
     set status = new_status, quotation_valid_until = v_qvu, next_billing_date = v_nbd, expiry_date = v_exp
   where s.id = sub_id
  returning s.* into v_sub;

  insert into public.subscription_status_log (subscription_id, from_status, to_status, changed_by)
  values (sub_id, v_from, new_status, auth.uid());

  return v_sub;
end;
$$;

-- Attach a subscription-level discount (admin/staff). Eligibility is checked at invoice time.
create function public.attach_discount(p_subscription_id uuid, p_discount_id uuid)
returns public.subscription_discounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.sub_status;
  v_disc   public.discounts;
  v_row    public.subscription_discounts;
begin
  if not public.is_staff_or_admin() then
    raise exception 'Only staff or admin can attach discounts' using errcode = '42501';
  end if;

  select s.status into v_status from public.subscriptions s where s.id = p_subscription_id;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;
  if v_status = 'closed' then
    raise exception 'Cannot attach discounts to a closed subscription' using errcode = '22023';
  end if;

  select * into v_disc from public.discounts d where d.id = p_discount_id;
  if not found then
    raise exception 'Discount not found' using errcode = 'P0002';
  end if;
  if v_disc.applies_to <> 'subscription' then
    raise exception 'Only subscription-level discounts can be attached' using errcode = '22023';
  end if;
  if not v_disc.is_active then
    raise exception 'Discount is not active' using errcode = '22023';
  end if;

  begin
    insert into public.subscription_discounts (subscription_id, discount_id)
    values (p_subscription_id, p_discount_id)
    returning * into v_row;
  exception when unique_violation then
    raise exception 'Discount is already attached to this subscription' using errcode = '23505';
  end;

  return v_row;
end;
$$;

revoke all on function public.create_subscription_from_template(uuid, uuid, date) from public, anon;
revoke all on function public.transition_subscription(uuid, public.sub_status) from public, anon;
revoke all on function public.attach_discount(uuid, uuid) from public, anon;
grant execute on function public.create_subscription_from_template(uuid, uuid, date) to authenticated, service_role;
grant execute on function public.transition_subscription(uuid, public.sub_status) to authenticated, service_role;
grant execute on function public.attach_discount(uuid, uuid) to authenticated, service_role;
