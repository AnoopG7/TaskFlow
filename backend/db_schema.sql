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
    telegram_chat_id VARCHAR(255),
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
CREATE INDEX idx_t_project_user ON tasks(project_id, user_id);
CREATE INDEX idx_t_user_project_status ON tasks(user_id, project_id, status);

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
-- 8. TASK STATUS TRANSITIONS (PHASE 2 - Audit Log)
-- ============================================================================
CREATE TABLE task_status_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by VARCHAR(255) NOT NULL,
    reason TEXT
);

CREATE INDEX idx_tst_task_id ON task_status_transitions(task_id);
CREATE INDEX idx_tst_changed_at ON task_status_transitions(changed_at DESC);
CREATE INDEX idx_tst_user_date ON task_status_transitions(changed_by, changed_at DESC);

-- ============================================================================
-- 9. AGENT PREFERENCES (PHASE 3 - User Customization)
-- ============================================================================
CREATE TABLE agent_preferences (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    -- Notification preferences
    notification_enabled BOOLEAN DEFAULT true,
    notification_channels JSONB DEFAULT '{"primary": "telegram", "secondary": "email"}',
    dnd_enabled BOOLEAN DEFAULT false,
    dnd_start TIME DEFAULT '20:00',
    dnd_end TIME DEFAULT '08:00',
    morning_brief_time TIME DEFAULT '07:00',

    -- Agent customization (BASIC - custom instructions only)
    custom_agent_instructions TEXT DEFAULT '',

    -- Telegram settings
    telegram_chat_id VARCHAR(255),
    telegram_notifications_enabled BOOLEAN DEFAULT true,

    -- Agent triggers
    enable_morning_brief BOOLEAN DEFAULT true,
    enable_evening_debrief BOOLEAN DEFAULT true,
    enable_risk_detection BOOLEAN DEFAULT true,
    enable_overload_warnings BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ap_user_id ON agent_preferences(user_id);
CREATE INDEX idx_ap_telegram ON agent_preferences(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- ============================================================================
-- 10. PROJECT TASK STATISTICS (MATERIALIZED VIEW - PHASE 1)
-- ============================================================================
CREATE MATERIALIZED VIEW project_task_stats AS
SELECT
    p.id as project_id,
    p.user_id,
    p.name,
    p.color,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'cancelled' THEN t.id END) as cancelled_tasks,
    ROUND(
        CASE
            WHEN COUNT(DISTINCT t.id) > 0
            THEN (COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)::FLOAT / COUNT(DISTINCT t.id) * 100)
            ELSE 0
        END, 2
    ) as completion_percentage,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.estimated_hours ELSE 0 END), 0) as estimated_hours_completed,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.actual_hours ELSE 0 END), 0) as actual_hours_completed,
    MAX(t.updated_at) as last_updated
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.user_id, p.name, p.color;

CREATE UNIQUE INDEX idx_pstats_project_id ON project_task_stats(project_id);
CREATE INDEX idx_pstats_user_id ON project_task_stats(user_id);

-- ============================================================================
-- Row-Level Security (RLS) - PRODUCTION SECURE POLICIES
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES - Only users can access their own profile
-- ============================================================================
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- PROJECTS - Only users can access their own projects
-- ============================================================================
CREATE POLICY "users_own_projects" ON projects
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- TASKS - Only users can access their own tasks
-- ============================================================================
CREATE POLICY "users_own_tasks" ON tasks
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- AGENT MEMORY - Only users can access their own memory
-- ============================================================================
CREATE POLICY "users_own_memory" ON agent_memory
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- SESSIONS - Only users can access their own sessions
-- ============================================================================
CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- NOTIFICATIONS - Only users can access their own notifications
-- ============================================================================
CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- DAILY ANALYTICS - Only users can access their own analytics
-- ============================================================================
CREATE POLICY "users_own_analytics" ON daily_analytics
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

-- ============================================================================
-- TASK STATUS TRANSITIONS - Only users can access their task transitions
-- ============================================================================
CREATE POLICY "users_own_status_transitions" ON task_status_transitions
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = COALESCE(current_setting('app.user_id'), '')
    )
  );

-- ============================================================================
-- AGENT PREFERENCES - Only users can access their own preferences
-- ============================================================================
CREATE POLICY "users_own_preferences" ON agent_preferences
  FOR ALL USING (user_id = COALESCE(current_setting('app.user_id'), ''));

ANALYZE;

SELECT '✅ TaskFlow schema ready!' AS status;
