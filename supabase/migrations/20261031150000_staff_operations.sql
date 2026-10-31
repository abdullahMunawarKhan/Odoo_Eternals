-- ==============================================================================
-- Migration: 20261031150000_staff_operations.sql
-- Description: Staff operations, payment recording, quotation conversion,
--              invoice generation, payment allocations, audit logs, and RLS.
-- ==============================================================================

-- 1. SEQUENCES & EXTENSIONS
CREATE SEQUENCE IF NOT EXISTS public.payment_reference_seq START 1;

-- 2. ALTER PAYMENTS FOR REFERENCE
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT ('PAY-' || LPAD(nextval('public.payment_reference_seq')::text, 5, '0'));

-- 3. PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   UUID,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_allocations_staff ON public.payment_allocations;
CREATE POLICY payment_allocations_staff ON public.payment_allocations
    FOR ALL TO authenticated
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS payment_allocations_customer_select ON public.payment_allocations;
CREATE POLICY payment_allocations_customer_select ON public.payment_allocations
    FOR SELECT TO authenticated
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS audit_logs_staff_select ON public.audit_logs;
CREATE POLICY audit_logs_staff_select ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS audit_logs_staff_insert ON public.audit_logs;
CREATE POLICY audit_logs_staff_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staff_or_admin());

