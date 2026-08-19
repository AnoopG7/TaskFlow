<div align="center">

# TaskFlow

### AI-Powered Proactive Daily Planner

**A full-stack AI agent that doesn't just store your tasks -- it plans your day, tracks your patterns, adapts to your habits, and reaches out to you before deadlines slip. Your personal chief of staff, for $0/month.**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-GPT_OSS_120B-FF6B00?style=for-the-badge&logoColor=white)](https://groq.com)

</div>

---

## What is TaskFlow?

TaskFlow is a full-stack AI productivity platform where a **single LLM call** can create a project, spawn 5 tasks under it, set priorities, assign deadlines, and generate a natural language response -- all in one shot. The agent doesn't just respond to commands. It **learns your estimation patterns**, **tracks your streaks**, **scans for overdue tasks**, and **proactively messages you** on Telegram when things are about to slip.

---

## Architecture

```
                         ┌──────────────────────┐
                         │    React Frontend     │
                         │    Vercel (Free)      │
                         └──────────┬───────────┘
                                    │ REST API (X-User-ID + JWT)
                         ┌──────────▼───────────┐
                         │   FastAPI Backend     │
                         │   Render (Free Tier)  │
                         └──┬───────┬───────┬───┘
                            │       │       │
             ┌──────────────┘       │       └──────────────┐
             │                      │                      │
   ┌─────────▼──────────┐  ┌───────▼────────┐  ┌─────────▼──────────┐
   │  Groq Cloud (LLM)  │  │  Supabase DB   │  │  Telegram Bot API  │
   │  LLaMA 3.3 70B     │  │  PostgreSQL     │  │  Webhook/Polling   │
   │  (1 call/message)  │  │  10 Tables      │  │  (Proactive)       │
   └────────────────────┘  └────────────────┘  └────────────────────┘

   ┌──────────────────────────────────────┐
   │  APScheduler (In-Process Cron)       │
   │  • Morning Brief  (daily @ 7am)      │
   │  • Due-Date Scan  (every hour)       │
   └──────────────────────────────────────┘
```

---

## The Agent -- Single-Call Multi-Action Architecture

This is the core differentiator. TaskFlow's agent doesn't use a ReAct loop that burns through tokens calling tools sequentially. It uses a **single LLM call that outputs structured actions**, which the backend then executes deterministically.

### How It Works

```
User: "Create a project called 'Exam Prep' and add 3 study tasks due next week"
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  1. ASSEMBLE CONTEXT                                    │
│     • Load all tasks (up to 50), projects, profile      │
│     • Load agent memory (estimation bias, patterns)     │
│     • Load last 6 conversation messages                 │
│     • Compute local date/time in user's timezone        │
│                                                         │
│  2. SINGLE GROQ LLM CALL                                │
│     Model: openai/gpt-oss-120b                           │
│     Temperature: 0.7 | Max tokens: 1500                 │
│                                                         │
│  3. PARSE STRUCTURED RESPONSE                           │
│     {                                                   │
│       "response_text": "Done! I've created...",         │
│       "actions": [                                      │
│         { "type": "create_project",                     │
│           "data": { "name": "Exam Prep", ... }},        │
│         { "type": "create_task",                        │
│           "data": { "title": "Review Chapter 5",        │
│                     "project": "Exam Prep", ... }},     │
│         { "type": "create_task", ... },                 │
│         { "type": "create_task", ... }                  │
│       ],                                                │
│       "confidence": 0.95                                │
│     }                                                   │
│                                                         │
│  4. EXECUTE ACTIONS SEQUENTIALLY                        │
│     • Projects first (so IDs are available for tasks)   │
│     • Then tasks (resolved to project by name)          │
│     • Each action validated against state machine       │
│                                                         │
│  5. RETURN RESPONSE                                     │
│     { response, actions[], session_id }                 │
└─────────────────────────────────────────────────────────┘
```

**One call. Four actions. Zero tool-call overhead.** The LLM generates the full action plan in a single pass, and the backend executes it deterministically.

### Supported Action Types (12)

