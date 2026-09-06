-- Migration: Add committed_percentage and activity_log to tasks
-- committed_percentage: the fraction of a task's weight committed to a specific day
--   NULL / 1.0  → full weight in denominator (backward compat)
--   0.40        → 40% of weight in denominator for that day's calculation
-- activity_log: JSONB array of timestamped events (assignment, partial completion, etc.)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS committed_percentage NUMERIC(5,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
