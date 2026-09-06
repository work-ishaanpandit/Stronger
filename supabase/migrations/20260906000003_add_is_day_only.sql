-- Migration: Add is_day_only column to public.tasks table
-- Flags operational day-only tasks created inside Dawn Alignment window

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_day_only BOOLEAN DEFAULT FALSE;