| Action | Description |
|--------|-------------|
| `create_task` | Create with priority, due date, estimated hours, project link |
| `create_project` | Create with name, description, color (6 options) |
| `complete_task` | Mark done with optional actual_hours for tracking |
| `delete_task` | Remove single task |
| `delete_tasks` | Batch remove multiple tasks |
| `delete_all_tasks` | Nuclear option |
| `delete_project` | Remove project (cascade unlinks tasks) |
| `delete_all_projects` | Full reset |
| `link_task_to_project` | Connect existing task to project |
| `unlink_task` | Disconnect task from project |
| `update_task` | Modify any task field |
| `batch_parse_and_create` | NL text -> multiple structured tasks via dedicated LLM call |

---

## Agent Memory & Self-Improvement

TaskFlow doesn't treat every conversation as independent. It **learns from your behavior** over time and injects those insights back into the LLM context.

### Estimation Bias Tracking

Every time you complete a task with both `estimated_hours` and `actual_hours`, the system calculates:

```
bias = actual_hours / estimated_hours
```

It maintains a **rolling window of the last 30 completions** and computes your average bias. If you consistently underestimate by 30%, the agent knows -- and adjusts its future estimates accordingly.

```
Agent memory context injection:
"Estimation bias: 1.3x -- this user typically underestimates task duration by 30%."
```

### Frequently Missed Categories

Tasks with `bias > 1.2` (taking 20%+ longer than estimated) automatically log their tags as "frequently missed categories." The agent can then proactively warn you about similar tasks.

### Daily Analytics

Each completion updates:
- `tasks_completed` count
- `actual_hours` logged
- `streak_days` (consecutive days with completions)

### Pattern Notes

The memory system generates contextual insights like:
> "You typically underestimate tasks by 30%. I've adjusted estimates."

These are accessible via `GET /api/agent/memory` and surfaced in the agent's responses.

---

## Task State Machine

Every task status transition is validated against a formal state machine with a complete audit trail:

```
                    ┌──────────────┐
                    │    pending   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
     ┌────────────────┐      ┌──────────────┐
     │  in_progress   │      │  cancelled   │
     └───────┬────────┘      └──────┬───────┘
             │                       │
             ▼                       │
     ┌────────────────┐              │
     │   completed    │              │
     └───────┬────────┘              │
             │                       │
             └───────────────────────┘
                  (revert to pending)
```

**Every transition is logged** to `task_status_transitions` with `from_status`, `to_status`, `changed_by`, and `reason`. The frontend's `TaskStatusSelector` component queries `GET /api/tasks/{id}/allowed-transitions` to only show valid options -- impossible to make an illegal state change.

---

## Features

### AI Agent

| Feature | Details |
|---------|---------|
| **Multi-Action Responses** | Single message triggers multiple database operations |
| **Context-Aware** | Loads tasks, projects, profile, memory, and conversation history |
| **Timezone-Aware** | Resolves user timezone for accurate scheduling |
| **Natural Language Task Parsing** | "Build login system (JWT, password reset, email verification)" -> 3 structured tasks |
| **AI Auto-Prioritize** | LLM analyzes task description to assign `low/medium/high/critical` priority |
| **Duplicate Detection** | Checks for existing pending tasks with same title before creation |
| **Confidence Scoring** | LLM outputs confidence score for each response |

### Proactive Automation

| Feature | Details |
|---------|---------|
| **Morning Brief** | Daily LLM-generated plan at user's configured time (default 7am) |
| **Hourly Due-Date Scan** | Scans for overdue and due-within-24h tasks |
| **Telegram Notifications** | Markdown-formatted alerts with overdue/due-soon breakdown |
| **Evening Debrief** | Daily summary and insights |
| **Risk Scan** | Identifies at-risk tasks before they become overdue |
| **26 Timezone Support** | Full IANA timezone mapping with abbreviation resolution |

### Project Management

| Feature | Details |
|---------|---------|
| **Project CRUD** | 6 color options: blue, violet, emerald, amber, rose, cyan |
| **Task Linking/Unlinking** | Connect tasks to projects dynamically |
| **Live Analytics** | Task counts, completion %, estimated vs actual hours per project |
| **Cascade Delete** | Delete project with or without unlinking tasks |
| **Materialized View** | Pre-computed `project_task_stats` for fast analytics |

### Task Management

| Feature | Details |
|---------|---------|
| **Full CRUD** | Create, read, update, delete with ownership verification |
| **State Machine** | Validated status transitions with audit trail |
| **Batch Operations** | Batch complete, batch priority update |
| **Search** | Title/description search with project exclusion |
| **Tags** | Array-based tagging for categorization |
| **Estimated vs Actual Hours** | Time tracking with accuracy analytics |

