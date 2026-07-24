-- Add 'cancelled' to the task status enum for soft-deletion of recurring tasks.
-- Cancelled tasks act as tombstones to prevent re-injection by initDay.
ALTER TYPE stronger_task_status ADD VALUE IF NOT EXISTS 'cancelled';
