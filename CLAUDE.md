# Brightloop Subscription Management System

Rules (from SPEC.md section 0):

- SPEC.md is the source of truth. Update the spec before changing behaviour.
- No separate backend. Sensitive logic lives in Postgres functions or the Edge Function.
- Service-role key only inside the Edge Function. Never in frontend or git.
- Money is numeric(12,2). No floats.
- RLS on every table. Business writes go through functions.
- Schema changes only as numbered SQL files in supabase/migrations.
- Paginate every list. Target under 2 seconds.
- Do one Part at a time. Stop after each Part and report "Done when" results.
