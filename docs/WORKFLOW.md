# Daily Planner Agent - Detailed Workflow

## Overview
Complete step-by-step workflow showing how the Daily Planner Agent works from task creation through execution with AI-powered insights and real-time synchronization.

---

## 1. User Task Management Flow (Web, Telegram, Email)

### 1.1 Web Interface Flow
```
User opens Daily Planner website
    ↓
React frontend authenticates with Supabase Auth
    ↓
Loads user's tasks for today from Supabase
    ↓
Displays task list with drag-drop UI
    ↓
User creates task: "Complete physics project"
    ↓
Frontend validates and calls: POST /api/tasks
    ↓
Backend receives task with Supabase Auth token
    ↓
Process task with AI insights (priority, time estimate, sub-tasks)
    ↓
WebSocket pushes updates in real-time
    ↓
UI displays task with AI insights and scheduling
```

### 1.2 Telegram Bot Flow
```
User sends message to Daily Planner Bot
    ↓
Telegram sends webhook to Render backend
    ↓
FastAPI endpoint: POST /telegram/webhook
    ↓
Parse message: "add task: complete physics project by 3pm"
    ↓
Extract: task_name, deadline, priority (optional)
    ↓
Backend processes task with AI insights
    ↓
Format response for Telegram
    ↓
Telegram bot replies: "✓ Task added. AI suggests: 2 hrs needed, High priority"
    ↓
Add quick action buttons: [Mark Done] [Edit] [Snooze]
```

### 1.3 Email Digest & Reminders
```
Daily morning email digest (sent via AWS SES)
    ↓
Shows today's tasks ordered by priority
    ↓
Shows AI-predicted completion time
    ↓
Includes: [Mark Complete] [Add Task] [View on Website] links
    ↓
Throughout day, AWS SES sends reminder emails at key times:
   - 8 AM: Morning briefing
   - 12 PM: Mid-day reminder
   - 5 PM: Evening summary
```

---

## 2. Task Creation & AI Processing Pipeline

### 2.1 Task Lifecycle

```
User Action: "Create task"
    ↓
Input: { task_name, description, deadline?, tags?, priority? }
    ↓
Step 1: Input Validation
    - Validate task_name (10-500 chars)
    - Validate deadline format (YYYY-MM-DD HH:MM)
    - Check for duplicates in today's list
    ↓
Step 2: AI Processing (Groq LLM)
    - Analyze task description
    - Estimate time needed (mins)
    - Determine priority (if not provided)
    - Generate sub-tasks (if complex)
    - Suggest optimal scheduling
    ↓
Step 3: Database Storage (Supabase)
    - INSERT into tasks table
    - INSERT into task_insights table
    - LINK to user's daily schedule
    ↓
Step 4: Real-Time Notification
    - WebSocket broadcasts to all user devices
    - Telegram notification sent (if enabled)
    - Update local calendar view
    ↓
Step 5: Response to User
    - Show task with AI-generated suggestions
    - Display in task list with visual indicators
    - Show time estimate and priority badge
```

### 2.2 AI Analysis API Endpoint

**Endpoint:** `POST /api/tasks`

**Request:**
```json
{
  "task_name": "Complete physics project on motion laws",
  "description": "Build a presentation and demo showing Newton's three laws. Include video examples. Due for submission.",
  "deadline": "2026-04-20 17:00",
  "priority": null,
  "category": "academics"
}
```

**Backend Processing (Step-by-Step Code Logic):**

