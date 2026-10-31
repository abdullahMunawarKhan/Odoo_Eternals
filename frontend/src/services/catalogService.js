import { supabase } from '../lib/supabase';

// Catalog data access. Contract: docs/API.md section 5. Admin writes, staff read only;
// all lists are paginated and filtered server-side.
export const PAGE_SIZE = 25;

const CONSTRAINT_MESSAGES = {
  taxes_rate_nonneg: 'Tax rate cannot be negative.',
  taxes_percent_max: 'A percentage tax cannot be more than 100.',
  payment_terms_days_nonneg: 'Days cannot be negative.',
  products_sales_price_nonneg: 'Sales price cannot be negative.',
  products_cost_price_nonneg: 'Cost price cannot be negative.',
  product_variants_extra_price_nonneg: 'Extra price cannot be negative.',
  product_variants_unique: 'This product already has a variant with that attribute and value.',
  plans_price_nonneg: 'Plan price cannot be negative.',
  plans_min_quantity_positive: 'Minimum quantity must be at least 1.',
  plans_window_order: '"Available from" must be on or before "Available to".',
  discounts_value_positive: 'Discount value must be greater than 0.',
  discounts_percent_max: 'A percentage discount cannot be more than 100.',
  discounts_product_required: 'Choose a product for a product-level discount.',
  discounts_dates_order: 'The end date must be on or after the start date.',
  discounts_usage_limit_positive: 'Usage limit must be greater than 0 (leave empty for unlimited).',
  discounts_min_purchase_nonneg: 'Minimum purchase cannot be negative.',
  discounts_min_quantity_nonneg: 'Minimum quantity cannot be negative.',
  quotation_templates_validity_positive: 'Validity must be at least 1 day.',
  quotation_template_lines_quantity_positive: 'Quantity must be at least 1.',
};

export function friendlyError(error) {
  if (!error) return 'Something went wrong.';
  const { code, message = '' } = error;
  if (code === '42501') return 'You do not have permission to change the catalog. Only admins can edit it.';
  if (code === '23505') return 'That already exists (duplicate value).';
  if (code === '23503') {
    return 'This record is used elsewhere and cannot be deleted. Mark it inactive instead.';
  }
  if (code === '23514') {
    const name = Object.keys(CONSTRAINT_MESSAGES).find((c) => message.includes(c));
    return name ? CONSTRAINT_MESSAGES[name] : 'A value is outside the allowed range.';
  }
  if (code === 'P0002' || code === '22023') return message;
  return message || 'Something went wrong.';
}

function fail(error) {
  const err = new Error(friendlyError(error));
  err.code = error.code;
  throw err;
}

export const catalogService = {
  async list({ table, select = '*', search = '', searchColumn = 'name', page = 0, orderBy = 'created_at', ascending = false }) {
    let query = supabase
      .from(table)
      .select(select, { count: 'exact' })
      .order(orderBy, { ascending })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (search.trim()) query = query.ilike(searchColumn, `%${search.trim()}%`);
    const { data, count, error } = await query;
    if (error) fail(error);
    return { rows: data ?? [], total: count ?? 0 };
  },

  // Small lookup lists for dropdowns (taxes, plans, products...).
  async options(table, columns = 'id, name') {
    const { data, error } = await supabase.from(table).select(columns).order('name').limit(500);
    if (error) fail(error);
    return data ?? [];
  },

  async create(table, payload) {
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) fail(error);
    return data;
  },

  // An RLS-blocked update or delete returns zero rows without an error, so check for that.
  async update(table, id, payload) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
    if (error) fail(error);
    if (!data?.length) fail({ code: '42501' });
    return data[0];
  },

  async remove(table, id) {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select();
    if (error) fail(error);
    if (!data?.length) fail({ code: '42501' });
  },

  // Variants and template lines (children of a product / template).
  async children(table, column, parentId, select = '*') {
    const { data, error } = await supabase.from(table).select(select).eq(column, parentId).order('created_at');
    if (error) fail(error);
    return data ?? [];
  },

  // Effective price comes from the database: sales_price + variant extra_price.
  async effectivePrice(productId, variantId = null) {
    const { data, error } = await supabase.rpc('effective_price', {
      p_product_id: productId,
      p_variant_id: variantId,
    });
    if (error) fail(error);
    return data;
  },
};
