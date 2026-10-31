// Admin extras tests (deactivation). Run: node scripts/tests/admin-extras.mjs
// Needs .env.test. The service-role key is used ONLY for setup and cleanup.
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
  const { data: s, error: le } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (le) throw new Error(`login ${tag}: ${le.message}`)
  return { id: data.user.id, email, client, token: s.session.access_token }
}

async function callFunction(name, token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    // non-JSON body
  }
  return { status: res.status, json }
}

const setActive = (caller, userId, active) => caller.client.rpc('set_user_active', { user_id: userId, active })

async function isActiveInDb(id) {
  const { data } = await service.from('profiles').select('is_active').eq('id', id).single()
  return data.is_active
}

async function main() {
  const admin = await makeUser('admin', 'admin')
  const admin2 = await makeUser('admin2', 'admin')
  const staff = await makeUser('staff', 'staff')
  const cust = await makeUser('cust', 'customer')
  const other = await makeUser('other', 'customer')

  // baseline: everything works while active
  await check('baseline: active staff and customer can read their data', async () => {
    const sp = await staff.client.from('profiles').select('id').in('id', [admin.id, cust.id, other.id])
    assert(!sp.error && sp.data.length === 3, `staff saw ${sp.data?.length} profiles`)
    const { data: role } = await staff.client.rpc('current_role')
    assert(role === 'staff', `current_role ${role}`)
    const cp = await cust.client.from('profiles').select('id').eq('id', cust.id)
    assert(cp.data.length === 1, 'customer cannot read own profile')
    const cc = await cust.client.from('customers').select('id').eq('user_id', cust.id)
    assert(cc.data.length === 1, 'customer cannot read own customers row')
  })

  // ---- who may call set_user_active ----
  await check('staff cannot call set_user_active', async () => {
    const { error } = await setActive(staff, cust.id, false)
    assert(error && error.code === '42501', `got ${error?.code} ${error?.message}`)
    assert(await isActiveInDb(cust.id), 'customer was deactivated')
  })

  await check('customer cannot call set_user_active', async () => {
    const { error } = await setActive(cust, other.id, false)
    assert(error && error.code === '42501', `got ${error?.code} ${error?.message}`)
    assert(await isActiveInDb(other.id), 'other customer was deactivated')
  })

  await check('anon cannot call set_user_active', async () => {
    const { error } = await anon().rpc('set_user_active', { user_id: cust.id, active: false })
    assert(error, 'anon call was accepted')
  })

  await check('admin cannot deactivate self', async () => {
    const { error } = await setActive(admin, admin.id, false)
    assert(error && /own account/i.test(error.message), `got ${error?.code} ${error?.message}`)
    assert(await isActiveInDb(admin.id), 'admin was deactivated')
  })

  await check('set_user_active on an unknown user errors', async () => {
    const { error } = await setActive(admin, '00000000-0000-0000-0000-000000000000', false)
    assert(error && error.code === 'P0002', `got ${error?.code} ${error?.message}`)
  })

  // ---- direct updates are blocked ----
  await check('clients cannot change is_active or role directly (even admins)', async () => {
    const a = await admin.client.from('profiles').update({ is_active: false }).eq('id', staff.id)
    assert(a.error && a.error.code === '42501', `admin direct is_active: ${a.error?.code}`)
    const b = await admin.client.from('profiles').update({ role: 'admin' }).eq('id', staff.id)
    assert(b.error && b.error.code === '42501', `admin direct role: ${b.error?.code}`)
    const c = await cust.client.from('profiles').update({ is_active: false }).eq('id', cust.id)
    assert(c.error && c.error.code === '42501', `customer direct is_active: ${c.error?.code}`)
    const d = await staff.client.from('profiles').update({ is_active: true }).eq('id', staff.id)
    assert(d.error && d.error.code === '42501', `staff direct is_active: ${d.error?.code}`)
    const { data } = await service.from('profiles').select('role, is_active').eq('id', staff.id).single()
    assert(data.role === 'staff' && data.is_active === true, 'staff row changed')
  })

  // ---- deactivate staff ----
  await check('admin deactivates staff: only is_active changes, row returned', async () => {
    const { data, error } = await setActive(admin, staff.id, false)
    assert(!error, error?.message)
    assert(data.id === staff.id && data.is_active === false && data.role === 'staff' && data.email === staff.email,
      `returned ${JSON.stringify(data)}`)
  })

  await check('deactivated staff loses all access', async () => {
    const p = await staff.client.from('profiles').select('id')
    assert(!p.error && p.data.length === 0, `still sees ${p.data?.length} profiles (own row included)`)
    const c = await staff.client.from('customers').select('id')
    assert(!c.error && c.data.length === 0, `still sees ${c.data?.length} customers`)
    const cat = await staff.client.from('products').select('id')
    assert(!cat.error && cat.data.length === 0, `still sees ${cat.data?.length} products`)
    const { data: role } = await staff.client.rpc('current_role')
    assert(role === null, `current_role is ${role}`)
    const { data: sta } = await staff.client.rpc('is_staff_or_admin')
    assert(sta === false, `is_staff_or_admin is ${sta}`)
    const ins = await staff.client.from('customers').insert({ name: 'x', email: emailFor('blocked') })
    assert(ins.error, 'deactivated staff could insert a customer')
    const f = await callFunction('create-staff', staff.token, { email: emailFor('n1'), full_name: 'N', password: PASSWORD })
    assert(f.status === 403, `create-staff status ${f.status}`)
  })

  await check('reactivation restores staff access', async () => {
    const { data, error } = await setActive(admin, staff.id, true)
    assert(!error && data.is_active === true, error?.message)
    const p = await staff.client.from('profiles').select('id').in('id', [admin.id, cust.id])
    assert(p.data.length === 2, `staff sees ${p.data.length} profiles`)
    const { data: role } = await staff.client.rpc('current_role')
    assert(role === 'staff', `current_role ${role}`)
    const cat = await staff.client.from('products').select('id').limit(1)
    assert(cat.data.length === 1, 'catalog not visible again')
  })

  // ---- deactivate customer ----
  await check('deactivated customer loses access to own rows', async () => {
    const { error } = await setActive(admin, cust.id, false)
    assert(!error, error?.message)
    const p = await cust.client.from('profiles').select('id')
    assert(!p.error && p.data.length === 0, `customer still sees ${p.data?.length} profiles`)
    const c = await cust.client.from('customers').select('id')
    assert(!c.error && c.data.length === 0, `customer still sees ${c.data?.length} customers rows`)
    const v = await cust.client.from('products_public').select('id').limit(1)
    // public catalog views are shared reference data, not own data; documented as still readable
    assert(!v.error, v.error?.message)
    const upd = await cust.client.from('profiles').update({ full_name: 'sneaky' }).eq('id', cust.id).select()
    assert(upd.error || upd.data.length === 0, 'deactivated customer updated own profile')
    const { data: row } = await service.from('profiles').select('full_name').eq('id', cust.id).single()
    assert(row.full_name !== 'sneaky', 'profile was changed')
  })

  await check('reactivation restores customer access', async () => {
    const { data, error } = await setActive(admin, cust.id, true)
    assert(!error && data.is_active, error?.message)
    const p = await cust.client.from('profiles').select('id')
    assert(p.data.length === 1 && p.data[0].id === cust.id, `sees ${p.data.length}`)
    const c = await cust.client.from('customers').select('id')
    assert(c.data.length === 1, `sees ${c.data.length} customers rows`)
  })

  // ---- deactivated admin ----
  await check('deactivated admin cannot call set_user_active or create-staff', async () => {
    const { error: e0 } = await setActive(admin, admin2.id, false)
    assert(!e0, `admin could not deactivate another admin: ${e0?.message}`)
    const { error } = await setActive(admin2, other.id, false)
    assert(error && error.code === '42501', `got ${error?.code} ${error?.message}`)
    const f = await callFunction('create-staff', admin2.token, { email: emailFor('n2'), full_name: 'N', password: PASSWORD })
    assert(f.status === 403, `create-staff status ${f.status}`)
    const { error: e3 } = await setActive(admin, admin2.id, true)
    assert(!e3, e3?.message)
  })
}

async function cleanup() {
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
