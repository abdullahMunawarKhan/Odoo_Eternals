# Brightloop Subscription Management System: SPEC

Hackathon build, deadline 4:00 PM. One source of truth for every Claude Code session. If code and spec disagree, fix the spec first, then the code.

## 0. Stack and ground rules

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + React Router |
| Data fetching | Supabase JS client + TanStack Query |
| Charts | Recharts |
| Auth | Supabase Auth (email + password, reset by email) |
| Database | Supabase PostgreSQL |
| Access control | Row Level Security (RLS), role in `profiles.role` |
| Business logic | Postgres functions (plpgsql) |
| Admin-only staff creation | One Supabase Edge Function (`create-staff`) |
| Scheduling | `pg_cron` + "Run billing now" admin button |
| Hosting | Vercel (frontend) + Supabase |
| Migrations | SQL files in `supabase/migrations/` |

Rules:
1. No separate backend server. Sensitive logic lives in Postgres functions or the Edge Function.
2. The service-role key is used only inside the Edge Function. Never in the frontend, never committed.
3. All money columns are `numeric(12,2)`. No floats anywhere, including JS (use integer paise or a decimal helper for display math only; the database is the source of truth for totals).
4. Every table has RLS enabled. No table is readable by `anon`.
5. Business-critical writes (generate invoice, record payment, status transitions, apply discount) go through functions, not direct table updates from the client.
6. Every list page is paginated (default 25) and filtered server-side. Target: every page responds in under 2 seconds with 5,000+ subscriptions.
7. Realtime on the dashboard is a bonus. Do it last, only if everything else works.

## 1. Roles and permissions

Exactly three roles: `admin`, `staff`, `customer`. The Finance Lead is an admin or staff user who uses the dashboard. Not a fourth role.

| Capability | Admin | Staff | Customer |
|---|---|---|---|
| Create staff accounts | Yes | No | No |
| Products, variants, plans, taxes, payment terms (edit) | Yes | Read only | No |
| Discount rules (create/edit) | Yes | Read only | No |
| Quotation templates (edit) | Yes | Read only (can use them) | No |
| Customers (create/edit) | Yes | Yes | Own record, read only |
| Subscriptions (create, move through lifecycle) | Yes | Yes | Own only: view, and close / pause / renew only if the plan flag allows |
| Attach discount to a subscription | Yes | Yes | No |
| Invoices (generate, confirm, cancel, send, print) | Yes | Yes | Own only: view and print |
| Payments (record) | Yes | Yes | Own only: view |
| Run billing now | Yes | Yes | No |
| Dashboard and reports | Yes | Yes | No |

Role rules:
- Public signup always creates a `customer`. The role is never read from the signup form or user metadata sent by the client.
- Staff are created only by the `create-staff` Edge Function, which first verifies the caller is an admin.
- The first admin is created by manually setting `profiles.role = 'admin'` in the database.
- Helper SQL functions used in RLS: `public.current_role()` and `public.is_staff_or_admin()`, both `security definer` with a fixed `search_path`.

## 2. Authentication rules

