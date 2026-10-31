-- Catalog seed (SPEC 3.2 / 9). Idempotent: every row is inserted only if no row with
-- that name exists, so it is safe to run twice. Run with:
--   npx supabase db query --linked -f supabase/seed/catalog.sql
-- Dates are relative to today so the "active" and "expired" discounts stay that way.

-- Taxes
insert into public.taxes (name, rate_type, rate)
select v.name, v.rate_type::public.tax_rate_type, v.rate
  from (values
    ('GST 18%', 'percent', 18.00),
    ('GST 5%',  'percent', 5.00),
    ('No tax',  'percent', 0.00)
  ) as v(name, rate_type, rate)
 where not exists (select 1 from public.taxes t where t.name = v.name);

-- Payment terms
insert into public.payment_terms (name, days)
select v.name, v.days
  from (values ('Immediate', 0), ('Net 15', 15), ('Net 30', 30)) as v(name, days)
 where not exists (select 1 from public.payment_terms p where p.name = v.name);

-- Products
insert into public.products (name, type, sales_price, cost_price, notes, tax_id)
select v.name, v.type::public.product_type, v.sales_price, v.cost_price, v.notes,
       (select t.id from public.taxes t where t.name = v.tax)
  from (values
    ('ERP Suite',        'software', 4999.00, 3200.00, 'Business ERP, choose a brand variant', 'GST 18%'),
    ('CRM Cloud',        'software', 1999.00, 1100.00, 'Hosted CRM, choose a brand variant',   'GST 18%'),
    ('Consulting Hours', 'service',  1500.00,  900.00, 'Per hour',                             'GST 18%'),
    ('Office Router',    'goods',    3500.00, 2600.00, 'Hardware, shipped separately',         'GST 18%'),
    ('Training Pack',    'service',   800.00,  300.00, 'Onboarding training session',          'GST 5%')
  ) as v(name, type, sales_price, cost_price, notes, tax)
 where not exists (select 1 from public.products p where p.name = v.name);

-- Brand variants: ERP Suite has Odoo (+560) and Zoho (+300); CRM Cloud has two brands.
insert into public.product_variants (product_id, attribute_name, value, extra_price)
select p.id, 'Brand', v.value, v.extra_price
  from (values
    ('ERP Suite', 'Odoo',       560.00),
    ('ERP Suite', 'Zoho',       300.00),
    ('CRM Cloud', 'HubSpot',    400.00),
    ('CRM Cloud', 'Salesforce', 900.00)
  ) as v(product, value, extra_price)
  join public.products p on p.name = v.product
 where not exists (
   select 1 from public.product_variants pv
    where pv.product_id = p.id and pv.attribute_name = 'Brand' and pv.value = v.value
 );

-- Plans: a mix of the four flags.
insert into public.plans
  (name, price, billing_period, min_quantity, available_from, available_to, tax_id,
   auto_close, closable, pausable, renewable)
select v.name, v.price, v.period::public.billing_period, v.min_quantity,
       case when v.from_off is null then null else current_date + v.from_off end,
       case when v.to_off   is null then null else current_date + v.to_off   end,
       (select t.id from public.taxes t where t.name = 'GST 18%'),
       v.auto_close, v.closable, v.pausable, v.renewable
  from (values
    ('Monthly Basic', 499.00,  'monthly', 1, null::int, null::int, false, true,  false, true),
    ('Yearly Pro',    4999.00, 'yearly',  1, null::int, null::int, true,  false, false, true),
    ('Weekly Trial',  0.00,    'weekly',  1, -30,       365,       false, true,  true,  false),
    ('Daily Test',    49.00,   'daily',   2, null::int, null::int, true,  true,  true,  true)
  ) as v(name, price, period, min_quantity, from_off, to_off, auto_close, closable, pausable, renewable)
 where not exists (select 1 from public.plans p where p.name = v.name);

-- Discounts: percent product discount, fixed subscription discount, one expired.
insert into public.discounts
  (name, type, value, applies_to, product_id, min_purchase, min_quantity, start_date, end_date, usage_limit)
select 'Launch 10% off ERP Suite', 'percent', 10.00, 'product',
       (select id from public.products where name = 'ERP Suite'),
       0, 0, current_date - 30, current_date + 60, 100
 where not exists (select 1 from public.discounts where name = 'Launch 10% off ERP Suite');

insert into public.discounts
  (name, type, value, applies_to, product_id, min_purchase, min_quantity, start_date, end_date, usage_limit)
select 'Flat 500 off', 'fixed', 500.00, 'subscription', null,
       5000, 0, current_date - 30, current_date + 90, null
 where not exists (select 1 from public.discounts where name = 'Flat 500 off');

insert into public.discounts
  (name, type, value, applies_to, product_id, min_purchase, min_quantity, start_date, end_date, usage_limit)
select 'Early Bird 15% (expired)', 'percent', 15.00, 'product',
       (select id from public.products where name = 'CRM Cloud'),
       0, 0, current_date - 120, current_date - 30, 50
 where not exists (select 1 from public.discounts where name = 'Early Bird 15% (expired)');

-- Quotation templates and their lines
insert into public.quotation_templates (name, plan_id, validity_days, payment_term_id, notes)
select 'Starter Monthly Bundle',
       (select id from public.plans where name = 'Monthly Basic'),
       14,
       (select id from public.payment_terms where name = 'Net 15'),
       'Entry package: consulting plus training'
 where not exists (select 1 from public.quotation_templates where name = 'Starter Monthly Bundle');

insert into public.quotation_templates (name, plan_id, validity_days, payment_term_id, notes)
select 'ERP Yearly Package',
       (select id from public.plans where name = 'Yearly Pro'),
       30,
       (select id from public.payment_terms where name = 'Net 30'),
       'ERP Suite (Odoo) with training'
 where not exists (select 1 from public.quotation_templates where name = 'ERP Yearly Package');

insert into public.quotation_template_lines (template_id, product_id, variant_id, quantity)
select tpl.id, p.id, pv.id, v.quantity
  from (values
    ('Starter Monthly Bundle', 'Consulting Hours', null::text, 2),
    ('Starter Monthly Bundle', 'Training Pack',    null::text, 1),
    ('ERP Yearly Package',     'ERP Suite',        'Odoo',     1),
    ('ERP Yearly Package',     'Training Pack',    null::text, 2)
  ) as v(template, product, variant, quantity)
  join public.quotation_templates tpl on tpl.name = v.template
  join public.products p on p.name = v.product
  left join public.product_variants pv
         on pv.product_id = p.id and pv.attribute_name = 'Brand' and pv.value = v.variant
 where not exists (
   select 1 from public.quotation_template_lines l
    where l.template_id = tpl.id and l.product_id = p.id
      and l.variant_id is not distinct from pv.id
 );
