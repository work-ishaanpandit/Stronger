-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Types
CREATE TYPE user_role_type AS ENUM ('logger', 'approver');
CREATE TYPE relation_status AS ENUM ('pending', 'active', 'rejected');
CREATE TYPE log_approval_type AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE stronger_task_type AS ENUM ('normal', 'power', 'kickass', 'uncritical');
CREATE TYPE stronger_task_status AS ENUM ('finished', 'partly_done', 'missed', 'postponed_tomorrow', 'postponed_later');

-- 1. Table: User Roles
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role_type NOT NULL DEFAULT 'logger',
    reviewer_email VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Table: Approver Relations (For future logger/reviewer linkage)
CREATE TABLE approver_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_email VARCHAR(255) NOT NULL,
    status relation_status NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_logger_approver UNIQUE (logger_id, approver_email)
);

-- 3. Table: Daily Logs (Evening Reflections)
CREATE TABLE daily_logs (
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    highlight VARCHAR(120) DEFAULT NULL, -- "Today's Highlight" field
    learned_notes TEXT,
    learned_source_url TEXT,
    reflection TEXT,
    epiphany TEXT,
    is_epiphany_visible BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    approval_state log_approval_type NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (date, user_id)
);

-- 4. Table: Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(100),
    type stronger_task_type NOT NULL DEFAULT 'normal',
    weight NUMERIC(5,2) DEFAULT 1.00,
    damage NUMERIC(6,2) DEFAULT 0.00,
    recurrence VARCHAR(50) DEFAULT 'none',
    status stronger_task_status DEFAULT 'missed',
    completion_percentage NUMERIC(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    has_bonus BOOLEAN DEFAULT FALSE,
    original_date DATE NOT NULL,
    delay_count INT DEFAULT 0,
    gcal_event_id VARCHAR(255) DEFAULT NULL,
    time_block_enabled BOOLEAN DEFAULT FALSE,
    time_block_start TIME DEFAULT NULL,
    time_block_end TIME DEFAULT NULL,
    audit_notes TEXT,
    FOREIGN KEY (log_date, user_id) REFERENCES daily_logs(date, user_id) ON DELETE CASCADE
);

-- 5. Table: Earnings Ledger
CREATE TABLE earnings (
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_earned NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    multiplier_applied NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    total_damage NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    negative_carryover NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    claimed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (date, user_id),
    FOREIGN KEY (date, user_id) REFERENCES daily_logs(date, user_id) ON DELETE CASCADE
);

-- Row Level Security (RLS) Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approver_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

-- User Roles: Users can only see/modify their own role
CREATE POLICY "Users can manage own role" ON user_roles
    FOR ALL USING (auth.uid() = user_id);

-- Approver Relations: Loggers can read/create, Approvers can read/update
CREATE POLICY "Loggers can view/create relation" ON approver_relations
    FOR ALL USING (auth.uid() = logger_id OR auth.uid() = approver_id);

-- Daily Logs: Only owner can access or edit
CREATE POLICY "Owners can manage own logs" ON daily_logs
    FOR ALL USING (auth.uid() = user_id);

-- Tasks: Only owner can access or edit
CREATE POLICY "Owners can manage own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- Earnings: Only owner can access or edit
CREATE POLICY "Owners can manage own earnings" ON earnings
    FOR ALL USING (auth.uid() = user_id);