- Email must be unique (Supabase Auth enforces it).
- Password: more than 8 characters (so minimum 9), at least one uppercase letter, one lowercase letter, one special character.
  - Set the Supabase Auth minimum password length to 9.
  - Validate the full rule client-side with a shared regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`
  - The `create-staff` Edge Function re-validates the same rule server-side.
  - Note: Supabase's built-in "required characters" option also demands a digit, which the brief does not, so we do not use it. Client regex plus the minimum length is the rule.
- Forgot password: "Forgot password" page calls `resetPasswordForEmail`, and the email link lands on `/reset-password`, where the user sets a new password (same validation).
- Login redirects by role: admin/staff go to `/app`, customer goes to `/portal`.
- A trigger on `auth.users` insert creates the `profiles` row (role `customer`) and links or creates a `customers` row (match by email, otherwise create).

## 3. Data model

Use `uuid` primary keys (`gen_random_uuid()`) and `created_at timestamptz default now()` on every table unless noted.

### 3.1 Identity

**profiles**: `id` (pk, references auth.users on delete cascade), `email`, `full_name`, `role` (enum `user_role`: admin, staff, customer; default customer), `is_active` bool default true.

**customers**: `id`, `user_id` (nullable, unique, references profiles), `name`, `email` (unique), `phone`, `company`, `address`. A customer may exist without a login (staff create it for a quote), and gets linked when that email signs up.

### 3.2 Catalog

**taxes**: `id`, `name`, `rate_type` (enum: percent, fixed), `rate` numeric, `is_active`.
Seed: GST 18% (percent), GST 5% (percent), No tax (0).

**products**: `id`, `name`, `type` (enum: service, goods, software), `sales_price`, `cost_price`, `notes`, `tax_id` (nullable), `is_active`.

**product_variants**: `id`, `product_id`, `attribute_name` (default `Brand`), `value`, `extra_price` numeric default 0. One attribute per product for now. Example: product "ERP Suite", attribute Brand, value Odoo, extra_price 560.

Effective unit price = `products.sales_price + product_variants.extra_price` (extra is 0 when no variant). Cost price is never exposed to customers and is used for margin on the dashboard.

**plans**: `id`, `name`, `price` numeric (base recurring fee, may be 0), `billing_period` (enum: daily, weekly, monthly, yearly), `min_quantity` int default 1, `available_from` date, `available_to` date, `tax_id` nullable, and four admin flags:
- `auto_close` bool: subscription closes automatically at expiry
- `closable` bool: can be closed early
- `pausable` bool: can be paused and resumed
- `renewable` bool: can be renewed
- `is_active` bool

**payment_terms**: `id`, `name`, `days` int. Seed: Immediate (0), Net 15 (15), Net 30 (30).

**discounts**: `id`, `name`, `type` (enum: fixed, percent), `value`, `applies_to` (enum: product, subscription), `product_id` (nullable; required when applies_to = product), `min_purchase` numeric default 0, `min_quantity` int default 0, `start_date`, `end_date`, `usage_limit` int (nullable = unlimited), `times_used` int default 0, `is_active`.

**quotation_templates**: `id`, `name`, `plan_id`, `validity_days` int, `payment_term_id`, `notes`.
**quotation_template_lines**: `id`, `template_id`, `product_id`, `variant_id` nullable, `quantity`.

### 3.3 Subscriptions

**subscriptions**: `id`, `number` (unique, `SUB-00001` from a sequence), `customer_id`, `plan_id`, `template_id` nullable, `status` (enum `sub_status`: draft, quotation, confirmed, active, paused, closed), `start_date`, `expiry_date`, `next_billing_date` (nullable), `payment_term_id`, `quotation_valid_until` date nullable, `created_by`, `notes`.

**subscription_lines**: `id`, `subscription_id`, `product_id`, `variant_id` nullable, `quantity`, `unit_price` (snapshot of effective price at the time of adding), `tax_id` nullable, `amount` (quantity x unit_price, before discount and tax).

**subscription_discounts**: `subscription_id`, `discount_id` (primary key on both). Used only for `applies_to = subscription` discounts.

**subscription_status_log**: `id`, `subscription_id`, `from_status`, `to_status`, `changed_by`, `changed_at`. Written by the transition function only.

### 3.4 Billing

**invoices**: `id`, `number` (unique, `INV-00001`), `subscription_id`, `customer_id`, `period_start` date, `period_end` date, `issue_date`, `due_date` (issue_date + payment term days), `status` (enum `inv_status`: draft, confirmed, paid, cancelled), `subtotal`, `discount_total`, `tax_total`, `total`, `amount_paid` default 0, `sent_at` nullable.
Constraint: **unique (subscription_id, period_start)**. This is the "never billed twice" guarantee.

**invoice_lines**: `id`, `invoice_id`, `kind` (enum: plan_fee, product), `product_id` nullable, `description`, `quantity`, `unit_price`, `base_amount`, `discount_amount`, `tax_id` nullable, `tax_amount`, `line_total`.

**payments**: `id`, `invoice_id`, `method` (enum: cash, bank_transfer, card, upi, cheque, other), `amount` > 0, `payment_date`, `note`, `recorded_by`.

### 3.5 Indexes (required for the 2-second target)

- `subscriptions (status)`, `(customer_id)`, `(next_billing_date) where status = 'active'`
- `invoices (status)`, `(customer_id)`, `(due_date) where status = 'confirmed'`, `(subscription_id)`
- `payments (invoice_id)`, `(payment_date)`
- `invoice_lines (invoice_id)`, `subscription_lines (subscription_id)`
- `customers (email)`

## 4. Business rules

### 4.1 Plan rules
- A subscription can only be created on a plan where `available_from <= today <= available_to` (empty bounds mean open-ended). Enforced inside the database, with a clear error message.
- Every subscription line quantity must be at least the plan's `min_quantity`, otherwise reject with a clear message (no silent correction).
- Flags decide which actions exist:
  - `closable`: Close action available on active subscriptions, setting `closed` immediately.
  - `pausable`: `active <-> paused`. While paused, billing skips the subscription.
  - `renewable`: Renew action extends `expiry_date` by the length of the current term (`expiry_date - start_date`), and is allowed on active subscriptions near or past expiry.
  - `auto_close`: a daily job closes active subscriptions where `expiry_date < today`.

### 4.2 Subscription lifecycle

```
Draft -> Quotation -> Confirmed -> Active -> Closed
                                     |  ^
                                     v  |
                                   Paused        (only when plan.pausable)