### Authentication & Security

| Feature | Details |
|---------|---------|
| **Supabase Auth** | Email/password with email confirmation flow |
| **JWT Bearer Tokens** | Validated on every request |
| **Dual Client Pattern** | Anon key for reads (RLS), service role for writes (bypasses RLS) |
| **Rate Limiting** | 100 requests/minute per user, in-memory sliding window |
| **Ownership Verification** | Every task/project operation verifies user ownership |
| **Input Sanitization** | String stripping, 5000 char cap, email regex, priority/status whitelists |
| **Row-Level Security** | RLS on all 10 tables |

### Telegram Bot

| Feature | Details |
|---------|---------|
| **Dual Mode** | Webhook (production) + Long-polling (development) |
| **Commands** | `/start`, `/today`, `/brief`, `/help` |
| **Natural Language** | Non-command messages passed to agent |
| **Deduplication** | In-memory set of processed message IDs (max 1000, FIFO) |
| **User Linking** | Looks up `telegram_chat_id` in profile and preferences |

### Frontend

| Feature | Details |
|---------|---------|
| **8 Pages** | Login, Signup, Dashboard, Tasks, Projects, Project Detail, Chat, Settings |
| **Dashboard** | 4 stat cards, priority tasks, quick actions, overdue warnings |
| **Task Filters** | 8 filter buttons: all, pending, in_progress, completed, cancelled, overdue, critical, high |
| **State-Aware Status Selector** | Queries allowed transitions from API, shows only valid options |
| **Project Grid** | Color-coded cards with live task completion stats |
| **AI Chat** | Session history sidebar, trigger support, suggested prompts |
| **Settings** | Profile, theme (light/dark/system), agent preferences, custom instructions |
| **Zod Validation** | Schema-validated forms for tasks, profile, and preferences |
| **OKLCH Color System** | Custom perceptually uniform light/dark design tokens |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite 8 + TypeScript | SPA with HMR |
| Styling | TailwindCSS 4 + OKLCH design tokens | Custom light/dark themes |
| Forms | react-hook-form + Zod | Schema validation |
| Backend | FastAPI + Python 3.12 | REST API |
| LLM | Groq `openai/gpt-oss-120b` | Agent + NL parsing |
| Database | Supabase PostgreSQL | 10 tables + materialized view |
| Auth | Supabase Auth | JWT authentication |
| Scheduler | APScheduler AsyncIO | Cron-based proactive tasks |
| Telegram | python-telegram-bot | Bot integration |
| Deployment | Vercel (FE) + Render (BE) | Free tier hosting |

---

## Database Schema

```
user_profiles             Settings: timezone, work hours, notification channels, DND
projects                  Project containers with color coding
tasks                     Full task records with priority, status, hours, tags
agent_memory              Learning patterns: estimation bias, frequently missed categories
sessions                  Chat sessions with JSONB message history
notifications             Notification log with channel, type, acknowledgment
daily_analytics           Daily metrics: tasks completed, hours, productivity, streaks
task_status_transitions   Audit trail: from/to status, changed_by, reason
agent_preferences         Notification toggles, DND schedule, custom instructions, Telegram
project_task_stats        Materialized view: pre-computed project analytics
```

**19 Indexes** including composite indexes for hot query paths, unique indexes for constraint enforcement, and a partial index for Telegram chat ID lookup.

---

## Project Structure

