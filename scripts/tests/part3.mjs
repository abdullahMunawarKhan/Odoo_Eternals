// Part 3 (subscriptions) backend tests. Run: node scripts/tests/part3.mjs
// Needs .env.test. The service-role key is used ONLY for setup and cleanup.
// All catalog rows are created with this run's prefix and removed at the end; seed data is never touched.
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
const P = `T3-${run}`
const emailFor = (tag) => `test+${tag}-${run}@example.com`.toLowerCase()
const PASSWORD = 'Str0ng!Pass1'
const createdUserIds = []
const results = []

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

async function mk(table, row) {
  const { data, error } = await service.from(table).insert(row).select().single()
  if (error) throw new Error(`setup ${table}: ${error.message}`)
  return data
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
  const { data: cust } = await service.from('customers').select('id').eq('user_id', data.user.id).maybeSingle()
  return { id: data.user.id, email, client, customerId: cust?.id }
}

const rpcT = (who, id, to) => who.client.rpc('transition_subscription', { sub_id: id, new_status: to })
const statusOf = async (id) => (await service.from('subscriptions').select('status').eq('id', id).single()).data.status

async function main() {
  // ---- catalog setup (service role) ----
  const tax = await mk('taxes', { name: `${P} tax`, rate_type: 'percent', rate: 18 })
  const term = await mk('payment_terms', { name: `${P} term`, days: 15 })
  const product = await mk('products', { name: `${P} product`, type: 'software', sales_price: 1000, cost_price: 400, tax_id: tax.id })
  const variant = await mk('product_variants', { product_id: product.id, value: `${P}-odoo`, extra_price: 560 })
  const flags = (o) => ({ billing_period: 'monthly', price: 100, available_from: day(-5), available_to: day(365), ...o })
  const planAll = await mk('plans', flags({ name: `${P} all`, min_quantity: 2, closable: true, pausable: true, renewable: true }))
  const planNone = await mk('plans', flags({ name: `${P} none`, min_quantity: 1 }))
  const planPast = await mk('plans', flags({ name: `${P} past`, available_from: day(-30), available_to: day(-10) }))
  const planFuture = await mk('plans', flags({ name: `${P} future`, available_from: day(10), available_to: day(40) }))
  const tplAll = await mk('quotation_templates', { name: `${P} tpl-all`, plan_id: planAll.id, validity_days: 10, payment_term_id: term.id })
  await mk('quotation_template_lines', { template_id: tplAll.id, product_id: product.id, variant_id: variant.id, quantity: 3 })
  await mk('quotation_template_lines', { template_id: tplAll.id, product_id: product.id, quantity: 2 })
  const tplNone = await mk('quotation_templates', { name: `${P} tpl-none`, plan_id: planNone.id, validity_days: 10, payment_term_id: term.id })
  await mk('quotation_template_lines', { template_id: tplNone.id, product_id: product.id, quantity: 1 })
  const tplPast = await mk('quotation_templates', { name: `${P} tpl-past`, plan_id: planPast.id, validity_days: 10, payment_term_id: term.id })
  await mk('quotation_template_lines', { template_id: tplPast.id, product_id: product.id, quantity: 1 })
  // a template whose line is below the plan minimum (plan min 2, line qty 1): needs a plan with min 2
  const tplLow = await mk('quotation_templates', { name: `${P} tpl-low`, plan_id: planAll.id, validity_days: 10, payment_term_id: term.id })
  await service.from('quotation_template_lines').insert({ template_id: tplLow.id, product_id: product.id, quantity: 1 })
  const subDisc = await mk('discounts', { name: `${P} sub-disc`, type: 'fixed', value: 50, applies_to: 'subscription' })
  const prodDisc = await mk('discounts', { name: `${P} prod-disc`, type: 'percent', value: 10, applies_to: 'product', product_id: product.id })

  const admin = await makeUser('admin', 'admin')
  const staff = await makeUser('staff', 'staff')
  const custA = await makeUser('custA', 'customer')
  const custB = await makeUser('custB', 'customer')

  const fromTpl = (who, tpl, cust = custA.customerId, start) =>
    who.client.rpc('create_subscription_from_template', { p_template_id: tpl.id, p_customer_id: cust, ...(start ? { p_start_date: start } : {}) })

  // ---- create from template ----
  let sub // main subscription walked through the lifecycle
  await check('create from template copies plan, term and lines with effective prices', async () => {
    const { data, error } = await fromTpl(staff, tplAll, custA.customerId, day(0))
    assert(!error, error?.message)
    sub = data
    assert(sub.status === 'draft' && sub.plan_id === planAll.id && sub.payment_term_id === term.id && sub.template_id === tplAll.id, 'header not copied')
    assert(/^SUB-\d{5,}$/.test(sub.number), `number ${sub.number}`)
    assert(sub.created_by === staff.id, 'created_by not the caller')
    assert(sub.expiry_date === day(0).replace(/^\d{4}/, (y) => String(Number(y) + 1)), `expiry ${sub.expiry_date}`)
    const { data: lines } = await service.from('subscription_lines').select('*').eq('subscription_id', sub.id)
    assert(lines.length === 2, `lines ${lines.length}`)
    const odoo = lines.find((l) => l.variant_id === variant.id)
    assert(Number(odoo.unit_price) === 1560 && Number(odoo.amount) === 4680 && odoo.tax_id === tax.id, `odoo line ${JSON.stringify(odoo)}`)
    const plain = lines.find((l) => !l.variant_id)
    assert(Number(plain.unit_price) === 1000 && Number(plain.amount) === 2000, 'plain line price')
  })

  await check('customer cannot create a subscription from a template', async () => {
    const { error } = await fromTpl(custA, tplAll)
    assert(error && error.code === '42501', `got ${error?.code} ${error?.message}`)
  })

  // ---- validation: min quantity, plan dates, client unit_price ----
  await check('quantity below plan minimum is rejected (line insert and template)', async () => {
    const { error } = await staff.client.from('subscription_lines').insert({ subscription_id: sub.id, product_id: product.id, quantity: 1 })
    assert(error && /below the minimum of 2/i.test(error.message), `line: ${error?.message}`)
    const r = await fromTpl(staff, tplLow)
    assert(r.error && /below the minimum/i.test(r.error.message), `template: ${r.error?.message}`)
    const { count } = await service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('template_id', tplLow.id)
    assert(count === 0, 'subscription left behind after failed template create')
  })

  await check('plan outside its date window is rejected (template and direct insert)', async () => {
    const a = await fromTpl(staff, tplPast)
    assert(a.error && /not available today/i.test(a.error.message), `past template: ${a.error?.message}`)
    const b = await staff.client.from('subscriptions').insert({ customer_id: custA.customerId, plan_id: planFuture.id })
    assert(b.error && /not available today/i.test(b.error.message), `future plan: ${b.error?.message}`)
  })

  await check('client unit_price, tax_id and amount are ignored', async () => {
    const { data, error } = await staff.client.from('subscription_lines')
      .insert({ subscription_id: sub.id, product_id: product.id, quantity: 5, unit_price: 1, tax_id: null, amount: 5 })
      .select().single()
    assert(!error, error?.message)
    assert(Number(data.unit_price) === 1000 && Number(data.amount) === 5000 && data.tax_id === tax.id, `stored ${JSON.stringify(data)}`)
    await staff.client.from('subscription_lines').delete().eq('id', data.id)
  })

  // ---- full path with log ----
  await check('full path draft -> quotation -> confirmed -> active -> closed writes the log', async () => {
    const empty = await staff.client.from('subscriptions').insert({ customer_id: custA.customerId, plan_id: planAll.id }).select().single()
    assert(!empty.error, empty.error?.message)
    const e = await rpcT(staff, empty.data.id, 'quotation')
    assert(e.error && /at least one line/i.test(e.error.message), `empty quote: ${e.error?.message}`)
    await service.from('subscriptions').delete().eq('id', empty.data.id)

    const q = await rpcT(staff, sub.id, 'quotation')
    assert(!q.error && q.data.status === 'quotation', q.error?.message)
    assert(q.data.quotation_valid_until === day(10), `valid until ${q.data.quotation_valid_until} (template validity 10)`)
    const c = await rpcT(staff, sub.id, 'confirmed')
    assert(!c.error && c.data.status === 'confirmed', c.error?.message)
    const a = await rpcT(admin, sub.id, 'active')
    assert(!a.error && a.data.status === 'active' && a.data.next_billing_date === sub.start_date, `active: ${a.error?.message} nbd ${a.data?.next_billing_date}`)
    const x = await rpcT(staff, sub.id, 'closed')
    assert(!x.error && x.data.status === 'closed', x.error?.message)
    const { data: log } = await service.from('subscription_status_log').select('from_status, to_status, changed_by').eq('subscription_id', sub.id).order('changed_at')
    const path = log.map((l) => `${l.from_status}>${l.to_status}`).join(',')
    assert(path === 'draft>quotation,quotation>confirmed,confirmed>active,active>closed', `log: ${path}`)
    assert(log[0].changed_by === staff.id && log[2].changed_by === admin.id, 'changed_by wrong')
  })

  await check('expired quotation cannot be confirmed', async () => {
    const { data: s } = await fromTpl(staff, tplAll, custA.customerId)
    await rpcT(staff, s.id, 'quotation')
    await service.from('subscriptions').update({ quotation_valid_until: day(-1) }).eq('id', s.id)
    const r = await rpcT(staff, s.id, 'confirmed')
    assert(r.error && /expired/i.test(r.error.message), `got ${r.error?.message}`)
  })

  // ---- invalid transitions ----
  await check('invalid transitions are rejected', async () => {
    const { data: d } = await fromTpl(staff, tplAll, custA.customerId) // draft
    for (const to of ['active', 'closed', 'paused', 'confirmed', 'draft']) {
      const r = await rpcT(staff, d.id, to)
      assert(r.error && /invalid transition/i.test(r.error.message), `draft -> ${to}: ${r.error?.message}`)
    }
    const back = await rpcT(staff, sub.id, 'active') // sub is closed
    assert(back.error && /invalid transition from closed/i.test(back.error.message), `closed -> active: ${back.error?.message}`)
    const unknown = await rpcT(staff, '00000000-0000-0000-0000-000000000000', 'quotation')
    assert(unknown.error && unknown.error.code === 'P0002', `unknown: ${unknown.error?.code}`)
    assert((await statusOf(d.id)) === 'draft', 'status changed by a rejected call')
  })

  // ---- direct status updates ----
  await check('direct status update is rejected for admin, staff and customer', async () => {
    const { data: d } = await fromTpl(staff, tplAll, custA.customerId)
    for (const [label, who] of [['admin', admin], ['staff', staff]]) {
      const { error } = await who.client.from('subscriptions').update({ status: 'active' }).eq('id', d.id)
      assert(error && error.code === '42501', `${label}: ${error?.code} ${error?.message}`)
    }
    const c = await custA.client.from('subscriptions').update({ status: 'closed' }).eq('id', d.id).select()
    assert(c.error || c.data.length === 0, 'customer updated a subscription')
    const ins = await staff.client.from('subscriptions').insert({ customer_id: custA.customerId, plan_id: planAll.id, status: 'active' })
    assert(ins.error && ins.error.code === '42501', `insert as active: ${ins.error?.code}`)
    const nb = await staff.client.from('subscriptions').update({ next_billing_date: day(1) }).eq('id', d.id)
    assert(nb.error && nb.error.code === '42501', `next_billing_date: ${nb.error?.code}`)
    assert((await statusOf(d.id)) === 'draft', 'status changed')
  })

  // ---- pause / close / renew flags and ownership ----
  async function activeSub(tpl, cust) {
    const { data: s, error } = await fromTpl(staff, tpl, cust)
    assert(!error, error?.message)
    for (const to of ['quotation', 'confirmed', 'active']) {
      const r = await rpcT(staff, s.id, to)
      assert(!r.error, `${to}: ${r.error?.message}`)
    }
    return s
  }

  await check('pause and close flags: plan without flags blocks everyone but staff may close', async () => {
    const s = await activeSub(tplNone, custA.customerId)
    for (const [label, who] of [['staff', staff], ['customer', custA]]) {
      const r = await rpcT(who, s.id, 'paused')
      assert(r.error && /does not allow pausing/i.test(r.error.message), `${label} pause: ${r.error?.message}`)
    }
    const cc = await rpcT(custA, s.id, 'closed')
    assert(cc.error && /does not allow early closing/i.test(cc.error.message), `customer close: ${cc.error?.message}`)
    const rn = await rpcT(staff, s.id, 'active')
    assert(rn.error && /does not allow renewal/i.test(rn.error.message), `renew: ${rn.error?.message}`)
    const sc = await rpcT(staff, s.id, 'closed')
    assert(!sc.error && sc.data.status === 'closed', `staff close: ${sc.error?.message}`)
  })

  await check('customer can pause, resume, renew and close their own subscription when the plan allows', async () => {
    const s = await activeSub(tplAll, custA.customerId)
    const p = await rpcT(custA, s.id, 'paused')
    assert(!p.error && p.data.status === 'paused', p.error?.message)
    const r = await rpcT(custA, s.id, 'active')
    assert(!r.error && r.data.status === 'active', r.error?.message)
    const before = new Date(r.data.expiry_date)
    const term = (new Date(r.data.expiry_date) - new Date(r.data.start_date)) / 86400000
    const rn = await rpcT(custA, s.id, 'active') // renew
    assert(!rn.error, rn.error?.message)
    const grown = (new Date(rn.data.expiry_date) - before) / 86400000
    assert(rn.data.status === 'active' && grown === term, `expiry grew ${grown} days, term ${term}`)
    const { data: log } = await service.from('subscription_status_log').select('from_status, to_status').eq('subscription_id', s.id).order('changed_at')
    assert(log.map((l) => `${l.from_status}>${l.to_status}`).slice(-3).join(',') === 'active>paused,paused>active,active>active', 'renew/pause not logged')
    const c = await rpcT(custA, s.id, 'closed')
    assert(!c.error && c.data.status === 'closed', c.error?.message)
  })

  await check('customer cannot do staff-only steps on their own subscription', async () => {
    const { data: d } = await fromTpl(staff, tplAll, custA.customerId)
    const r = await rpcT(custA, d.id, 'quotation')
    assert(r.error && r.error.code === '42501', `got ${r.error?.code} ${r.error?.message}`)
  })

  await check('customer acts only on own subscription and cannot see others', async () => {
    const s = await activeSub(tplAll, custA.customerId)
    const t = await rpcT(custB, s.id, 'paused')
    assert(t.error && t.error.code === 'P0002', `B pause A's: ${t.error?.code} ${t.error?.message}`)
    assert((await statusOf(s.id)) === 'active', 'status changed by non-owner')
    const subs = await custB.client.from('subscriptions').select('id').eq('id', s.id)
    const lines = await custB.client.from('subscription_lines').select('id').eq('subscription_id', s.id)
    const log = await custB.client.from('subscription_status_log').select('id').eq('subscription_id', s.id)
    assert(subs.data.length === 0 && lines.data.length === 0 && log.data.length === 0, 'customer B sees A data')
    const own = await custA.client.from('subscriptions').select('id').eq('id', s.id)
    const ownLines = await custA.client.from('subscription_lines').select('id').eq('subscription_id', s.id)
    const ownLog = await custA.client.from('subscription_status_log').select('id').eq('subscription_id', s.id)
    assert(own.data.length === 1 && ownLines.data.length === 2 && ownLog.data.length >= 3, 'customer A cannot see own data')
    const all = await custB.client.from('subscriptions').select('id')
    assert(all.data.every((r) => r.id !== s.id), 'A in B list')
    const w = await custA.client.from('subscription_lines').insert({ subscription_id: s.id, product_id: product.id, quantity: 9 })
    assert(w.error, 'customer inserted a line')
  })

  await check('deactivated customer loses own subscriptions; reactivation restores', async () => {
    const s = await activeSub(tplAll, custB.customerId)
    await admin.client.rpc('set_user_active', { user_id: custB.id, active: false })
    const off = await custB.client.from('subscriptions').select('id').eq('id', s.id)
    const act = await rpcT(custB, s.id, 'paused')
    await admin.client.rpc('set_user_active', { user_id: custB.id, active: true })
    assert(off.data.length === 0, 'deactivated customer still sees subscription')
    assert(act.error, 'deactivated customer transitioned')
    const on = await custB.client.from('subscriptions').select('id').eq('id', s.id)
    assert(on.data.length === 1, 'not restored')
  })

  // ---- attach discount ----
  await check('attach_discount: staff attaches subscription-level discount; others and bad cases rejected', async () => {
    const { data: s } = await fromTpl(staff, tplAll, custA.customerId)
    const ok = await staff.client.rpc('attach_discount', { p_subscription_id: s.id, p_discount_id: subDisc.id })
    assert(!ok.error && ok.data.discount_id === subDisc.id, ok.error?.message)
    const dup = await staff.client.rpc('attach_discount', { p_subscription_id: s.id, p_discount_id: subDisc.id })
    assert(dup.error && /already attached/i.test(dup.error.message), `dup: ${dup.error?.message}`)
    const prod = await staff.client.rpc('attach_discount', { p_subscription_id: s.id, p_discount_id: prodDisc.id })
    assert(prod.error && /subscription-level/i.test(prod.error.message), `product-level: ${prod.error?.message}`)
    const cu = await custA.client.rpc('attach_discount', { p_subscription_id: s.id, p_discount_id: subDisc.id })
    assert(cu.error && cu.error.code === '42501', `customer: ${cu.error?.code}`)
    const direct = await staff.client.from('subscription_discounts').insert({ subscription_id: s.id, discount_id: prodDisc.id })
    assert(direct.error, 'direct insert into subscription_discounts was accepted')
    const seen = await custA.client.from('subscription_discounts').select('discount_id').eq('subscription_id', s.id)
    assert(seen.data.length === 0, 'customer sees attached discounts')
    const staffSees = await staff.client.from('subscription_discounts').select('discount_id').eq('subscription_id', s.id)
    assert(staffSees.data.length === 1, 'staff cannot read attached discounts')
  })

  await check('plans_public exposes the plan flags and nothing secret', async () => {
    const { data, error } = await custA.client.from('plans_public').select('*').eq('id', planAll.id).single()
    assert(!error, error?.message)
    assert(data.price !== undefined && data.min_quantity === 2 && data.closable === true && data.pausable === true && data.renewable === true && data.auto_close === false,
      `row ${JSON.stringify(data)}`)
    assert(!('tax_id' in data) && !('available_from' in data) && !('is_active' in data), 'extra columns exposed')
  })
}

async function cleanup() {
  const { data: custs } = await service.from('customers').select('id').like('email', `test+%-${run}@example.com`)
  const ids = (custs ?? []).map((c) => c.id)
  if (ids.length) await service.from('subscriptions').delete().in('customer_id', ids) // cascades lines, log, discounts
  const { data: tpls } = await service.from('quotation_templates').select('id').like('name', `${P}%`)
  if (tpls?.length) await service.from('quotation_template_lines').delete().in('template_id', tpls.map((r) => r.id))
  await service.from('quotation_templates').delete().like('name', `${P}%`)
  await service.from('discounts').delete().like('name', `${P}%`)
  await service.from('plans').delete().like('name', `${P}%`)
  const { data: prods } = await service.from('products').select('id').like('name', `${P}%`)
  if (prods?.length) await service.from('product_variants').delete().in('product_id', prods.map((r) => r.id))
  await service.from('products').delete().like('name', `${P}%`)
  await service.from('taxes').delete().like('name', `${P}%`)
  await service.from('payment_terms').delete().like('name', `${P}%`)
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
