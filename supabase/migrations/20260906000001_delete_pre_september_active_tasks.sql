-- Migration: Hard delete active tasks created before September 1, 2026
-- Active tasks: status NOT IN ('finished', 'completed', 'cancelled') AND completion_percentage < 1
-- Excludes Core Discipline tasks

DELETE FROM public.tasks
WHERE (status IS NULL OR status NOT IN ('finished', 'completed', 'cancelled'))
  AND (completion_percentage IS NULL OR completion_percentage < 1.0)
  AND (is_core_discipline IS NOT TRUE OR is_core_discipline IS NULL)
  AND core_discipline_id IS NULL
  AND (
    (created_at IS NOT NULL AND created_at < '2026-09-01T00:00:00Z')
    OR (log_date IS NOT NULL AND log_date < '2026-09-01')
    OR (original_date IS NOT NULL AND original_date < '2026-09-01')
    OR (planned_date IS NOT NULL AND planned_date < '2026-09-01')
  );
