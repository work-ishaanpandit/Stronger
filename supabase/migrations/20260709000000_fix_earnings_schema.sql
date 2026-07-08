-- Migration: Fix earnings schema + add user auto-provisioning trigger
-- Run this in Supabase SQL Editor AFTER the initial schema migration

-- 1. Add missing columns to earnings table
ALTER TABLE earnings
  ADD COLUMN IF NOT EXISTS r_calc NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS e_base NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS p_base NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS p_potential NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS m_pow NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS d_tot NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS new_debt NUMERIC(8,2) NOT NULL DEFAULT 0.00;

-- 2. Add calendar_sync column to tasks table (needed for two-step sync UI)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS calendar_sync BOOLEAN DEFAULT FALSE;

-- 3. Auto-create user_role row on first Google Sign-In
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'logger')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
