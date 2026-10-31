-- Part 3: customers need plan price, minimum quantity and the action flags to show the
-- right buttons. None of these are secret. Columns are appended so the existing
-- view definition keeps its order. Nothing else from plans is exposed (SPEC section 5).

create or replace view public.plans_public with (security_invoker = false) as
  select pl.id, pl.name, pl.billing_period,
         pl.price, pl.min_quantity, pl.closable, pl.pausable, pl.renewable, pl.auto_close
    from public.plans pl
   where pl.is_active;
