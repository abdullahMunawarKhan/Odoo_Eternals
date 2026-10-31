// Part 2 (catalog) backend tests. Run: node scripts/tests/part2.mjs
// Needs .env.test and the catalog seed (supabase/seed/catalog.sql) loaded.
// The service-role key is used ONLY for setup and cleanup. Cleanup deletes only rows
// whose name starts with this run's prefix, never seed data.
import { createClient } from '@supabase/supabase-js'

try {
  process.loadEnvFile(new URL('../../.env.test', import.meta.url))
} catch {
  console.error('Missing .env.test (copy .env.test.example and fill it in).')
  process.exit(1)
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opts)
const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts)

const run = Math.random().toString(36).slice(2, 10)
const P = `T2-${run}` // name prefix for every test row
const emailFor = (tag) => `test+${tag}-${run}@example.com`.toLowerCase()
const PASSWORD = 'Str0ng!Pass1'
const createdUserIds = []
const results = []

const CATALOG_TABLES = [
  'taxes', 'payment_terms', 'products', 'product_variants', 'plans',
  'discounts', 'quotation_templates', 'quotation_template_lines',
]

async function check(name, fn) {
  try {
    await fn()
    results.push({ test: name, result: 'PASS', detail: '' })
  } catch (e) {
    results.push({ test: name, result: 'FAIL', detail: e.message })
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const day = (offset) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

async function makeUser(tag, role) {
  const email = emailFor(tag)
  const { data, error } = await service.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `Test ${tag}` },
  })
  if (error) throw new Error(`createUser ${tag}: ${error.message}`)
  createdUserIds.push(data.user.id)
  if (role !== 'customer') {
    const { error: e } = await service.from('profiles').update({ role }).eq('id', data.user.id)
    if (e) throw new Error(`promote ${tag}: ${e.message}`)
  }
  const client = anon()
  const { error: le } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (le) throw new Error(`login ${tag}: ${le.message}`)
  return client
}

// Insert via a given client; returns the inserted row or throws on error.
async function insert(client, table, row) {
  const { data, error } = await client.from(table).insert(row).select().single()
  if (error) throw new Error(`insert ${table}: ${error.message}`)
  return data
}

// A write that must be rejected by a CHECK / UNIQUE constraint (admin passes RLS, so the
// rejection comes from the constraint).
async function expectConstraint(client, table, row, code, label) {
  const { error } = await client.from(table).insert(row)
  assert(error, `${label}: bad row was accepted`)
  assert(error.code === code, `${label}: expected ${code}, got ${error.code} (${error.message})`)
}

