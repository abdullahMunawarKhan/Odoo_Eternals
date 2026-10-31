import { supabase } from '../lib/supabase';

export const staffService = {
  // ==========================================
  // ADMIN EXISTING METHODS (PRESERVED)
  // ==========================================

  /**
   * Fetch all staff members from profiles (used by Admin)
   */
  async getStaffList() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .in('role', ['staff', 'admin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff list:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Create a staff account with the admin-only `create-staff` Edge Function
   * (docs/API.md section 4). The staff member can log in right away.
   * Errors come back as { error: { code, message, field } }.
   */
  async createStaff({ email, fullName, password }) {
    const { data, error } = await supabase.functions.invoke('create-staff', {
      body: {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        password,
      },
    });

    if (error) {
      let message = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.error?.message) message = body.error.message;
        }
      } catch {
        // keep the default message
      }
      throw new Error(message || 'Failed to create the staff account');
    }

    return data;
  },

  /**
   * Activate or deactivate an account (admin only). A deactivated user can still sign
   * in but sees no data. Returns the updated profile row.
   */
  async setActive(userId, active) {
    const { data, error } = await supabase.rpc('set_user_active', { user_id: userId, active });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Fetch live metrics for Admin Overview (used by Admin)
   */
  async getAdminOverviewStats() {
    try {
      const { count: staffCount, error: staffErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'staff');

      const { count: customerCount, error: custErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      if (staffErr) console.warn('Could not count staff:', staffErr);
      if (custErr) console.warn('Could not count customers:', custErr);

      return {
        totalStaff: staffCount ?? 0,
        totalCustomers: customerCount ?? 0,
        activeSubscriptions: {
          value: '0',
          isPlaceholder: true,
          label: 'Active Subscriptions (Module Coming Soon)',
        },
        totalRevenue: {
          value: '$0.00',
          isPlaceholder: true,
          label: 'Total Revenue (Billing Coming Soon)',
        },
      };
    } catch (err) {
      console.error('Error fetching admin overview stats:', err);
      return {
        totalStaff: 0,
        totalCustomers: 0,
        activeSubscriptions: { value: '0', isPlaceholder: true, label: 'Active Subscriptions' },
        totalRevenue: { value: '$0.00', isPlaceholder: true, label: 'Total Revenue' },
      };
    }
  },

  // ==========================================
  // STAFF OVERVIEW & METRICS
  // ==========================================

  /**
   * Fetch live operational statistics for Staff Overview Dashboard
   */
  async getStaffOverviewStats() {
    try {
      // 1. Total Customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // 2. Active Subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // 3. Pending Quotations (draft or quotation)
      const { count: pendingQuotations } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'quotation']);

      // 4. Invoices & Outstanding Balance
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, number, status, total, amount_paid, due_date, customer:customers(name)');

      const invoices = invoicesData || [];
      const outstandingInvoices = invoices.filter(
        (inv) => inv.status === 'confirmed' || (inv.status !== 'cancelled' && inv.status !== 'paid')
      );
      const outstandingAmount = outstandingInvoices.reduce(
        (acc, inv) => acc + Math.max(0, Number(inv.total || 0) - Number(inv.amount_paid || 0)),
        0
      );

      // Overdue invoices (due_date < today AND status = confirmed AND amount_paid < total)
      const todayStr = new Date().toISOString().split('T')[0];
      const overdueInvoices = outstandingInvoices.filter(
        (inv) => inv.due_date && inv.due_date < todayStr && inv.status === 'confirmed'
      );

      // 5. Total Payments Recorded
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, payment_date, reference, invoice:invoices(number, customer:customers(name))')
        .order('created_at', { ascending: false });

      const payments = paymentsData || [];
      const totalPaymentsRecorded = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

      // 6. Recent Customers with Subscription count
      const { data: recentCustomersData } = await supabase
        .from('customers')
        .select('id, name, email, company, created_at, subscriptions(id)')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentCustomers = (recentCustomersData || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company || '—',
        created_at: c.created_at,
        subscriptionCount: c.subscriptions?.length || 0,
      }));

      // 7. Recent Subscriptions
      const { data: recentSubs } = await supabase
        .from('subscriptions')
        .select('id, number, status, start_date, created_at, customer:customers(name), plan:plans(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      // 8. Upcoming Renewals (active, expiry_date within 30 days)
      const next30Days = new Date();
      next30Days.setDate(next30Days.getDate() + 30);
      const next30DaysStr = next30Days.toISOString().split('T')[0];

      const { data: upcomingRenewalsData } = await supabase
        .from('subscriptions')
        .select('id, number, expiry_date, customer:customers(name), plan:plans(name)')
        .eq('status', 'active')
        .lte('expiry_date', next30DaysStr)
        .order('expiry_date', { ascending: true })
        .limit(5);

      return {
        metrics: {
          totalCustomers: totalCustomers ?? 0,
          activeSubscriptions: activeSubscriptions ?? 0,
          pendingQuotations: pendingQuotations ?? 0,
          outstandingInvoicesCount: outstandingInvoices.length,
          outstandingAmount,
          totalPaymentsAmount: totalPaymentsRecorded,
          paymentsCount: payments.length,
          overdueInvoicesCount: overdueInvoices.length,
        },
        recentActivities: {
          recentCustomers: recentCustomers.slice(0, 5),
          recentSubscriptions: recentSubs || [],
          recentInvoices: invoices.slice(0, 5),
          recentPayments: payments.slice(0, 5),
        },
        pendingActions: {
          quotationsAwaitingConfirmation: (recentSubs || []).filter((s) => s.status === 'quotation' || s.status === 'draft'),
          overdueInvoices: overdueInvoices.slice(0, 5),
          upcomingRenewals: upcomingRenewalsData || [],
        },
        recentCustomers,
      };
    } catch (err) {
      console.error('Error fetching staff overview stats:', err);
      throw err;
    }
  },

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================

  /**
   * Fetch paginated customers with search & filter
   */
  async getCustomers({ search = '', page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('customers')
      .select('id, name, email, phone, company, address, created_at, subscriptions(id, status)', { count: 'exact' });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},company.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }

    const items = (data || []).map((c) => ({
      ...c,
      activeSubscriptionsCount: (c.subscriptions || []).filter((s) => s.status === 'active').length,
      totalSubscriptionsCount: (c.subscriptions || []).length,
    }));

    return {
      data: items,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
      limit,
    };
  },

  /**
   * Get single customer details with full related history
   */
  async getCustomerById(id) {
    // 1. Customer record
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (custErr) throw custErr;

    // 2. Subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, number, status, start_date, expiry_date, next_billing_date, plan:plans(name, price, billing_period)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    // 3. Invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, number, status, issue_date, due_date, subtotal, tax_total, total, amount_paid, subscription:subscriptions(number)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    // 4. Payments
    let payments = [];
    const invIds = (invoices || []).map((i) => i.id);
    if (invIds.length > 0) {
      const { data: pmts } = await supabase
        .from('payments')
        .select('id, reference, amount, payment_date, method, note, invoice:invoices(number)')
        .in('invoice_id', invIds)
        .order('payment_date', { ascending: false });
      payments = pmts || [];
    }

    return {
      customer,
      subscriptions: (subscriptions || []).filter((s) => s.status !== 'draft' && s.status !== 'quotation'),
      quotations: (subscriptions || []).filter((s) => s.status === 'draft' || s.status === 'quotation'),
      invoices: invoices || [],
      payments,
    };
  },

  /**
   * Create a new customer record
   */
  async createCustomer({ name, email, phone, company, address }) {
    // Check if customer email already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      throw new Error(`A customer with email ${email} already exists.`);
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        address: address?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update an existing customer's contact information
   */
  async updateCustomer(id, { name, phone, company, address }) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: name.trim(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        address: address?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw error;
    }

    return data;
  },

  // ==========================================
  // QUOTATION MANAGEMENT
  // ==========================================

  /**
   * Get paginated quotations (subscriptions with status = 'draft' or 'quotation')
   */
  async getQuotations({ search = '', status = 'all', page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('subscriptions')
      .select(`
        id, number, status, quotation_valid_until, created_at, notes,
        customer:customers(id, name, email, company),
        plan:plans(id, name, price, billing_period),
        subscription_lines(id, quantity, unit_price, amount)
      `, { count: 'exact' });

    if (status === 'all') {
      query = query.in('status', ['draft', 'quotation', 'confirmed']);
    } else {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`number.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching quotations:', error);
      throw error;
    }

    const items = (data || []).map((q) => {
      const lines = q.subscription_lines || [];
      const linesTotal = lines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
      const planPrice = Number(q.plan?.price || 0);
      const totalAmount = linesTotal + planPrice;

      return {
        ...q,
        lines,
        totalAmount,
      };
    });

    return {
      data: items,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
      limit,
    };
  },

  /**
   * Get single quotation details
   */
  async getQuotationById(id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id, number, status, quotation_valid_until, start_date, expiry_date, notes, created_at,
        customer:customers(id, name, email, phone, company, address),
        plan:plans(id, name, price, billing_period, closable, pausable, renewable),
        payment_term:payment_terms(id, name, days),
        subscription_lines(
          id, quantity, unit_price, amount,
          product:products(id, name, sales_price),
          variant:product_variants(id, attribute_name, value, extra_price),
          tax:taxes(id, name, rate_type, rate)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const lines = data.subscription_lines || [];
    const linesTotal = lines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const planPrice = Number(data.plan?.price || 0);
    const totalAmount = linesTotal + planPrice;

    return {
      ...data,
      lines,
      totalAmount,
    };
  },

  /**
   * Create a quotation (as subscription with status = 'quotation' or 'draft')
   */
  async createQuotation({ customer_id, plan_id, validity_days = 30, payment_term_id = null, notes = '', lines = [], status = 'quotation' }) {
    // The database owns status, prices and the log: create a draft, add lines (unit_price,
    // tax and amount are computed server-side), then move it with transition_subscription.
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        customer_id,
        plan_id,
        payment_term_id: payment_term_id || null,
        notes: notes || null,
        start_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    if (subErr) {
      console.error('Error creating quotation header:', subErr);
      throw subErr;
    }

    if (lines.length > 0) {
      const lineRows = lines.map((line) => ({
        subscription_id: sub.id,
        product_id: line.product_id,
        variant_id: line.variant_id || null,
        quantity: Number(line.quantity || 1),
      }));
      const { error: linesErr } = await supabase.from('subscription_lines').insert(lineRows);
      if (linesErr) {
        console.error('Error inserting quotation lines:', linesErr);
        throw linesErr;
      }
    }

    if (status === 'draft') return sub;

    const moved = await this.transitionSubscription(sub.id, 'quotation');
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(validity_days));
    const validUntilStr = validUntil.toISOString().split('T')[0];
    await supabase.from('subscriptions').update({ quotation_valid_until: validUntilStr }).eq('id', sub.id);
    return { ...moved, quotation_valid_until: validUntilStr };
  },

  /**
   * Convert quotation to Confirmed subscription
   */
  async convertQuotationToSubscription(id) {
    // Call the secure RPC function
    const { data, error } = await supabase.rpc('convert_quotation_to_subscription', {
      p_subscription_id: id,
    });

    if (error) {
      // Fallback: direct update via transition_subscription
      const fallback = await supabase.rpc('transition_subscription', {
        sub_id: id,
        new_status: 'confirmed',
      });
      if (fallback.error) throw new Error(fallback.error.message || error.message);
      return fallback.data;
    }

    return data;
  },

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  /**
   * Get paginated subscriptions
   */
  async getSubscriptions({ search = '', status = 'all', page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('subscriptions')
      .select(`
        id, number, status, start_date, expiry_date, next_billing_date, created_at,
        customer:customers(id, name, email, company),
        plan:plans(id, name, price, billing_period),
        subscription_lines(id, amount)
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`number.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    const items = (data || []).map((s) => {
      const lines = s.subscription_lines || [];
      const linesTotal = lines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
      const planPrice = Number(s.plan?.price || 0);
      return {
        ...s,
        totalAmount: linesTotal + planPrice,
      };
    });

    return {
      data: items,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
      limit,
    };
  },

  /**
   * Get subscription details
   */
  async getSubscriptionById(id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id, number, status, start_date, expiry_date, next_billing_date, notes, created_at,
        customer:customers(id, name, email, phone, company, address),
        plan:plans(id, name, price, billing_period, closable, pausable, renewable, auto_close),
        payment_term:payment_terms(id, name, days),
        subscription_lines(
          id, quantity, unit_price, amount,
          product:products(id, name, sales_price),
          variant:product_variants(id, attribute_name, value, extra_price),
          tax:taxes(id, name, rate_type, rate)
        ),
        subscription_status_log(id, from_status, to_status, changed_at),
        invoices(id, number, issue_date, due_date, status, total, amount_paid)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const lines = data.subscription_lines || [];
    const linesTotal = lines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
    const planPrice = Number(data.plan?.price || 0);

    return {
      ...data,
      lines,
      totalAmount: linesTotal + planPrice,
      statusLog: data.subscription_status_log || [],
      invoices: data.invoices || [],
    };
  },

  /**
   * Create a new subscription directly
   */
  async createSubscription({ customer_id, plan_id, start_date, expiry_date, payment_term_id = null, notes = '', lines = [] }) {
    const sDate = start_date || new Date().toISOString().split('T')[0];
    const eDate = expiry_date || (() => {
      const d = new Date(sDate);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    })();

    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        customer_id,
        plan_id,
        start_date: sDate,
        expiry_date: eDate,
        payment_term_id: payment_term_id || null,
        notes: notes || null,
      })
      .select()
      .single();
    if (subErr) {
      console.error('Error creating subscription:', subErr);
      throw subErr;
    }

    if (lines.length > 0) {
      const lineRows = lines.map((l) => ({
        subscription_id: sub.id,
        product_id: l.product_id,
        variant_id: l.variant_id || null,
        quantity: Number(l.quantity || 1),
      }));
      const { error: linesErr } = await supabase.from('subscription_lines').insert(lineRows);
      if (linesErr) throw linesErr;
    }

    // draft -> quotation -> confirmed, each step validated and logged by the database
    await this.transitionSubscription(sub.id, 'quotation');
    return this.transitionSubscription(sub.id, 'confirmed');
  },

  /**
   * Transition subscription status (confirm, activate, pause, resume, close, renew)
   */
  async transitionSubscription(subId, newStatus) {
    const { data, error } = await supabase.rpc('transition_subscription', {
      sub_id: subId,
      new_status: newStatus,
    });

    if (error) {
      console.error('Error transitioning subscription:', error);
      throw new Error(error.message || 'Failed to update subscription status');
    }

    return data;
  },

  /**
   * Generate invoice from subscription
   */
  async generateInvoiceForSubscription(subId, periodStart = null) {
    const pStart = periodStart || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('generate_invoice', {
      sub_id: subId,
      period_start: pStart,
    });

    if (error) {
      console.error('Error generating invoice for subscription:', error);
      throw new Error(error.message || 'Failed to generate invoice');
    }

    return data;
  },

  // ==========================================
  // INVOICE MANAGEMENT
  // ==========================================

  /**
   * Get paginated invoices
   */
  async getInvoices({ search = '', status = 'all', page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('invoices')
      .select(`
        id, number, status, issue_date, due_date, subtotal, tax_total, discount_total, total, amount_paid, created_at,
        customer:customers(id, name, email, company),
        subscription:subscriptions(id, number)
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`number.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
      limit,
    };
  },

  /**
   * Get single invoice details
   */
  async getInvoiceById(id) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id, number, status, issue_date, due_date, period_start, period_end, subtotal, tax_total, discount_total, total, amount_paid, created_at,
        customer:customers(id, name, email, phone, company, address),
        subscription:subscriptions(id, number, plan:plans(name)),
        invoice_lines(
          id, kind, description, quantity, unit_price, base_amount, discount_amount, tax_amount, line_total,
          product:products(id, name),
          tax:taxes(id, name, rate)
        ),
        payments(id, reference, amount, payment_date, method, note)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...data,
      lines: data.invoice_lines || [],
      payments: data.payments || [],
    };
  },

  /**
   * Update invoice status (confirm draft, or cancel)
   */
  async updateInvoiceStatus(id, newStatus) {
    // Invoices cannot be updated directly; confirm and cancel are functions. "paid" is set
    // automatically when a payment covers the total.
    const fn = { confirmed: 'invoice_confirm', cancelled: 'invoice_cancel' }[newStatus];
    if (!fn) throw new Error(`An invoice cannot be set to "${newStatus}" directly.`);
    const { data, error } = await supabase.rpc(fn, { invoice_id: id });
    if (error) {
      console.error('Error updating invoice status:', error);
      throw new Error(error.message);
    }
    return data;
  },

  // ==========================================
  // PAYMENT MANAGEMENT
  // ==========================================

  /**
   * Get paginated payments
   */
  async getPayments({ search = '', page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('payments')
      .select(`
        id, reference, amount, payment_date, method, note, created_at,
        invoice:invoices(
          id, number, total, amount_paid, status,
          customer:customers(id, name, email, company)
        )
      `, { count: 'exact' });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`reference.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
      limit,
    };
  },

  /**
   * Fetch confirmed/unpaid invoices for payment dropdown
   */
  async getUnpaidInvoices(customerId = null) {
    let query = supabase
      .from('invoices')
      .select('id, number, total, amount_paid, due_date, status, customer:customers(id, name, email, company)')
      .in('status', ['confirmed', 'draft'])
      .order('due_date', { ascending: true });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter to only those with positive outstanding balance
    return (data || []).filter(
      (inv) => Number(inv.total || 0) > Number(inv.amount_paid || 0)
    );
  },

  /**
   * Record a payment against an invoice
   */
  async recordPayment({ invoice_id, method, amount, payment_date, note, reference }) {
    const fullNote = [reference ? `Ref: ${reference}` : null, note || null].filter(Boolean).join(' | ') || null;
    const { data, error } = await supabase.rpc('record_payment', {
      invoice_id,
      method,
      amount: String(amount).trim(), // string so no float touches the amount
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      note: fullNote,
    });

    if (error) {
      console.error('Error recording payment via RPC:', error);
      throw new Error(error.message || 'Failed to record payment');
    }

    return data;
  },

  // ==========================================
  // CATALOG OPTIONS FOR FORMS
  // ==========================================

  /**
   * Fetch active catalog options for forms (plans, products, variants, taxes, payment terms, customers)
   */
  async getCatalogOptions() {
    const [plansRes, productsRes, taxesRes, termsRes, customersRes] = await Promise.all([
      supabase.from('plans').select('id, name, price, billing_period, closable, pausable, renewable').eq('is_active', true),
      supabase.from('products').select('id, name, sales_price, product_variants(id, attribute_name, value, extra_price)').eq('is_active', true),
      supabase.from('taxes').select('id, name, rate_type, rate').eq('is_active', true),
      supabase.from('payment_terms').select('id, name, days'),
      supabase.from('customers').select('id, name, email, company').order('name'),
    ]);

    return {
      plans: plansRes.data || [],
      products: productsRes.data || [],
      taxes: taxesRes.data || [],
      paymentTerms: termsRes.data || [],
      customers: customersRes.data || [],
    };
  },

  // ==========================================
  // STAFF PROFILE
  // ==========================================

  /**
   * Fetch current staff profile
   */
  async getStaffProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { ...data, email: user.email };
  },

  /**
   * Update staff full name
   */
  async updateStaffProfile({ full_name }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name.trim(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
