# Backend API contract

Contract between the database / Edge Function and the frontend. SPEC.md is the source of truth; this file is updated at the end of every Part.

Last updated: **Part 3 (Subscriptions)**; section 6 is new, `plans_public` gained columns in 5.3. Sections 1 to 4 are Part 1 (auth, profiles, customers, `create-staff`); section 5 is the Part 2 catalog.

Project URL and keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the publishable key). The frontend never uses the secret / service-role key.

## 1. Password rule (exact)

- At least 9 characters (more than 8), at least one lowercase letter, one uppercase letter, one special (non-alphanumeric) character. No digit is required.
- Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`
- Message: `Password must be at least 9 characters and include an uppercase letter, a lowercase letter and a special character.`
- Client: implement the same regex in the frontend (for example `frontend/src/utils/validators.js`). Server: `create-staff` re-validates the same regex. Supabase Auth minimum length is 9 (set in `supabase/config.toml` and must also be set in Dashboard > Authentication > Sign In / Providers > Email; Supabase's own "required characters" option stays off).

## 2. Auth flow

All through `supabase.auth` (supabase-js).

| Flow | Call | Notes |
|---|---|---|
| Signup | `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` | Always creates a `customer`. The role is never read from the form or metadata. `full_name` in metadata is optional and used for the profile and customer name. |
| Login | `supabase.auth.signInWithPassword({ email, password })` | Then read the role (below) and redirect: `admin`/`staff` to `/app`, `customer` to `/portal`. |
| Forgot password | `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })` | `<origin>/reset-password` must be in Dashboard > Authentication > URL Configuration > Redirect URLs. |
| Reset password | On `/reset-password` the session is a recovery session; call `supabase.auth.updateUser({ password })` after `validatePassword`. | |
| Logout | `supabase.auth.signOut()` | |
| Current role | `supabase.from('profiles').select('role, full_name, is_active').eq('id', user.id).single()` | Own row is always readable. Inactive profiles (`is_active = false`) resolve to no role in RLS and see no data. |

Duplicate email: Auth rejects it (`User already registered`). If "Confirm email" is enabled on the project, a duplicate signup may return an obfuscated success without a new user; show a generic "check your email" message in that case.

On every signup a database trigger creates the `profiles` row (role `customer`) and either links an existing `customers` row with the same email (sets `user_id`) or creates a new one.

The first admin is set manually: see `supabase/seed-admin.sql.example`.

## 3. Table access by role

`anon` has no access to any table. "Own" = the row belonging to `auth.uid()`.

### profiles
Columns: `id`, `email`, `full_name`, `role` (`admin` | `staff` | `customer`), `is_active`, `created_at`.

| | admin | staff | customer |
|---|---|---|---|
| select | all rows | all rows | own row |
| insert | no (trigger only) | no | no |
| update | any row (not `role`, not `id`) | own row (`full_name` only) | own row (`full_name` only) |
| delete | no | no | no |

`role`, `id` and `is_active` can never be changed by a direct client update, by anyone (admins included). Such an update fails with Postgres error `42501`. Only admins may change `email`. Roles change only via SQL (first admin) or the `create-staff` function. `is_active` changes only through `set_user_active` (below).

**Deactivated users (`is_active = false`) have no access at all**, including to their own profile and customer row: every query returns an empty result and `current_role()` returns null. They can still sign in to Supabase Auth, so after login, if `profiles` returns no row for the signed-in user, show "Your account is inactive or has no access. Contact an admin." and sign them out. The shared public catalog views (`products_public`, ...) are reference data and stay readable.

#### Function `set_user_active(user_id uuid, active boolean) returns profiles`

Admin only. Sets `profiles.is_active` and changes nothing else (no role change). Returns the updated profile row.

```js
const { data: profile, error } = await supabase.rpc('set_user_active', { user_id: staffId, active: false })
// data: { id, email, full_name, role, is_active, created_at }
```

| `error.code` | Message | When |
|---|---|---|
| `42501` | Only an admin can activate or deactivate accounts | caller is not an active admin (staff, customer, deactivated admin, anon) |
| `22023` | You cannot deactivate your own account | admin passes their own id with `active: false` |
| `P0002` | User not found | no such profile |

Admins can deactivate other admins. Hide the toggle for your own row in the UI.

### customers
Columns: `id`, `user_id` (nullable, unique, FK profiles), `name`, `email` (unique), `phone`, `company`, `address`, `created_at`.

| | admin | staff | customer |
|---|---|---|---|
| select | all | all | own row (`user_id = auth.uid()`) |
| insert / update / delete | yes | yes | no |

A customer without a login has `user_id = null` and is linked when that email signs up. Email matching is case-insensitive; the trigger stores lowercase emails, so store customer emails in lowercase.

Helper SQL functions (callable by signed-in users, e.g. `supabase.rpc('current_role')`): `public.current_role()` returns the caller's role or null (null for inactive users); `public.is_staff_or_admin()` returns boolean (false for inactive users); `public.is_active_user()` returns whether the caller's profile is active.

## 4. Edge Function `create-staff`

Admin only. `POST {SUPABASE_URL}/functions/v1/create-staff`

Call from the frontend:

```js
const { data, error } = await supabase.functions.invoke('create-staff', {
  body: { email, full_name, password },
})
```

`supabase.functions.invoke` sends the logged-in user's JWT automatically. With plain `fetch`, send `Authorization: Bearer <access_token>` and `apikey: <anon key>`. For non-2xx responses `error` is a `FunctionsHttpError`; read the JSON with `await error.context.json()`.

Request body (JSON):

| Field | Rules |
|---|---|
| `email` | required, valid email, trimmed and lowercased |
| `full_name` | required, non-empty |
| `password` | required, must satisfy the password rule above |

Success: `201`

```json
{ "user": { "id": "uuid", "email": "staff@example.com", "full_name": "Jane Doe", "role": "staff" } }
```

The staff user is email-confirmed and can log in immediately. No `customers` row is created for staff.

Errors: always `{ "error": { "code": string, "message": string, "field"?: string } }`

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_email` | email not valid (`field: "email"`) |
| 400 | `invalid_input` | body not JSON, or `full_name` empty (`field: "full_name"`) |
| 400 | `weak_password` | password breaks the rule (`field: "password"`) |
| 401 | `unauthorized` | missing, invalid or expired token |
| 403 | `forbidden` | caller is not an active admin (staff and customers get this) |
| 405 | `method_not_allowed` | not POST |
| 409 | `duplicate_email` | email already registered (`field: "email"`) |
| 500 | `internal_error` / `server_misconfigured` | unexpected failure (a half-created user is rolled back) |

