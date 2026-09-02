-- Migration: Add Task Basket fields to public.tasks
-- Feature: Master Task Basket & Eisenhower Matrix Integration

-- 1. Make log_date nullable to allow unassigned inbox tasks in Task Basket
ALTER TABLE public.tasks ALTER COLUMN log_date DROP NOT NULL;

-- 2. Add Task Basket & Planning fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS importance VARCHAR(20) DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_date DATE DEFAULT NULL;
