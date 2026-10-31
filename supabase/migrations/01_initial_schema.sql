-- ==============================================================================
-- Migration: 01_initial_schema.sql
-- Description: Core Schema, Triggers, RLS Policies, and Role Functions
-- Project: Subscription Management System
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. CREATE CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for profile_id lookup
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);

-- 4. ROLE-CHECKING SQL FUNCTIONS (SECURITY DEFINER to prevent recursive RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'staff'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
    );
$$;

-- 5. FUNCTION & TRIGGER: AUTOMATIC PROFILE & CUSTOMER CREATION ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_role TEXT;
    user_full_name TEXT;
    user_company TEXT;
    user_phone TEXT;
    caller_role TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_company := NEW.raw_user_meta_data->>'company_name';
    user_phone := NEW.raw_user_meta_data->>'phone';
    caller_role := current_setting('request.jwt.claim.role', true);

    -- Enforce security: Only service_role can specify a non-customer role (e.g. staff via Edge Function)
    IF caller_role = 'service_role' AND NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        assigned_role := NEW.raw_user_meta_data->>'role';
        IF assigned_role NOT IN ('admin', 'staff', 'customer') THEN
            assigned_role := 'customer';
        END IF;
    ELSE
        -- Public signup is strictly constrained to customer role
        assigned_role := 'customer';
    END IF;

    -- Create or update profile record
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, user_full_name, assigned_role, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    -- If customer, create customer record
    IF assigned_role = 'customer' THEN
        INSERT INTO public.customers (profile_id, company_name, phone, created_at, updated_at)
        VALUES (NEW.id, user_company, user_phone, now(), now())
        ON CONFLICT (profile_id) DO UPDATE
        SET company_name = COALESCE(EXCLUDED.company_name, public.customers.company_name),
            phone = COALESCE(EXCLUDED.phone, public.customers.phone),
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. FUNCTION & TRIGGER: PREVENT REGULAR USERS FROM CHANGING THEIR OWN ROLES
CREATE OR REPLACE FUNCTION public.protect_role_and_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    caller_role := current_setting('request.jwt.claim.role', true);

    -- If role is changing, ensure caller is admin or service_role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF caller_role != 'service_role' AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify roles.';
        END IF;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_role_and_timestamp();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read staff and customer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- PROFILES POLICIES
-- Read: Users can view their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Read: Admins can view all profiles
CREATE POLICY "Admins can read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Read: Staff can view staff and customer profiles
CREATE POLICY "Staff can read staff and customer profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_staff() AND role IN ('staff', 'customer'));

-- Update: Users can update their own profile (trigger ensures role cannot be tampered)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Update: Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Insert: Admins can insert profiles directly if needed
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Delete: Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- CUSTOMERS POLICIES
DROP POLICY IF EXISTS "Customers can read own record" ON public.customers;
DROP POLICY IF EXISTS "Admins and Staff can read all customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own record" ON public.customers;
DROP POLICY IF EXISTS "Admins can update any customer" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own record" ON public.customers;
DROP POLICY IF EXISTS "Admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

-- Read: Customers can read their own customer details
CREATE POLICY "Customers can read own record"
    ON public.customers FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

-- Read: Admins and Staff can read all customers
CREATE POLICY "Admins and Staff can read all customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff());

-- Update: Customers can update their own details
CREATE POLICY "Customers can update own record"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- Update: Admins can update any customer record
CREATE POLICY "Admins can update any customer"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Insert: Customers can insert own record (backup for trigger)
CREATE POLICY "Customers can insert own record"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid());

-- Insert: Admins can insert customer record
CREATE POLICY "Admins can insert customers"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Delete: Admins can delete customer records
CREATE POLICY "Admins can delete customers"
    ON public.customers FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 8. GRANT USAGE & PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO anon, authenticated, service_role;
