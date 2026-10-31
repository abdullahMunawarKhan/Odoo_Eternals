import { supabase } from '../lib/supabase';

export const customerService = {
  /**
   * Resolves the customer row associated with the current user
   */
  async getCurrentCustomer() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check with user_id first (SPEC 3.1)
    let { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data && !error) {
      // Fallback check with profile_id if present
      const fallback = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (fallback.data) data = fallback.data;
    }

    return data;
  },

  /**
   * Fetch live metrics and summaries for Customer Overview Dashboard
   */
  async getOverviewData() {
    const customer = await this.getCurrentCustomer();
    if (!customer) {
      return {
        metrics: {
          activeSubscriptionsCount: 0,
          upcomingBillingAmount: 0,
          outstandingInvoiceAmount: 0,
          totalPaymentsMade: 0,
        },
        recentSubscriptions: [],
        recentInvoices: [],
        customer: null,
      };
    }

    // 1. Fetch Subscriptions for this customer
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, number, status, start_date, expiry_date, next_billing_date, plan:plans(name, price, billing_period)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    // 2. Fetch Invoices for this customer
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, number, status, issue_date, due_date, subtotal, tax_total, discount_total, total, amount_paid, subscription:subscriptions(number)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    // 3. Fetch Payments for this customer's invoices
    let totalPayments = 0;
    const invIds = (invoices || []).map((i) => i.id);
    if (invIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .in('invoice_id', invIds);
      totalPayments = (payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
    }

    // Calculate metrics
    const activeSubs = (subscriptions || []).filter((s) => s.status === 'active');
    const activeSubsCount = activeSubs.length;

    // Upcoming billing: active subscriptions with next_billing_date
    const upcomingBilling = activeSubs.reduce((acc, sub) => {
      const price = Number(sub.plan?.price || 0);
      return acc + price;
    }, 0);

    // Outstanding invoices: confirmed invoices where amount_paid < total
    const outstandingAmount = (invoices || [])
      .filter((inv) => inv.status === 'confirmed' || (inv.status !== 'cancelled' && inv.status !== 'paid'))
      .reduce((acc, inv) => {
        const total = Number(inv.total || 0);
        const paid = Number(inv.amount_paid || 0);
        return acc + Math.max(0, total - paid);
      }, 0);

    return {
      metrics: {
        activeSubscriptionsCount: activeSubsCount,
        upcomingBillingAmount: upcomingBilling,
        outstandingInvoiceAmount: outstandingAmount,
        totalPaymentsMade: totalPayments,
      },
      recentSubscriptions: (subscriptions || []).slice(0, 5),
      recentInvoices: (invoices || []).slice(0, 5),
      customer,
    };
  },

  /**
   * Fetch paginated list of subscriptions with filtering and search
   */
  async getSubscriptions({ status = 'all', search = '', page = 1, pageSize = 10 } = {}) {
    const customer = await this.getCurrentCustomer();
    if (!customer) return { data: [], total: 0, page, totalPages: 0 };

    let query = supabase
      .from('subscriptions')
      .select('id, number, status, start_date, expiry_date, next_billing_date, notes, created_at, plan:plans(id, name, price, billing_period, closable, pausable, renewable)', { count: 'exact' })
      .eq('customer_id', customer.id);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      query = query.ilike('number', `%${search.trim()}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch detailed subscription record by ID
   */
  async getSubscriptionById(id) {
    if (!id) return null;
    const customer = await this.getCurrentCustomer();
    if (!customer) throw new Error('Customer account not found');

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id, number, status, start_date, expiry_date, next_billing_date, quotation_valid_until, notes, created_at,
        plan:plans(*),
        payment_term:payment_terms(name, days),
        subscription_lines(
          id, quantity, unit_price, amount,
          product:products(id, name, type),
          variant:product_variants(id, attribute_name, value, extra_price),
          tax:taxes(name, rate, rate_type)
        )
      `)
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single();

    if (subError) {
      console.error('Error fetching subscription details:', subError);
      throw subError;
    }

    // Fetch related invoices for this subscription
    const { data: relatedInvoices } = await supabase
      .from('invoices')
      .select('id, number, status, issue_date, due_date, total, amount_paid')
      .eq('subscription_id', id)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    return {
      ...sub,
      relatedInvoices: relatedInvoices || [],
    };
  },

  /**
   * Transition a subscription status (pause, resume, close, renew) via secure database function
   */
  async transitionSubscription(subId, newStatus) {
    const { data, error } = await supabase.rpc('transition_subscription', {
      sub_id: subId,
      new_status: newStatus,
    });

    if (error) {
      console.error('Error executing transition_subscription:', error);
      throw error;
    }
    return data;
  },

  /**
   * Fetch paginated list of invoices with filtering and search
   */
  async getInvoices({ status = 'all', search = '', page = 1, pageSize = 10 } = {}) {
    const customer = await this.getCurrentCustomer();
    if (!customer) return { data: [], total: 0, page, totalPages: 0 };

    let query = supabase
      .from('invoices')
      .select(`
        id, number, status, issue_date, due_date, subtotal, tax_total, discount_total, total, amount_paid, created_at,
        subscription:subscriptions(id, number)
      `, { count: 'exact' })
      .eq('customer_id', customer.id);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      query = query.ilike('number', `%${search.trim()}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('issue_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch invoice details by ID
   */
  async getInvoiceById(id) {
    if (!id) return null;
    const customer = await this.getCurrentCustomer();
    if (!customer) throw new Error('Customer account not found');

    const { data: inv, error: invError } = await supabase
      .from('invoices')
      .select(`
        id, number, status, period_start, period_end, issue_date, due_date, subtotal, tax_total, discount_total, total, amount_paid, sent_at, created_at,
        subscription:subscriptions(id, number, start_date, expiry_date),
        invoice_lines(
          id, kind, description, quantity, unit_price, base_amount, discount_amount, tax_amount, line_total,
          tax:taxes(name, rate)
        ),
        payments(id, method, amount, payment_date, note)
      `)
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single();

    if (invError) {
      console.error('Error fetching invoice details:', invError);
      throw invError;
    }

    return {
      ...inv,
      customer,
    };
  },

  /**
   * Fetch payment history for the authenticated customer
   */
  async getPaymentHistory({ search = '', page = 1, pageSize = 10 } = {}) {
    const customer = await this.getCurrentCustomer();
    if (!customer) return { data: [], total: 0, page, totalPages: 0 };

    // Get all customer invoice IDs first to query payments securely
    const { data: customerInvoices } = await supabase
      .from('invoices')
      .select('id, number, status, total, amount_paid')
      .eq('customer_id', customer.id);

    const invMap = new Map();
    (customerInvoices || []).forEach((inv) => {
      invMap.set(inv.id, inv);
    });

    const invoiceIds = Array.from(invMap.keys());
    if (invoiceIds.length === 0) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .in('invoice_id', invoiceIds);

    if (search.trim()) {
      query = query.ilike('note', `%${search.trim()}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('payment_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }

    // Attach related invoice info
    const enrichedPayments = (data || []).map((p) => ({
      ...p,
      invoice: invMap.get(p.invoice_id) || null,
    }));

    return {
      data: enrichedPayments,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Update customer profile contact and company info safely
   */
  async updateCustomerProfile({ name, phone, company, address }) {
    const customer = await this.getCurrentCustomer();
    if (!customer) throw new Error('Customer account not found');

    const updatePayload = {
      phone: phone?.trim() || null,
      address: address?.trim() || null,
    };

    if (name?.trim()) updatePayload.name = name.trim();
    if (company !== undefined) {
      updatePayload.company = company?.trim() || null;
      // also set company_name if column exists
      updatePayload.company_name = company?.trim() || null;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', customer.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer profile:', error);
      throw error;
    }
    return data;
  },
};
