# Daily Planner Agent - Cost Breakdown

**Monthly Cost: $0/month**

## Services Used

| Service | Free Tier | Cost | Usage |
|---|---|---|---|
| **Supabase PostgreSQL** | 500 MB storage | $0/month | Tasks, projects, team data, calendars, history |
| **Supabase Storage** | 500 MB included | $0/month | Task attachments, project documents |
| **Render** | 750 hrs/month | $0/month | FastAPI backend hosting (~50 hrs/month used) |
| **Vercel** | Unlimited | $0/month | React + Vite frontend hosting |
| **python-socketio** | Included with Render | $0/month | Real-time task sync, team collaboration |
| **Groq API** | Unlimited free | $0/month | Generate task suggestions, priority analysis, risk detection |
| **Telegram Bot API** | Free | $0/month | Telegram bot for quick task management |
| **Supabase Auth** | Included with PostgreSQL | $0/month | User login/signup (email verification, password reset, OAuth)

## Breakdown by Feature

### Task Management
- Database: Supabase PostgreSQL (tasks, priorities, deadlines, dependencies)
- Real-time: python-socketio (live updates across devices)
- LLM: Groq API (suggest task breakdowns, priority recommendations)

### Team Collaboration
- Database: Supabase PostgreSQL (team members, permissions, task assignments)
- Real-time: python-socketio (live notifications when tasks assigned/updated)
- Notifications: AWS SES (team email updates)

### Advanced Planning
- LLM: Groq API (critical path analysis, capacity planning, risk detection)
- Database: Supabase PostgreSQL (historical data for pattern analysis)

### Communication Channels
- Website: React on Vercel (full task management, portfolio view)
- Telegram: Telegram Bot API (today's tasks, quick status updates)
- In-app: python-socketio notifications

## Storage Needs
- Task attachments: ~50-100 MB
- Project documents: ~100-150 MB
- Analytics/exports: ~20-50 MB
- Total: **~170-300 MB** (within 500 MB limit)

## LLM Usage (Groq)
- Task suggestion/breakdown: 50-100/day
- Priority analysis: 30-60/day
- Critical path analysis: 10-20/day
- Risk detection: 20-40/day
- Daily briefing generation: 20-50/day
- Total: **~150-270 requests/day** (well under Groq's free limits)

## Scaling Notes
- Upgrade Supabase when > 500 MB data: $35/month
- Upgrade Render when > 1000 concurrent users: $7/month
- Groq stays free unless > 30 req/min consistently: ($5+/month)

**Total: $0/month forever** ✅
