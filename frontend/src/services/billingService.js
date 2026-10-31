import { supabase } from '../lib/supabase';

// Subscriptions, invoices, payments and dashboard data for admin and staff.
// Contract: docs/API.md sections 6 and 7. Every write is an rpc; reads are paginated.
export const PAGE_SIZE = 25;

function fail(error) {
  const err = new Error(error?.message || 'Something went wrong');
  err.code = error?.code;
  throw err;
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) fail(error);
  return data;
}

function range(page) {
  return [page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1];
}

export const billingService = {
  // ---------- subscriptions ----------
  async listSubscriptions({ search = '', status = 'all', page = 0 }) {
    let q = supabase
      .from('subscriptions')
      .select(
        'id, number, status, start_date, expiry_date, next_billing_date, customer:customers(name, email), plan:plans(name, billing_period)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(...range(page));
    if (status !== 'all') q = q.eq('status', status);
    if (search.trim()) q = q.ilike('number', `%${search.trim()}%`);
    const { data, count, error } = await q;
    if (error) fail(error);
    return { rows: data ?? [], total: count ?? 0 };
  },

  async getSubscription(id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        `*, customer:customers(id, name, email, company), plan:plans(*), payment_term:payment_terms(name, days),
         template:quotation_templates(name),
         lines:subscription_lines(id, quantity, unit_price, amount, product:products(name),
           variant:product_variants(attribute_name, value), tax:taxes(name, rate_type, rate)),
         discounts:subscription_discounts(discount:discounts(id, name, type, value))`
      )
      .eq('id', id)
      .single();
    if (error) fail(error);
    return data;
  },

  async getStatusLog(id) {
    const { data, error } = await supabase
      .from('subscription_status_log')
      .select('id, from_status, to_status, changed_at, by:profiles(full_name, email)')
      .eq('subscription_id', id)
      .order('changed_at', { ascending: false });
    if (error) fail(error);
    return data ?? [];
  },

  transition: (subId, status) => rpc('transition_subscription', { sub_id: subId, new_status: status }),
  createFromTemplate: ({ templateId, customerId, startDate }) =>
    rpc('create_subscription_from_template', {
      p_template_id: templateId,
      p_customer_id: customerId,
      ...(startDate ? { p_start_date: startDate } : {}),
    }),
  attachDiscount: (subId, discountId) => rpc('attach_discount', { p_subscription_id: subId, p_discount_id: discountId }),

  async detachDiscount(subId, discountId) {
    const { data, error } = await supabase
      .from('subscription_discounts')
      .delete()
      .eq('subscription_id', subId)
      .eq('discount_id', discountId)
      .select();
    if (error) fail(error);
    if (!data?.length) fail({ message: 'You do not have permission to remove this discount.' });
  },

  async templateOptions() {
    const { data, error } = await supabase.from('quotation_templates').select('id, name').order('name').limit(500);
    if (error) fail(error);
    return data ?? [];
  },
  async customerOptions() {
    const { data, error } = await supabase.from('customers').select('id, name, email').order('name').limit(500);
    if (error) fail(error);
    return data ?? [];
  },
  async subscriptionDiscountOptions() {
    const { data, error } = await supabase
      .from('discounts')
      .select('id, name, type, value')
      .eq('applies_to', 'subscription')
      .eq('is_active', true)
      .order('name');
    if (error) fail(error);
    return data ?? [];
  },

  // ---------- invoices ----------
  async listInvoices({ search = '', status = 'all', overdueOnly = false, page = 0 }) {
    let q = supabase
      .from('v_invoice_summary')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(...range(page));
    if (status !== 'all') q = q.eq('status', status);
    if (overdueOnly) q = q.eq('is_overdue', true);
    if (search.trim()) {
      const s = search.trim().replace(/[,()]/g, ' ');
      q = q.or(`number.ilike.%${s}%,customer_name.ilike.%${s}%`);
    }
    const { data, count, error } = await q;
    if (error) fail(error);
    return { rows: data ?? [], total: count ?? 0 };
  },

  async invoicesOfSubscription(subId) {
    const { data, error } = await supabase
      .from('v_invoice_summary')
      .select('id, number, status, period_start, period_end, due_date, total, amount_paid, outstanding, is_overdue')
      .eq('subscription_id', subId)
      .order('period_start', { ascending: false });
    if (error) fail(error);
    return data ?? [];
  },

  async getInvoice(id) {
    const [inv, lines, payments] = await Promise.all([
      supabase.from('v_invoice_summary').select('*').eq('id', id).single(),
      supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('kind'),
      supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date', { ascending: false }),
    ]);
    if (inv.error) fail(inv.error);
    if (lines.error) fail(lines.error);
    if (payments.error) fail(payments.error);
    return { ...inv.data, lines: lines.data ?? [], payments: payments.data ?? [] };
  },

  confirmInvoice: (id) => rpc('invoice_confirm', { invoice_id: id }),
  cancelInvoice: (id) => rpc('invoice_cancel', { invoice_id: id }),
  sendInvoice: (id) => rpc('invoice_send', { invoice_id: id }),
  recordPayment: ({ invoiceId, method, amount, paymentDate, note }) =>
    rpc('record_payment', {
      invoice_id: invoiceId,
      method,
      amount, // string, so no float touches the amount
      ...(paymentDate ? { payment_date: paymentDate } : {}),
      note: note?.trim() || null,
    }),

  async runBilling() {
    const data = await rpc('run_billing');
    return data?.[0] ?? { created: 0, skipped: 0, errors: 0 };
  },

  // ---------- payments ----------
  async listPayments({ search = '', page = 0 }) {
    let q = supabase
      .from('payments')
      .select('id, method, amount, payment_date, note, invoice:invoices(id, number, customer:customers(name))', { count: 'exact' })
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(...range(page));
    if (search.trim()) q = q.ilike('note', `%${search.trim()}%`);
    const { data, count, error } = await q;
    if (error) fail(error);
    return { rows: data ?? [], total: count ?? 0 };
  },

  async listOutstanding({ page = 0 }) {
    const { data, count, error } = await supabase
      .from('v_invoice_summary')
      .select('*', { count: 'exact' })
      .eq('status', 'confirmed')
      .gt('outstanding', 0)
      .order('due_date', { ascending: true })
      .range(...range(page));
    if (error) fail(error);
    return { rows: data ?? [], total: count ?? 0 };
  },

  async listOverdue({ page = 0 }) {
    const { data, count, error } = await supabase
      .from('v_overdue_invoices')
      .select('*', { count: 'exact' })
      .order('days_overdue', { ascending: false })
      .range(...range(page));
    if (error) fail(error);
    return { rows: data ?? [], total: count ?? 0 };
  },

  // ---------- dashboard ----------
  async dashboard() {
    const [summary, overdue] = await Promise.all([
      supabase.from('v_dashboard_summary').select('*').single(),
      supabase.from('v_overdue_invoices').select('*').order('days_overdue', { ascending: false }).limit(8),
    ]);
    if (summary.error) fail(summary.error);
    if (overdue.error) fail(overdue.error);
    return { summary: summary.data, overdue: overdue.data ?? [] };
  },
};
