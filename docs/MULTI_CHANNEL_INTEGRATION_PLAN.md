# Daily Planner Agent - Multi-Channel Integration

## Overview
Users access Daily Planner Agent via:
1. **Website** (React + Vite on Vercel) - Full task management & collaboration
2. **Telegram Bot** (@daily_planner_bot) - Quick task updates & reminders

---

## Telegram Bot (@daily_planner_bot)

### Commands
```
/start          → Welcome + Account linking
/today          → Today's task list
/add_task       → Create new task
/mark_done      → Complete a task
/upcoming       → Show deadlines
/summary        → Daily briefing
/team           → Team status updates
/urgent         → Show urgent items
/help           → Show all commands
/settings       → Notification preferences
/link_account   → Link to website account
```

### Quick Actions (Inline Buttons)
```
[✅ Mark Done] [⏱️ Snooze 1hr] [📌 Priority] [📝 Add Note]
[📱 View Details]  [👥 Assign Team]
```

### Example Interactions

**Scenario 1: Task Due Soon Alert**
```
System (4 hours before deadline):
Bot: "⏰ Budget Planning due in 4 hours (2:00 PM)
     
     Status: 60% complete
     Assigned to: You
     Team: John (awaiting), Sarah (done)
     
     [✅ Mark Done] [⏱️ Snooze] [📝 Add Note] [📱 View Full]"

User: [📱 View Full]
Website opens task detail page
```

**Scenario 2: Daily Briefing**
```
User: /today

Bot: "📋 Your Day - Apr 17

     🔴 URGENT (5)
     - Budget Planning (due 2:00 PM)
     - Client call prep (due 12:00 PM)
     - Review contracts (due EOD)
     
     🟡 TODAY (8)
     - Email follow-ups
     - Sprint planning
     - Team feedback
     - [+5 more]
     
     🟢 THIS WEEK (12)
     - Project kickoff (Thu)
     - Design review (Fri)
     - [+10 more]
     
     ✅ DONE TODAY (3)
     - Morning standup ✓
     - Design approval ✓
     - Budget review ✓
     
     ⏰ DEADLINES
     - Next: Budget Planning (2:00 PM)
     - Today: 5 tasks
     - Tomorrow: 8 tasks
     
     👥 TEAM
     - 3 tasks assigned to you
     - 2 tasks awaiting your approval
     - 1 overdue item needs attention
     
     [📝 Add Task] [📊 Analytics] [🔄 Sync]"
```

---

## Website Features

### Task Management Dashboard
- Today's tasks (visual priority display)
- Quick task creation
- Task list by status (To-do, In Progress, Done)
- Calendar view
- Portfolio view (all projects)

### Task Detail & Editing
- Task name, description, details
- Priority level (Critical, High, Medium, Low)
- Due date & time
- Assigned to (person)
- Dependencies (blocking/blocked by)
- Tags/labels
- Subtasks
- Comments & notes
- Attachments
- Time tracking (optional)

### Project Management
- Create/manage projects
- Project overview
- Task breakdown by project
- Project progress tracking
- Team members per project

### Team Collaboration
- Assign tasks to team members
- Task comments & discussions
- @mention notifications
- Task status updates
- Team workload view
- Permission management

### Calendar View
- All tasks on calendar
- Deadline visualization
- Team availability
- Meeting integration (optional)
- Drag-to-reschedule tasks

### Analytics & Insights
- Tasks completed today/week/month
- Productivity metrics
- On-time completion rate
- Overdue tasks tracking
- Team productivity comparison
- Time distribution by project
- Burndown charts

### AI Features
- Task prioritization suggestions
- Critical path analysis
- Capacity planning
- Risk detection (overdue trends, bottlenecks)
- Smart reminders
- Task auto-suggestions

### Notifications & Reminders
- Task due soon (4 hours before)
- Overdue task alerts
- Assigned task notifications
- Approved task notifications
- Team member reminders
- Daily briefing

### Settings
- Notification preferences
- Telegram bot linking
- Default priority
- Working hours
- Team/project settings
- Email frequency

---

## Notification System

### Automated Notifications

**Task Due Soon** (4 hours before deadline)
- Telegram: "[Task] due in 4 hours"
- Email: In daily digest or separate alert
- In-app: Notification + banner
- Push: Mobile notification

