-- Part 2: effective_price (SPEC 3.2) and plan_is_available (SPEC 4.1).

-- security invoker on purpose: it reads products/variants under the caller's RLS, so a
-- customer cannot use it to read prices. Later security definer functions (billing,
-- subscriptions) call it as the function owner and see the rows.
create function public.effective_price(p_product_id uuid, p_variant_id uuid default null)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  v_sales numeric(12,2);
  v_extra numeric(12,2) := 0;
begin
  select sales_price into v_sales from public.products where id = p_product_id;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  if p_variant_id is not null then
    select extra_price into v_extra
      from public.product_variants
     where id = p_variant_id and product_id = p_product_id;
    if not found then
      raise exception 'Variant does not belong to this product' using errcode = '22023';
    end if;
  end if;

  return v_sales + v_extra;
end;
$$;

-- A plan is available when it is active and available_from <= on_date <= available_to
-- (a null bound is open-ended). Unknown plan returns false. security definer so the
-- subscription functions and the portal can ask without table access; it returns only
-- a boolean.
create function public.plan_is_available(p_plan_id uuid, p_on_date date default current_date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select pl.is_active
        and (pl.available_from is null or pl.available_from <= p_on_date)
        and (pl.available_to   is null or p_on_date <= pl.available_to)
       from public.plans pl
      where pl.id = p_plan_id),
    false)
$$;

revoke all on function public.effective_price(uuid, uuid) from public, anon;
revoke all on function public.plan_is_available(uuid, date) from public, anon;
grant execute on function public.effective_price(uuid, uuid) to authenticated, service_role;
grant execute on function public.plan_is_available(uuid, date) to authenticated, service_role;
