# GAPS: read-only audit, 31 Oct 2026 (deadline 16:00)

Scope: `sarthak` working tree (with 14 uncommitted frontend files), `origin/main` (tip `0ec5bc2`, includes Abdullah's merged customer portal), `origin/kirti`, `origin/Abdullah`, `origin/sanskar`. Hosted DB checked with read-only queries only. Nothing was changed, applied, deployed or committed. Things I could not verify without running the app are marked **not verified**.

Evidence base: migrations (12 files on `sarthak`, 6 on `main`), live catalog of hosted tables/policies/grants, every `.from()/.rpc()/.functions.invoke()/.auth` call in `origin/main:frontend/src`, `npm run build` on the `sarthak` working tree (passes).

---

## 1. Completeness table (12 brief items)

"main" = what is on `origin/main` today. "sarthak" = what exists only on my branch or uncommitted.

| # | Brief item | Backend | Frontend |
|---|---|---|---|
| 1 | Signup, password rule, reset email, login redirect by role | **PARTIAL**: trigger always makes `customer`, unique email (Auth). Min length 9 and reset redirect URL are hosted-dashboard settings, **not verified** done. Server cannot enforce the upper/lower/special rule on public signup. | **PARTIAL**: Login/Register/Forgot/Reset forms exist, `RootRedirect` redirects by role (`routes/AppRoutes.jsx`). **Not verified** in a browser. Email rate limit hit repeatedly in tests. |
| 2 | Roles; admin only adds staff; customers see only own data | **DONE**: RLS on all 14 tables, `create-staff` admin-only, deactivation (`set_user_active`). 3-role test suites pass. | **PARTIAL**: route guards per role exist (`RoleRoute.jsx`), but a deactivated user is treated as customer (`currentRole = role \|\| 'customer'`). Staff area is Coming Soon (see 6). |
| 3 | Product (name, type, prices, notes) + variants (Odoo +560) | **DONE**: `products`, `product_variants`, `effective_price()`, seed has Odoo +560, tested (part2). | **PARTIAL**: full CRUD + variants editor exists **only uncommitted on sarthak** (`features/admin/catalog/`, `pages/admin/AdminProductsPage.jsx`). On `main` it is a Coming Soon placeholder. |
| 4 | Plan (price, period, min qty, dates) + 4 flags | **DONE**: `plans` with constraints, `plan_is_available()`, tested. | **PARTIAL**: same, uncommitted `AdminPlansPage.jsx`; placeholder on `main`. |
| 5 | Quotation templates used to start a subscription | **DONE**: `quotation_templates(+lines)`, `create_subscription_from_template()`, tested (part3). | **PARTIAL**: template CRUD uncommitted (`AdminTemplatesPage.jsx`). Nothing lets staff start a subscription from a template: **MISSING** (staff Quotations/Subscriptions are Coming Soon). |
| 6 | Subscription: number, dates, terms, lines; Draft..Closed; team sees status | **DONE**: tables, `transition_subscription()`, status log, guards, RLS, tested (16 tests). No demo rows (0 subscriptions in hosted DB). | **MISSING** for admin/staff (`/admin/subscriptions`, `/staff/subscriptions`, `/staff/quotations` are `ComingSoon` in `AppRoutes.jsx`). Customer list/detail exist but embeds come back empty (see C). |
| 7 | Invoices generated from subscriptions; confirm/cancel/send/print; never twice | **MISSING**: no `invoices`, `invoice_lines`, `generate_invoice`, `run_billing` in `supabase/migrations/`. Abdullah's unapplied migration defines the tables only (no functions, weak policies). | **PARTIAL**: customer invoice list/detail/print (`features/customer/pages/MyInvoices.jsx`, `InvoiceDetails.jsx`, `utils/pdfGenerator.js`) written against a schema that does not exist. Admin/staff invoice pages MISSING. |
| 8 | Taxes from admin rules, calculated automatically | **PARTIAL**: `taxes` table and rules exist; line tax id copied onto subscription lines. Automatic tax math is invoice-time (SPEC 4.3) and not built. | **PARTIAL**: tax CRUD uncommitted (`AdminTaxesPage.jsx`). |
| 9 | Discounts: rules, apply to product/subscription, auto on next invoice, stop at limit | **PARTIAL**: `discounts` rules + `attach_discount()` done and tested; automatic application, `times_used` increment and stop-at-limit are billing-time and not built. | **PARTIAL**: discount CRUD uncommitted (`AdminDiscountsPage.jsx`). |
| 10 | Payments with method/amount/date/note; paid vs outstanding; overdue | **MISSING**: no `payments`, `record_payment`, overdue view. | **PARTIAL**: customer payment history page exists (`PaymentHistory.jsx`), no data source. Staff record-payment UI MISSING. |
| 11 | Finance dashboard; filters; under 2 s | **MISSING**: no `v_dashboard_summary`, `v_overdue_invoices`, `v_revenue_by_month`. | **MISSING**: `AdminOverview` shows placeholder zeros (`staffService.js getAdminOverviewStats`: `value: '$0.00', isPlaceholder: true`). Staff dashboard is "Coming Soon" tiles. |
| 12 | Customer portal: own subscriptions, pause/close/renew, own invoices, print | **PARTIAL**: own-row RLS and `transition_subscription` (flag checks, ownership) done and tested; `plans_public` exposes the flags. Invoices/payments do not exist. | **PARTIAL**: pages exist (`/customer`, `/subscriptions`, `/invoices`, `/payments`, `/profile`, `/settings`) but plan/flag/line embeds return null under RLS, so action buttons are hidden; invoice/payment pages error; profile update broken. |

Bottom line: identity, catalog and subscription backend is done and tested. **Billing, invoices, payments, dashboard and demo data do not exist at all.** Steps 3 to 11 of the demo script cannot run today.

---

## 2. P0 DEMO-BREAKERS

Time estimates are for the smallest version that makes the demo step work.

| # | Problem | Where | Smallest fix | Min | Who |
|---|---|---|---|---|---|
| P0-1 | **No billing/payment/dashboard backend.** Demo steps 4, 5, 7 impossible. | missing from `supabase/migrations/`. Names expected by `customerService.js` and SPEC 3.4/4.6/4.7/6: `invoices`, `invoice_lines`, `payments`, `generate_invoice`, `run_billing`, `record_payment`, `v_dashboard_summary`, `v_overdue_invoices`, `v_revenue_by_month` | One migration `2026103115xxxx_billing.sql`: tables with SPEC 3.4 column names (so Abdullah's code matches), RLS (staff via functions only, customer own read, **using `my_customer_id()`**), unique (subscription_id, period_start), `generate_invoice` (plan fee + lines + tax, discounts if time), `run_billing`, `confirm/cancel/send` as small functions, `record_payment`, one summary view. Realistic only if scoped this tightly. | 40 to 60 | Sanskar |
| P0-2 | **Duplicate migration version on `main`.** `main` has `20261031120000_customer_dashboard_schema.sql`; `sarthak` has `20261031120000_catalog_tables.sql`, already applied to hosted DB. Merge gives two files with one version: `supabase db push` / `db reset` will fail (**not verified by running**). If the Abdullah file ever runs after ours it adds `USING (true)` read policies on products/plans/discounts (cost_price leak, see S1) and duplicate seed rows. | `supabase/migrations/20261031120000_customer_dashboard_schema.sql` (main) | Delete that file in the merge commit. Hosted DB already has the catalog; keep only its useful ideas (customer update-own policy) in the new billing migration. | 3 | Sanskar (merge) |
| P0-3 | **My admin UI is uncommitted** (14 files); `main` still shows Coming Soon for Products/Plans and its Staff page is broken (selects `profiles.updated_at`, calls `invite-staff`). | `git status` on sarthak; `main: services/staffService.js:10,33` | Commit, merge `origin/main`, resolve `routes/AppRoutes.jsx` (touched by main, kirti and sarthak), push. | 10 | Sarthak |
| P0-4 | **Staff cannot do anything.** Create quote from template, confirm, activate have no UI. | `routes/AppRoutes.jsx` (main): `/staff/customers`, `/quotations`, `/subscriptions`, `/invoices` are `ComingSoon` | One staff Subscriptions page: list (paginated), "New from template" (rpc `create_subscription_from_template`), detail with transition buttons (rpc `transition_subscription`), attach discount. Backend is ready and tested. Reuse `catalogService` patterns. | 30 | Sarthak |
| P0-5 | **Customer portal embeds are empty under RLS.** Customers have no access to `plans`, `payment_terms`, `products`, `product_variants`, `taxes`, so these embeds return null: plan name/price/flags, payment term, line product names. Buttons depend on `plan.pausable/closable/renewable` (`SubscriptionDetails.jsx:168-171`), so Pause/Close/Renew never show. | `services/customerService.js` lines 52-53 (`plan:plans(...)`), 115-116, 156-165 (`plan:plans(*)`, `payment_term:payment_terms`, `subscription_lines(... product:products, variant:product_variants, tax:taxes)`) | Do not embed. Fetch `plans_public` (has name, price, min_quantity, flags), `products_public`, `variants_public` by id and merge in JS. Drop tax/payment-term names or add one security-definer `get_subscription_detail`. | 15 | Abdullah |
| P0-6 | **No demo data, no demo logins.** 0 subscriptions in hosted DB; `supabase/seed/` only has `catalog.sql`; README has no logins. | `supabase/seed/`, `README.md` | `supabase/seed/demo.sql` (idempotent): ~10 subscriptions in mixed statuses via the real functions, then billing + payments once P0-1 lands. Pre-create admin, staff and 2 customer logins in the dashboard (avoids email rate limit), list them in README. | 15 | Sanskar + Kirti (README) |
| P0-7 | **Dashboard is placeholders.** | `services/staffService.js getAdminOverviewStats`, `pages/admin/AdminOverview.jsx` | Read `v_dashboard_summary` (needs P0-1) for active subs, revenue, outstanding, overdue; table from `v_overdue_invoices`. | 15 | Sarthak |
| P0-8 | **Hosted Auth settings unverified.** Min password length 9, Redirect URL `http://localhost:5173/reset-password` (and the deployed URL), confirm-email off. Password reset and signup both send email; the built-in sender hit `email rate limit exceeded` several times during testing. | Supabase dashboard (not in repo) | Check/set the three settings; pre-warm the demo accounts; for the live reset demo use one address only once, with a fallback (see section 6). | 5 | whoever owns the dashboard login |
| P0-9 | **Customer invoice/payment pages need P0-1** and then column checks: `customerService.js:59,69,179,215,259,293,308` query `invoices`, `payments`, `invoice_lines`. SPEC column names match, so wiring should work once tables exist (**not verified**). | `customerService.js` | After P0-1 applies, load the pages once as a seeded customer and fix field names. | 10 | Abdullah |

---

## 3. P1 (fix if time)

| # | Problem | Where | Smallest fix | Min | Who |
|---|---|---|---|---|---|
| P1-1 | Profile name update fails: writes `profiles.updated_at`, which does not exist. Affects staff and customer profile pages. | `services/authService.js:108` (used by `StaffProfile.jsx:29`, `CustomerProfile.jsx:66`) | Remove `updated_at` from the update. | 2 | Abdullah |
| P1-2 | Customer profile update fails: writes `customers.company_name` (column is `company`) and a customer has no UPDATE policy on `customers`. | `customerService.js:345-370`, `identity_rls` migration (`customers_update` is staff-only) | Drop `company_name`; add policy `customers_update_own` using `my_customer_id()` plus a guard trigger that blocks `user_id`, `email`, `id` changes. | 8 | Abdullah (UI) + Sanskar (policy) |
| P1-3 | Deactivated users are shown the customer portal with empty data instead of an "account inactive" message. | `routes/RoleRoute.jsx` (`currentRole = role \|\| 'customer'`), `context/AuthContext.jsx` | If a session exists but `profile` is null after retry, sign out and show "account inactive". | 6 | Kirti |
| P1-3b | Customer fallback queries a column that does not exist. | `customerService.js:21-23` (`.eq('profile_id', ...)`) | Delete the fallback. | 1 | Abdullah |
| P1-4 | Staff/admin invite flow on `main` is still `invite-staff`; the deployed function upserts `updated_at`, then deletes the invited user, and never removes the signup trigger's `customers` row. | `main: services/staffService.js:24-60`, `supabase/functions/invite-staff/index.ts:142` | Adopt my uncommitted `createStaff()`/`create-staff` (P0-3); remove `invite-staff` from repo and delete the deployed function. | 3 | Sarthak |
| P1-5 | Signup form collects company and phone, the trigger only stores `full_name`; `customers.company/phone` stay empty. | `authService.js:20-31`, migration `20261031110000_new_user_trigger_simplify.sql` | Extend `handle_new_user` to copy `company_name`, `phone` from metadata. | 5 | Sanskar |
| P1-6 | README is stale: describes `invite-staff`, "Coming Soon" modules, no setup steps (`frontend/.env.local`, `supabase link`, `db push`, seed, tests), no demo logins. | `README.md` | Rewrite setup + demo logins + test commands. | 10 | Kirti |
| P1-7 | `[db.seed] sql_paths = ["./seed.sql"]` points to a file that does not exist; `supabase db reset` will not seed anything. | `supabase/config.toml:71` | Point at `./seed/catalog.sql`, `./seed/demo.sql` (in that order). | 2 | Sanskar |
| P1-8 | `kirti` is 6 commits behind `main` and changes `routes/AppRoutes.jsx` (`/` now renders `Home`, adds `/signup`). Logged-in users hitting `/` now see the landing page, not a role redirect. | `origin/kirti: frontend/src/routes/AppRoutes.jsx`, `pages/Home.jsx` (1412 lines) | Rebase on `main`; in `Home` redirect authenticated users by role. | 10 | Kirti |
| P1-9 | Client password rule differs from SPEC: special char is a fixed list, not "any non-alphanumeric". | `frontend/src/utils/validators.js:11` | Use `/[^A-Za-z0-9]/`. | 1 | Kirti |

---

## 4. P2 / nice to have

- Route names differ from SPEC/docs (`/admin`, `/staff`, `/customer` vs `/app`, `/portal`); `/portal` redirects. Update `docs/API.md` or ignore.
- Money summed with JS floats in `customerService.js getOverviewData` (display only; SPEC rule 3 says avoid).
- `getPaymentHistory` builds `.in('invoice_id', allIds)`; a customer with hundreds of invoices overflows the URL (`customerService.js` ~line 290-310).
- `VariantsEditor.jsx` calls `effective_price` once per variant (N small rpc calls; fine at 2 to 5 variants).
- Admin Staff list is not paginated (`staffService.getStaffList`); fine at this size.
- `ilike '%x%'` search on `name`/`number` has no trigram index; fine below tens of thousands of rows.
- JS bundle 585 kB (single chunk warning from Vite).
- No frontend tests; backend tests only for Parts 1 to 3 + admin extras (`scripts/tests/`).
- No `pg_cron` (SPEC makes it optional next to the "Run billing now" button).
- Dashboard realtime (SPEC bonus) not started.
- `anon` has EXECUTE on the two trigger functions `subscriptions_before_write`, `subscription_lines_before_write` (cannot be called as normal functions; revoke for hygiene).

---

## 5. Security findings (severity ranked)

1. **HIGH (integration risk, not live today): Abdullah's migration on `main` would open the catalog to customers.** `20261031120000_customer_dashboard_schema.sql` creates `taxes_read`, `payment_terms_read`, `products_read`, `product_variants_read`, `plans_read`, `discounts_read` as `FOR SELECT TO authenticated USING (true)`: any customer could read `products.cost_price`, direct violation of the Part 2 SPEC fix. It also defines `invoices_staff`/`payments_staff` `FOR ALL` policies that let staff write `amount_paid`, `status`, totals directly (SPEC rule 5: writes via functions), and own-row policies without `is_active_user()`. Hosted DB has **none** of this applied today (verified: 0 policies with `qual = true`). Fix = P0-2.
2. **MEDIUM: password rule not enforced server-side for public signup / reset.** Only the min length (hosted setting, unverified) can be enforced by Auth; the upper/lower/special rule exists in the client and in `create-staff` only. A direct call to the Auth API with a weak 9-char password succeeds.
3. **MEDIUM: `invite-staff` is live (`supabase functions list`: ACTIVE, v2).** Admin-gated and no service key in client, but it does not check `is_active`, leaves orphan `customers` rows, deletes users on its own errors, and bypasses the SPEC password rule (invitee sets password via the reset form). Delete it once the UI uses `create-staff`.
4. **LOW: anon EXECUTE on two trigger functions** (see P2). Not callable as normal functions.
5. **LOW: public views are `security_invoker = false` by design** (Supabase linter will flag them). Column lists are fixed and tested (no `cost_price`, `notes`, `sales_price`).
6. **INFO, clean results:**
   - All 14 hosted tables have RLS enabled; no policy with `USING (true)` or `WITH CHECK (true)`; `anon` has no table grants.
   - No JWT / `sb_secret_` / `sb_publishable_` / service-role value in added lines on any branch (`main`, `Abdullah`, `kirti`, `sanskar`, `sarthak`). Only `.env.example` files were ever committed; `.env.test`, `.env.local` are ignored. No service-role reference in `frontend/`.
   - Clients cannot set `role`, `is_active`, `subscriptions.status`, `next_billing_date`, `number`, `created_by`, or line `unit_price`/`tax_id`/`amount` (triggers, tested). `amount_paid` does not exist yet.
   - `create-staff` verifies JWT, loads profile, requires active admin, validates password, rolls back on failure.

---

## 6. Plan for the next 35 minutes (minute-by-minute) and demo risks

Assumes four people in parallel. Billing is the critical path; everything else can show data only after it lands.

| Minute | Sanskar (backend) | Sarthak (admin) | Abdullah (customer) | Kirti (shared/landing) |
|---|---|---|---|---|
| 0-3 | Post invoice/payment column list (use SPEC 3.4 names). Delete `20261031120000_customer_dashboard_schema.sql` from `main` | Commit the 14 uncommitted files | Pause new features | Rebase `kirti` on `main` |
| 3-10 | Billing migration: tables, RLS (`my_customer_id()`), unique (subscription_id, period_start) | Merge `origin/main` into `sarthak`, resolve `AppRoutes.jsx`, push (P0-3) | `customerService.js`: replace plan/line embeds with `plans_public`/`products_public`/`variants_public`; remove `profile_id`, `company_name`, `updated_at` (P0-5, P1-1, P1-3b) | Hosted Auth settings (P0-8); create admin, staff, 2 customer logins in dashboard |
| 10-25 | `generate_invoice` + `run_billing` + `record_payment` + confirm/cancel/send + `v_dashboard_summary`, `v_overdue_invoices`; apply at ~min 25 | Staff Subscriptions page: list, new from template, transition buttons (P0-4) | Customer UI against live tables once min 25 lands; load pages as a seeded customer (P0-9) | README with setup, logins, test commands (P1-6); landing redirect for logged-in users (P1-8) |
| 25-30 | Smoke test billing twice (no duplicates), partial then full payment; `demo.sql` seed (P0-6) | Dashboard cards from the views (P0-7) | Fix field names found in min 25-30 | Rehearse demo on `main` |
| 30-35 | Run `part1`..`part3` + a quick billing check; tell the team what is verified | Final merge to `main` | Final merge | Dry-run full demo script once, note failures |

**Demo-script risks and fallbacks**

| Demo step | What can fail live | Fallback |
|---|---|---|
| 1. Signup + reset email | Built-in email rate limit; confirm-email setting; redirect URL not allowlisted (**not verified**) | Show signup with a pre-warmed address; for reset, show the form and the email already received on a prior attempt, or reset a user from the dashboard |
| 2. Admin catalog | Admin pages exist only if P0-3 merged | Run from the `sarthak` branch locally |
| 3. Staff quote -> confirm -> activate | No staff UI unless P0-4 done | Call `rpc` from a small test page or the SQL editor: `create_subscription_from_template`, `transition_subscription` (backend is tested) |
| 4. Run billing twice | Billing not built unless P0-1 done in time | If not ready by min 30, drop steps 4 to 7 and show tests + SPEC; do not fake numbers |
| 5. Partial and full payment | Same dependency | Same |
| 6. Customer portal | Buttons hidden if P0-5 not done; invoices empty without P0-1 | Show subscriptions and pause/close/renew only; skip invoices |
| 7. Dashboard | Placeholder zeros if P0-7 not done | Show the SQL view output instead of the page |

Honest estimate: P0-1 alone is 40 to 60 minutes for one person, so full end-to-end by 16:00 is tight. If it slips, ship the demo as: signup, admin catalog, staff flow, customer portal, with billing and the dashboard presented as designed but not complete.

---

## Appendix: branches and merge state

| Branch | Tip | Author / time (IST) | State |
|---|---|---|---|
| `main` | `0ec5bc2` | Abdullah, 14:13 | Includes Abdullah's customer portal + **clashing migration** + `invite-staff`. |
| `sarthak` | `7161510` | Sarthak Godse, 14:38 | 5 ahead / 3 behind `main`: Parts 2, 3, admin extras, tests, docs, catalog seed. Text merge with `main` is clean (`git merge-tree`), but 14 frontend files are uncommitted and will conflict in `AppRoutes.jsx`. |
| `kirti` | `a2583d8` | Kirti Tambe, 14:32 | 1 ahead / 6 behind: new `pages/Home.jsx` landing, `/signup` route, `AppRoutes.jsx` edit. |
| `Abdullah` | `72102e2` | Abdullah, 12:38 | Fully merged into `main`; nothing unique. |
| `sanskar` | `6f93ecd` | Sarthak030506, 11:42 | Equal to an old `main`; no unique work. |

Tests present (`scripts/tests/`): `part1.mjs` (auth, `create-staff`, `invite-staff`; one known failing check), `part2.mjs` (catalog), `part3.mjs` (subscriptions), `admin-extras.mjs` (deactivation). None for Parts 4 to 6.
