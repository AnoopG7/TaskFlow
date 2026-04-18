# 🏗️ Project Scaffolding Plan - Daily Planner Agent

## Phase 1: Repository Structure

### Directory Layout
```
daily-planner-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py (FastAPI app entry)
│   │   ├── config.py (environment config)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py (Supabase auth endpoints)
│   │   │   │   ├── tasks.py (task management endpoints)
│   │   │   │   ├── projects.py (project management)
│   │   │   │   ├── analytics.py (user analytics & insights)
│   │   │   │   └── websocket.py (real-time updates)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py (Pydantic request/response schemas)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── task_service.py (task logic & AI analysis)
│   │   │   ├── supabase_service.py (Supabase client wrapper)
│   │   │   ├── groq_service.py (Groq API for task analysis)
│   │   │   └── telegram_service.py (Telegram bot handler)
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── logger.py (logging setup)
│   │   │   ├── errors.py (custom exceptions)
│   │   │   └── validators.py (input validation)
│   │   └── background_tasks/
│   │       ├── __init__.py
│   │       ├── scheduled_jobs.py (APScheduler jobs - reminders)
│   │       └── telegram_webhooks.py (async webhook handler)
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_task_service.py
│   │   ├── test_api_endpoints.py
│   │   ├── conftest.py (pytest fixtures)
│   │   └── fixtures/
│   │       ├── sample_tasks.py
│   │       └── mock_supabase.py
│   ├── requirements.txt (Python dependencies)
│   ├── .env.example (environment template)
│   ├── Dockerfile (optional, for containerization)
│   └── wsgi.py (Gunicorn entry point for Render)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx (Vite entry)
│   │   ├── App.jsx (root component)
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── SignUp.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── TaskList.jsx
│   │   │   │   ├── TaskCard.jsx
│   │   │   │   ├── TaskForm.jsx
│   │   │   │   └── AIInsights.jsx
│   │   │   ├── Projects/
│   │   │   │   ├── ProjectView.jsx
│   │   │   │   ├── ProjectForm.jsx
│   │   │   │   └── TaskDependencies.jsx
│   │   │   ├── Analytics/
│   │   │   │   ├── ProductivityChart.jsx
│   │   │   │   ├── TimeEstimateAccuracy.jsx
│   │   │   │   └── CategoryBreakdown.jsx
│   │   │   ├── Common/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   └── Calendar/
│   │   │       ├── CalendarView.jsx
│   │   │       └── TaskTimeline.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   ├── supabaseClient.js (Supabase initialization)
│   │   │   ├── apiClient.js (REST API wrapper)
│   │   │   ├── websocketClient.js (WebSocket handler)
│   │   │   └── authService.js (Supabase Auth wrapper)
│   │   ├── hooks/
│   │   │   ├── useAuth.js (auth context hook)
│   │   │   ├── useSupabase.js (Supabase query hook)
│   │   │   ├── useTasks.js (task state management)
│   │   │   └── useAnalytics.js (analytics data hook)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── UIContext.jsx
│   │   ├── styles/
│   │   │   ├── index.css
│   │   │   └── tailwind.css
│   │   └── utils/
│   │       ├── formatters.js
│   │       └── validators.js
│   ├── public/
│   │   ├── favicon.ico
│   │   └── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── .env.local (ignored in git)
│
└── docs/
    ├── DETAILED_PLAN.md (existing)
    ├── WORKFLOW.md (existing)
    ├── COST_BREAKDOWN.md (existing)
    ├── MULTI_CHANNEL_INTEGRATION_PLAN.md (existing)
    └── SCAFFOLDING.md (this file)
```

---

## Phase 2: Backend Scaffolding (FastAPI)

### Core Dependencies (requirements.txt)
```
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
supabase==2.3.4
groq==0.4.2
python-socketio==5.10.0
python-engineio==4.8.0
aiohttp==3.9.1
pydantic==2.5.0
pydantic-settings==2.1.0
httpx==0.25.2
python-telegram-bot==21.0
apscheduler==3.10.4
sqlalchemy==2.0.23  # optional, for type hints
pytest==7.4.3
pytest-asyncio==0.21.1
```

