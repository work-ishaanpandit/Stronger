-- Migration: Add Admin Dashboard, User Activation & Subscription Management System
-- Feature: Admin & Access Control System

-- 1. Extend public.profiles table with role, account_status, subscription_status, access_type, custom pricing, and email/name
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(30) DEFAULT 'SUBSCRIBER',
  ADD COLUMN IF NOT EXISTS custom_monthly_price NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_yearly_price NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_price_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL;

-- 2. Table: Activation Codes (one-time secure alphanumeric codes linked to specific user)
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  is_used BOOLEAN DEFAULT FALSE
);

-- 3. Table: Payment Records (historical subscription payment entries)
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  plan VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  payment_method VARCHAR(50) DEFAULT 'manual',
  transaction_id VARCHAR(255) DEFAULT NULL,
  provider VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table: Audit Logs (administrative action recording)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  previous_value JSONB DEFAULT NULL,
  new_value JSONB DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Backfill Profiles from auth.users (idempotent, safe migration)
-- Automatically insert profiles for any auth.users that don't have a profile row yet
INSERT INTO public.profiles (id, email, calendar_token)
SELECT id, email, gen_random_uuid()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Update email and full_name for profiles from auth.users
UPDATE public.profiles p
SET 
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email)
FROM auth.users u
WHERE p.id = u.id;

-- Backfill Existing Users as GRANDFATHERED (created before this deployment)
UPDATE public.profiles
SET 
  role = 'user',
  account_status = 'ACTIVE',
  access_type = 'GRANDFATHERED'
WHERE role IS NULL OR role = 'user' AND (access_type IS NULL OR access_type = 'SUBSCRIBER');

-- Assign Primary Admin: work.ishaanpandit@gmail.com
UPDATE public.profiles
SET 
  role = 'admin',
  account_status = 'ACTIVE',
  subscription_status = 'ACTIVE',
  access_type = 'ADMIN'
WHERE LOWER(email) = 'work.ishaanpandit@gmail.com';

-- 6. Helper Function: Check if authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable RLS on new & updated tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin() OR auth.uid() = id);

-- Policies for activation_codes
DROP POLICY IF EXISTS "Admins can manage activation codes" ON public.activation_codes;
CREATE POLICY "Admins can manage activation codes"
  ON public.activation_codes FOR ALL
  USING (public.is_admin() OR auth.uid() = user_id);

-- Policies for payment_records
DROP POLICY IF EXISTS "Admins can manage payment records" ON public.payment_records;
CREATE POLICY "Admins can manage payment records"
  ON public.payment_records FOR ALL
  USING (public.is_admin() OR auth.uid() = user_id);

-- Policies for audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());