CORS: `Access-Control-Allow-Origin: *`, headers `authorization, x-client-info, apikey, content-type`, methods `POST, OPTIONS`.

### 4.1 Edge Function `invite-staff` (status: written by the frontend teammate, needs fixes)

`POST {SUPABASE_URL}/functions/v1/invite-staff`, admin only. It is deployed on the hosted project but is **not in this repo** (it exists on the `Abdullah` and `sanskar` branches only). Prefer `create-staff` (section 4), which is the SPEC section 8 design. Behaviour of the deployed version, as reviewed:

Request: `{ "email": string, "full_name": string, "redirectTo": string }`. Sends a Supabase invite email; the invited user follows the link, lands on `redirectTo`, and sets their own password there (the 9-character rule is then enforced only by the frontend form and the Auth minimum length, not server-side). `redirectTo` is honoured only if it is in the project's Redirect URLs list (Dashboard > Authentication > URL Configuration).

| Status | Body | When |
|---|---|---|
| 200 | `{ "message": string, "user": { "id", "email", "full_name", "role": "staff" } }` | invited |
| 400 | `{ "error": string }` | invalid email, missing name, duplicate email (Auth message "already been registered"), email rate limit exceeded |
| 401 | `{ "error": string }` | missing or invalid token |
| 403 | `{ "error": string }` | caller is not an admin |
| 500 | `{ "error": string }` | misconfiguration, malformed JSON body, or profile update failure |

Errors here are `{ "error": string }`, unlike `create-staff`'s `{ "error": { code, message } }`.