```

| Transition | Who | Conditions |
|---|---|---|
| Draft -> Quotation | admin, staff | has at least one line; sets `quotation_valid_until = today + template validity_days` (default 30 if no template) |
| Quotation -> Confirmed | admin, staff | quotation not expired |
| Confirmed -> Active | admin, staff | sets `next_billing_date = start_date` |
| Active -> Paused / Paused -> Active | admin, staff, owning customer | plan.pausable |
| Active/Paused -> Closed | admin, staff, owning customer (customer needs plan.closable) | plan.closable for early close; auto_close job bypasses |
| Active -> Active (renew) | admin, staff, owning customer | plan.renewable |

Backward transitions other than Paused -> Active are not allowed. All transitions go through `transition_subscription(sub_id, new_status)`, which validates, updates, and writes the log row. Direct updates to `subscriptions.status` from the client are blocked by RLS.

Creating from a template: `create_subscription_from_template(template_id, customer_id, start_date)` copies the plan, payment term and lines (with current effective prices) into a new Draft subscription. Expiry date defaults to start_date + 1 year and is editable.

### 4.3 Pricing and invoice math (one defined order)

For each invoice, build lines like this:
1. **Plan fee line** (kind `plan_fee`): quantity 1, unit price = `plans.price` (skipped if price is 0).
2. **Product lines** (kind `product`): from `subscription_lines`, `base_amount = quantity x unit_price`.
3. **Line discount**: for each line, find the best eligible product-level discount (see 4.4). `discount_amount` = percent of base or fixed amount, never more than the base.
4. **Subscription discount**: if the subscription has an eligible attached discount, take the best one, compute its amount on the sum of (base - line discount), and **allocate it pro rata** across lines.
5. **Tax** per line on the net amount: `net = base - discounts`. Percent tax = `net x rate / 100`; fixed tax = `rate` (per line). Round to 2 decimals per line.
6. `line_total = net + tax_amount`.
7. Invoice totals are sums of the lines: `subtotal` = sum of base, `discount_total`, `tax_total`, `total = subtotal - discount_total + tax_total`.

Rounding: round at line level, then sum. Totals must always equal the sum of lines exactly.

### 4.4 Discount rules
- Only admin creates or edits discounts.
- Eligibility at invoice time (all must hold): `is_active`, today within `start_date`/`end_date`, `times_used < usage_limit` (or no limit), line quantity >= `min_quantity` (product-level) or subscription total quantity >= `min_quantity` (subscription-level), pre-discount amount >= `min_purchase`.
- **Product-level** discounts apply automatically to any matching product line on any subscription.
- **Subscription-level** discounts apply only to subscriptions they are attached to (via `subscription_discounts`), by admin or staff.
- At most one product-level discount per line (the one giving the largest amount) and at most one subscription-level discount per invoice.
- Each invoice that uses a discount increments `times_used` once per discount (inside the same transaction). When the limit is reached or the end date passes, the discount stops applying with no manual step.

### 4.5 Invoice lifecycle

```
Draft -> Confirmed -> Paid
   \         \
    +---------+--> Cancelled   (not allowed once Paid)
