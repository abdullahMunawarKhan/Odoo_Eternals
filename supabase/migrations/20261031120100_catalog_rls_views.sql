-- Part 2: RLS for the catalog tables and the customer-facing public views (SPEC 5).
-- Tables: admin full write, staff read only, customers nothing.
-- Customers read the catalog only through the *_public views below.

do $$
declare
  t text;
begin
  foreach t in array array[
    'taxes', 'payment_terms', 'products', 'product_variants', 'plans',
    'discounts', 'quotation_templates', 'quotation_template_lines'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_staff_or_admin())',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (public."current_role"() = ''admin'') with check (public."current_role"() = ''admin'')',
      t || '_admin_write', t);
  end loop;
end
$$;

-- Public views. Owned by the migration role and NOT security_invoker, so they read the
-- tables past RLS; that is the point, and why they list explicit columns and only
-- active rows. Never add cost_price, notes, sales_price or flags here without
-- updating SPEC section 5.
create view public.products_public with (security_invoker = false) as
  select p.id, p.name, p.type
    from public.products p
   where p.is_active;

create view public.variants_public with (security_invoker = false) as
  select v.id, v.product_id, v.attribute_name, v.value
    from public.product_variants v
    join public.products p on p.id = v.product_id
   where p.is_active;

create view public.plans_public with (security_invoker = false) as
  select pl.id, pl.name, pl.billing_period
    from public.plans pl
   where pl.is_active;

revoke all on public.products_public from public, anon;
revoke all on public.variants_public from public, anon;
revoke all on public.plans_public    from public, anon;
grant select on public.products_public to authenticated;
grant select on public.variants_public to authenticated;
grant select on public.plans_public    to authenticated;
