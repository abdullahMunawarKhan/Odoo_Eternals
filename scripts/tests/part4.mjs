// Part 4 (billing + payments) tests. Run: node scripts/tests/part4.mjs
// Needs .env.test and the Part 4 migration. Service role is used only for setup and cleanup;
// only rows created by this run (T4- prefix, test+ users) are removed, never seed or DEMO rows.
import { createClient } from '@supabase/supabase-js'

try {
  process.loadEnvFile(new URL('../../.env.test', import.meta.url))
} catch {
  console.error('Missing .env.test')
  process.exit(1)
}
const { SUPABASE_URL: U, SUPABASE_ANON_KEY: A, SUPABASE_SERVICE_ROLE_KEY: K } = process.env
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const service = createClient(U, K, opts)
const anon = () => createClient(U, A, opts)

const run = Math.random().toString(36).slice(2, 10)
const P = `T4-${run}`
const emailFor = (t) => `test+${t}-${run}@example.com`.toLowerCase()
const PASSWORD = 'Str0ng!Pass1'
const userIds = []
const results = []

async function check(name, fn) {
  try {
    await fn()
    results.push({ test: name, result: 'PASS', detail: '' })
  } catch (e) {
    results.push({ test: name, result: 'FAIL', detail: e.message })
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m)
}
const num = (v) => Number(v).toFixed(2)
const day = (o = 0) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + o)
  return d.toISOString().slice(0, 10)
}
async function mk(table, row) {
  const { data, error } = await service.from(table).insert(row).select().single()
  if (error) throw new Error(`setup ${table}: ${error.message}`)
  return data
}
async function user(tag, role) {
  const email = emailFor(tag)
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error) throw new Error(error.message)
  userIds.push(data.user.id)
  if (role !== 'customer') await service.from('profiles').update({ role }).eq('id', data.user.id)
  const client = anon()
  const { error: le } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (le) throw new Error(le.message)
  const { data: c } = await service.from('customers').select('id').eq('user_id', data.user.id).maybeSingle()
  return { id: data.user.id, client, customerId: c?.id }
}

