-- ============================================================================
-- TaskFlow Agent - Complete Database Schema
-- Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- 1. USER PROFILES
-- ============================================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'IST',
    work_hours JSONB DEFAULT '{"start": 9, "end": 17}',
    notification_channels JSONB DEFAULT '{"primary": "telegram", "secondary": "email"}',
    do_not_disturb JSONB DEFAULT '{"enabled": false, "start": "20:00", "end": "08:00"}',
    brief_time TIME DEFAULT '07:00',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_up_user_id ON user_profiles(user_id);

-- ============================================================================
-- 2. PROJECTS
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pr_user_id ON projects(user_id);
CREATE INDEX idx_pr_status ON projects(status);

-- ============================================================================
-- 3. TASKS
-- ============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_date TIMESTAMP,
    recurring VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_t_user_id ON tasks(user_id);
CREATE INDEX idx_t_project_id ON tasks(project_id);
CREATE INDEX idx_t_status ON tasks(status);
CREATE INDEX idx_t_priority ON tasks(priority);
CREATE INDEX idx_t_due_date ON tasks(due_date);
CREATE INDEX idx_t_user_status ON tasks(user_id, status, due_date);

-- ============================================================================
-- 4. AGENT MEMORY
-- ============================================================================
CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    patterns JSONB DEFAULT '{}',
    completion_history JSONB DEFAULT '{}',
    estimation_bias DECIMAL(5, 2) DEFAULT 1.0,
    frequently_missed_categories TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_am_user_id ON agent_memory(user_id);

-- ============================================================================
-- 5. SESSIONS
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    session_type VARCHAR(50) DEFAULT 'chat',
    messages JSONB DEFAULT '[]',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_s_user_id ON sessions(user_id);
CREATE INDEX idx_s_started ON sessions(started_at DESC);

-- ============================================================================
-- 6. NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    type VARCHAR(50),
    channel VARCHAR(50),
    content JSONB,
    sent_at TIMESTAMP DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_n_user_id ON notifications(user_id);
CREATE INDEX idx_n_sent_at ON notifications(sent_at DESC);

-- ============================================================================
-- 7. DAILY ANALYTICS
-- ============================================================================
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    analytics_date DATE NOT NULL,
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_pending INTEGER DEFAULT 0,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    productivity_score DECIMAL(5, 2),
    streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, analytics_date)
);

CREATE INDEX idx_da_user_id ON daily_analytics(user_id);
CREATE INDEX idx_da_date ON daily_analytics(analytics_date DESC);

-- ============================================================================
-- Row-Level Security (RLS) - Allow ALL access
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access" ON user_profiles FOR ALL USING (true);
CREATE POLICY "public_access" ON projects FOR ALL USING (true);
CREATE POLICY "public_access" ON tasks FOR ALL USING (true);
CREATE POLICY "public_access" ON agent_memory FOR ALL USING (true);
CREATE POLICY "public_access" ON sessions FOR ALL USING (true);
CREATE POLICY "public_access" ON notifications FOR ALL USING (true);
CREATE POLICY "public_access" ON daily_analytics FOR ALL USING (true);

ANALYZE;

SELECT '✅ TaskFlow schema ready!' AS status;