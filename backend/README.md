# TaskFlow Backend - AI-Powered Task Management API

A FastAPI-based backend service that provides intelligent task management with AI-powered analysis, scheduling, and Telegram integration.

## Overview

TaskFlow backend is built with **FastAPI** and powered by **Groq LLM** to analyze tasks, estimate time requirements, detect risks, and generate productivity insights. It integrates with **Supabase** for data persistence and **Telegram** for mobile notifications.

### Key Features

- **AI Task Analysis**: Automatic priority inference, time estimation, risk detection, and subtask generation using Groq LLM
- **RESTful API**: Full CRUD operations for tasks and projects
- **Smart Scheduling**: APScheduler integration for automated morning briefs, midday check-ins, and evening debriefs
- **Telegram Integration**: Send reminders and receive task updates via Telegram Bot
- **Agent System**: Intelligent agent that processes natural language and executes task management actions
- **Memory & Context**: Maintains user profiles and agent memory for personalized recommendations
- **Supabase Integration**: PostgreSQL database with real-time capabilities

## Tech Stack

- **Framework**: FastAPI 0.104.1
- **Server**: Uvicorn
- **Database**: Supabase PostgreSQL
- **LLM**: Groq (Llama 3.3 70B)
- **Job Scheduling**: APScheduler 3.10.4
- **Data Validation**: Pydantic 2.5.0
- **HTTP Client**: httpx (async)
- **Telegram**: python-telegram-bot 21.0

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py              # Configuration & environment variables
│   ├── agent/                 # AI agent logic
│   │   ├── loop.py            # Main agent orchestrator
│   │   ├── parser.py          # LLM response parsing
│   │   ├── memory.py          # Agent memory management
│   │   └── risk.py            # Risk assessment
│   ├── api/
│   │   └── routes/
│   │       ├── tasks.py       # Task CRUD endpoints
│   │       ├── projects.py    # Project management endpoints
│   │       ├── agent.py       # Agent interaction endpoints
│   │       └── auth.py        # Authentication endpoints
│   ├── services/
│   │   ├── groq_service.py    # LLM completions
│   │   ├── supabase_service.py # Database operations
│   │   ├── scheduler.py       # Job scheduling
│   │   └── telegram_service.py # Telegram bot handling
│   ├── models/
│   │   └── schemas.py         # Pydantic models & schemas
│   └── utils/
│       ├── errors.py          # Custom exceptions
│       └── logger.py          # Logging configuration
├── scripts/
│   └── test_cli.py            # CLI testing utilities
├── prompts/
│   └── system_prompt_v1.txt   # Agent system prompt template
├── requirements.txt           # Python dependencies
├── .env.example              # Example environment variables
└── db_schema.sql             # Database schema definition
```

## Getting Started

### Prerequisites

- Python 3.12+
- pip or conda
- Supabase account (free tier available)
- Groq API key (free tier available)
- Telegram Bot Token (optional, for notifications)

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your `.env` file:
   ```env
   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Groq
   GROQ_API_KEY=your-groq-api-key
   
   # Telegram (optional)
   TELEGRAM_TOKEN=your-telegram-bot-token
   
   # Environment
   ENVIRONMENT=development
   DEBUG=true
   ```

5. **Run migrations** (if needed)
   ```bash
   # Create tables in Supabase from db_schema.sql
   psql postgresql://... < db_schema.sql
   ```

6. **Start the server**
   ```bash
   python -m uvicorn app.main:app --reload
   ```

   Server will run at `http://localhost:8000`

## API Endpoints

### Tasks

#### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication",
  "priority": "high",
  "due_date": "2024-05-15T17:00:00",
  "estimated_hours": 4.5,
  "auto_prioritize": true
}
```

**Response**: Task object with ID, timestamps, and AI analysis

#### List Tasks
```http
GET /api/tasks?status=pending&priority=high&due_today=false
```

**Query Parameters**:
- `status`: pending, in_progress, completed, cancelled
- `priority`: low, medium, high, critical
- `due_today`: boolean to filter tasks due today

#### Get Task
```http
GET /api/tasks/{task_id}
```

#### Update Task
```http
PUT /api/tasks/{task_id}
Content-Type: application/json

{
  "status": "in_progress",
  "actual_hours": 3.2
}
```

#### Complete Task
```http
POST /api/tasks/{task_id}/complete?actual_hours=3.5
```

#### Delete Task
```http
DELETE /api/tasks/{task_id}
```

### Projects

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Mobile App Redesign",
  "description": "Complete UI/UX overhaul",
  "color": "blue"
}
```

#### List Projects
```http
GET /api/projects
```

### Agent

#### Chat with Agent
```http
POST /api/agent/chat
Content-Type: application/json

{
  "message": "What should I work on first?",
  "session_id": "optional-session-uuid"
}
```

**Response**:
```json
{
  "response": "Based on priorities...",
  "actions": {
    "intent": "prioritize_tasks",
    "task_ids": ["task-1", "task-2"]
  },
  "session_id": "uuid"
}
```

#### Morning Brief
```http
GET /api/agent/morning-brief
```

#### Evening Debrief
```http
GET /api/agent/evening-debrief
```

### Health & System

#### Health Check
```http
GET /health
```

#### API Info
```http
GET /
```

## Database Schema

### Core Tables

**users** - User authentication
- `id` (UUID, PK)
- `email` (string, unique)
- `created_at` (timestamp)

**tasks**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `title` (string)
- `description` (text)
- `priority` (enum: low, medium, high, critical)
- `status` (enum: pending, in_progress, completed, cancelled)
- `estimated_hours` (float)
- `actual_hours` (float)
- `due_date` (timestamp)
- `project_id` (UUID, FK)
- `created_at`, `updated_at` (timestamp)