### main.py Structure
```python
# FastAPI app initialization
# ├─ CORS setup (Vercel frontend + localhost)
# ├─ Event handlers (startup/shutdown for Supabase connection)
# ├─ Router includes (auth, tasks, projects, analytics, websocket)
# ├─ Error handlers (custom exceptions)
# ├─ Middleware (logging, auth verification)
# ├─ Background tasks (APScheduler for reminders)
# └─ Telegram webhook route (POST /webhook/telegram)
```

### config.py Structure
```python
# Settings management
# ├─ Supabase credentials (URL, key, service role key)
# ├─ Groq API key (for task analysis)
# ├─ Telegram bot token
# ├─ CORS allowed origins
# ├─ JWT secret (for optional custom tokens)
# ├─ Environment detection (dev/prod)
# └─ Logging level
```

### API Routes Breakdown

**auth.py**
```
POST /auth/signup            → Supabase auth signup
POST /auth/login             → Supabase auth login
POST /auth/logout            → Invalidate session
POST /auth/refresh-token     → Refresh JWT
GET  /auth/user              → Get current user profile
POST /auth/link-telegram     → Link Telegram to account
```

**tasks.py**
```
POST /api/tasks                         → Create new task
  ├─ Input: title, description, deadline, priority
  ├─ Process: Groq AI analyzes → estimates time → detects risks
  └─ Output: task object with AI insights
  
GET  /api/tasks                         → Get user's tasks
GET  /api/tasks/{id}                    → Get specific task
PUT  /api/tasks/{id}                    → Update task
POST /api/tasks/{id}/start              → Mark task as started
POST /api/tasks/{id}/complete           → Mark task as complete
GET  /api/tasks/today                   → Get today's tasks
```

**projects.py**
```
POST /api/projects                      → Create new project
GET  /api/projects                      → Get user's projects
GET  /api/projects/{id}                 → Get project details
PUT  /api/projects/{id}                 → Update project
POST /api/projects/{id}/tasks           → Get project tasks
```

**analytics.py**
```
GET  /api/analytics/dashboard           → User productivity summary
GET  /api/analytics/task-trends         → Historical task data
GET  /api/analytics/time-accuracy       → Time estimate accuracy
GET  /api/analytics/category-breakdown  → Tasks by category
GET  /api/analytics/weekly-report       → Weekly productivity report
```

**websocket.py**
```
WebSocket /ws                → Real-time updates
  ├─ Task status changes
  ├─ Real-time notifications
  └─ Multi-device sync
```

### Database Layer (supabase_service.py)
```python
# Supabase wrapper
# ├─ Connection initialization
# ├─ Auth helpers (user verification)
# ├─ CRUD operations (generic query/insert/update/delete)
# ├─ Real-time subscription setup
# └─ Error handling & retry logic
```

### Task Service (task_service.py)
```python
# Task intelligence
# ├─ AI task analysis (Groq LLM)
# ├─ Time estimation with correction factors
# ├─ Risk detection (unrealistic deadlines, etc.)
# ├─ Priority calculation
# ├─ Subtask generation
# └─ Error handling
```

### Telegram Service (telegram_service.py)
```python
# Telegram bot handler
# ├─ Commands: /today, /add, /complete, /upcoming, /summary
# ├─ User authentication (link Telegram to app account)
# ├─ Quick task creation from Telegram
# ├─ Keyboard/inline button generation
# └─ Webhook handler for Telegram messages
```

### Background Tasks (scheduled_jobs.py)
```python
# APScheduler jobs
# ├─ Morning task briefing (8 AM)
# ├─ Midday check-in (12 PM)
# ├─ Evening summary (5 PM)
# ├─ Weekly productivity report
# └─ Database maintenance
```

---

## Phase 3: Frontend Scaffolding (React + Vite)

