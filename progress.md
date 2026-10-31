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
- STATUS: written, **migration not yet applied to the hosted project** and tests not yet run (push was blocked; see below).

## Open items
- Dashboard (manual): Auth minimum password length 9; add `http://localhost:5173/reset-password` to Redirect URLs.
- `invite-staff` (frontend teammate's function, deployed but not in this repo) is broken against the current schema (`profiles.updated_at` no longer exists, does not remove the signup trigger's customers row). Prefer `create-staff`. Details in `docs/API.md` section 4.1.
- Supabase's built-in email rate limit blocks repeated auth email tests (invite success path unverified).

## Not started
- Part 3 Subscriptions, Part 4 Billing, Part 5 Payments, Part 6 Dashboard / portal / full seed.