Known problems (open):
- It upserts `profiles.updated_at`, which no longer exists, so after the schema change the profile step fails and the function deletes the user it just invited. A successful invite is not currently possible.
- It does not remove the `customers` row the signup trigger creates, so invited staff would appear in customers (and a rolled-back invite leaves an orphan customers row).
- It does not check `profiles.is_active`.

`scripts/tests/part1.mjs` covers it: no token 401, staff 403, customer 403, duplicate email rejected (pass today), and "admin invite creates staff with no customers row" (cannot pass until the function is fixed; it can also be blocked by Supabase's built-in email rate limit, which allows only a few auth emails per hour).

## 5. Catalog (Part 2)

Money columns are `numeric(12,2)`. supabase-js returns them as numbers or strings depending on size; format for display only, never do money math in JS (the database is the source of truth). Every table has `id uuid` and `created_at`.

### 5.1 Who can do what

| | admin | staff | customer |
|---|---|---|---|
| Catalog tables (below): select | yes | yes | **no (empty result)** |
| Catalog tables: insert / update / delete | yes | **no** | no |
| `products_public`, `variants_public`, `plans_public` views: select | yes | yes | yes (active rows only) |
| `effective_price` rpc | yes | yes | no (errors "Product not found") |
| `plan_is_available` rpc | yes | yes | yes |

`anon` (not logged in) can read nothing here.

A denied write is not always an error: an INSERT by staff/customer fails with `42501` ("new row violates row-level security policy"), but an UPDATE or DELETE on rows they cannot touch succeeds with **zero rows affected**. Always `.select()` after update/delete and treat an empty result as "not allowed" (see 5.5).

### 5.2 Tables

**taxes**: `name`, `rate_type` (`percent` | `fixed`), `rate` (>= 0; percent <= 100), `is_active` (default true).

**payment_terms**: `name`, `days` (>= 0).

**products**: `name`, `type` (`service` | `goods` | `software`), `sales_price` (>= 0), `cost_price` (>= 0, default 0, **staff/admin only**), `notes`, `tax_id` (nullable FK taxes), `is_active`.

**product_variants**: `product_id` (FK, deleted with the product), `attribute_name` (default `Brand`), `value`, `extra_price` (>= 0, default 0). Unique on (`product_id`, `attribute_name`, `value`).

**plans**: `name`, `price` (>= 0, default 0), `billing_period` (`daily` | `weekly` | `monthly` | `yearly`), `min_quantity` (>= 1, default 1), `available_from` / `available_to` (dates, null = open-ended; `available_from <= available_to` when both set), `tax_id`, flags `auto_close`, `closable`, `pausable`, `renewable` (all default false), `is_active`.

**discounts**: `name`, `type` (`fixed` | `percent`), `value` (> 0; percent <= 100), `applies_to` (`product` | `subscription`), `product_id` (required when `applies_to = 'product'`), `min_purchase` (>= 0, default 0), `min_quantity` (>= 0, default 0), `start_date`, `end_date` (null = open; `end_date >= start_date`), `usage_limit` (null = unlimited, else > 0), `times_used` (default 0, do not set from the client), `is_active`.

**quotation_templates**: `name`, `plan_id` (FK plans), `validity_days` (> 0), `payment_term_id` (FK payment_terms), `notes`.

**quotation_template_lines**: `template_id` (FK, deleted with the template), `product_id` (FK), `variant_id` (nullable; when set it must be a variant of `product_id`), `quantity` (> 0, default 1).

Deleting a tax, plan, payment term or product that is still referenced fails with `23503` (foreign key); set `is_active = false` instead.

### 5.3 Public views (what customers read)

Fixed columns, active rows only. They never contain `cost_price`, `sales_price`, `notes`, tax or dates (`plans_public` additionally shows the non-secret plan price, minimum quantity and action flags).

| View | Columns |
|---|---|
| `products_public` | `id`, `name`, `type` |
| `variants_public` | `id`, `product_id`, `attribute_name`, `value` (only for active products) |
| `plans_public` | `id`, `name`, `billing_period`, `price`, `min_quantity`, `closable`, `pausable`, `renewable`, `auto_close` (added in Part 3 so customers can show the right buttons) |

Selecting any other column from these views is an error. Staff and admin should read the real tables, not these views.

### 5.4 Functions

**`effective_price(p_product_id uuid, p_variant_id uuid default null) returns numeric`**: `products.sales_price + product_variants.extra_price` (extra is 0 with no variant). Staff and admin only.
Errors: `Product not found` (`P0002`; also what a customer gets); `Variant does not belong to this product` (`22023`).

**`plan_is_available(p_plan_id uuid, p_on_date date default current_date) returns boolean`**: true when the plan is active and `available_from <= date <= available_to` (null bounds are open-ended, both ends inclusive). Unknown or inactive plans return false (no error). Callable by every signed-in role.

### 5.5 supabase-js examples

```js
// Read (staff/admin): products with their variants and tax
const { data, error } = await supabase
  .from('products')
  .select('id, name, type, sales_price, cost_price, is_active, tax:taxes(name, rate_type, rate), variants:product_variants(id, attribute_name, value, extra_price)')
  .order('name')
  .range(0, 24) // paginate every list (25 per page)

// Read (customer): public views only
const { data: prods } = await supabase.from('products_public').select('id, name, type')
const { data: variants } = await supabase.from('variants_public').select('*').eq('product_id', productId)
const { data: plans } = await supabase.from('plans_public').select('*')

// Create (admin)
const { data: product, error: e1 } = await supabase
  .from('products')
  .insert({ name: 'ERP Suite', type: 'software', sales_price: 4999, cost_price: 3200, tax_id })
  .select()
  .single()

const { error: e2 } = await supabase
  .from('product_variants')
  .insert({ product_id: product.id, value: 'Odoo', extra_price: 560 }) // attribute_name defaults to 'Brand'

// Update (admin). Check that a row came back.
const { data: updated, error: e3 } = await supabase
  .from('plans').update({ pausable: true }).eq('id', planId).select()
if (!e3 && updated.length === 0) { /* not allowed (staff/customer) or id not found */ }

// Effective price (staff/admin): Odoo variant gives sales_price + 560
const { data: price, error: e4 } = await supabase
  .rpc('effective_price', { p_product_id: productId, p_variant_id: variantId })

// Plan availability (any signed-in role); date is optional, defaults to today
const { data: ok } = await supabase.rpc('plan_is_available', { p_plan_id: planId, p_on_date: '2026-12-01' })
```

### 5.6 Error cases

Supabase returns `error.code` (Postgres SQLSTATE) and `error.message`. Show a friendly message per code:

| `error.code` | Cause |
|---|---|
| `42501` | not allowed by RLS (staff/customer insert) |
| `23514` | a CHECK failed: negative price, `min_quantity < 1`, `available_from > available_to`, discount `value <= 0`, percent discount over 100, product discount without `product_id`, `end_date < start_date`, `usage_limit <= 0`, `validity_days <= 0`, line `quantity <= 0`. `error.message` names the constraint, for example `discounts_percent_max` |
| `23505` | unique violation: duplicate variant (same product, attribute and value) |
| `23503` | foreign key: variant not belonging to the line's product, or deleting something still in use |
| `P0002` | `effective_price`: product not found (or hidden from the caller) |
| `22023` | `effective_price`: variant does not belong to the product |

### 5.7 Seed data

`supabase/seed/catalog.sql` (idempotent) loads: taxes GST 18%, GST 5%, No tax; payment terms Immediate, Net 15, Net 30; products ERP Suite (variants Odoo +560, Zoho +300), CRM Cloud (HubSpot +400, Salesforce +900), Consulting Hours, Office Router, Training Pack; plans Monthly Basic, Yearly Pro, Weekly Trial, Daily Test (flags mixed); discounts "Launch 10% off ERP Suite", "Flat 500 off", "Early Bird 15% (expired)"; templates "Starter Monthly Bundle" and "ERP Yearly Package" with lines. Run: `npx supabase db query --linked -f supabase/seed/catalog.sql`.

## 6. Subscriptions (Part 3)

### 6.1 Tables

| Table | Columns | admin / staff | customer |
|---|---|---|---|
| `subscriptions` | `id`, `number` (`SUB-00001`), `customer_id`, `plan_id`, `template_id`, `status`, `start_date`, `expiry_date`, `next_billing_date`, `payment_term_id`, `quotation_valid_until`, `created_by`, `notes` | select, insert, update, delete (never `status`, `number`, `created_by`, `next_billing_date`) | select own |
| `subscription_lines` | `id`, `subscription_id`, `product_id`, `variant_id`, `quantity`, `unit_price`, `tax_id`, `amount` | select, insert, update, delete (only while subscription is `draft`/`quotation`) | select own |
| `subscription_discounts` | `subscription_id`, `discount_id` | select, delete; attach only via `attach_discount` | none |
| `subscription_status_log` | `id`, `subscription_id`, `from_status`, `to_status`, `changed_by`, `changed_at` | select | select own |

`status` is one of `draft`, `quotation`, `confirmed`, `active`, `paused`, `closed`. "Own" = the subscription's customer is the signed-in user; deactivated users see nothing. A client-created subscription always starts as `draft`, `expiry_date` defaults to `start_date` + 1 year, and `unit_price`, `tax_id` and `amount` on a line are always computed by the database (values you send are ignored). Direct `update ... status` fails with `42501` for every role.

### 6.2 Functions

| Signature | Who | Returns |
|---|---|---|
| `create_subscription_from_template(p_template_id uuid, p_customer_id uuid, p_start_date date default current_date)` | admin, staff | the new `subscriptions` row (draft) with lines copied at current effective prices |
| `transition_subscription(sub_id uuid, new_status sub_status)` | see table below | the updated `subscriptions` row; writes a log row |
| `attach_discount(p_subscription_id uuid, p_discount_id uuid)` | admin, staff | the `subscription_discounts` row |

### 6.3 Transitions

| From -> To | Who | Conditions |
|---|---|---|
| `draft` -> `quotation` | admin, staff | at least one line; sets `quotation_valid_until` = today + template `validity_days` (30 without a template) |
| `quotation` -> `confirmed` | admin, staff | quotation not expired |
| `confirmed` -> `active` | admin, staff | sets `next_billing_date` = `start_date` |
| `active` -> `paused`, `paused` -> `active` | admin, staff, owning customer | `plan.pausable` (everyone) |
| `active`/`paused` -> `closed` | admin, staff, owning customer | owning customer needs `plan.closable`; admin and staff can always close |
| `active` -> `active` (renew) | admin, staff, owning customer | `plan.renewable`; extends `expiry_date` by the current term (`expiry_date - start_date`) |

Anything else is rejected with `Invalid transition from X to Y`. Customers use the flags from `plans_public` (`pausable`, `closable`, `renewable`) to show or hide buttons.

### 6.4 Errors (`error.code`: `error.message`)

| Code | Message |
|---|---|
| `42501` | `Only staff or admin can ...` (customer on a staff step, or any non-staff on create/attach) |
| `42501` | `Status can only be changed with transition_subscription()` (direct update; also `A new subscription must start as draft`) |
| `42501` | `This plan does not allow pausing` / `...early closing` / `...renewal` |
| `22023` | `Invalid transition from draft to active` |
| `22023` | `Add at least one line before sending a quotation` |
| `22023` | `Quotation has expired` |
| `22023` | `Plan "Name" is not available today` |
| `22023` | `Quantity 1 is below the minimum of 2 for plan "Name"` |
| `22023` | `Lines can only be changed while the subscription is a draft or quotation` |
| `22023` | `Only subscription-level discounts can be attached` / `Discount is not active` / `Cannot attach discounts to a closed subscription` |
| `23505` | `Discount is already attached to this subscription` |
| `P0002` | `Subscription not found` (also what a customer gets for someone else's), `Template not found`, `Customer not found`, `Discount not found` |

### 6.5 supabase-js examples

```js
// 1. Staff: create from a template, then move it forward
const { data: sub, error } = await supabase.rpc('create_subscription_from_template', {
  p_template_id: templateId, p_customer_id: customerId, p_start_date: '2026-11-01',
})
const { data: quoted, error: e2 } = await supabase.rpc('transition_subscription', { sub_id: sub.id, new_status: 'quotation' })

// 2. Customer: list own subscriptions with plan flags (plans_public), then pause one
const { data: mine } = await supabase
  .from('subscriptions')
  .select('id, number, status, expiry_date, plan_id')
  .order('created_at', { ascending: false })
  .range(0, 24)
const { data: plans } = await supabase.from('plans_public').select('*').in('id', mine.map((s) => s.plan_id))
const { error: e3 } = await supabase.rpc('transition_subscription', { sub_id: mine[0].id, new_status: 'paused' })

// 3. Staff: subscription detail with lines, log and attach a discount
const { data: detail } = await supabase
  .from('subscriptions')
  .select('*, lines:subscription_lines(*), log:subscription_status_log(*)')
  .eq('id', subId).single()
const { error: e4 } = await supabase.rpc('attach_discount', { p_subscription_id: subId, p_discount_id: discountId })
```

## 7. Billing and payments (Part 4, smallest version)

Clients only get SELECT on these tables; every write goes through a function. Staff/admin see all rows, a customer only their own (and only while active). Money is `numeric(12,2)`.

**Tables:** `invoices` (`number` INV-00001, `subscription_id`, `customer_id`, `period_start`, `period_end`, `issue_date`, `due_date`, `status` draft/confirmed/paid/cancelled, `subtotal`, `discount_total`, `tax_total`, `total`, `amount_paid`, `sent_at`; unique `(subscription_id, period_start)`), `invoice_lines` (`invoice_id`, `kind` plan_fee/product, `product_id`, `description`, `quantity`, `unit_price`, `base_amount`, `discount_amount`, `tax_id`, `tax_amount`, `line_total`), `payments` (`invoice_id`, `method` cash/bank_transfer/card/upi/cheque/other, `amount`, `payment_date`, `note`, `recorded_by`).

**Functions** (staff/admin only, else `42501`; call with `supabase.rpc(name, {named args})`):
- `generate_invoice(sub_id uuid, period_start date) returns uuid`: plan fee line + one line per subscription line, best product-level discount, tax per line on the net, due date from the payment term. Called twice for one period it returns the same id and changes nothing.
- `run_billing(as_of date default current_date) returns table(created, skipped, errors)`: bills active subscriptions with `next_billing_date <= as_of`, catching up missed periods and advancing `next_billing_date`. Safe to run twice.
- `invoice_confirm(invoice_id)` draft to confirmed; `invoice_cancel(invoice_id)` (not if paid or has payments); `invoice_send(invoice_id)` sets `sent_at`. Each returns the invoice row.
- `record_payment(invoice_id uuid, method payment_method, amount numeric, payment_date date default current_date, note text default null) returns payments`: invoice must be confirmed, `0 < amount <= outstanding`; flips the invoice to `paid` when fully paid.

**Views** (run with the caller's RLS): `v_invoice_summary` (invoice + `customer_name`, `customer_email`, `subscription_number`, `outstanding`, `is_overdue`), `v_overdue_invoices` (`days_overdue`, `outstanding`), `v_dashboard_summary` (one row: `active_subscriptions`, `total_revenue`, `outstanding_amount`, `overdue_count`, `overdue_amount`).

**Errors (`error.message`):** `Payments can only be recorded on a confirmed invoice (this one is draft)`, `Payment of X is more than the outstanding amount of Y`, `Payment amount must be greater than 0`, `Only a draft invoice can be confirmed ...`, `A paid invoice cannot be cancelled`, `Invoice not found` (`P0002`).

```js
await supabase.rpc('run_billing')                       // [{ created, skipped, errors }]
await supabase.rpc('record_payment', { invoice_id, method: 'upi', amount: '500.00', note: 'part' })
const { data } = await supabase.from('v_dashboard_summary').select('*').single()
```

Demo data: `supabase/seed/demo.sql` (idempotent, `DEMO-` customers).

## 8. Not built yet

Subscription-level discounts at invoice time, pg_cron schedule, monthly revenue view.