async function main() {
  const admin = await makeUser('admin', 'admin')
  const staff = await makeUser('staff', 'staff')
  const customer = await makeUser('cust', 'customer')

  // ---- seed present (needed for the Odoo test) ----
  const { data: erp } = await service.from('products').select('id, sales_price, cost_price').eq('name', 'ERP Suite').maybeSingle()
  const { data: odoo } = erp
    ? await service.from('product_variants').select('id, extra_price').eq('product_id', erp.id).eq('value', 'Odoo').maybeSingle()
    : { data: null }

  await check('seed data is loaded (ERP Suite with Odoo +560)', async () => {
    assert(erp, 'ERP Suite missing: run supabase/seed/catalog.sql first')
    assert(odoo && Number(odoo.extra_price) === 560, 'Odoo variant missing or not +560')
  })

  // ---- admin CRUD ----
  const t = {} // created rows by kind
  await check('admin can create tax, term, product, variant, plan, discount, template, line', async () => {
    t.tax = await insert(admin, 'taxes', { name: `${P} tax`, rate_type: 'percent', rate: 12 })
    t.term = await insert(admin, 'payment_terms', { name: `${P} term`, days: 7 })
    t.product = await insert(admin, 'products', {
      name: `${P} product`, type: 'software', sales_price: 1000, cost_price: 400, notes: 'secret note', tax_id: t.tax.id,
    })
    t.variant = await insert(admin, 'product_variants', { product_id: t.product.id, value: `${P}-brand`, extra_price: 25 })
    t.plan = await insert(admin, 'plans', {
      name: `${P} plan`, price: 100, billing_period: 'monthly', min_quantity: 2,
      available_from: day(-10), available_to: day(10), tax_id: t.tax.id,
      auto_close: true, closable: true, pausable: false, renewable: true,
    })
    t.discount = await insert(admin, 'discounts', {
      name: `${P} discount`, type: 'percent', value: 10, applies_to: 'product', product_id: t.product.id,
    })
    t.template = await insert(admin, 'quotation_templates', {
      name: `${P} template`, plan_id: t.plan.id, validity_days: 14, payment_term_id: t.term.id,
    })
    t.line = await insert(admin, 'quotation_template_lines', {
      template_id: t.template.id, product_id: t.product.id, variant_id: t.variant.id, quantity: 3,
    })
    assert(t.variant.attribute_name === 'Brand', 'variant attribute_name default should be Brand')
  })

  await check('admin can update each entity', async () => {
    const updates = [
      ['taxes', t.tax.id, { rate: 13 }],
      ['payment_terms', t.term.id, { days: 8 }],
      ['products', t.product.id, { sales_price: 1100 }],
      ['product_variants', t.variant.id, { extra_price: 30 }],
      ['plans', t.plan.id, { price: 120 }],
      ['discounts', t.discount.id, { value: 12 }],
      ['quotation_templates', t.template.id, { validity_days: 15 }],
      ['quotation_template_lines', t.line.id, { quantity: 4 }],
    ]
    for (const [table, id, patch] of updates) {
      const { data, error } = await admin.from(table).update(patch).eq('id', id).select()
      assert(!error && data.length === 1, `${table} update: ${error?.message ?? 'no row updated'}`)
    }
    t.product.sales_price = 1100
    t.variant.extra_price = 30
  })

  // ---- staff: read only ----
  await check('staff can read every catalog table', async () => {
    for (const table of CATALOG_TABLES) {
      const { data, error } = await staff.from(table).select('id').limit(1)
      assert(!error && data.length === 1, `${table}: ${error?.message ?? 'no rows visible'}`)
    }
    const { data } = await staff.from('products').select('cost_price').eq('id', t.product.id).single()
    assert(Number(data.cost_price) === 400, 'staff cannot read cost_price')
  })

  await check('staff writes are rejected on every catalog table', async () => {
    const rows = {
      taxes: { name: `${P} s-tax`, rate_type: 'percent', rate: 1 },
      payment_terms: { name: `${P} s-term`, days: 1 },
      products: { name: `${P} s-product`, type: 'goods', sales_price: 1 },
      product_variants: { product_id: t.product.id, value: `${P}-s`, extra_price: 0 },
      plans: { name: `${P} s-plan`, billing_period: 'daily' },
      discounts: { name: `${P} s-disc`, type: 'fixed', value: 1, applies_to: 'subscription' },
      quotation_templates: { name: `${P} s-tpl`, plan_id: t.plan.id, validity_days: 1, payment_term_id: t.term.id },
      quotation_template_lines: { template_id: t.template.id, product_id: t.product.id, quantity: 1 },
    }
    for (const table of CATALOG_TABLES) {
      const ins = await staff.from(table).insert(rows[table])
      assert(ins.error, `${table}: staff insert was accepted`)
      const upd = await staff.from(table).update({ created_at: '2000-01-01' }).eq('id', t[{
        taxes: 'tax', payment_terms: 'term', products: 'product', product_variants: 'variant', plans: 'plan',
        discounts: 'discount', quotation_templates: 'template', quotation_template_lines: 'line',
      }[table]].id).select()
      assert(upd.error || upd.data.length === 0, `${table}: staff update changed a row`)
      const del = await staff.from(table).delete().eq('id', t[{
        taxes: 'tax', payment_terms: 'term', products: 'product', product_variants: 'variant', plans: 'plan',
        discounts: 'discount', quotation_templates: 'template', quotation_template_lines: 'line',
      }[table]].id).select()
      assert(del.error || del.data.length === 0, `${table}: staff delete removed a row`)
    }
    const { data } = await service.from('products').select('sales_price').eq('id', t.product.id).single()
    assert(Number(data.sales_price) === 1100, 'product changed by staff')
  })

  // ---- customer: no tables, views only ----
  await check('customer cannot read any catalog table', async () => {
    for (const table of CATALOG_TABLES) {
      const { data, error } = await customer.from(table).select('id')
      assert(error || data.length === 0, `${table}: customer saw ${data?.length} rows`)
    }
  })

  await check('customer cannot write any catalog table', async () => {
    const { error } = await customer.from('products').insert({ name: `${P} c-product`, type: 'goods', sales_price: 1 })
    assert(error, 'customer insert was accepted')
    const upd = await customer.from('products').update({ sales_price: 1 }).eq('id', t.product.id).select()
    assert(upd.error || upd.data.length === 0, 'customer update changed a row')
  })

  await check('customer can read the three public views', async () => {
    const p = await customer.from('products_public').select('*').eq('id', t.product.id)
    const v = await customer.from('variants_public').select('*').eq('id', t.variant.id)
    const pl = await customer.from('plans_public').select('*').eq('id', t.plan.id)
    assert(!p.error && p.data.length === 1, `products_public: ${p.error?.message ?? p.data.length}`)
    assert(!v.error && v.data.length === 1, `variants_public: ${v.error?.message ?? v.data.length}`)
    assert(!pl.error && pl.data.length === 1, `plans_public: ${pl.error?.message ?? pl.data.length}`)
  })

  await check('public views expose only the allowed columns (no cost_price)', async () => {
    const expected = {
      products_public: ['id', 'name', 'type'],
      variants_public: ['id', 'product_id', 'attribute_name', 'value'],
      plans_public: ['id', 'name', 'billing_period', 'price', 'min_quantity', 'closable', 'pausable', 'renewable', 'auto_close'],
    }
    for (const [view, cols] of Object.entries(expected)) {
      const { data, error } = await customer.from(view).select('*').limit(1)
      assert(!error && data.length === 1, `${view}: ${error?.message ?? 'empty'}`)
      assert(JSON.stringify(Object.keys(data[0]).sort()) === JSON.stringify([...cols].sort()),
        `${view} columns: ${Object.keys(data[0]).join(',')}`)
      assert(!JSON.stringify(data).includes('cost_price'), `${view} leaks cost_price`)
    }
    const bad = await customer.from('products_public').select('cost_price')
    assert(bad.error, 'selecting cost_price from products_public should fail')
    const bad2 = await customer.from('products_public').select('sales_price,notes')
    assert(bad2.error, 'selecting sales_price/notes from products_public should fail')
  })

  await check('public views hide inactive rows', async () => {
    const inactive = await insert(admin, 'products', { name: `${P} inactive`, type: 'goods', sales_price: 1, is_active: false })
    const { data } = await customer.from('products_public').select('id').eq('id', inactive.id)
    assert(data.length === 0, 'inactive product visible in products_public')
  })

  await check('anon cannot read catalog tables or views', async () => {
    for (const rel of [...CATALOG_TABLES, 'products_public', 'variants_public', 'plans_public']) {
      const { data, error } = await anon().from(rel).select('*').limit(1)
      assert(error || data.length === 0, `anon read ${rel}`)
    }
  })

  // ---- effective_price ----
  await check('effective_price: Odoo variant = sales_price + 560', async () => {
    assert(erp && odoo, 'seed missing')
    const { data, error } = await admin.rpc('effective_price', { p_product_id: erp.id, p_variant_id: odoo.id })
    assert(!error, error?.message)
    const expected = (Number(erp.sales_price) + 560).toFixed(2)
    assert(Number(data).toFixed(2) === expected, `got ${data}, expected ${expected}`)
    const s = await staff.rpc('effective_price', { p_product_id: erp.id, p_variant_id: odoo.id })
    assert(!s.error && Number(s.data).toFixed(2) === expected, 'staff result differs')
  })

  await check('effective_price: no variant = sales_price', async () => {
    const { data, error } = await admin.rpc('effective_price', { p_product_id: t.product.id })
    assert(!error && Number(data) === 1100, `got ${data} ${error?.message ?? ''}`)
  })

  await check('effective_price: variant of another product errors', async () => {
    const { error } = await admin.rpc('effective_price', { p_product_id: t.product.id, p_variant_id: odoo.id })
    assert(error && /does not belong/i.test(error.message), `got ${error?.message}`)
  })

  await check('effective_price: unknown product errors; customer cannot use it', async () => {
    const r1 = await admin.rpc('effective_price', { p_product_id: '00000000-0000-0000-0000-000000000000' })
    assert(r1.error && /not found/i.test(r1.error.message), `got ${r1.error?.message}`)
    const r2 = await customer.rpc('effective_price', { p_product_id: t.product.id })
    assert(r2.error, 'customer got a price')
  })

  // ---- plan_is_available ----
  await check('plan_is_available: inside window true, before/after false', async () => {
    const ask = async (on) => {
      const { data, error } = await admin.rpc('plan_is_available', { p_plan_id: t.plan.id, ...(on ? { p_on_date: on } : {}) })
      assert(!error, error?.message)
      return data
    }
    assert((await ask()) === true, 'today (default) should be true')
    assert((await ask(day(-10))) === true, 'start boundary should be true')
    assert((await ask(day(10))) === true, 'end boundary should be true')
    assert((await ask(day(-11))) === false, 'day before window should be false')
    assert((await ask(day(11))) === false, 'day after window should be false')
  })

  await check('plan_is_available: open-ended, inactive and unknown plans', async () => {
    const open = await insert(admin, 'plans', { name: `${P} open`, billing_period: 'daily' })
    const futureOnly = await insert(admin, 'plans', { name: `${P} future`, billing_period: 'daily', available_from: day(5) })
    const off = await insert(admin, 'plans', { name: `${P} off`, billing_period: 'daily', is_active: false })
    const r = async (id, on) => (await admin.rpc('plan_is_available', { p_plan_id: id, p_on_date: on })).data
    assert((await r(open.id, day(-3000))) === true && (await r(open.id, day(3000))) === true, 'open plan not always available')
    assert((await r(futureOnly.id, day(4))) === false && (await r(futureOnly.id, day(5))) === true, 'from-only bound wrong')
    assert((await r(off.id, day(0))) === false, 'inactive plan available')
    assert((await r('00000000-0000-0000-0000-000000000000', day(0))) === false, 'unknown plan available')
    const c = await customer.rpc('plan_is_available', { p_plan_id: t.plan.id })
    assert(!c.error && c.data === true, 'customer cannot ask plan_is_available')
  })

  // ---- constraints (admin client: RLS passes, constraints must reject) ----
  const CHECK = '23514'
  const UNIQUE = '23505'
  const base = { name: `${P} c`, type: 'goods', sales_price: 1 }
  const baseDisc = { name: `${P} d`, type: 'fixed', value: 5, applies_to: 'subscription' }
  const cases = [
    ['product sales_price < 0', 'products', { ...base, sales_price: -1 }, CHECK],
    ['product cost_price < 0', 'products', { ...base, cost_price: -1 }, CHECK],
    ['variant extra_price < 0', 'product_variants', { product_id: t.product.id, value: `${P}-neg`, extra_price: -1 }, CHECK],
    ['plan price < 0', 'plans', { name: `${P} p`, billing_period: 'daily', price: -1 }, CHECK],
    ['tax rate < 0', 'taxes', { name: `${P} t`, rate_type: 'fixed', rate: -1 }, CHECK],
    ['tax percent > 100', 'taxes', { name: `${P} t`, rate_type: 'percent', rate: 101 }, CHECK],
    ['payment term days < 0', 'payment_terms', { name: `${P} pt`, days: -1 }, CHECK],
    ['plan min_quantity < 1', 'plans', { name: `${P} p`, billing_period: 'daily', min_quantity: 0 }, CHECK],
    ['plan available_from > available_to', 'plans', { name: `${P} p`, billing_period: 'daily', available_from: day(5), available_to: day(1) }, CHECK],
    ['discount value = 0', 'discounts', { ...baseDisc, value: 0 }, CHECK],
    ['discount value < 0', 'discounts', { ...baseDisc, value: -5 }, CHECK],
    ['percent discount > 100', 'discounts', { ...baseDisc, type: 'percent', value: 100.01 }, CHECK],
    ['product discount without product_id', 'discounts', { ...baseDisc, applies_to: 'product' }, CHECK],
    ['discount end_date < start_date', 'discounts', { ...baseDisc, start_date: day(5), end_date: day(1) }, CHECK],
    ['discount usage_limit = 0', 'discounts', { ...baseDisc, usage_limit: 0 }, CHECK],
    ['duplicate variant (product, attribute, value)', 'product_variants', { product_id: t.product.id, value: t.variant.value }, UNIQUE],
    ['template validity_days = 0', 'quotation_templates', { name: `${P} tpl`, plan_id: t.plan.id, validity_days: 0, payment_term_id: t.term.id }, CHECK],
    ['template line quantity = 0', 'quotation_template_lines', { template_id: t.template.id, product_id: t.product.id, quantity: 0 }, CHECK],
    ['template line variant of another product', 'quotation_template_lines', { template_id: t.template.id, product_id: t.product.id, variant_id: odoo?.id, quantity: 1 }, '23503'],
  ]
  for (const [label, table, row, code] of cases) {
    await check(`constraint rejects: ${label}`, () => expectConstraint(admin, table, row, code, label))
  }

  await check('constraints accept boundary values', async () => {
    await insert(admin, 'discounts', { ...baseDisc, name: `${P} d100`, type: 'percent', value: 100, usage_limit: 1 })
    await insert(admin, 'plans', { name: `${P} same-day`, billing_period: 'daily', min_quantity: 1, available_from: day(3), available_to: day(3), price: 0 })
    await insert(admin, 'discounts', { ...baseDisc, name: `${P} sameday`, start_date: day(2), end_date: day(2) })
  })
}

