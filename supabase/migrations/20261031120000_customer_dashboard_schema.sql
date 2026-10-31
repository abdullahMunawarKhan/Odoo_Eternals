-- ==============================================================================
-- Migration: 20261031120000_customer_dashboard_schema.sql
-- Description: Catalog, Subscriptions, Billing, Payments and Customer Dashboard RLS
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE public.rate_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.product_type AS ENUM ('service', 'goods', 'software');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.billing_period AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.discount_type AS ENUM ('fixed', 'percent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.discount_applies_to AS ENUM ('product', 'subscription');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.sub_status AS ENUM ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.inv_status AS ENUM ('draft', 'confirmed', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.inv_line_kind AS ENUM ('plan_fee', 'product');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. SEQUENCES FOR READABLE NUMBERS
CREATE SEQUENCE IF NOT EXISTS public.subscription_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- 3. CATALOG TABLES

-- Taxes
CREATE TABLE IF NOT EXISTS public.taxes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    rate_type  public.rate_type NOT NULL DEFAULT 'percent',
    rate       NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Terms
CREATE TABLE IF NOT EXISTS public.payment_terms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    days       INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    type        public.product_type NOT NULL DEFAULT 'service',
    sales_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes       TEXT,
    tax_id      UUID REFERENCES public.taxes(id) ON DELETE SET NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    attribute_name TEXT NOT NULL DEFAULT 'Brand',
    value          TEXT NOT NULL,
    extra_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    price          NUMERIC(12,2) NOT NULL DEFAULT 0,
    billing_period public.billing_period NOT NULL DEFAULT 'monthly',
    min_quantity   INT NOT NULL DEFAULT 1,
    available_from DATE,
    available_to   DATE,
    tax_id         UUID REFERENCES public.taxes(id) ON DELETE SET NULL,
    auto_close     BOOLEAN NOT NULL DEFAULT false,
    closable       BOOLEAN NOT NULL DEFAULT true,
    pausable       BOOLEAN NOT NULL DEFAULT true,
    renewable      BOOLEAN NOT NULL DEFAULT true,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discounts
CREATE TABLE IF NOT EXISTS public.discounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    type         public.discount_type NOT NULL DEFAULT 'percent',
    value        NUMERIC(12,2) NOT NULL DEFAULT 0,
    applies_to   public.discount_applies_to NOT NULL DEFAULT 'subscription',
    product_id   UUID REFERENCES public.products(id) ON DELETE CASCADE,
    min_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_quantity INT NOT NULL DEFAULT 0,
    start_date   DATE,
    end_date     DATE,
    usage_limit  INT,
    times_used   INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SUBSCRIPTIONS TABLES

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number                TEXT NOT NULL UNIQUE DEFAULT ('SUB-' || LPAD(nextval('public.subscription_number_seq')::text, 5, '0')),
    customer_id           UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    plan_id               UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    template_id           UUID,
    status                public.sub_status NOT NULL DEFAULT 'draft',
    start_date            DATE NOT NULL DEFAULT current_date,
    expiry_date           DATE NOT NULL DEFAULT (current_date + interval '1 year'),
    next_billing_date     DATE,
    payment_term_id       UUID REFERENCES public.payment_terms(id) ON DELETE SET NULL,
    quotation_valid_until DATE,
    created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id      UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_id          UUID REFERENCES public.taxes(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_discounts (
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    discount_id     UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (subscription_id, discount_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_status_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    from_status     public.sub_status NOT NULL,
    to_status       public.sub_status NOT NULL,
    changed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. BILLING & INVOICES TABLES

CREATE TABLE IF NOT EXISTS public.invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number          TEXT NOT NULL UNIQUE DEFAULT ('INV-' || LPAD(nextval('public.invoice_number_seq')::text, 5, '0')),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    period_start    DATE NOT NULL DEFAULT current_date,
    period_end      DATE NOT NULL DEFAULT (current_date + interval '1 month'),
    issue_date      DATE NOT NULL DEFAULT current_date,
    due_date        DATE NOT NULL DEFAULT (current_date + interval '15 days'),
    status          public.inv_status NOT NULL DEFAULT 'draft',
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    kind            public.inv_line_kind NOT NULL DEFAULT 'product',
    product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description     TEXT NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    base_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_id          UUID REFERENCES public.taxes(id) ON DELETE SET NULL,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    method       public.payment_method NOT NULL DEFAULT 'card',
    amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT current_date,
    note         TEXT,
    recorded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. HELPER FUNCTIONS & INDEXES

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_lines_sub ON public.subscription_lines(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_inv ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- Helper to safely resolve current customer ID
CREATE OR REPLACE FUNCTION public.get_customer_id_for_user(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers WHERE user_id = user_uuid LIMIT 1;
$$;

-- Allow customers to update their own contact information
DROP POLICY IF EXISTS customers_update_own ON public.customers;
CREATE POLICY customers_update_own ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent customers from changing user_id, id, or email
CREATE OR REPLACE FUNCTION public.guard_customer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') AND NOT public.is_staff_or_admin() THEN
    IF new.id IS DISTINCT FROM old.id THEN
      RAISE EXCEPTION 'customers.id cannot be changed' USING errcode = '42501';
    END IF;
    IF new.user_id IS DISTINCT FROM old.user_id THEN
      RAISE EXCEPTION 'customers.user_id cannot be changed' USING errcode = '42501';
    END IF;
    IF new.email IS DISTINCT FROM old.email THEN
      RAISE EXCEPTION 'customers.email cannot be changed' USING errcode = '42501';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS customers_guard_update ON public.customers;
CREATE TRIGGER customers_guard_update
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_update();

-- 7. SECURE TRANSITION FUNCTION FOR SUBSCRIPTION ACTIONS (PAUSE, RESUME, CLOSE, RENEW)
CREATE OR REPLACE FUNCTION public.transition_subscription(
    sub_id UUID,
    new_status public.sub_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_plan RECORD;
    v_caller_role public.user_role;
    v_is_owner BOOLEAN;
    v_term_length INTERVAL;
BEGIN
    SELECT * INTO v_sub FROM public.subscriptions WHERE id = sub_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found' USING errcode = 'P0002';
    END IF;

    SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
    v_caller_role := public."current_role"();
    v_is_owner := EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = v_sub.customer_id AND user_id = auth.uid()
    );

    -- Caller must be staff/admin OR owning customer
    IF NOT public.is_staff_or_admin() AND NOT v_is_owner THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this subscription' USING errcode = '42501';
    END IF;

    -- Lifecycle rules
    IF v_sub.status = new_status THEN
        -- If renewing, status stays 'active' or transitions from near-expiry active
        IF new_status = 'active' AND v_sub.status = 'active' THEN
            IF NOT v_plan.renewable THEN
                RAISE EXCEPTION 'This plan does not permit renewals' USING errcode = '42501';
            END IF;
            -- Extend expiry date
            v_term_length := (v_sub.expiry_date - v_sub.start_date) * INTERVAL '1 day';
            UPDATE public.subscriptions
            SET expiry_date = expiry_date + v_term_length
            WHERE id = sub_id;

            INSERT INTO public.subscription_status_log (subscription_id, from_status, to_status, changed_by)
            VALUES (sub_id, 'active', 'active', auth.uid());

            RETURN jsonb_build_object('success', true, 'message', 'Subscription renewed successfully');
        ELSE
            RETURN jsonb_build_object('success', true, 'message', 'Subscription is already in this status');
        END IF;
    END IF;

    -- Pause rule
    IF new_status = 'paused' THEN
        IF v_sub.status != 'active' THEN
            RAISE EXCEPTION 'Only active subscriptions can be paused' USING errcode = '22023';
        END IF;
        IF NOT v_plan.pausable THEN
            RAISE EXCEPTION 'Plan does not permit pausing' USING errcode = '42501';
        END IF;
    END IF;

    -- Resume rule
    IF new_status = 'active' AND v_sub.status = 'paused' THEN
        IF NOT v_plan.pausable THEN
            RAISE EXCEPTION 'Plan does not permit pausing or resuming' USING errcode = '42501';
        END IF;
    END IF;

    -- Close rule
    IF new_status = 'closed' THEN
        IF NOT public.is_staff_or_admin() AND NOT v_plan.closable THEN
            RAISE EXCEPTION 'Plan does not permit early closure' USING errcode = '42501';
        END IF;
    END IF;

    -- Perform update
    UPDATE public.subscriptions
    SET status = new_status
    WHERE id = sub_id;

    -- Record log
    INSERT INTO public.subscription_status_log (subscription_id, from_status, to_status, changed_by)
    VALUES (sub_id, v_sub.status, new_status, auth.uid());

    RETURN jsonb_build_object(
        'success', true,
        'from_status', v_sub.status,
        'to_status', new_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_subscription(UUID, public.sub_status) TO authenticated;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all newly created tables
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Catalog tables: read-only for authenticated customers
CREATE POLICY taxes_read ON public.taxes FOR SELECT TO authenticated USING (true);
CREATE POLICY payment_terms_read ON public.payment_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY products_read ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY product_variants_read ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY plans_read ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY discounts_read ON public.discounts FOR SELECT TO authenticated USING (true);

-- Admin & Staff management for catalog
CREATE POLICY taxes_all_staff ON public.taxes FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY payment_terms_all_staff ON public.payment_terms FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY products_all_staff ON public.products FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY product_variants_all_staff ON public.product_variants FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY plans_all_staff ON public.plans FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY discounts_all_staff ON public.discounts FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- Subscriptions RLS: Customer can ONLY read their own
CREATE POLICY subscriptions_select ON public.subscriptions
    FOR SELECT TO authenticated
    USING (
        public.is_staff_or_admin()
        OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    );

CREATE POLICY subscriptions_staff ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

-- Subscription lines RLS: Customer can ONLY read lines belonging to their subscriptions
CREATE POLICY subscription_lines_select ON public.subscription_lines
    FOR SELECT TO authenticated
    USING (
        public.is_staff_or_admin()
        OR subscription_id IN (
            SELECT id FROM public.subscriptions
            WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        )
    );

CREATE POLICY subscription_lines_staff ON public.subscription_lines
    FOR ALL TO authenticated
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

-- Subscription status log RLS
CREATE POLICY sub_log_select ON public.subscription_status_log
    FOR SELECT TO authenticated
    USING (
        public.is_staff_or_admin()
        OR subscription_id IN (
            SELECT id FROM public.subscriptions
            WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        )
    );

-- Invoices RLS: Customer can ONLY read invoices belonging to them
CREATE POLICY invoices_select ON public.invoices
    FOR SELECT TO authenticated
    USING (
        public.is_staff_or_admin()
        OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    );

CREATE POLICY invoices_staff ON public.invoices
    FOR ALL TO authenticated
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

-- Invoice lines RLS
CREATE POLICY invoice_lines_select ON public.invoice_lines
    FOR SELECT TO authenticated
    USING (
        public.is_staff_or_admin()
        OR invoice_id IN (
            SELECT id FROM public.invoices
            WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        )
    );

CREATE POLICY invoice_lines_staff ON public.invoice_lines
    FOR ALL TO authenticated
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

-- Payments RLS: Customer can ONLY read payments for their own invoices
CREATE POLICY payments_select ON public.payments
    FOR SELECT TO authenticated
    USING (
        public.is_staff_or_admin()
        OR invoice_id IN (
            SELECT id FROM public.invoices
            WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        )
    );

CREATE POLICY payments_staff ON public.payments
    FOR ALL TO authenticated
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

-- 9. SEED BASE CATALOG DATA (IDEMPOTENT)
INSERT INTO public.taxes (name, rate_type, rate, is_active)
VALUES 
    ('GST 18%', 'percent', 18.00, true),
    ('GST 5%', 'percent', 5.00, true),
    ('No Tax', 'fixed', 0.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.payment_terms (name, days)
VALUES 
    ('Immediate', 0),
    ('Net 15', 15),
    ('Net 30', 30)
ON CONFLICT DO NOTHING;

INSERT INTO public.plans (name, price, billing_period, min_quantity, closable, pausable, renewable, is_active)
VALUES 
    ('Monthly Basic', 29.00, 'monthly', 1, true, true, true, true),
    ('Yearly Pro Enterprise', 290.00, 'yearly', 1, true, true, true, true),
    ('Weekly Starter', 10.00, 'weekly', 1, true, false, true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, type, sales_price, cost_price, notes, is_active)
VALUES 
    ('ERP Cloud Suite', 'software', 120.00, 40.00, 'Core SaaS enterprise platform', true),
    ('Premium Dedicated Support', 'service', 50.00, 20.00, '24/7 dedicated account manager', true),
    ('Storage Expansion Pack (100GB)', 'software', 15.00, 3.00, 'Additional high-speed SSD storage', true)
ON CONFLICT DO NOTHING;