```python
import asyncio
from groq import Groq

@app.post("/api/tasks")
async def create_task(task: TaskCreate, user_id: str = Depends(verify_supabase_auth)):
    
    # Step 1: Validate input
    if len(task.task_name) < 5 or len(task.task_name) > 500:
        raise HTTPException(status_code=400, detail="Task name must be 5-500 chars")
    
    # Step 2: AI Analysis - Use Groq to generate insights
    groq_client = Groq()
    
    ai_prompt = f"""Analyze this task and provide insights:
    
Task: {task.task_name}
Description: {task.description}
Deadline: {task.deadline}

Provide JSON response with:
1. estimated_hours: float (how many hours needed)
2. priority_level: "high" | "medium" | "low"
3. sub_tasks: [list of 2-4 actionable sub-tasks]
4. optimal_start_time: "morning" | "afternoon" | "evening"
5. difficulty_level: "easy" | "medium" | "hard"
6. risk_assessment: "on-track" | "tight-deadline" | "unrealistic"

Be specific and practical."""

    ai_response = groq_client.chat.completions.create(
        model="mixtral-8x7b",
        messages=[
            {"role": "system", "content": "You are a task planning expert. Analyze tasks pragmatically."},
            {"role": "user", "content": ai_prompt}
        ],
        temperature=0.3,
        max_tokens=500
    )
    
    # Parse AI response
    insights_json = json.loads(ai_response.choices[0].message.content)
    
    # Step 3: Store in Supabase
    task_data = {
        "user_id": user_id,
        "task_name": task.task_name,
        "description": task.description,
        "deadline": task.deadline,
        "priority": insights_json["priority_level"],
        "status": "pending",
        "created_at": datetime.now()
    }
    
    # INSERT task
    task_result = supabase.table("tasks").insert(task_data).execute()
    task_id = task_result.data[0]["id"]
    
    # INSERT AI insights
    insights_data = {
        "task_id": task_id,
        "estimated_hours": insights_json["estimated_hours"],
        "priority_level": insights_json["priority_level"],
        "sub_tasks": insights_json["sub_tasks"],
        "optimal_start_time": insights_json["optimal_start_time"],
        "difficulty_level": insights_json["difficulty_level"],
        "risk_assessment": insights_json["risk_assessment"]
    }
    
    supabase.table("task_insights").insert(insights_data).execute()
    
    # Step 4: Broadcast via WebSocket
    await broadcast_to_user(user_id, {
        "type": "task_created",
        "task_id": task_id,
        "insights": insights_json
    })
    
    # Step 5: Return response
    return {
        "task_id": task_id,
        "task_name": task.task_name,
        "insights": {
            "estimated_hours": insights_json["estimated_hours"],
            "priority": insights_json["priority_level"],
            "sub_tasks": insights_json["sub_tasks"],
            "optimal_start_time": insights_json["optimal_start_time"],
            "risk": insights_json["risk_assessment"]
        },
        "created_at": datetime.now()
    }
```

**Response:**
```json
{
  "task_id": "task_12345",
  "task_name": "Complete physics project on motion laws",
  "insights": {
    "estimated_hours": 4.5,
    "priority": "high",
    "sub_tasks": [
      "Research Newton's three laws (1 hour)",
      "Create presentation slides with examples (2 hours)",
      "Record video demo or find visual examples (1 hour)",
      "Practice presentation and prepare for Q&A (30 mins)"
    ],
    "optimal_start_time": "afternoon",
    "difficulty_level": "medium",
    "risk": "tight-deadline"
  },
  "created_at": "2026-04-17T10:30:45Z"
}
```

---

## 3. Complete User Journey - Web Interface

### 3.1 Student logs in

```
1. Student navigates to daily-planner.app
2. Frontend detects no Supabase Auth token
3. Redirect to login page
4. Student enters email + password
5. Frontend calls: Supabase.auth.signInWithPassword(email, password)
6. Supabase Auth verifies credentials
7. Returns JWT token + user session
8. Frontend stores token in secure localStorage
9. Redirect to main dashboard
10. Frontend fetches user's tasks for today: GET /api/tasks?date=2026-04-17
    ↓
    Returns: [
      { id: 1, name: "Physics project", priority: "high", estimated_hours: 4.5, status: "pending" },
      { id: 2, name: "Math homework", priority: "medium", estimated_hours: 1.5, status: "pending" },
      { id: 3, name: "Breakfast meeting", priority: "low", estimated_hours: 0.5, status: "completed" }
    ]
11. Display dashboard with task list sorted by priority
```

### 3.2 Student views AI-powered dashboard

