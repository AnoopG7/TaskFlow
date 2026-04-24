"""Interactive CLI for testing TaskFlow."""
import asyncio
import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    """Interactive CLI loop."""
    from app.agent.loop import run_agent, run_morning_brief
    from app.agent.risk import get_at_risk_tasks, check_overload
    from app.services.supabase_service import get_tasks, create_task
    import app.services.supabase_service as db
    
    print("\n🌀 TaskFlow CLI - Interactive Testing")
    print("=" * 40)
    print("Commands:")
    print("  chat <message>  - Send a message to the agent")
    print("  brief         - Generate morning brief")
    print("  tasks        - List pending tasks")
    print("  risk         - Show at-risk tasks")
    print("  load         - Check today's load")
    print("  add <title> - Create a new task")
    print("  quit        - Exit")
    print()
    
    # Default test user
    user_id = "test_user_001"
    
    # Ensure profile exists
    profile = await db.get_user_profile(user_id)
    if not profile:
        await db.upsert_user_profile({
            "user_id": user_id,
            "name": "Test User",
            "timezone": "IST",
            "work_hours": {"start": 9, "end": 17},
            "notification_channels": {"primary": "telegram", "secondary": "email"},
        })
        print(f"✅ Created test profile for {user_id}")
    
    while True:
        try:
            user_input = input("\n> ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() == "quit":
                print("👋 Goodbye!")
                break
            
            if user_input.lower() == "brief":
                print("\n📋 Generating morning brief...")
                result = await run_morning_brief(user_id)
                print(result.get("response", "No response"))
                continue
            
            if user_input.lower() == "tasks":
                print("\n📝 Pending tasks:")
                tasks = await get_tasks(user_id, status="pending")
                for i, t in enumerate(tasks, 1):
                    due = t.get("due_date", "No due")[:16] if t.get("due_date") else "No due"
                    print(f"  {i}. [{t.get('priority', 'med')}] {t.get('title')} - {due}")
                continue
            
            if user_input.lower() == "risk":
                print("\n⚠️ Checking at-risk tasks...")
                tasks = await get_tasks(user_id, status="pending")
                at_risk = await get_at_risk_tasks(user_id, tasks)
                if not at_risk:
                    print("  No at-risk tasks!")
                else:
                    for r in at_risk[:5]:
                        print(f"  [{r['level'].upper()}] {r.get('task_title')}")
                        print(f"    Score: {r.get('score')}, Factors: {r.get('factors')}")
                continue
            
            if user_input.lower() == "load":
                print("\n📊 Checking workload...")
                tasks = await get_tasks(user_id, status="pending")
                assessment = await check_overload(tasks, expected_hours_today=8.0, meetings_hours=2.0)
                print(f"  Available: {assessment['available_hours']}h")
                print(f"  Estimated today: {assessment['estimated_hours_today']}h")
                print(f"  Overloaded: {assessment['is_overloaded']}")
                if assessment.get('recommendation'):
                    print(f"  Recommendation: {assessment['recommendation']}")
                continue
            
            if user_input.lower().startswith("add "):
                title = user_input[4:].strip()
                print(f"\n✅ Creating task: {title}")
                task = await create_task({
                    "user_id": user_id,
                    "title": title,
                    "status": "pending",
                    "priority": "medium",
                    "due_date": (datetime.now(timezone.utc)).isoformat(),
                })
                print(f"  Created: {task['id']}")
                continue
            
            if user_input.lower().startswith("chat "):
                message = user_input[5:]
                print(f"\n💬 Sending: {message}")
                result = await run_agent(user_id, message=message)
                print(f"\n{result.get('response', 'No response')}")
                continue
            
            print("Unknown command. Try: chat, brief, tasks, risk, load, add, quit")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())