-- Migration: Fix RLS Policy Infinite Recursion and Backfill Existing Users
-- Feature: Access Control Security & RLS Fix

-- 1. Create a non-recursive SECURITY DEFINER helper function for admin check
-- Setting SECURITY DEFINER and search_path = public allows this function to read
-- public.profiles under table owner privileges without evaluating RLS policies recursively.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  is_adm boolean;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT (role = 'admin') INTO is_adm
  FROM public.profiles
  WHERE id = user_id;

  RETURN COALESCE(is_adm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 2. Drop legacy policies on public.profiles to prevent conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. Re-create non-recursive policies on public.profiles
-- Policy A: Users can view their own profile (direct auth.uid() check, 0 function call)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy B: Admins can view all profiles (uses non-recursive is_admin())
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Policy C: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy D: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Policy E: Users can insert own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Re-create non-recursive policies on activation_codes, payment_records, and audit_logs
DROP POLICY IF EXISTS "Admins can manage activation codes" ON public.activation_codes;
CREATE POLICY "Admins can manage activation codes"
  ON public.activation_codes FOR ALL
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage payment records" ON public.payment_records;
CREATE POLICY "Admins can manage payment records"
  ON public.payment_records FOR ALL
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. Safe, Idempotent Existing User Backfill & Primary Admin Setup
-- Ensure profiles exist for any auth.users rows
INSERT INTO public.profiles (id, email, calendar_token, created_at)
SELECT u.id, u.email, gen_random_uuid(), u.created_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Update email and full_name
UPDATE public.profiles p
SET 
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email)
FROM auth.users u
WHERE p.id = u.id;

-- Grandfather all existing profiles created prior to deployment (or legacy default 'SUBSCRIBER')
-- Set existing non-admin profiles to GRANDFATHERED and ACTIVE
UPDATE public.profiles
SET 
  role = 'user',
  account_status = 'ACTIVE',
  access_type = 'GRANDFATHERED'
WHERE (role IS NULL OR role = 'user') 
  AND (access_type IS NULL OR access_type = 'SUBSCRIBER' OR account_status = 'PENDING_APPROVAL')
  AND LOWER(COALESCE(email, '')) != 'work.ishaanpandit@gmail.com';

-- Ensure Primary Admin: work.ishaanpandit@gmail.com has full admin rights
UPDATE public.profiles
SET 
  role = 'admin',
  account_status = 'ACTIVE',
  subscription_status = 'ACTIVE',
  access_type = 'ADMIN'
WHERE LOWER(email) = 'work.ishaanpandit@gmail.com';
