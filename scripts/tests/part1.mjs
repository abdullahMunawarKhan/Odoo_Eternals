// Part 1 backend tests. Run: node scripts/tests/part1.mjs
// Needs .env.test (see .env.test.example). The service-role key is used ONLY here,
// for setup and cleanup.
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
let note = ''
const createdUserIds = []
const results = []

async function check(name, fn) {
  try {
    await fn()
    results.push({ test: name, result: 'PASS', detail: note })
    note = ''
  } catch (e) {
    results.push({ test: name, result: 'FAIL', detail: e.message })
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function makeUser(tag, role, metadata = {}) {
  const email = emailFor(tag)
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Test ${tag}`, ...metadata },
  })
  if (error) throw new Error(`createUser ${tag}: ${error.message}`)
  createdUserIds.push(data.user.id)
  if (role !== 'customer') {
    const { error: e } = await service.from('profiles').update({ role }).eq('id', data.user.id)
    if (e) throw new Error(`promote ${tag}: ${e.message}`)
  }
  return { id: data.user.id, email }
}

async function login(email, password = PASSWORD) {
  const client = anon()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return { client, token: data.session.access_token }
}

async function callCreateStaff(token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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

async function main() {
  // ---- setup ----
  const customerA = await makeUser('custA', 'customer')
  const customerB = await makeUser('custB', 'customer')
  const staff = await makeUser('staff', 'staff')
  const admin = await makeUser('admin', 'admin')
  const customerAClient = (await login(customerA.email)).client
  const staffSession = await login(staff.email)
  const adminSession = await login(admin.email)

  // ---- signup trigger ----
  const signupEmail = emailFor('signup')
  let signupUserId = null
  await check('signup creates a customer profile', async () => {
    // Hosted Auth may reject example.com on the public signUp endpoint; fall back to the
    // admin API, which fires the same auth.users insert trigger.
    const { data, error } = await anon().auth.signUp({
      email: signupEmail,
      password: PASSWORD,
      options: { data: { full_name: 'Signup Test', role: 'admin' } },
    })
    if (error && /invalid|rate limit/i.test(error.message)) {
      const r = await makeUser('signup', 'customer', { role: 'admin' })
      signupUserId = r.id
      note = 'public signUp unavailable (example.com rejected or email rate limit); used admin API'
    } else {
      assert(!error, `signUp failed: ${error?.message}`)
      signupUserId = data.user.id
      createdUserIds.push(signupUserId)
    }
    const { data: p } = await service.from('profiles').select('role, email').eq('id', signupUserId).single()
    assert(p?.role === 'customer', `role was ${p?.role}`)
    const { data: c } = await service.from('customers').select('user_id').eq('email', signupEmail).single()
    assert(c?.user_id === signupUserId, 'customers row not created/linked')
  })

  await check('client-supplied role in metadata is ignored', async () => {
    const evil = await makeUser('evil', 'customer', { role: 'admin', user_role: 'admin' })
    const { data: p } = await service.from('profiles').select('role').eq('id', evil.id).single()
    assert(p?.role === 'customer', `role was ${p?.role}`)
  })

  await check('signup links an existing customers row by email', async () => {
    const email = emailFor('prelinked')
    const { data: row, error } = await service
      .from('customers')
      .insert({ name: 'Pre Existing', email })
      .select('id')
      .single()
    assert(!error, error?.message)
    const { data, error: e2 } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    assert(!e2, e2?.message)
    createdUserIds.push(data.user.id)
    const { data: rows } = await service.from('customers').select('id, user_id').eq('email', email)
    assert(rows.length === 1, `expected 1 customers row, got ${rows.length}`)
    assert(rows[0].id === row.id && rows[0].user_id === data.user.id, 'existing row not linked')
  })

  // ---- RLS ----
  await check('customer cannot read other profiles', async () => {
    const { data, error } = await customerAClient.from('profiles').select('id')
    assert(!error, error?.message)
    assert(data.length === 1 && data[0].id === customerA.id, `saw ${data.length} profiles`)
    const { data: other } = await customerAClient.from('profiles').select('id').eq('id', customerB.id)
    assert(other.length === 0, 'could read another customer profile')
  })

  await check('customer reads only own customers row', async () => {
    const { data, error } = await customerAClient.from('customers').select('email')
    assert(!error, error?.message)
    assert(data.length === 1 && data[0].email === customerA.email, `saw ${data.length} customers`)
  })

  await check('customer cannot update own role', async () => {
    await customerAClient.from('profiles').update({ role: 'admin' }).eq('id', customerA.id)
    const { data: p } = await service.from('profiles').select('role').eq('id', customerA.id).single()
    assert(p.role === 'customer', `role is now ${p.role}`)
  })

  await check('customer can update own full_name', async () => {
    const { error } = await customerAClient.from('profiles').update({ full_name: 'Renamed' }).eq('id', customerA.id)
    assert(!error, error?.message)
  })

  await check('staff cannot update a role either', async () => {
    await staffSession.client.from('profiles').update({ role: 'admin' }).eq('id', staff.id)
    const { data: p } = await service.from('profiles').select('role').eq('id', staff.id).single()
    assert(p.role === 'staff', `role is now ${p.role}`)
  })

  await check('staff can read all profiles and customers', async () => {
    const { data, error } = await staffSession.client.from('profiles').select('id').in('id', [customerA.id, customerB.id, admin.id])
    assert(!error && data.length === 3, `saw ${data?.length}`)
  })

  await check('anon cannot read profiles or customers', async () => {
    const a = await anon().from('profiles').select('id')
    const b = await anon().from('customers').select('id')
    assert(a.error || a.data.length === 0, 'anon read profiles')
    assert(b.error || b.data.length === 0, 'anon read customers')
  })

  // ---- create-staff ----
  await check('create-staff without token returns 401', async () => {
    const r = await callCreateStaff(null, { email: emailFor('x'), full_name: 'X', password: PASSWORD })
    assert(r.status === 401, `status ${r.status}`)
  })

  await check('staff cannot call create-staff (403)', async () => {
    const r = await callCreateStaff(staffSession.token, { email: emailFor('x2'), full_name: 'X', password: PASSWORD })
    assert(r.status === 403, `status ${r.status}`)
  })

  await check('customer cannot call create-staff (403)', async () => {
    const { token } = await login(customerB.email)
    const r = await callCreateStaff(token, { email: emailFor('x3'), full_name: 'X', password: PASSWORD })
    assert(r.status === 403, `status ${r.status}`)
  })

  const newStaffEmail = emailFor('newstaff')
  await check('admin can create staff and the new staff can log in', async () => {
    const r = await callCreateStaff(adminSession.token, { email: newStaffEmail, full_name: 'New Staff', password: PASSWORD })
    assert(r.status === 201, `status ${r.status} ${JSON.stringify(r.json)}`)
    assert(r.json?.user?.role === 'staff', 'response role is not staff')
    createdUserIds.push(r.json.user.id)
    const { client } = await login(newStaffEmail)
    const { data: me } = await client.from('profiles').select('role, full_name').eq('id', r.json.user.id).single()
    assert(me?.role === 'staff' && me?.full_name === 'New Staff', `profile: ${JSON.stringify(me)}`)
    const { data: cust } = await service.from('customers').select('id').eq('email', newStaffEmail)
    assert(cust.length === 0, 'staff got a customers row')
  })

  await check('weak password rejected by create-staff', async () => {
    for (const pw of ['short1!A', 'alllowercase!1', 'NOLOWERCASE!1', 'NoSpecial123456']) {
      const r = await callCreateStaff(adminSession.token, { email: emailFor('weak'), full_name: 'W', password: pw })
      assert(r.status === 400 && r.json?.error?.code === 'weak_password', `"${pw}" -> ${r.status} ${JSON.stringify(r.json)}`)
    }
  })

  await check('duplicate email rejected by create-staff', async () => {
    const r = await callCreateStaff(adminSession.token, { email: newStaffEmail, full_name: 'Dup', password: PASSWORD })
    assert(r.status === 409 && r.json?.error?.code === 'duplicate_email', `status ${r.status} ${JSON.stringify(r.json)}`)
  })

  await check('duplicate email rejected by public signup', async () => {
    const { error } = await anon().auth.signUp({ email: customerA.email, password: PASSWORD })
    // Supabase may return an obfuscated success when confirmations are on; then no new user exists.
    const { count } = await service.from('profiles').select('id', { count: 'exact', head: true }).eq('email', customerA.email)
    assert(error || count === 1, `profiles with email: ${count}`)
  })
}

async function cleanup() {
  for (const id of createdUserIds) {
    await service.auth.admin.deleteUser(id)
  }
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
