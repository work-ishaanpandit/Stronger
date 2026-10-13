-- Migration: Add Study Mode Schema with Single Active Session Constraint, Phase Timings, and Revision Audits
-- Migration timestamp: 20261014000000

-- 1. Table: study_sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ DEFAULT NULL,
    brain_dump TEXT DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'interrupted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint: Only one active study session per user at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_sessions_single_active 
    ON public.study_sessions (user_id) 
    WHERE (status = 'active');

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date 
    ON public.study_sessions (user_id, date DESC);

-- 2. Table: study_blocks
CREATE TABLE IF NOT EXISTS public.study_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL DEFAULT 1 CHECK (sequence_number >= 1),
    course TEXT DEFAULT NULL,
    topic TEXT DEFAULT NULL,
    planned_outcome TEXT NOT NULL,
    actual_outcome TEXT DEFAULT NULL,
    next_action TEXT DEFAULT NULL,
    focus_rating INT DEFAULT NULL CHECK (focus_rating IS NULL OR (focus_rating >= 1 AND focus_rating <= 5)),
    status VARCHAR(30) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'interrupted')),
    recall_completeness VARCHAR(30) NOT NULL DEFAULT 'not_recorded' CHECK (recall_completeness IN ('complete', 'missing_fields', 'not_recorded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_session_sequence UNIQUE (session_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_study_blocks_session 
    ON public.study_blocks (session_id, sequence_number ASC);

CREATE INDEX IF NOT EXISTS idx_study_blocks_user 
    ON public.study_blocks (user_id, created_at DESC);

-- 3. Table: study_phases
CREATE TABLE IF NOT EXISTS public.study_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.study_blocks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phase_type VARCHAR(20) NOT NULL CHECK (phase_type IN ('work', 'recall', 'break')),
    target_duration INT NOT NULL CHECK (target_duration > 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ DEFAULT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'interrupted')),
    pauses JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_phases_block 
    ON public.study_phases (block_id, started_at ASC);

-- 4. Table: study_revisions (Audit history for historical edits)
CREATE TABLE IF NOT EXISTS public.study_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    record_type VARCHAR(30) NOT NULL CHECK (record_type IN ('study_block', 'study_session')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    previous_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_revisions_record 
    ON public.study_revisions (record_id, edited_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_revisions_user 
    ON public.study_revisions (user_id, edited_at DESC);

-- 5. Row Level Security (RLS)
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_revisions ENABLE ROW LEVEL SECURITY;

-- Drop legacy/existing policies if re-running
DROP POLICY IF EXISTS "Owners can manage own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Owners can manage own study blocks" ON public.study_blocks;
DROP POLICY IF EXISTS "Owners can manage own study phases" ON public.study_phases;
DROP POLICY IF EXISTS "Owners can manage own study revisions" ON public.study_revisions;

-- Policies for study_sessions
CREATE POLICY "Owners can manage own study sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for study_blocks (Ensures ownership of block and parent session)
CREATE POLICY "Owners can manage own study blocks" ON public.study_blocks
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.study_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.study_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );

-- Policies for study_phases (Ensures ownership of phase and parent block)
CREATE POLICY "Owners can manage own study phases" ON public.study_phases
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.study_blocks b WHERE b.id = block_id AND b.user_id = auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM public.study_blocks b WHERE b.id = block_id AND b.user_id = auth.uid())
    );

-- Policies for study_revisions
CREATE POLICY "Owners can manage own study revisions" ON public.study_revisions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