```
daily-planner-agent/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI entry (161 lines)
│   │   ├── config.py                        # Pydantic Settings
│   │   ├── agent/
│   │   │   ├── loop.py                      # Core agent: context → LLM → actions (316 lines)
│   │   │   ├── parser.py                    # Multi-action response parser (235 lines)
│   │   │   └── memory.py                    # Estimation bias + pattern tracking (186 lines)
│   │   ├── api/routes/
│   │   │   ├── tasks.py                     # Task CRUD + batch + search (325 lines)
│   │   │   ├── projects.py                  # Project CRUD + task linking (225 lines)
│   │   │   ├── agent.py                     # Chat + sessions + triggers (121 lines)
│   │   │   └── auth.py                      # Auth + profile + preferences (300 lines)
│   │   ├── services/
│   │   │   ├── supabase_service.py          # Database operations (824 lines)
│   │   │   ├── groq_service.py              # Groq API HTTP client
│   │   │   ├── scheduler.py                 # APScheduler crons (269 lines)
│   │   │   ├── telegram_service.py          # Telegram bot (285 lines)
│   │   │   └── task_parser.py               # NL → structured tasks (221 lines)
│   │   ├── prompts/system_prompt_v1.txt     # Agent system prompt (142 lines)
│   │   └── utils/
│   │       ├── task_state_machine.py        # Status transition logic (145 lines)
│   │       ├── security.py                  # Rate limiter + validation (103 lines)
│   │       └── timezone_utils.py            # 26-timezone mapping (107 lines)
│   └── scripts/test_cli.py                  # Interactive CLI testing
├── frontend/
│   └── src/
│       ├── pages/                           # 8 pages: Login, Signup, Dashboard, Tasks, Projects, ProjectDetail, Chat, Settings
│       ├── components/
│       │   ├── TaskStatusSelector.tsx        # State-machine-aware dropdown
│       │   ├── ProjectTaskSelector.tsx       # Debounced task search
│       │   └── layout/                      # AppShell, Sidebar
│       ├── providers/                       # AuthProvider, ThemeProvider, BannerProvider
│       ├── lib/
│       │   ├── api.ts                       # Typed API client (415 lines)
│       │   └── schemas.ts                   # Zod validation schemas
│       └── index.css                        # OKLCH design system
├── db_schema.sql                            # Full schema (298 lines)
├── render.yaml                              # Render deployment config
└── vercel.json                              # Vercel deployment config
```

---

## API Endpoints (27)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/profile` | Get profile |
| `POST` | `/api/auth/profile` | Update profile |
| `GET/POST` | `/api/auth/preferences` | Agent preferences |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tasks` | Create task (with optional AI auto-prioritize) |
| `GET` | `/api/tasks` | List tasks with filters |
| `GET` | `/api/tasks/search` | Search by title/description |
| `GET/PUT/DELETE` | `/api/tasks/{id}` | Single task operations |
| `POST` | `/api/tasks/{id}/complete` | Complete with actual_hours |
| `GET` | `/api/tasks/{id}/allowed-transitions` | Valid status changes |
| `GET` | `/api/tasks/{id}/status-history` | Audit trail |
| `POST` | `/api/tasks/batch/complete` | Batch complete |
| `POST` | `/api/tasks/batch/priority` | Batch priority update |
| `POST` | `/api/tasks/batch/parse-and-create` | NL -> structured tasks |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List with live analytics |
| `GET/PUT/DELETE` | `/api/projects/{id}` | Single project operations |
| `GET` | `/api/projects/{id}/tasks` | Project tasks |
| `POST` | `/api/projects/{id}/tasks/link` | Link tasks |
| `POST` | `/api/projects/{id}/tasks/unlink/{taskId}` | Unlink task |
| `GET` | `/api/projects/{id}/analytics` | Project statistics |

### Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agent/chat` | Main agent endpoint |
| `GET` | `/api/agent/sessions/{userId}` | Recent sessions |
| `GET` | `/api/agent/sessions/{userId}/{sessionId}/history` | Session history |
| `POST` | `/api/agent/sessions/{sessionId}/close` | Close session |
| `POST` | `/api/agent/trigger/{triggerType}` | morning_brief, evening_debrief, risk_scan |
| `GET` | `/api/agent/memory` | Agent memory insights |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Supabase project (free tier)
- Groq API key (free tier)
- (Optional) Telegram Bot Token

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY

# Apply database schema
# Run db_schema.sql in Supabase SQL Editor

python -m uvicorn app.main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000

npm run dev
# → http://localhost:5173
```

---

## Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Groq (LLM) | Free | $0/month |
| Supabase (Database + Auth) | Free (500MB) | $0/month |
| Vercel (Frontend) | Free | $0/month |
| Render (Backend) | Free (750 hrs) | $0/month |
| Telegram (Bot API) | Free | $0/month |
| **Total** | | **$0/month** |

---

## Deployment

- **Frontend**: `cd frontend && npm run build` → Vercel auto-deploys
- **Backend**: Push to GitHub → Render auto-deploys via `render.yaml`
- **Database**: Supabase SQL Editor for schema
- **Telegram**: Set webhook via `POST /setup-webhook` on first deploy

---

## License

MIT