```
Dashboard shows:
┌─────────────────────────────────────────────────────────┐
│ TODAY'S SCHEDULE (April 17, 2026)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📊 AI INSIGHTS                                          │
│ • Tasks today: 3                                        │
│ • Total time needed: 6.5 hours                          │
│ • Available time: 8 hours                               │
│ • Status: ✓ On track                                   │
│ • Recommended start time: Start HIGH priority now      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 🔴 HIGH PRIORITY (Start Now)                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Physics Project                            4.5 hrs  │ │
│ │ Due: Today 5:00 PM                         ⏰ 6:30  │ │
│ │ Risk: ⚠️ Tight deadline                              │ │
│ │ Sub-tasks:                                          │ │
│ │ □ Research Newton's laws                (1 hr)      │ │
│ │ □ Create presentation slides           (2 hrs)     │ │
│ │ □ Record video demo                    (1 hr)      │ │
│ │ □ Practice presentation                (0.5 hr)    │ │
│ │ [Start Task] [Edit] [Snooze]                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🟡 MEDIUM PRIORITY (Start at 3 PM)                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Math Homework                              1.5 hrs  │ │
│ │ Due: Tomorrow 10:00 AM                   ✓ Flexible │
│ │ Risk: On track                                      │ │
│ │ [Start Task] [Edit]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚪ LOW PRIORITY (Optional Today)                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✓ Breakfast Meeting               0.5 hrs | DONE    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [+ Add New Task] [View Calendar] [Weekly View]         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Student creates a new task

```
1. Student clicks [+ Add New Task]
2. Modal form appears:
   Task Name: [___________________________________]
   Description: [____________________________]
                [____________________________]
   Category: [Academics ▼]
   Priority: [Auto-detect ▼]
   Deadline: [Date picker] [Time picker]
   [Create] [Cancel]

3. Student types:
   Task Name: "Complete physics project on motion laws"
   Description: "Build presentation and demo showing Newton's laws. Include video."
   Category: "Academics"
   Deadline: "2026-04-20 17:00"
   Priority: (leave blank for AI detection)

4. Frontend validates:
   - Task name not empty ✓
   - Deadline in future ✓
   - Not duplicate ✓
   
5. Frontend shows loading spinner: "AI is analyzing your task..."

6. Frontend calls: POST /api/tasks
   Request: { task_name, description, deadline, category }
   Headers: { "Authorization": "Bearer {jwt_token}" }

7. Backend processes:
   - Validates input
   - Runs Groq LLM analysis
   - Generates insights (4.5 hours needed, HIGH priority, 4 sub-tasks)
   - Stores in Supabase
   - Returns response with AI insights

8. Frontend displays response in modal:
   ✓ Task Created!
   
   📊 AI Analysis:
   • Estimated time: 4.5 hours
   • Priority: 🔴 HIGH
   • Difficulty: Medium
   • Status: ⚠️ Tight deadline (only 2 days, 4.5 hours needed)
   • Recommended start: This afternoon
   
   Suggested sub-tasks:
   ✓ Research Newton's three laws (1 hour)
   ✓ Create presentation slides (2 hours)
   ✓ Record video demo (1 hour)
   ✓ Practice presentation (30 mins)

9. Frontend closes modal and updates dashboard:
   - Physics Project now appears in HIGH PRIORITY section
   - Real-time update via WebSocket
   - All user devices sync instantly
```

### 3.4 Student starts working on task

```
1. Student clicks [Start Task] on Physics Project
2. Frontend calls: POST /api/tasks/{task_id}/start
3. Backend updates:
   - SET status = "in_progress"
   - SET started_at = NOW()
   - Send WebSocket update: "task_started"

4. Frontend enters "Focused Mode":
   ┌─────────────────────────────────────┐
   │ 📚 Physics Project           [Exit] │
   │                                     │
   │ ⏱️ Timer: 00:00:15                  │
   │ 📍 Currently on: Sub-task 1        │
   │    "Research Newton's laws"        │
   │                                     │
   │ Progress: [████░░░░░░░░░░] 25%    │
   │                                     │
   │ [Sub-task 1] [Sub-task 2]         │
   │ [Sub-task 3] [Sub-task 4]         │
   │                                     │
   │ [Mark Sub-task Complete] [Snooze] │
   │ [Pause] [Resume]                  │
   └─────────────────────────────────────┘

5. Real-time timer shows elapsed time
6. Student can mark sub-tasks as complete
7. As student completes sub-tasks:
   - Progress bar updates (25% → 50% → 75% → 100%)
   - WebSocket updates Telegram & all devices
   - Email reminder shows updated progress
```

### 3.5 Student marks task complete

```
1. Student finishes all sub-tasks
2. Student clicks [Mark Task Complete]
3. Frontend calls: POST /api/tasks/{task_id}/complete
4. Backend:
   - SET status = "completed"
   - SET completed_at = NOW()
   - Calculate actual_hours = (completed_at - started_at) / 3600
   - Compare with estimated_hours (AI accuracy tracking)
   - Send WebSocket: "task_completed"

