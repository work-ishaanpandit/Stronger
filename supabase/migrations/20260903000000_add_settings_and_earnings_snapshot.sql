-- Migration: Add Settings (currency, max_daily_remuneration) and Earnings Snapshot
-- Feature: User Settings (Phase 3, Feature 1)

-- 1. Add currency and max_daily_remuneration columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS max_daily_remuneration NUMERIC(10,2) DEFAULT 1000.00;

-- 2. Add currency and max_daily_remuneration snapshot columns to public.earnings
ALTER TABLE public.earnings
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS max_daily_remuneration NUMERIC(10,2) DEFAULT 1000.00;
