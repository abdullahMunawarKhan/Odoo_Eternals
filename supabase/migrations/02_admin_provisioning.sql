-- ==============================================================================
-- Migration: 02_admin_provisioning.sql
-- Description: Controlled Initial Admin Provisioning
-- Project: Subscription Management System
-- ==============================================================================

-- ==============================================================================
-- METHOD 1: PROMOTE AN EXISTING AUTH USER TO ADMIN (RECOMMENDED)
-- ==============================================================================
-- Step 1: Sign up in the frontend application or Supabase Dashboard Auth UI.
-- Step 2: Replace 'admin@example.com' with your actual user's email address below.
-- Step 3: Run this block in the Supabase SQL Editor.

DO $$
DECLARE
    target_email TEXT := 'admin@example.com'; -- << REPLACE WITH YOUR EMAIL
    target_user_id UUID;
BEGIN
    -- Find user in auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please sign up first.', target_email;
    ELSE
        -- Update or insert profile with role 'admin'
        INSERT INTO public.profiles (id, full_name, role, updated_at)
        VALUES (target_user_id, 'System Administrator', 'admin', now())
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin',
            updated_at = now();

        -- Clean up from customers table if previously added as customer
        DELETE FROM public.customers WHERE profile_id = target_user_id;

        RAISE NOTICE 'User % (ID: %) successfully promoted to admin.', target_email, target_user_id;
    END IF;
END $$;


-- ==============================================================================
-- METHOD 2: SECURE HELPER FUNCTION FOR FUTURE ADMIN PROMOTION (ADMINS ONLY)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Security check: Ensure only an existing admin or service_role can execute this
    IF current_setting('request.jwt.claim.role', true) != 'service_role' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can promote users.';
    END IF;

    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found in auth.users', target_email;
    END IF;

    UPDATE public.profiles
    SET role = 'admin',
        updated_at = now()
    WHERE id = target_user_id;

    -- Delete customer record if existed
    DELETE FROM public.customers WHERE profile_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT) TO authenticated;

