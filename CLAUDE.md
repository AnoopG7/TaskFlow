# Daily Planner Agent - AI Context Guide

## Project Overview
Intelligent task management system that analyzes tasks, estimates time, detects risks, and provides daily productivity insights.

## Architecture
- **Frontend**: React + Vite + Supabase Auth
- **Backend**: FastAPI (Python 3.12) on Render
- **Database**: Supabase PostgreSQL
- **AI**: Groq LLM (Mixtral 8x7B) for task analysis

## Key Features
1. **AI Task Analysis**: Auto time estimation, risk detection, subtask generation
2. **Productivity Tracking**: Daily/weekly analytics
3. **Time Accuracy**: Track estimate vs actual hours
4. **Project Management**: Organize tasks by project
5. **Smart Reminders**: Morning briefing, midday check-in, evening summary
6. **Telegram Bot**: Quick task creation & completion

## Important Files
- `backend/app/services/groq_service.py` - Task AI analysis
- `backend/app/services/supabase_service.py` - Task CRUD
- `docs/DETAILED_PLAN.md` - Feature specifications
- `docs/WORKFLOW.md` - User journeys

## Database Schema
```sql
user_profiles(user_id, name, timezone, work_hours)
tasks(id, user_id, title, priority, status, deadline, estimated_hours, actual_hours)
projects(id, user_id, name, status)
task_insights(task_id, time_confidence, risk_factors, suggested_subtasks)
user_analytics(user_id, date, tasks_completed, avg_time_accuracy)
```

## Getting Started
```bash
# Backend
cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

## AI Analysis Example
```
Input: "Implement user authentication system"
Output:
  - estimated_hours: 4.5
  - priority: high
  - risks: ["New authentication system", "Security implications"]
  - subtasks: ["Design auth flow", "Implement JWT", "Add password reset", "Write tests"]
```

## Cost & Deployment
- **Cost**: $0/month (free tiers)
- **Frontend**: Vercel (daily-planner.vercel.app)
- **Backend**: Render (daily-api.onrender.com)
- **Database**: Supabase (500MB free)

## Next Steps
1. Refine time estimation model with historical data
2. Implement APScheduler jobs for daily notifications
3. Build productivity dashboard with charts
4. Setup Telegram bot integration
5. Deploy to production
