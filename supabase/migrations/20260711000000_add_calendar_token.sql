-- Migration: Add calendar_token to profiles table
-- Feature: Unique calendar subscription links per user (Phase 1, F1)
--
-- Each user gets a unique UUID token that is required to access
-- their calendar ICS feed via the Edge Function.

-- Ensure profiles table exists (it may already if auth is set up)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_token UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add calendar_token column if table already exists without it
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calendar_token UUID DEFAULT gen_random_uuid();

-- Set a token for any existing profiles that don't have one yet
UPDATE public.profiles
  SET calendar_token = gen_random_uuid()
  WHERE calendar_token IS NULL;

-- RLS: users can only read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