**projects**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `name` (string)
- `description` (text)
- `color` (string)
- `status` (string)
- `created_at`, `updated_at` (timestamp)

**user_profiles**
- `user_id` (UUID, PK)
- `name` (string)
- `timezone` (string)
- `work_hours` (json: {start: int, end: int})
- `notification_channels` (json)
- `do_not_disturb` (json)

**agent_memory**
- `user_id` (UUID, PK)
- `patterns` (json)
- `completion_history` (json)
- `estimation_bias` (float)
- `frequently_missed_categories` (array)

**sessions**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `title` (string)
- `session_type` (string)
- `messages` (jsonb array)
- `created_at`, `updated_at` (timestamp)

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | (from dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | (from dashboard) |
| `GROQ_API_KEY` | Groq API key for LLM | (from console.groq.com) |
| `GROQ_MODEL` | LLM model to use | `llama-3.3-70b-versatile` |
| `TELEGRAM_TOKEN` | Telegram bot token | (from @BotFather) |
| `TELEGRAM_CHAT_ID` | Default Telegram chat ID | (your chat ID) |
| `ENVIRONMENT` | Deployment environment | `development` or `production` |
| `DEBUG` | Enable debug logging | `true` or `false` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |

## Core Services

### GroqService (`app/services/groq_service.py`)
Handles LLM completions for task analysis and natural language processing.

**Key Functions**:
- `complete(messages, temperature=0.7, max_tokens=1024)` - Send chat completion request

### SupabaseService (`app/services/supabase_service.py`)
Manages all database operations with fallback to in-memory store for development.

**Key Functions**:
- `create_task(task_data)` - Create new task
- `get_tasks(user_id, status, priority, due_today)` - Retrieve tasks with filters
- `update_task(task_id, updates)` - Update task
- `complete_task(task_id, actual_hours)` - Mark task as completed
- `get_user_profile(user_id)` - Retrieve user profile
- `upsert_user_profile(profile_data)` - Create or update profile

### Scheduler (`app/services/scheduler.py`)
APScheduler-based job scheduler for automated notifications.

**Jobs**:
- Morning briefing at user-configured time
- Midday check-in
- Evening debrief

### TelegramService (`app/services/telegram_service.py`)
Handles Telegram bot interactions for quick task creation and notifications.

## Agent System

### Loop (`app/agent/loop.py`)
Main orchestrator following the TutorX pattern - single LLM call per request.

**Key Functions**:
- `run_agent(user_id, message, trigger_type, session_id)` - Process user message and execute actions
- `run_morning_brief(user_id)` - Generate morning briefing
- `run_evening_debrief(user_id)` - Generate evening summary

### Parser (`app/agent/parser.py`)
Parses LLM responses into structured actions.

**Supported Intents**:
- `create_task` - Create new task
- `prioritize_tasks` - Reorder tasks by priority
- `estimate_time` - Estimate task duration
- `provide_insight` - General advice

### Memory (`app/agent/memory.py`)
Manages persistent memory for user profiles and agent learning.

## Deployment

### Render

1. **Connect GitHub repository** to Render
2. **Set environment variables** in Render dashboard
3. **Create database** (Supabase PostgreSQL)
4. **Configure build command**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Configure start command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0
   ```

### Production Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Configure `CORS_ORIGINS` to your frontend domain
- [ ] Set up proper logging and monitoring
- [ ] Configure Telegram for production
- [ ] Test all AI features with production Groq API
- [ ] Set up database backups
- [ ] Enable scheduler for automated jobs

## Testing

Run tests with pytest:

```bash
pytest                    # Run all tests
pytest -v               # Verbose output
pytest app/api/         # Run specific directory
pytest -k "test_create" # Run by name pattern
```

## Logging

Logs are configured in `app/utils/logger.py` with format:
```
%(asctime)s | %(levelname)s | %(name)s | %(message)s
```

**Log Levels**:
- `INFO`: General application flow
- `DEBUG`: Detailed debugging info
- `WARNING`: Warning messages (used when services degrade)
- `ERROR`: Error conditions

## API Documentation

Once running, access interactive API docs at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Troubleshooting

### Supabase Connection Failed
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check network connectivity
- Backend falls back to in-memory store for development

### Groq API Errors
- Verify `GROQ_API_KEY` is valid
- Check API rate limits at console.groq.com
- Review LLM call parameters (temperature, max_tokens)

### Telegram Webhook Not Receiving Updates
- Verify `TELEGRAM_TOKEN` is correct
- Ensure webhook URL is publicly accessible
- Check webhook endpoint in Telegram Bot API settings

### Memory/Session Management
- Sessions are stored in database (Supabase)
- Agent memory is per-user and persistent
- In-memory fallback used if Supabase unavailable

## Performance Considerations

- **LLM Calls**: ~2-5 seconds per request (Groq is fast)
- **Database Queries**: <100ms for typical operations
- **Telegram Updates**: Handled asynchronously
- **Scheduling**: APScheduler runs background jobs

## Security Notes

- Supabase service role key should never be exposed to frontend
- Telegram token stored securely as environment variable
- API expects authentication from frontend (Supabase JWT)
- Input validation on all endpoints via Pydantic

## Contributing

1. Create feature branch from main
2. Make changes and add tests
3. Run `pytest` to ensure tests pass
4. Submit pull request

## License

Proprietary - Daily Planner Agent Project

## Support

For issues and feature requests, check the project documentation or contact the development team.
