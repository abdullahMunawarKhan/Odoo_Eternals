-- Part 2: catalog enums and tables (SPEC 3.2).

create type public.product_type        as enum ('service', 'goods', 'software');
create type public.tax_rate_type       as enum ('percent', 'fixed');
create type public.billing_period      as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.discount_type       as enum ('fixed', 'percent');
create type public.discount_applies_to as enum ('product', 'subscription');

create table public.taxes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rate_type  public.tax_rate_type not null,
  rate       numeric(12,2) not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint taxes_rate_nonneg check (rate >= 0),
  constraint taxes_percent_max check (rate_type <> 'percent' or rate <= 100)
);

create table public.payment_terms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  days       integer not null,
  created_at timestamptz not null default now(),
  constraint payment_terms_days_nonneg check (days >= 0)
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        public.product_type not null,
  sales_price numeric(12,2) not null,
  cost_price  numeric(12,2) not null default 0,
  notes       text,
  tax_id      uuid references public.taxes (id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint products_sales_price_nonneg check (sales_price >= 0),
  constraint products_cost_price_nonneg check (cost_price >= 0)
);
create index products_tax_id_idx on public.products (tax_id);

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  attribute_name text not null default 'Brand',
  value          text not null,
  extra_price    numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),
  constraint product_variants_extra_price_nonneg check (extra_price >= 0),
  constraint product_variants_unique unique (product_id, attribute_name, value),
  -- lets child tables prove a variant belongs to a given product
  constraint product_variants_id_product_unique unique (id, product_id)
);

create table public.plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  price          numeric(12,2) not null default 0,
  billing_period public.billing_period not null,
  min_quantity   integer not null default 1,
  available_from date,
  available_to   date,
  tax_id         uuid references public.taxes (id),
  auto_close     boolean not null default false,
  closable       boolean not null default false,
  pausable       boolean not null default false,
  renewable      boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint plans_price_nonneg check (price >= 0),
  constraint plans_min_quantity_positive check (min_quantity >= 1),
  constraint plans_window_order check (
    available_from is null or available_to is null or available_from <= available_to
  )
);
create index plans_tax_id_idx on public.plans (tax_id);

create table public.discounts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        public.discount_type not null,
  value       numeric(12,2) not null,
  applies_to  public.discount_applies_to not null,
  product_id  uuid references public.products (id),
  min_purchase numeric(12,2) not null default 0,
  min_quantity integer not null default 0,
  start_date  date,
  end_date    date,
  usage_limit integer,
  times_used  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint discounts_value_positive check (value > 0),
  constraint discounts_percent_max check (type <> 'percent' or value <= 100),
  constraint discounts_product_required check (applies_to <> 'product' or product_id is not null),
  constraint discounts_dates_order check (
    start_date is null or end_date is null or end_date >= start_date
  ),
  constraint discounts_usage_limit_positive check (usage_limit is null or usage_limit > 0),
  constraint discounts_min_purchase_nonneg check (min_purchase >= 0),
  constraint discounts_min_quantity_nonneg check (min_quantity >= 0),
  constraint discounts_times_used_nonneg check (times_used >= 0)
);
create index discounts_product_id_idx on public.discounts (product_id);

create table public.quotation_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  plan_id         uuid not null references public.plans (id),
  validity_days   integer not null,
  payment_term_id uuid not null references public.payment_terms (id),
  notes           text,
  created_at      timestamptz not null default now(),
  constraint quotation_templates_validity_positive check (validity_days > 0)
);
create index quotation_templates_plan_id_idx on public.quotation_templates (plan_id);

create table public.quotation_template_lines (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quotation_templates (id) on delete cascade,
  product_id  uuid not null references public.products (id),
  variant_id  uuid,
  quantity    integer not null default 1,
  created_at  timestamptz not null default now(),
  constraint quotation_template_lines_quantity_positive check (quantity > 0),
  -- a variant, when given, must belong to the line's product
  constraint quotation_template_lines_variant_fk
    foreign key (variant_id, product_id) references public.product_variants (id, product_id)
);
create index quotation_template_lines_template_id_idx on public.quotation_template_lines (template_id);
