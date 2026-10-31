import React from 'react';
import { Package, CalendarCheck, Percent, Landmark, Ticket, FileText } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { formatMoney } from '../../../utils/money';
import { formatShortDate } from '../../../utils/formatters';
import { VariantsEditor } from './VariantsEditor';
import { TemplateLinesEditor } from './TemplateLinesEditor';

// Config for each catalog screen. Columns, fields and constraints mirror docs/API.md section 5.

const Active = ({ value }) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge>;
const today = () => new Date().toISOString().slice(0, 10);

export const productsConfig = {
  title: 'Products',
  singular: 'Product',
  icon: Package,
  table: 'products',
  select: '*, tax:taxes(name), variants:product_variants(id, attribute_name, value, extra_price)',
  emptyText: 'Add your first product, then offer it in variants such as brands.',
  formHint: 'Cost price is visible to admin and staff only, never to customers.',
  lookups: { taxes: { table: 'taxes' } },
  defaults: { type: 'software', sales_price: '0', cost_price: '0', is_active: true },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'select', required: true, options: [
      { value: 'service', label: 'Service' }, { value: 'goods', label: 'Goods' }, { value: 'software', label: 'Software' },
    ] },
    { name: 'sales_price', label: 'Sales price', type: 'number', money: true, min: 0, required: true },
    { name: 'cost_price', label: 'Cost price', type: 'number', money: true, min: 0, helperText: 'Used for margin on the dashboard.' },
    { name: 'tax_id', label: 'Tax', type: 'select', lookup: 'taxes', placeholder: 'No tax' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'is_active', label: 'Active', type: 'checkbox', helperText: 'Inactive products are hidden from customers.' },
  ],
  columns: [
    { label: 'Product', render: (r) => (<div><div className="font-medium text-slate-900">{r.name}</div>{r.notes && <div className="text-xs text-slate-500 truncate max-w-xs">{r.notes}</div>}</div>) },
    { label: 'Type', render: (r) => <Badge variant="primary" className="capitalize">{r.type}</Badge> },
    { label: 'Sales price', render: (r) => formatMoney(r.sales_price) },
    { label: 'Cost price', render: (r) => formatMoney(r.cost_price) },
    { label: 'Tax', render: (r) => r.tax?.name ?? '—' },
    { label: 'Variants', render: (r) => (r.variants?.length ? (
      <div className="flex flex-wrap gap-1">{r.variants.map((v) => <Badge key={v.id} variant="info">{v.value} +{formatMoney(v.extra_price)}</Badge>)}</div>
    ) : '—') },
    { label: 'Status', render: (r) => <Active value={r.is_active} /> },
  ],
  Extras: VariantsEditor,
};

const FLAGS = [
  ['auto_close', 'Auto-close', 'Closes on its own when the subscription expires.'],
  ['closable', 'Closable', 'Can be closed early.'],
  ['pausable', 'Pausable', 'Can be paused and resumed. Billing skips paused subscriptions.'],
  ['renewable', 'Renewable', 'Can be renewed for another term.'],
];