**Task Overdue** (On deadline + 1, 4, 24 hours later)
- Telegram: "⚠️ [Task] is OVERDUE"
- Email: Urgent alert
- In-app: Red alert
- Push: Urgent notification

**Assigned Task** (Immediately when assigned)
- Telegram: "👤 [Task] assigned to you"
- Email: Notification (if enabled)
- In-app: In inbox
- Push: Notification

**Daily Briefing** (8 AM by default)
- Telegram: "📋 Your day at a glance"
- Email: Detailed briefing
- In-app: Dashboard view
- Push: Summary

**Team Notifications** (Real-time)
- Telegram: "[Team member] completed task"
- In-app: Activity feed
- Email: In digest

**Urgent Alerts** (Real-time)
- Telegram: "🚨 Urgent: Multiple tasks overdue"
- Push: Immediate notification
- In-app: Red alert

### User Preferences
```json
{
  "notifications": {
    "task_due_soon": {
      "enabled": true,
      "advance_notice": "4_hours",
      "channels": ["telegram", "push", "in_app"]
    },
    "task_overdue": {
      "enabled": true,
      "channels": ["telegram", "email", "push"]
    },
    "daily_briefing": {
      "enabled": true,
      "time": "08:00",
      "channels": ["telegram", "email"]
    },
    "team_updates": {
      "enabled": true,
      "channels": ["in_app", "email"]
    },
    "urgent_alerts": {
      "enabled": true,
      "channels": ["telegram", "push"]
    }
  }
}
```

---

## Account Linking

### Flow
```
1. User taps /start on Telegram
2. Bot: "Link your account to manage tasks on the go!"
3. Bot sends: "Link here: https://planner.app/link?code=PLAN456"
4. User clicks link → Website
5. User signs in (or creates account)
6. System confirms Telegram ID + Code
7. Bot confirms: "✅ Account linked! Ready to manage!"
8. User's tasks now synced across devices
```

---

## Real-Time Sync

### Cross-Device Updates
```
User marks task done on Website
  ↓
Backend updates Supabase
  ↓
WebSocket broadcasts update
  ├─ → Other web sessions (real-time)
  ├─ → Team members (if shared task)
  ├─ → Mobile app (if using)
  └─ → Telegram bot (shows in next message)
```

### Real-Time Sync (python-socketio)
```python
# Task status changed
socket.emit('task:status-changed', {
    'taskId': '456',
    'status': 'done',
    'timestamp': time.time()
})

# Listen on other sessions
@socket.on('task:status-changed')
def on_task_changed(data):
    update_task_in_ui(data['taskId'], data['status'])

# Notify Telegram if user has bot linked
if user.telegram_linked:
    await bot.send_message(
        chat_id=user.telegram_id,
        text=f"✅ {task['name']} marked as done!"
  );
}

// Notify team members
team_members.forEach(member => {
  if (member.telegram_linked) {
    await bot.telegram.sendMessage(
      member.telegram_id,
      `👤 ${user.name} completed: ${task.name}`
    );
  }
});
```

---

## Message Routing

### Channel Decision Logic
```
Event: Task marked complete
  ├─ Creator → Telegram (quick notification)
  ├─ Assignee → Telegram (confirmation)
  ├─ Team → In-app (activity feed) + Email (digest)
  ├─ Critical deadline → All (urgent)
  └─ Regular task → Based on preferences
```

---

## Email Templates

### Daily Briefing Email
```
Subject: 📋 Your Daily Briefing - Apr 17, 2026

Hi [User Name],

Here's your day at a glance:

🔴 URGENT - 5 Tasks (due today or earlier)
   1. Budget Planning - due 2:00 PM (60% complete)
      👤 John (awaiting) | Sarah (done)
   
   2. Client call prep - due 12:00 PM (ready)
      👤 You
   
   3. Review contracts - due EOD (0% complete)
      👤 You
   
   [View Urgent Tasks]

🟡 TODAY - 8 Tasks
   - Email follow-ups
   - Sprint planning
   - Team feedback
   - [+5 more]
   
   [View All Today's Tasks]

📊 QUICK STATS
   ✅ Done: 3 tasks
   🔄 In Progress: 2 tasks
   📋 To Do: 8 tasks
   ⏰ Overdue: 0 tasks
   
   On track for today! ✨

👥 TEAM UPDATES (Last 24 hours)
   • Sarah completed: Design approval
   • John: 2 tasks completed, 1 overdue
   • Alex assigned you: "Review Q2 budget"

⏰ UPCOMING DEADLINES
   • Today: 5 tasks (3 urgent)
   • Tomorrow: 8 tasks
   • This week: 25 tasks total

💡 AI INSIGHTS
   • You're 20% ahead of schedule this week
   • Risk: "Review contracts" only 4 hours to deadline
   • Recommendation: Prioritize "Budget Planning" (blocks 3 tasks)

[Start Your Day] [View Calendar] [Team Board] [Analytics]

Have a productive day! 🚀
```