5. Frontend shows celebration:
   🎉 Task Complete!
   
   Physics Project ✓
   Estimated: 4.5 hours
   Actual: 4.2 hours
   AI was 93% accurate! 📈
   
   [Next Task] [View All] [Take Break]

6. Dashboard updates:
   - Physics Project moves to COMPLETED section
   - Daily progress shows: 2/3 tasks done
   - AI recalculates remaining time needed
```

### 3.6 Student views weekly analytics

```
1. Student clicks [Weekly View]
2. Frontend loads analytics: GET /api/analytics/week
3. Dashboard shows:
   
   📊 THIS WEEK (April 14-20)
   ├─ Tasks Completed: 12/15 (80%)
   ├─ Average Task Accuracy: 91%
   │  (AI estimates vs actual time)
   ├─ Most Productive Day: Wednesday
   ├─ Average Daily Tasks: 2.4
   └─ Time Spent: 28.5 hours
   
   📈 Category Breakdown:
   ├─ Academics: 18 hours
   ├─ Fitness: 5 hours
   ├─ Personal: 5.5 hours
   └─ Work: 0 hours (vacation)
   
   🎯 Productivity Trends:
   ├─ Monday: 70% (3/4 completed)
   ├─ Tuesday: 90% (9/10 completed)
   ├─ Wednesday: 100% (5/5 completed) ⭐
   ├─ Thursday: 80% (4/5 completed)
   └─ Friday: (today, ongoing)
   
   💡 AI Insights:
   • You work best on Wednesday afternoons
   • Physics tasks take 20% longer than estimated (adjust future estimates)
   • Best completion rate between 2-5 PM
```

---

## 4. Telegram Bot Workflow

### 4.1 Bot Commands

```
/start → Subscribe to bot, show menu
/today → Show today's tasks
/add → Add new task (with AI analysis)
/list → Show all pending tasks
/complete [task] → Mark task as done
/reschedule [task] → Move to another day
/notify [on/off] → Toggle reminders
/weekly → Show weekly stats
/help → Show all commands
```

### 4.2 Example Telegram Conversation

```
User: /today
Bot: "📋 Your Tasks Today (April 17)
     
🔴 HIGH (Start Now)
├─ Physics Project (4.5 hrs, Due 5:00 PM)
│  Risk: ⚠️ Tight deadline
│  [Start] [Mark Done] [Snooze]
│
🟡 MEDIUM (Start at 3 PM)
├─ Math Homework (1.5 hrs, Due Tomorrow)
│  [Start] [Mark Done]
│
⚪ LOW (Optional)
└─ Breakfast Meeting (DONE) ✓

🤖 AI Says: You have 6.5 hours of work and 8 hours available. 
   Start HIGH priority tasks immediately!

[Add New Task] [View On Website] [Weekly Stats]"

User: (clicks [Add New Task])
Bot: "What's your new task?"

User: complete physics project
Bot: "⏳ Got it! Let me analyze...
     
🔍 AI Analysis:
• Task: Complete physics project
• Estimated time: 4.5 hours
• Priority: 🔴 HIGH
• Difficulty: Medium
• Risk: ⚠️ Tight deadline
• Suggested start: This afternoon

Sub-tasks suggested:
1️⃣ Research Newton's laws (1h)
2️⃣ Create presentation (2h)
3️⃣ Record video demo (1h)
4️⃣ Practice presentation (0.5h)

✓ Task added! Start ASAP to meet deadline.

[Start Working] [Edit] [View On Website]"

User: /complete physics project
Bot: "✅ Physics Project marked complete!
     
📊 Performance:
• Estimated: 4.5 hours
• Actual: 4.2 hours
• Accuracy: 93% 📈

Great work! 🎉
Next task: Math Homework (1.5 hrs)

[Start Next] [View All] [Rest Mode]"
```

### 4.3 Telegram Real-Time Sync

```
User adds task on Website
    ↓
Backend stores in Supabase
    ↓
Backend sends Telegram notification:
   "📝 New task: Complete physics project
    AI says: 4.5 hours, HIGH priority"
    ↓
User on Telegram sees notification
    ↓
User can immediately [Start] or [Snooze]

User marks task complete on Telegram
    ↓
Backend updates Supabase
    ↓
