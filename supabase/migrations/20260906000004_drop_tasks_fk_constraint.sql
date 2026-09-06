-- Migration: Drop foreign key constraint on public.tasks
-- Feature: Allow Task Basket & future-planned tasks without requiring a pre-existing daily_logs entry

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_log_date_user_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_log_date_fkey;

-- Ensure schema cache is notified
NOTIFY pgrst, 'reload schema';