### Task Assigned Notification
```
Subject: 👤 [Task Name] assigned to you

Hi [User Name],

You've been assigned a new task:

📌 TASK
   Budget Planning Review
   
🎯 PROJECT
   Q2 Financial Planning
   
⏰ DUE DATE
   Today, 2:00 PM (4 hours from now)
   
👤 ASSIGNED BY
   Manager Name
   
📝 DESCRIPTION
   Please review the Q2 budget document and provide feedback.
   Focus on: Department allocations, Cost optimization.
   
📎 ATTACHMENTS
   - Q2_Budget_Draft.xlsx
   - Budget_Guidelines.pdf
   
👥 TEAM
   • You (Assigned)
   • John (Awaiting)
   • Sarah (Approved)
   
💬 NOTES
   "This needs approval before Friday. Let me know if you have questions."
   - Manager Name

[View Full Task] [Mark Done] [Add Note] [View Team]

Let me know if you have any questions!
```

---

## Features by Channel

| Feature | Website | Telegram | Email |
|---------|---------|----------|-------|
| View all tasks | ✅ Full dashboard | ✅ Today's list | ⚠️ Daily digest |
| Create tasks | ✅ Full editor | ⚠️ Quick add only | ❌ |
| Mark tasks done | ✅ Yes | ✅ Yes | ❌ |
| Add details/notes | ✅ Full editor | ⚠️ Quick notes | ❌ |
| See projects | ✅ Portfolio view | ❌ | ⚠️ In digest |
| Team collaboration | ✅ Full features | ⚠️ Status only | ⚠️ Updates |
| Analytics | ✅ Detailed | ❌ | ⚠️ Daily summary |
| Critical path | ✅ Yes | ❌ | ❌ |

---

## Data Model Extensions

### User Planner Settings
```json
{
  "user_id": "user_123",
  "planner_settings": {
    "working_hours": {
      "start": "09:00",
      "end": "18:00"
    },
    "default_task_priority": "medium",
    "capacity_hours_per_day": 8
  },
  "telegram": {
    "telegram_id": "123456789",
    "linked": true,
    "daily_briefing_time": "08:00"
  },
  "notification_settings": {
    "task_due_advance": "4_hours",
    "urgent_threshold": "critical"
  }
}
```

---

## Implementation Steps

### Phase 1: Setup (Week 1)
- [ ] Create Telegram bot via @BotFather
- [ ] Set up webhook for bot messages
- [ ] Create account linking system
- [ ] Build "link account" UI on website

### Phase 2: Bot Commands (Week 2)
- [ ] Implement /start, /help, /settings
- [ ] Implement /today, /add_task commands
- [ ] Implement /mark_done, /urgent commands
- [ ] Implement /summary command

### Phase 3: Notifications (Week 3)
- [ ] Set up daily briefing scheduling
- [ ] Create email templates
- [ ] Implement task due soon alerts
- [ ] Route notifications to channels

### Phase 4: Integration (Week 4)
- [ ] Test cross-device sync
- [ ] Test team collaboration
- [ ] Beta test with users
- [ ] Deploy to production

---

## Success Metrics
- Telegram bot daily active users
- Message response time < 1 second
- Account linking success rate > 95%
- Notification delivery rate > 98%
- Task completion rate
- On-time task completion %
- Team collaboration engagement

---

## Future Enhancements
- Calendar integration (Google, Outlook, Apple)
- Slack/Teams integration
- Voice task creation (Alexa, Google Assistant)
- Project templates
- Time tracking and estimation
- Budget tracking per project
- Resource allocation planning
- Portfolio/dashboard sharing
- Client-facing task boards
