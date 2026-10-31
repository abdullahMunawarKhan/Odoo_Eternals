# Progress

Backend status per Part. Contract for the frontend: `docs/API.md`. Rules: `SPEC.md`, `CLAUDE.md`.
Work goes on the `sarthak` branch only.

## Done

### Part 1: Foundation (backend)
- `profiles`, `customers`, signup trigger (role always `customer`), `current_role()`, `is_staff_or_admin()`, RLS.
- Edge Function `create-staff` (admin only, SPEC password rule, no customers row for staff).
- Tests: `scripts/tests/part1.mjs`.

### Part 2: Catalog (backend)
- Tables, constraints and RLS for taxes, payment terms, products, variants, plans, discounts, templates and lines.
- Customer-safe views `products_public`, `variants_public`, `plans_public`.
- `effective_price()`, `plan_is_available()`. Seed: `supabase/seed/catalog.sql`.
- Tests: `scripts/tests/part2.mjs` (37 passing).

### Admin extras (backend)
- Migration `20261031130000_admin_extras.sql`: deactivated users have no access (including own-row access), `is_active_user()`, clients cannot change `profiles.is_active` or `role` directly, admin-only `set_user_active(user_id, active)` (cannot deactivate self).
- Tests: `scripts/tests/admin-extras.mjs`.
- STATUS: applied to the hosted project; `admin-extras.mjs` all passing, Part 2 suite still all passing. Part 1 suite passes except the `invite-staff` success-path test (known: rate limit and the function's own bugs).

### Part 3: Subscriptions (backend)
- Migrations `20261031140000` (plans_public extended), `…140100` (subscriptions, lines, discounts, status log, guards, RLS via `my_customer_id()`), `…140200` (`create_subscription_from_template`, `transition_subscription`, `attach_discount`).
- Tests: `scripts/tests/part3.mjs`; `part2.mjs` updated for the new `plans_public` columns.
- STATUS: applied to the hosted project; `part3.mjs` 16/16 passing; Part 1 (except the invite-staff success path), Part 2 and admin-extras suites still passing.

## Open items
- Dashboard (manual): Auth minimum password length 9; add `http://localhost:5173/reset-password` to Redirect URLs.
- `invite-staff` (frontend teammate's function, deployed but not in this repo) is broken against the current schema (`profiles.updated_at` no longer exists, does not remove the signup trigger's customers row). Prefer `create-staff`. Details in `docs/API.md` section 4.1.
- Supabase's built-in email rate limit blocks repeated auth email tests (invite success path unverified).

## Not started
- Part 4 Billing, Part 5 Payments, Part 6 Dashboard / portal / full seed.
