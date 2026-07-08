-- Migration: Add Core Disciplines and missing task columns
-- 1. Create core_disciplines table
CREATE TABLE IF NOT EXISTS core_disciplines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(100),
    type stronger_task_type NOT NULL DEFAULT 'normal',
    weight NUMERIC(5,2) DEFAULT 1.00,
    damage NUMERIC(6,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE core_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage own core disciplines" ON core_disciplines
    FOR ALL USING (auth.uid() = user_id);

-- 2. Add missing columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_core_discipline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS core_discipline_id UUID REFERENCES core_disciplines(id) ON DELETE SET NULL;

-- 3. Remove rigid foreign key constraints so tasks/earnings can be created without a pre-existing daily log
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_log_date_user_id_fkey;
ALTER TABLE earnings DROP CONSTRAINT IF EXISTS earnings_date_user_id_fkey;