WebSocket broadcasts to all devices
    ↓
User's website dashboard updates in real-time
```

---

## 5. Email Workflow

### 5.1 Morning Briefing (8 AM Daily)

```
Scheduled email sent to user@email.com
Subject: "Good morning! Your tasks for April 17"

═══════════════════════════════════════════════
📋 DAILY BRIEFING - Thursday, April 17

Hi [Student Name],

Here's your task plan for today:

🔴 HIGH PRIORITY (3 tasks - 6.5 hours)
├─ Physics Project              Due: 5:00 PM
│  ⏰ Estimated: 4.5 hours
│  ⚠️  Risk: Tight deadline (start now!)
│  📌 Sub-tasks: Research → Create slides → Video → Practice
│  [Start Task] [View Details]
│
├─ Backup Task A                Due: 8:00 PM
│  ⏰ Estimated: 1.5 hours
│
└─ Backup Task B                Due: 9:00 PM
   ⏰ Estimated: 0.5 hours

🟡 MEDIUM PRIORITY (2 tasks - 2.5 hours)
└─ Math Homework                Due: Tomorrow 10:00 AM
   [Add to Today] [Reschedule]

⚪ OPTIONAL (1 task)
└─ Meditation                   Flexible
   [Add to Today]

═══════════════════════════════════════════════
📊 AI INSIGHTS
• Total workload: 6.5 hours available time
• Available time: 8 hours
• Status: ✅ On track
• Recommended start: Physics Project immediately
• Best productivity window: 2-5 PM (based on your history)

═══════════════════════════════════════════════
🔗 Quick Links
[View Full Schedule] [Add Task] [View Analytics] [Settings]

Or reply to this email to add a new task!

Your Daily Planner Bot
═══════════════════════════════════════════════
```

### 5.2 Mid-Day Reminder (12 PM)

```
Subject: "Midday check-in: You're on track! 🎯"

Hi [Student Name],

Quick update on your progress:

✅ COMPLETED (1/3)
├─ Breakfast Meeting (30 mins)

🔄 IN PROGRESS (1/3)
├─ Physics Project (started 10:30 AM, 1.5 hrs elapsed)
│  ✓ Research complete
│  → Working on: Create presentation slides
│  Time remaining: 2.5 hours (on track for 5:00 PM deadline)

⏳ NOT STARTED (2/3)
├─ Math Homework (due tomorrow)
├─ Backup tasks

🎯 RECOMMENDATION
You're 33% done. To stay on schedule:
• Continue physics project until 2:00 PM (1 more hour)
• Take a 15-min break
• Start Math Homework at 2:15 PM
• Finish by 3:45 PM

[View Schedule] [Update Progress] [Need Help?]
```

### 5.3 Evening Summary (5 PM)

```
Subject: "End of day summary 📊"

Hi [Student Name],

Here's how your day went:

✅ COMPLETED (2/3)
├─ Physics Project (4.2 hrs - Excellent! 93% accurate)
└─ Math Homework (1.3 hrs - Quick finish)

⏳ NOT STARTED (1/3)
└─ Backup Task (moved to tomorrow)

═══════════════════════════════════════════════
📈 TODAY'S STATS
• Tasks completed: 67%
• Time spent: 5.5 hours
• AI accuracy: 93% (estimated vs actual)
• Productivity: High ⭐

🏆 ACHIEVEMENTS
• Completed high-priority task on time ✓
• Beat time estimate by 18 minutes ✓
• 93% planning accuracy ✓

💪 TOMORROW'S OUTLOOK
• 4 tasks scheduled
• Total time: 7.2 hours
• Recommended start: 9:00 AM
• Difficulty: Medium

═══════════════════════════════════════════════
[View Full Week] [Plan Tomorrow] [See Trends] [Settings]

Rest well! You earned it. 🌙
```

---

## 6. Database Operations During Task Management

### 6.1 Supabase Tables Updated

When task is created:

**1. tasks table** (INSERT)
```sql
INSERT INTO tasks (
  user_id, 
  task_name, 
  description, 
  deadline, 
  priority, 
  category,
  status, 
  created_at
)
VALUES (
  'user_123',
  'Complete physics project',
  'Build presentation and demo',
  '2026-04-20 17:00',
  'high',
  'academics',
  'pending',
  NOW()
);
```

**2. task_insights table** (INSERT)
```sql
INSERT INTO task_insights (
  task_id,
  estimated_hours,
  priority_level,
  sub_tasks,
  difficulty_level,
  risk_assessment,
  optimal_start_time
)
VALUES (
  'task_456',
  4.5,
  'high',
  '["Research laws", "Create slides", "Record video", "Practice"]',
  'medium',
  'tight-deadline',
  'afternoon'
);
```

**3. user_activity table** (UPDATE)
```sql
UPDATE user_activity
SET 
  tasks_created = tasks_created + 1,
  last_activity = NOW()
