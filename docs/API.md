# Backend API contract

Contract between the database / Edge Function and the frontend. SPEC.md is the source of truth; this file is updated at the end of every Part.

Last updated: **Part 1 (Foundation)**.

Project URL and keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the publishable key). The frontend never uses the secret / service-role key.

## 1. Password rule (exact)

- At least 9 characters (more than 8), at least one lowercase letter, one uppercase letter, one special (non-alphanumeric) character. No digit is required.
- Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`
- Message: `Password must be at least 9 characters and include an uppercase letter, a lowercase letter and a special character.`
- Client: `src/lib/passwordRule.js` (`PASSWORD_REGEX`, `validatePassword(pw)`). Server: `create-staff` re-validates the same regex. Supabase Auth minimum length is 9 (set in `supabase/config.toml` and must also be set in Dashboard > Authentication > Sign In / Providers > Email; Supabase's own "required characters" option stays off).

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

`role` can never be changed from the client, by anyone. A client update that changes `role` or `id` fails with Postgres error `42501`. Only admins may change `is_active` or `email`. Roles change only via SQL (first admin) or the `create-staff` function.

### customers
Columns: `id`, `user_id` (nullable, unique, FK profiles), `name`, `email` (unique), `phone`, `company`, `address`, `created_at`.

| | admin | staff | customer |
|---|---|---|---|
| select | all | all | own row (`user_id = auth.uid()`) |
| insert / update / delete | yes | yes | no |

A customer without a login has `user_id = null` and is linked when that email signs up. Email matching is case-insensitive; the trigger stores lowercase emails, so store customer emails in lowercase.

Helper SQL functions (callable by signed-in users, e.g. `supabase.rpc('current_role')`): `public.current_role()` returns the caller's role or null; `public.is_staff_or_admin()` returns boolean.

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

## 5. Not built yet

Catalog, subscriptions, billing, payments, dashboard views: later Parts. This file gains their tables, RLS and functions as they land.