export const plansConfig = {
  title: 'Plans',
  singular: 'Plan',
  icon: CalendarCheck,
  table: 'plans',
  select: '*, tax:taxes(name)',
  emptyText: 'Create a plan to say what it costs, how often it bills and which actions customers get.',
  formHint: 'The four flags decide which actions exist for subscriptions on this plan.',
  lookups: { taxes: { table: 'taxes' } },
  defaults: { billing_period: 'monthly', price: '0', min_quantity: '1', auto_close: false, closable: false, pausable: false, renewable: false, is_active: true },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'billing_period', label: 'Billing period', type: 'select', required: true, options: [
      { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' },
    ] },
    { name: 'price', label: 'Recurring fee', type: 'number', money: true, min: 0, helperText: 'Can be 0 when only products are billed.' },
    { name: 'min_quantity', label: 'Minimum quantity', type: 'number', min: 1, step: 1, required: true },
    { name: 'available_from', label: 'Available from', type: 'date', helperText: 'Leave empty for no start limit.' },
    { name: 'available_to', label: 'Available to', type: 'date', helperText: 'Leave empty for no end limit.' },
    { name: 'tax_id', label: 'Tax', type: 'select', lookup: 'taxes', placeholder: 'No tax' },
    ...FLAGS.map(([name, label, helperText]) => ({ name, label, type: 'checkbox', helperText })),
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  columns: [
    { label: 'Plan', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { label: 'Billing', render: (r) => <Badge variant="primary" className="capitalize">{r.billing_period}</Badge> },
    { label: 'Fee', render: (r) => formatMoney(r.price) },
    { label: 'Min qty', render: (r) => r.min_quantity },
    { label: 'Available', render: (r) => (r.available_from || r.available_to ? `${r.available_from ? formatShortDate(r.available_from) : 'Any time'} to ${r.available_to ? formatShortDate(r.available_to) : 'open'}` : 'Always') },
    { label: 'Flags', render: (r) => {
      const on = FLAGS.filter(([n]) => r[n]);
      return on.length ? <div className="flex flex-wrap gap-1">{on.map(([n, l]) => <Badge key={n} variant="info">{l}</Badge>)}</div> : '—';
    } },
    { label: 'Status', render: (r) => <Active value={r.is_active} /> },
  ],
};

export const taxesConfig = {
  title: 'Taxes',
  singular: 'Tax',
  icon: Percent,
  table: 'taxes',
  select: '*',
  emptyText: 'Add the tax rules products and plans can use.',
  defaults: { rate_type: 'percent', rate: '0', is_active: true },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'rate_type', label: 'Rate type', type: 'select', required: true, options: [
      { value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed amount' },
    ] },
    { name: 'rate', label: 'Rate', type: 'number', money: true, min: 0, required: true, helperText: 'A percentage cannot be more than 100.' },
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  columns: [
    { label: 'Tax', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { label: 'Rate', render: (r) => (r.rate_type === 'percent' ? `${Number(r.rate)}%` : `${formatMoney(r.rate)} fixed`) },
    { label: 'Status', render: (r) => <Active value={r.is_active} /> },
  ],
};

export const paymentTermsConfig = {
  title: 'Payment terms',
  singular: 'Payment term',
  icon: Landmark,
  table: 'payment_terms',
  select: '*',
  emptyText: 'Add terms such as Immediate, Net 15 or Net 30.',
  defaults: { days: '0' },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'days', label: 'Days until due', type: 'number', min: 0, step: 1, required: true },
  ],
  columns: [
    { label: 'Term', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { label: 'Due after', render: (r) => (r.days === 0 ? 'Immediately' : `${r.days} days`) },
  ],
};

export const discountsConfig = {
  title: 'Discounts',
  singular: 'Discount',
  icon: Ticket,
  table: 'discounts',
  select: '*, product:products(name)',
  emptyText: 'Create a discount rule. Matching discounts appear on the next invoice by themselves.',
  formHint: 'Eligibility (dates, usage limit, minimums) is checked when an invoice is generated.',
  lookups: { products: { table: 'products' } },
  defaults: { type: 'percent', applies_to: 'subscription', min_purchase: '0', min_quantity: '0', is_active: true },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'select', required: true, options: [
      { value: 'percent', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount' },
    ] },
    { name: 'value', label: 'Value', type: 'number', money: true, min: 0, required: true, helperText: 'Greater than 0. A percentage cannot be more than 100.' },
    { name: 'applies_to', label: 'Applies to', type: 'select', required: true, options: [
      { value: 'product', label: 'A specific product' }, { value: 'subscription', label: 'Whole subscriptions' },
    ] },
    { name: 'product_id', label: 'Product', type: 'select', lookup: 'products', required: true, showWhen: (v) => v.applies_to === 'product' },
    { name: 'min_purchase', label: 'Minimum purchase', type: 'number', money: true, min: 0 },
    { name: 'min_quantity', label: 'Minimum quantity', type: 'number', min: 0, step: 1 },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'end_date', label: 'End date', type: 'date' },
    { name: 'usage_limit', label: 'Usage limit', type: 'number', min: 1, step: 1, nullable: true, helperText: 'Leave empty for unlimited.' },
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  columns: [
    { label: 'Discount', render: (r) => (<div><div className="font-medium text-slate-900">{r.name}</div><div className="text-xs text-slate-500">{r.applies_to === 'product' ? (r.product?.name ?? 'Product') : 'Whole subscription'}</div></div>) },
    { label: 'Value', render: (r) => (r.type === 'percent' ? `${Number(r.value)}%` : formatMoney(r.value)) },
    { label: 'Minimums', render: (r) => (Number(r.min_purchase) > 0 || r.min_quantity > 0 ? `${Number(r.min_purchase) > 0 ? formatMoney(r.min_purchase) : ''}${Number(r.min_purchase) > 0 && r.min_quantity > 0 ? ' / ' : ''}${r.min_quantity > 0 ? `qty ${r.min_quantity}` : ''}` : '—') },
    { label: 'Valid', render: (r) => (r.start_date || r.end_date ? `${r.start_date ? formatShortDate(r.start_date) : 'Any time'} to ${r.end_date ? formatShortDate(r.end_date) : 'open'}` : 'Always') },
    { label: 'Used', render: (r) => `${r.times_used} / ${r.usage_limit ?? '∞'}` },
    { label: 'Status', render: (r) => {
      if (!r.is_active) return <Badge>Inactive</Badge>;
      if (r.end_date && r.end_date < today()) return <Badge variant="danger">Expired</Badge>;
      if (r.usage_limit && r.times_used >= r.usage_limit) return <Badge variant="warning">Used up</Badge>;
      return <Badge variant="success">Active</Badge>;
    } },
  ],
};

export const templatesConfig = {
  title: 'Quotation templates',
  singular: 'Template',
  icon: FileText,
  table: 'quotation_templates',
  select: '*, plan:plans(name), term:payment_terms(name), lines:quotation_template_lines(count)',
  emptyText: 'Create a template so sales can start a quotation with the right plan and lines.',
  formHint: 'Save the template, then add its product lines.',
  lookups: { plans: { table: 'plans' }, terms: { table: 'payment_terms' } },
  defaults: { validity_days: '30' },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'plan_id', label: 'Plan', type: 'select', lookup: 'plans', required: true },
    { name: 'validity_days', label: 'Valid for (days)', type: 'number', min: 1, step: 1, required: true },
    { name: 'payment_term_id', label: 'Payment term', type: 'select', lookup: 'terms', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Template', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { label: 'Plan', render: (r) => r.plan?.name ?? '—' },
    { label: 'Valid for', render: (r) => `${r.validity_days} days` },
    { label: 'Payment term', render: (r) => r.term?.name ?? '—' },
    { label: 'Lines', render: (r) => r.lines?.[0]?.count ?? 0 },
  ],
  Extras: TemplateLinesEditor,
};