async function main() {
  const tax = await mk('taxes', { name: `${P} tax`, rate_type: 'percent', rate: 18 })
  const term = await mk('payment_terms', { name: `${P} term`, days: 10 })
  const prodA = await mk('products', { name: `${P} A`, type: 'software', sales_price: 1000, cost_price: 1, tax_id: tax.id })
  const prodB = await mk('products', { name: `${P} B`, type: 'service', sales_price: 500, cost_price: 1, tax_id: tax.id })
  const plan = await mk('plans', { name: `${P} plan`, price: 100, billing_period: 'monthly', min_quantity: 1, tax_id: tax.id })
  const disc = await mk('discounts', { name: `${P} disc`, type: 'percent', value: 10, applies_to: 'product', product_id: prodA.id, usage_limit: 5 })
  const tpl = await mk('quotation_templates', { name: `${P} tpl`, plan_id: plan.id, validity_days: 30, payment_term_id: term.id })
  await mk('quotation_template_lines', { template_id: tpl.id, product_id: prodA.id, quantity: 2 })
  await mk('quotation_template_lines', { template_id: tpl.id, product_id: prodB.id, quantity: 1 })

  const staff = await user('staff', 'staff')
  const custA = await user('custA', 'customer')
  const custB = await user('custB', 'customer')
  const mkSub = async (cust) => {
    const { data, error } = await staff.client.rpc('create_subscription_from_template', { p_template_id: tpl.id, p_customer_id: cust.customerId, p_start_date: day(0) })
    if (error) throw new Error(`create sub: ${error.message}`)
    return data
  }
  const sub1 = await mkSub(custA) // stays draft; used for direct generate_invoice
  const sub2 = await mkSub(custA) // activated for run_billing
  const sub3 = await mkSub(custB)
  for (const to of ['quotation', 'confirmed', 'active']) {
    const { error } = await staff.client.rpc('transition_subscription', { sub_id: sub2.id, new_status: to })
    if (error) throw new Error(`${to}: ${error.message}`)
  }

  let inv1
  await check('invoice math: plan fee + 2 lines + 1 discount, totals equal sum of lines', async () => {
    const { data: id, error } = await staff.client.rpc('generate_invoice', { sub_id: sub1.id, period_start: day(0) })
    assert(!error, error?.message)
    const { data: inv } = await service.from('invoices').select('*').eq('id', id).single()
    const { data: lines } = await service.from('invoice_lines').select('*').eq('invoice_id', id)
    inv1 = inv
    assert(lines.length === 3, `lines ${lines.length}`)
    const fee = lines.find((l) => l.kind === 'plan_fee')
    const a = lines.find((l) => l.product_id === prodA.id)
    const b = lines.find((l) => l.product_id === prodB.id)
    assert(num(fee.base_amount) === '100.00' && num(fee.tax_amount) === '18.00', 'plan fee line')
    assert(num(a.base_amount) === '2000.00' && num(a.discount_amount) === '200.00' && num(a.tax_amount) === '324.00' && num(a.line_total) === '2124.00', `line A ${JSON.stringify(a)}`)
    assert(num(b.base_amount) === '500.00' && num(b.discount_amount) === '0.00' && num(b.tax_amount) === '90.00', 'line B')
    assert(num(inv.subtotal) === '2600.00' && num(inv.discount_total) === '200.00' && num(inv.tax_total) === '432.00' && num(inv.total) === '2832.00', `totals ${inv.subtotal} ${inv.discount_total} ${inv.tax_total} ${inv.total}`)
    const sum = lines.reduce((s, l) => s + Math.round(Number(l.line_total) * 100), 0)
    assert(sum === Math.round(Number(inv.total) * 100), 'total != sum of lines')
    assert(inv.status === 'draft' && /^INV-\d{5,}$/.test(inv.number), `status/number ${inv.status} ${inv.number}`)
    assert(inv.due_date === day(10), `due ${inv.due_date}`)
    const { data: d } = await service.from('discounts').select('times_used').eq('id', disc.id).single()
    assert(d.times_used === 1, `times_used ${d.times_used}`)
  })

  await check('generate_invoice twice returns the same id and changes nothing', async () => {
    const { data: id2, error } = await staff.client.rpc('generate_invoice', { sub_id: sub1.id, period_start: day(0) })
    assert(!error && id2 === inv1.id, `got ${id2} ${error?.message}`)
    const { count } = await service.from('invoice_lines').select('id', { count: 'exact', head: true }).eq('invoice_id', inv1.id)
    const { data: d } = await service.from('discounts').select('times_used').eq('id', disc.id).single()
    assert(count === 3 && d.times_used === 1, `lines ${count}, times_used ${d.times_used}`)
  })

  await check('run_billing twice: second run creates 0 new invoices', async () => {
    const first = await staff.client.rpc('run_billing')
    assert(!first.error, first.error?.message)
    assert(first.data[0].created >= 1 && first.data[0].errors === 0, `first ${JSON.stringify(first.data)}`)
    const { count: c1 } = await service.from('invoices').select('id', { count: 'exact', head: true }).eq('subscription_id', sub2.id)
    assert(c1 === 1, `invoices for sub2 ${c1}`)
    const second = await staff.client.rpc('run_billing')
    assert(!second.error && second.data[0].created === 0 && second.data[0].errors === 0, `second ${JSON.stringify(second.data)}`)
    const { count: c2 } = await service.from('invoices').select('id', { count: 'exact', head: true }).eq('subscription_id', sub2.id)
    assert(c2 === 1, `invoices after second run ${c2}`)
    const { data: s } = await service.from('subscriptions').select('next_billing_date').eq('id', sub2.id).single()
    assert(s.next_billing_date > day(0), `next_billing_date ${s.next_billing_date}`)
  })

  await check('partial then full payment flips the invoice to paid; overpayment rejected', async () => {
    const draftPay = await staff.client.rpc('record_payment', { invoice_id: inv1.id, method: 'cash', amount: 10 })
    assert(draftPay.error && /confirmed invoice/i.test(draftPay.error.message), `draft pay: ${draftPay.error?.message}`)
    const c = await staff.client.rpc('invoice_confirm', { invoice_id: inv1.id })
    assert(!c.error && c.data.status === 'confirmed', c.error?.message)
    const p1 = await staff.client.rpc('record_payment', { invoice_id: inv1.id, method: 'upi', amount: 1000, note: 'part' })
    assert(!p1.error && num(p1.data.amount) === '1000.00', p1.error?.message)
    let { data: i } = await service.from('invoices').select('status, amount_paid').eq('id', inv1.id).single()
    assert(i.status === 'confirmed' && num(i.amount_paid) === '1000.00', `after partial ${i.status} ${i.amount_paid}`)
    const over = await staff.client.rpc('record_payment', { invoice_id: inv1.id, method: 'cash', amount: 2000 })
    assert(over.error && /more than the outstanding/i.test(over.error.message), `overpay: ${over.error?.message}`)
    const zero = await staff.client.rpc('record_payment', { invoice_id: inv1.id, method: 'cash', amount: 0 })
    assert(zero.error, 'zero payment accepted')
    const p2 = await staff.client.rpc('record_payment', { invoice_id: inv1.id, method: 'bank_transfer', amount: 1832, payment_date: day(0) })
    assert(!p2.error, p2.error?.message)
    ;({ data: i } = await service.from('invoices').select('status, amount_paid, total').eq('id', inv1.id).single())
    assert(i.status === 'paid' && num(i.amount_paid) === num(i.total), `after full ${i.status} ${i.amount_paid}`)
    const again = await staff.client.rpc('record_payment', { invoice_id: inv1.id, method: 'cash', amount: 1 })
    assert(again.error, 'payment on a paid invoice accepted')
    const cancel = await staff.client.rpc('invoice_cancel', { invoice_id: inv1.id })
    assert(cancel.error && /paid invoice/i.test(cancel.error.message), `cancel paid: ${cancel.error?.message}`)
  })

  await check('dashboard views work for staff and show the payment', async () => {
    const { data, error } = await staff.client.from('v_dashboard_summary').select('*').single()
    assert(!error, error?.message)
    assert(Number(data.total_revenue) >= 2832 && data.active_subscriptions >= 1, JSON.stringify(data))
    const s = await staff.client.from('v_invoice_summary').select('number, outstanding, is_overdue, customer_name, subscription_number').eq('id', inv1.id).single()
    assert(!s.error && num(s.data.outstanding) === '0.00' && s.data.is_overdue === false, JSON.stringify(s))
  })

  await check('customer sees only own invoices, lines and payments', async () => {
    const { data: id3 } = await staff.client.rpc('generate_invoice', { sub_id: sub3.id, period_start: day(0) })
    const mine = await custA.client.from('invoices').select('id, customer_id')
    assert(!mine.error && mine.data.length >= 2 && mine.data.every((r) => r.customer_id === custA.customerId), `A sees ${mine.data?.length}`)
    const theirs = await custA.client.from('invoices').select('id').eq('id', id3)
    assert(theirs.data.length === 0, 'A sees B invoice')
    const lines = await custA.client.from('invoice_lines').select('id').eq('invoice_id', id3)
    assert(lines.data.length === 0, 'A sees B lines')
    const pays = await custA.client.from('payments').select('id').eq('invoice_id', inv1.id)
    assert(pays.data.length === 2, `A sees ${pays.data.length} own payments`)
    const bPay = await custB.client.from('payments').select('id').eq('invoice_id', inv1.id)
    assert(bPay.data.length === 0, 'B sees A payments')
    const view = await custB.client.from('v_invoice_summary').select('id, customer_id')
    assert(view.data.every((r) => r.customer_id === custB.customerId), 'B sees foreign rows in v_invoice_summary')
  })

  await check('customer cannot run billing, confirm, record payment or write invoices', async () => {
    const rb = await custA.client.rpc('run_billing')
    assert(rb.error && rb.error.code === '42501', `run_billing: ${rb.error?.code}`)
    const rp = await custA.client.rpc('record_payment', { invoice_id: inv1.id, method: 'cash', amount: 1 })
    assert(rp.error && rp.error.code === '42501', `record_payment: ${rp.error?.code}`)
    const gi = await custA.client.rpc('generate_invoice', { sub_id: sub1.id, period_start: day(40) })
    assert(gi.error && gi.error.code === '42501', `generate_invoice: ${gi.error?.code}`)
    const ins = await custA.client.from('invoices').insert({ subscription_id: sub1.id, customer_id: custA.customerId, period_start: day(90), period_end: day(91), due_date: day(95) })
    assert(ins.error, 'customer inserted an invoice')
    const upd = await staff.client.from('invoices').update({ amount_paid: 1, status: 'paid' }).eq('id', inv1.id).select()
    assert(upd.error || upd.data.length === 0, 'staff updated an invoice directly')
    const pins = await staff.client.from('payments').insert({ invoice_id: inv1.id, method: 'cash', amount: 1 })
    assert(pins.error, 'staff inserted a payment directly')
  })
}

async function cleanup() {
  const { data: custs } = await service.from('customers').select('id').like('email', `test+%-${run}@example.com`)
  const cids = (custs ?? []).map((c) => c.id)
  if (cids.length) {
    const { data: invs } = await service.from('invoices').select('id').in('customer_id', cids)
    const ids = (invs ?? []).map((r) => r.id)
    if (ids.length) {
      await service.from('payments').delete().in('invoice_id', ids)
      await service.from('invoices').delete().in('id', ids) // lines cascade
    }
    await service.from('subscriptions').delete().in('customer_id', cids)
  }
  const { data: tpls } = await service.from('quotation_templates').select('id').like('name', `${P}%`)
  if (tpls?.length) await service.from('quotation_template_lines').delete().in('template_id', tpls.map((r) => r.id))
  await service.from('quotation_templates').delete().like('name', `${P}%`)
  await service.from('discounts').delete().like('name', `${P}%`)
  await service.from('plans').delete().like('name', `${P}%`)
  await service.from('products').delete().like('name', `${P}%`)
  await service.from('taxes').delete().like('name', `${P}%`)
  await service.from('payment_terms').delete().like('name', `${P}%`)
  for (const id of userIds) await service.auth.admin.deleteUser(id)
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