WHERE user_id = 'user_123';
```

When task is completed:

**4. tasks table** (UPDATE)
```sql
UPDATE tasks
SET 
  status = 'completed',
  completed_at = NOW(),
  actual_hours = EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600
WHERE id = 'task_456';
```

**5. task_analytics table** (INSERT)
```sql
INSERT INTO task_analytics (
  user_id,
  task_id,
  estimated_hours,
  actual_hours,
  accuracy_percentage,
  completed_date
)
VALUES (
  'user_123',
  'task_456',
  4.5,
  4.2,
  93.3,
  '2026-04-17'
);
```

---

## 7. Real-Time WebSocket Updates

### 7.1 WebSocket Connection Flow

```
Frontend connects:
ws://render-backend.com/ws?token=jwt_token

    ↓
Backend authenticates token via Supabase
    ↓
Backend creates WebSocket connection
    ↓
Backend stores connection in active_connections[user_id]

User creates task via REST API
    ↓
Backend broadcasts via WebSocket:
{"type": "task_created", "task": {...}, "insights": {...}}

    ↓
All connected devices receive update:
├─ Web browser tab 1
├─ Web browser tab 2
├─ Mobile browser
└─ Telegram bot (separate notification)

User marks task complete on one device
    ↓
Backend broadcasts:
{"type": "task_completed", "task_id": "task_456", "time_taken": 4.2}

    ↓
All devices update in real-time:
├─ Web: Task moves to completed section
├─ Telegram: User gets notification
├─ Email: Dashboard refreshes when next opened
```

### 7.2 Task Progress Sync

```
User on device A marks task in progress:
    ↓
Backend updates: status = "in_progress", started_at = NOW()
    ↓
Broadcasts via WebSocket to all devices:
{"type": "task_status_changed", "task_id": "task_456", "status": "in_progress"}

User on device B sees instant update:
    ↓
Task moves from "pending" to "in progress" section
    ↓
Timer starts running
    ↓
Real-time feedback across all screens
```

---

## 8. AI Learning & Personalization

### 8.1 AI Accuracy Tracking

```
Over time, backend tracks:

For each completed task:
├─ Estimated hours (from AI)
├─ Actual hours (from timer)
├─ Category (academics, fitness, etc.)
├─ Day of week
├─ Time of day
└─ Accuracy percentage = (estimated / actual) * 100

Database query for personalization:
SELECT 
  category,
  AVG(estimated_hours) as avg_estimate,
  AVG(actual_hours) as avg_actual,
  COUNT(*) as task_count
FROM task_analytics
WHERE user_id = 'user_123'
GROUP BY category;

Result example:
├─ Academics: Est 3.2hrs → Actual 3.8hrs (AI is 16% too optimistic)
├─ Fitness: Est 1.0hr → Actual 0.9hrs (AI is 11% too optimistic)
└─ Personal: Est 1.5hrs → Actual 1.2hrs (AI is 25% too optimistic)

For future estimates, AI adds correction factors:
New estimate = (base_estimate * category_correction_factor)
Physics project estimate adjusted: 4.5 * 1.16 = 5.2 hours (more realistic)
```

### 8.2 Personalized Recommendations

```
Backend analyzes user patterns:

1. Best productive hours
   SELECT task_name, completed_at::hour, actual_hours
   FROM tasks WHERE user_id = 'user_123'
   Result: Most tasks finished 2-5 PM
   Recommendation: "You work best in afternoons"

2. Weak categories
   SELECT category, AVG(accuracy) as avg_accuracy
   FROM task_analytics
   WHERE user_id = 'user_123'
   Result: Math tasks 20% less accurate than estimates
   Recommendation: "Add 20% buffer to math tasks"

3. Task duration patterns
   SELECT category, DAYOFWEEK, AVG(actual_hours)
   Result: Tasks take longer on Monday
   Recommendation: "Monday tasks might need extra time"