```

- Billing creates invoices as **Draft**. Staff can Confirm, Cancel, Send (sets `sent_at`; email is optional/mock) and Print (print-friendly page) any invoice.
- Confirming locks the amounts.
- Becomes **Paid** automatically when `amount_paid >= total` (set by the payment function).
- **Overdue** is not a status. It is computed: `status = 'confirmed' AND due_date < current_date AND amount_paid < total`.
- Cancelling a draft/confirmed invoice does not free its period (the unique constraint still holds), so the period is never silently re-billed. To rebill, staff create a new invoice manually from a cancelled one (stretch goal).

### 4.6 Billing engine (idempotent)

- `generate_invoice(sub_id uuid, period_start date) returns uuid`: builds the invoice and lines per 4.3, in one transaction. Uses `insert ... on conflict (subscription_id, period_start) do nothing`. If the conflict fires, returns the existing invoice id and changes nothing (no duplicate lines, no discount usage increment).
- `run_billing(as_of date default current_date) returns table(...)`: for every subscription with `status = 'active'` and `next_billing_date <= as_of` and `next_billing_date <= expiry_date`, loop: generate the invoice for `next_billing_date`, then advance `next_billing_date` by one billing period. Loops until caught up (so missed periods are not skipped). Returns a summary: created count, skipped (already existed), errors.
- Paused, closed and draft subscriptions are never billed.
- `period_end = period_start + 1 period - 1 day`.
- Safe to run twice in a row: the second run creates nothing.
- Scheduled with `pg_cron` daily at 01:00, and exposed as an admin/staff "Run billing now" button that calls the function via `supabase.rpc`.

### 4.7 Payments
- `record_payment(invoice_id, method, amount, payment_date, note)`: validates invoice is `confirmed` (or draft is auto-rejected with a message), amount > 0, amount <= outstanding. Inserts the payment, updates `amount_paid`, sets invoice to `paid` when fully paid.
- Partial payments allowed. Outstanding = `total - amount_paid`.
- Payments are never edited or deleted in the UI (corrections are a stretch goal).

### 4.8 Scheduled jobs (pg_cron)
- `run_billing()` daily.
- `close_expired_subscriptions()` daily: active subscriptions with `auto_close` plans and `expiry_date < today` become `closed` and log a row.
- Overdue needs no job (computed in the view).

## 5. RLS summary

| Table | admin | staff | customer |
|---|---|---|---|
| profiles | all | read all | own row |
| customers | all | all | own row (read) |
| products, variants, plans, taxes, payment_terms, discounts, templates | all | read | none (customers never see cost price) |
| subscriptions, lines | all | all (no direct status update) | own only, read |
| invoices, invoice_lines | all | all (changes via functions) | own only, read |
| payments | all | all (insert via function) | own only, read |
| subscription_status_log | all | read | own subscriptions, read |

"Own" means `customer_id` belongs to a `customers` row where `user_id = auth.uid()`.
Customer actions (pause, close, renew) go through `transition_subscription`, which checks ownership and plan flags inside the function.
**Test every table with three real logins** (admin, staff, customer) before moving on.

## 6. Dashboard and reports

Built on SQL views so the frontend only runs one simple select each.

- `v_dashboard_summary`: active subscription count, total revenue collected (sum of payments), outstanding amount (sum of total - amount_paid on confirmed invoices), overdue count and amount, MRR (monthly-normalised recurring revenue of active subscriptions: yearly / 12, weekly x 52 / 12, daily x 365 / 12).
- `v_overdue_invoices`: invoice, customer, due date, days overdue, outstanding.
- `v_revenue_by_month`: payments grouped by month.
- Page filters: date range, status, customer. Summary cards on top, tables below, one chart (revenue by month) and one chart (subscriptions by status).
- All table views paginated with `range()`.

## 7. Frontend structure

**Auth pages:** `/login`, `/signup`, `/forgot-password`, `/reset-password`.

**Staff and admin console (`/app/...`):**
- `/app` dashboard
- `/app/customers`, `/app/customers/:id`
- `/app/subscriptions`, `/app/subscriptions/new`, `/app/subscriptions/:id` (lines, status buttons by allowed transitions, status log, attached discounts, its invoices)
- `/app/invoices`, `/app/invoices/:id` (confirm / cancel / send / print, record payment, payment list)
- `/app/payments`
- `/app/catalog/products`, `/app/catalog/plans`, `/app/catalog/taxes`, `/app/catalog/discounts`, `/app/catalog/templates` (edit only for admin; read-only for staff)
- `/app/staff` (admin only: list and create staff)

**Customer portal (`/portal/...`):** `/portal` (my subscriptions), `/portal/subscriptions/:id` (with allowed actions), `/portal/invoices`, `/portal/invoices/:id` (print view).

UI rules: show disabled/hidden actions based on role and plan flags, but never rely on the UI for security (RLS and functions are the real gate). Show friendly error messages from the database (minimum quantity, plan not available, overpayment). Status shown as coloured badges.

## 8. Edge Function: `create-staff`

- Input: `email`, `full_name`, `password`.
- Verifies the caller's JWT, loads their profile, and rejects unless `role = 'admin'`.
- Validates the password rule server-side.
- Uses the service-role key to create the auth user (email confirmed), then sets `profiles.role = 'staff'`.
- Returns success or a clear error (duplicate email, weak password).

## 9. Seed data (required, run as `supabase/seed.sql`)

An empty dashboard demos badly, so the seed must produce:
- 1 admin, 2 staff, 5 customer users (document the logins in `README.md`)
- 12 customers (5 with logins)
- Taxes, payment terms (Immediate, Net 15, Net 30)
- 5 products including one with a Brand variant (Odoo +560) and one with two brand variants
- 4 plans: Monthly Basic, Yearly Pro, Weekly Trial (closable, pausable), Daily Test; mix the four flags
- 3 discounts: a percent product discount, a fixed subscription discount, and one already expired
- 2 quotation templates
- About 60 subscriptions in all statuses, with start dates spread over the last 6 months
- Run `run_billing()` over the history to produce invoices, confirm most of them, record payments on about 60% (some partial), and leave about 10 invoices overdue
- Totals should give the dashboard visibly different numbers for active count, revenue, outstanding and overdue

## 10. Build parts and acceptance checks

### Part 1: Foundation
Vite + Tailwind + Supabase client, folder structure, auth pages, profile trigger, `current_role()` helper, role-based routing, `create-staff` Edge Function, staff admin page.
**Done when:** signup creates a customer; weak passwords are rejected; duplicate email is rejected; reset email arrives and works; staff can't open `/app/staff`; admin creates a staff user who can then log in.

### Part 2: Catalog
Tables, RLS and CRUD screens for taxes, payment terms, products with variants, plans with the four flags, discounts, templates.
**Done when:** admin edits everything, staff see read-only, customer sees nothing; product shows effective price with Odoo +560.

### Part 3: Subscriptions
Customers, subscriptions, lines, create from template, `transition_subscription`, status log, plan date and min quantity validation.
**Done when:** a quote created from a template walks Draft -> Closed; invalid transitions and below-minimum quantities show clear errors; customer can only see their own.

### Part 4: Billing
`generate_invoice`, `run_billing`, discount application, tax math, invoice list and detail, confirm/cancel/send/print.
**Done when:** running billing twice creates no duplicates; paused subscriptions are skipped; a product discount appears on the next invoice by itself and stops at its limit or end date; invoice totals equal the sum of lines.

### Part 5: Payments
`record_payment`, payment form, paid vs outstanding views, overdue view.
**Done when:** partial and full payments work; overpayment is rejected; the invoice flips to Paid automatically; overdue list is correct.

### Part 6: Dashboard, portal and seed
Dashboard views and page, customer portal, pg_cron jobs, seed data, README with demo logins, Vercel deploy.
**Done when:** the dashboard loads in under 2 seconds on seeded data; the customer portal shows only own data; the full demo script (below) runs end to end.

## 11. Demo script (rehearse before 3:30)

1. Sign up a new customer (show the password rules and duplicate email).
2. Admin: show the catalog, the Odoo variant (+560), plan flags, a discount rule.
3. Staff: create a quote from a template, then Confirm and Activate.
4. Click "Run billing now": invoice appears with taxes and discount. Click it again: nothing duplicates.
5. Confirm the invoice, record a partial payment, then the rest, and watch it turn Paid.
6. Customer portal: log in as the customer and see only their own data; pause or close if the plan allows it.
7. Dashboard: active subscriptions, revenue, outstanding, overdue, with filters.

## 12. Out of scope (do not build unless everything above is done)

Real payment gateway, real invoice PDFs (print view is enough), multi-currency, proration, multiple variant attributes, refunds, multi-tenant support, microservices, Redis.