### Core Dependencies (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "supabase": "^2.38.1",
    "@supabase/auth-helpers-react": "^0.4.5",
    "@supabase/supabase-js": "^2.38.1",
    "axios": "^1.6.2",
    "socket.io-client": "^4.7.2",
    "zustand": "^4.4.1",
    "tailwindcss": "^3.3.6",
    "lucide-react": "^0.294.0",
    "react-big-calendar": "^1.8.5",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
```

### App Structure (React)
```
App.jsx
├─ AuthContext (Supabase session)
├─ Router
│  ├─ PublicRoutes
│  │  ├─ HomePage
│  │  ├─ LoginPage
│  │  └─ SignUpPage
│  └─ ProtectedRoutes
│     ├─ DashboardPage
│     │  ├─ TaskList
│     │  ├─ TaskCard
│     │  ├─ AIInsights (time estimates, priorities)
│     │  └─ TaskForm (create/edit)
│     ├─ ProjectsPage
│     │  ├─ ProjectView
│     │  └─ TaskDependencies
│     ├─ CalendarView
│     │  ├─ TaskTimeline
│     │  └─ Deadlines
│     └─ AnalyticsPage
│        ├─ ProductivityChart
│        ├─ TimeAccuracy
│        └─ WeeklyReport
└─ Header + Sidebar (navigation)
```

### State Management (Zustand)
```javascript
// authStore.js
// ├─ user, session, setUser, setSession, logout

// taskStore.js
// ├─ tasks (array)
// ├─ selectedTask (object)
// ├─ filter (today/week/all)
// ├─ addTask, updateTask, completeTask
// ├─ setFilter, selectTask
// └─ fetchTasks [async]

// analyticsStore.js
// ├─ productivityData
// ├─ timeAccuracy
// ├─ weeklyStats
// └─ fetchAnalytics [async]
```

### Service Layer

**apiClient.js** - Axios wrapper for REST API
**supabaseClient.js** - Supabase initialization
**websocketClient.js** - Socket.io client for real-time updates

### Key Hooks

**useAuth.js** - Auth state management
**useTasks.js** - Task state & operations
**useAnalytics.js** - Analytics data fetching
**useSupabase.js** - Generic Supabase queries

---

## Phase 4: Database (Supabase) Schema

### Tables to Create

**1. users** (managed by Supabase Auth - auto-created)
**2. user_profiles** (Daily Planner specific)
```sql
user_id (UUID, FK)
name (string)
timezone (string)
work_hours_start (time)
work_hours_end (time)
```

**3. tasks**
```sql
id (UUID, PK)
user_id (UUID, FK)
title (string)
description (text)
category (string)
priority (string) - "low", "medium", "high"
status (string) - "todo", "in_progress", "completed"
deadline (timestamp)
estimated_hours (float) - AI estimated
actual_hours (float, nullable)
created_at (timestamp)
updated_at (timestamp)
completed_at (timestamp, nullable)
```

**4. projects**
```sql
id (UUID, PK)
user_id (UUID, FK)
name (string)
description (text)
status (string) - "active", "archived"
created_at (timestamp)
updated_at (timestamp)
```

**5. task_insights** (AI-generated)
```sql
task_id (UUID, FK)
time_estimate_confidence (float) - 0-1
risk_factors (jsonb)
suggested_subtasks (jsonb)
estimated_accuracy (float) - based on historical data
```

**6. user_analytics**
```sql
user_id (UUID, FK)
date (date)
tasks_completed (integer)
tasks_total (integer)
total_hours_tracked (float)
avg_time_accuracy (float)
created_at (timestamp)
```

### Indexes to Create
```sql
CREATE INDEX ON tasks(user_id, status);
CREATE INDEX ON tasks(user_id, deadline DESC);
CREATE INDEX ON projects(user_id, status);
CREATE INDEX ON user_analytics(user_id, date DESC);
```

---

## Phase 5-10: Same as CBSE Study Agent

(Backend/Frontend setup, Environment config, Deployment, CI/CD, Local dev, Testing, Implementation order remain the same)

---

**Ready to start building? 🚀**