All recommendations shown in:
├─ Daily briefing emails
├─ Weekly analytics dashboard
└─ Task creation AI suggestions
```

---

## 9. Performance Timeline

From task creation to display:

```
T+0ms:     User submits task form
T+50ms:    Request transmitted to backend
T+100ms:   Supabase Auth token verified
T+200ms:   Input validation complete
T+400ms:   Groq LLM begins analysis
T+1200ms:  Groq returns insights (4.5 hours, HIGH priority, sub-tasks)
T+1300ms:  Supabase INSERT tasks table
T+1350ms:  Supabase INSERT task_insights table
T+1400ms:  WebSocket broadcasts to all connections
T+1450ms:  Response sent to frontend
T+1500ms:  Frontend receives & displays task with insights
Total:     ~1.5 seconds from creation to display
```

---

## 10. Error Handling

### 10.1 Error Scenarios

**Scenario 1: Groq API timeout**
```
LLM takes >5 seconds to respond
    ↓
Backend catches timeout
    ↓
Fallback: Return generic insights
    ↓
Response: "Task added! (AI analysis unavailable, try later)"
    ↓
UI shows basic task without sub-tasks
```

**Scenario 2: User authentication fails**
```
Request comes without JWT token
    ↓
Supabase Auth verification fails
    ↓
Backend returns: 401 Unauthorized
    ↓
Frontend redirects to login page
```

**Scenario 3: Duplicate task**
```
User creates: "Physics project"
User later creates: "Physics project" (same day)
    ↓
Backend detects: SELECT * FROM tasks WHERE task_name = ? AND user_id = ?
    ↓
Returns: 409 Conflict - Task already exists
    ↓
Frontend offers: [Edit Existing] [Create Anyway]
```

**Scenario 4: Unrealistic deadline**
```
AI analysis determines: 10 hours needed by tomorrow 5 PM
(Only 21 hours available, but includes sleep)
    ↓
Backend flags: risk_assessment = "unrealistic"
    ↓
Email warning: "⚠️ This task may not be completable by deadline"
    ↓
Suggestions: [Extend deadline] [Remove sub-tasks] [Seek help]
```

---

## 11. Summary Workflow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│              DAILY PLANNER AGENT COMPLETE FLOW                     │
└────────────────────────────────────────────────────────────────────┘

USER INPUT (3 channels)
├─ Web (React + Vite on Vercel)
├─ Telegram (Telegram Bot API)
└─ Email (AWS SES)
         ↓
AUTHENTICATION
├─ Supabase Auth verifies token
└─ User profile loaded
         ↓
TASK CREATION
├─ Validate input (name, deadline)
└─ Extract metadata (category, priority)
         ↓
AI ANALYSIS (Groq LLM)
├─ Estimate hours needed
├─ Determine priority level
├─ Generate sub-tasks (2-4)
├─ Suggest optimal start time
└─ Calculate risk assessment
         ↓
DATABASE STORAGE (Supabase)
├─ INSERT into tasks table
├─ INSERT into task_insights table
└─ UPDATE user_activity
         ↓
REAL-TIME BROADCAST (WebSocket)
├─ Notify all user devices
└─ Telegram bot notification
         ↓
TASK DISPLAY (3 channels)
├─ Web: Dashboard with AI insights
├─ Telegram: Quick action buttons
└─ Email: Morning briefing included
         ↓
TASK EXECUTION
├─ User clicks "Start Task"
├─ Timer begins, status = "in_progress"
├─ Sub-task checkboxes available
└─ Real-time progress synced
         ↓
TASK COMPLETION
├─ User marks task complete
├─ Backend calculates actual hours
├─ Compares vs AI estimate (accuracy tracking)
└─ Stores analytics for future personalization
         ↓
ANALYTICS & PERSONALIZATION
├─ Track AI accuracy per category
├─ Identify best productive hours
├─ Suggest correction factors
└─ Personalize future estimates
         ↓
NOTIFICATIONS (All Channels)
├─ Morning briefing (8 AM)
├─ Midday check-in (12 PM)
├─ Evening summary (5 PM)
├─ Real-time task updates (WebSocket)
└─ Telegram instant notifications
```

This workflow ensures students stay productive with AI-powered task planning, real-time synchronization, and intelligent insights across all devices!