-- 6. SECURE FUNCTION: RECORD PAYMENT
CREATE OR REPLACE FUNCTION public.record_payment(
    p_invoice_id   UUID,
    p_method       public.payment_method,
    p_amount       NUMERIC(12,2),
    p_payment_date DATE DEFAULT current_date,
    p_note         TEXT DEFAULT NULL,
    p_reference    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
    v_new_amount_paid NUMERIC(12,2);
    v_outstanding NUMERIC(12,2);
    v_payment_id UUID;
    v_ref TEXT;
BEGIN
    -- Check role
    IF NOT public.is_staff_or_admin() THEN
        RAISE EXCEPTION 'Only staff or admin can record payments' USING errcode = '42501';
    END IF;

    -- Validate invoice
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found' USING errcode = 'P0002';
    END IF;

    IF v_inv.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot record payment on a cancelled invoice' USING errcode = '22023';
    END IF;

    IF v_inv.status = 'draft' THEN
        RAISE EXCEPTION 'Invoice must be confirmed before recording payments' USING errcode = '22023';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero' USING errcode = '22023';
    END IF;

    v_outstanding := v_inv.total - v_inv.amount_paid;
    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'Payment amount (%) exceeds outstanding balance (%)', p_amount, v_outstanding USING errcode = '22023';
    END IF;

    -- Set reference
    v_ref := COALESCE(p_reference, 'PAY-' || LPAD(nextval('public.payment_reference_seq')::text, 5, '0'));

    -- Insert payment
    INSERT INTO public.payments (
        invoice_id,
        method,
        amount,
        payment_date,
        note,
        recorded_by,
        reference
    ) VALUES (
        p_invoice_id,
        p_method,
        p_amount,
        COALESCE(p_payment_date, current_date),
        p_note,
        auth.uid(),
        v_ref
    ) RETURNING id INTO v_payment_id;

    -- Insert allocation
    INSERT INTO public.payment_allocations (
        payment_id,
        invoice_id,
        amount
    ) VALUES (
        v_payment_id,
        p_invoice_id,
        p_amount
    );

    -- Update invoice amount_paid and status
    v_new_amount_paid := v_inv.amount_paid + p_amount;
    UPDATE public.invoices
    SET 
        amount_paid = v_new_amount_paid,
        status = CASE WHEN v_new_amount_paid >= total THEN 'paid'::public.inv_status ELSE status END
    WHERE id = p_invoice_id;

    -- Log audit
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        'RECORD_PAYMENT',
        'invoices',
        p_invoice_id,
        jsonb_build_object('payment_id', v_payment_id, 'amount', p_amount, 'reference', v_ref)
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'reference', v_ref,
        'amount_paid', v_new_amount_paid,
        'is_fully_paid', v_new_amount_paid >= v_inv.total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment(UUID, public.payment_method, NUMERIC, DATE, TEXT, TEXT) TO authenticated;

-- 7. SECURE FUNCTION: GENERATE INVOICE FROM SUBSCRIPTION
CREATE OR REPLACE FUNCTION public.generate_invoice_for_subscription(
    p_subscription_id UUID,
    p_period_start    DATE DEFAULT current_date
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_plan RECORD;
    v_cust RECORD;
    v_existing_inv_id UUID;
    v_new_inv_id UUID;
    v_period_end DATE;
    v_due_date DATE;
    v_subtotal NUMERIC(12,2) := 0;
    v_tax_total NUMERIC(12,2) := 0;
    v_discount_total NUMERIC(12,2) := 0;
    v_total NUMERIC(12,2) := 0;
    v_line RECORD;
    v_tax RECORD;
    v_line_tax NUMERIC(12,2);
    v_line_total NUMERIC(12,2);
    v_pt_days INT := 15;
BEGIN
    IF NOT public.is_staff_or_admin() THEN
        RAISE EXCEPTION 'Only staff or admin can generate invoices' USING errcode = '42501';
    END IF;

    SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found' USING errcode = 'P0002';
    END IF;

    SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
    SELECT * INTO v_cust FROM public.customers WHERE id = v_sub.customer_id;

    -- Check payment term
    IF v_sub.payment_term_id IS NOT NULL THEN
        SELECT days INTO v_pt_days FROM public.payment_terms WHERE id = v_sub.payment_term_id;
        v_pt_days := COALESCE(v_pt_days, 15);
    END IF;

    -- Calculate period_end based on plan billing_period
    v_period_end := CASE v_plan.billing_period
        WHEN 'daily' THEN p_period_start + INTERVAL '1 day' - INTERVAL '1 day'
        WHEN 'weekly' THEN p_period_start + INTERVAL '1 week' - INTERVAL '1 day'
        WHEN 'yearly' THEN p_period_start + INTERVAL '1 year' - INTERVAL '1 day'
        ELSE p_period_start + INTERVAL '1 month' - INTERVAL '1 day'
    END;

    v_due_date := current_date + (v_pt_days || ' days')::INTERVAL;

    -- Avoid duplicate billing period for this subscription
    SELECT id INTO v_existing_inv_id 
    FROM public.invoices 
    WHERE subscription_id = p_subscription_id AND period_start = p_period_start;

    IF v_existing_inv_id IS NOT NULL THEN
        RETURN v_existing_inv_id;
    END IF;

    -- 1. Create invoice header
    INSERT INTO public.invoices (
        subscription_id,
        customer_id,
        period_start,
        period_end,
        issue_date,
        due_date,
        status,
        subtotal,
        discount_total,
        tax_total,
        total,
        amount_paid
    ) VALUES (
        p_subscription_id,
        v_sub.customer_id,
        p_period_start,
        v_period_end,
        current_date,
        v_due_date,
        'draft',
        0, 0, 0, 0, 0
    ) RETURNING id INTO v_new_inv_id;

    -- 2. Add Plan Fee Line if plan price > 0
    IF COALESCE(v_plan.price, 0) > 0 THEN
        v_line_tax := 0;
        IF v_plan.tax_id IS NOT NULL THEN
            SELECT * INTO v_tax FROM public.taxes WHERE id = v_plan.tax_id;
            IF FOUND AND v_tax.is_active THEN
                IF v_tax.rate_type = 'percent' THEN
                    v_line_tax := ROUND((v_plan.price * v_tax.rate / 100.0), 2);
                ELSE
                    v_line_tax := v_tax.rate;
                END IF;
            END IF;
        END IF;

        v_line_total := v_plan.price + v_line_tax;

        INSERT INTO public.invoice_lines (
            invoice_id,
            kind,
            description,
            quantity,
            unit_price,
            base_amount,
            discount_amount,
            tax_id,
            tax_amount,
            line_total
        ) VALUES (
            v_new_inv_id,
            'plan_fee',
            'Plan Recurring Fee: ' || v_plan.name,
            1,
            v_plan.price,
            v_plan.price,
            0,
            v_plan.tax_id,
            v_line_tax,
            v_line_total
        );

        v_subtotal := v_subtotal + v_plan.price;
        v_tax_total := v_tax_total + v_line_tax;
        v_total := v_total + v_line_total;
    END IF;

    -- 3. Add Product Lines from subscription_lines
    FOR v_line IN 
        SELECT sl.*, p.name AS product_name, pv.value AS variant_name
        FROM public.subscription_lines sl
        JOIN public.products p ON p.id = sl.product_id
        LEFT JOIN public.product_variants pv ON pv.id = sl.variant_id
        WHERE sl.subscription_id = p_subscription_id
    LOOP
        v_line_tax := 0;
        IF v_line.tax_id IS NOT NULL THEN
            SELECT * INTO v_tax FROM public.taxes WHERE id = v_line.tax_id;
            IF FOUND AND v_tax.is_active THEN
                IF v_tax.rate_type = 'percent' THEN
                    v_line_tax := ROUND((v_line.amount * v_tax.rate / 100.0), 2);
                ELSE
                    v_line_tax := v_tax.rate;
                END IF;
            END IF;
        END IF;

        v_line_total := v_line.amount + v_line_tax;

        INSERT INTO public.invoice_lines (
            invoice_id,
            kind,
            product_id,
            description,
            quantity,
            unit_price,
            base_amount,
            discount_amount,
            tax_id,
            tax_amount,
            line_total
        ) VALUES (
            v_new_inv_id,
            'product',
            v_line.product_id,
            v_line.product_name || COALESCE(' (' || v_line.variant_name || ')', ''),
            v_line.quantity,
            v_line.unit_price,
            v_line.amount,
            0,
            v_line.tax_id,
            v_line_tax,
            v_line_total
        );

        v_subtotal := v_subtotal + v_line.amount;
        v_tax_total := v_tax_total + v_line_tax;
        v_total := v_total + v_line_total;
    END LOOP;

    -- Update invoice totals
    UPDATE public.invoices
    SET 
        subtotal = v_subtotal,
        tax_total = v_tax_total,
        discount_total = v_discount_total,
        total = v_total
    WHERE id = v_new_inv_id;

    -- Advance next_billing_date if applicable
    UPDATE public.subscriptions
    SET next_billing_date = CASE v_plan.billing_period
        WHEN 'daily' THEN COALESCE(next_billing_date, current_date) + INTERVAL '1 day'
        WHEN 'weekly' THEN COALESCE(next_billing_date, current_date) + INTERVAL '1 week'
        WHEN 'yearly' THEN COALESCE(next_billing_date, current_date) + INTERVAL '1 year'
        ELSE COALESCE(next_billing_date, current_date) + INTERVAL '1 month'
    END
    WHERE id = p_subscription_id AND status = 'active';

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        'GENERATE_INVOICE',
        'invoices',
        v_new_inv_id,
        jsonb_build_object('subscription_id', p_subscription_id, 'total', v_total)
    );

    RETURN v_new_inv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_for_subscription(UUID, DATE) TO authenticated;

-- 8. SECURE FUNCTION: CONVERT QUOTATION TO SUBSCRIPTION
CREATE OR REPLACE FUNCTION public.convert_quotation_to_subscription(
    p_subscription_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
BEGIN
    IF NOT public.is_staff_or_admin() THEN
        RAISE EXCEPTION 'Only staff or admin can convert quotations' USING errcode = '42501';
    END IF;

    SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation/Subscription not found' USING errcode = 'P0002';
    END IF;

    IF v_sub.status NOT IN ('draft', 'quotation') THEN
        RAISE EXCEPTION 'Only Draft or Quotation status can be converted (current status: %)', v_sub.status USING errcode = '22023';
    END IF;

    -- Convert to confirmed
    UPDATE public.subscriptions
    SET 
        status = 'confirmed',
        start_date = current_date,
        next_billing_date = current_date
    WHERE id = p_subscription_id;

    -- Status log
    INSERT INTO public.subscription_status_log (subscription_id, from_status, to_status, changed_by)
    VALUES (p_subscription_id, v_sub.status, 'confirmed', auth.uid());

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        'CONVERT_QUOTATION',
        'subscriptions',
        p_subscription_id,
        jsonb_build_object('from_status', v_sub.status, 'to_status', 'confirmed')
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Quotation converted to Confirmed subscription successfully',
        'status', 'confirmed'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quotation_to_subscription(UUID) TO authenticated;