async function cleanup() {
  const like = `${P}%`
  // children first; only rows carrying this run's prefix
  const { data: tpls } = await service.from('quotation_templates').select('id').like('name', like)
  if (tpls?.length) await service.from('quotation_template_lines').delete().in('template_id', tpls.map((r) => r.id))
  await service.from('quotation_templates').delete().like('name', like)
  await service.from('discounts').delete().like('name', like)
  await service.from('plans').delete().like('name', like)
  const { data: prods } = await service.from('products').select('id').like('name', like)
  if (prods?.length) await service.from('product_variants').delete().in('product_id', prods.map((r) => r.id))
  await service.from('products').delete().like('name', like)
  await service.from('taxes').delete().like('name', like)
  await service.from('payment_terms').delete().like('name', like)
  for (const id of createdUserIds) await service.auth.admin.deleteUser(id)
  await service.from('customers').delete().like('email', `test+%-${run}@example.com`)
}

try {
  await main()
} catch (e) {
  results.push({ test: 'setup/run', result: 'FAIL', detail: e.message })
} finally {
  try {
    await cleanup()
  } catch (e) {
    console.error('Cleanup error:', e.message)
  }
}

console.table(results)
const failed = results.filter((r) => r.result === 'FAIL').length
console.log(failed ? `${failed} FAILED` : 'ALL PASSED')
process.exit(failed ? 1 : 0)
