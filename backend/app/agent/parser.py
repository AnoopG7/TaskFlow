"""Parse LLM response into actionable items — multi-action support."""
import json
import logging
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)


class AgentAction(BaseModel):
    """A single action from the agent response."""
    type: str  # create_task, create_project, complete_task, delete_task, delete_tasks, delete_project, delete_all_tasks, delete_all_projects, chat
    data: dict = {}


class ParsedResponse(BaseModel):
    """Full parsed agent response with multiple actions."""
    response_text: str = ""
    actions: list[AgentAction] = []
    confidence: float = 0.5

    # Legacy compat
    @property
    def intent(self) -> str:
        if not self.actions:
            return "chat"
        return self.actions[0].type

    @property
    def task_data(self) -> dict | None:
        for action in self.actions:
            if action.type == "create_task":
                return action.data
        return None

    @property
    def complete_task_id(self) -> str | None:
        for action in self.actions:
            if action.type == "complete_task":
                return action.data.get("task_id")
        return None


# Keep legacy alias for backward compat
ParsedAction = ParsedResponse


def parse_llm_response(response: str, profile: dict) -> ParsedResponse:
    """
    Parse LLM response into structured actions.

    Supports both new multi-action format and legacy single-action format.
    Falls back to chat intent if parsing fails.
    """
    if not response or not response.strip():
        return ParsedResponse(
            response_text="I'm here to help with your tasks. What would you like to do?",
        )

    try:
        # Try to extract JSON from response
        json_start = response.find("{")
        json_end = response.rfind("}")

        if json_start != -1 and json_end > json_start:
            json_str = response[json_start: json_end + 1]
            data = json.loads(json_str)

            response_text = data.get("response_text", response)
            confidence = min(1.0, max(0.0, data.get("confidence", 0.7)))

            # New format: actions[] array
            if "actions" in data and isinstance(data["actions"], list):
                actions = []
                for action_data in data["actions"]:
                    if isinstance(action_data, dict) and "type" in action_data:
                        actions.append(AgentAction(
                            type=action_data["type"],
                            data=action_data.get("data", {}),
                        ))

                return ParsedResponse(
                    response_text=response_text,
                    actions=actions,
                    confidence=confidence,
                )

            # Legacy format: single intent + task_data
            intent = data.get("intent", "chat")
            actions = []

            if intent == "create_task" and data.get("task_data"):
                actions.append(AgentAction(type="create_task", data=data["task_data"]))
            elif intent == "create_project" and data.get("project_data"):
                actions.append(AgentAction(type="create_project", data=data["project_data"]))
            elif intent == "complete_task" and data.get("complete_task_id"):
                actions.append(AgentAction(type="complete_task", data={"task_id": data["complete_task_id"]}))

            return ParsedResponse(
                response_text=response_text,
                actions=actions,
                confidence=confidence,
            )

    except json.JSONDecodeError as e:
        logger.debug(f"JSON parse failed: {e}")

    # Fallback: treat as plain chat response
    return ParsedResponse(
        response_text=response,
        actions=[],
        confidence=0.5,
    )


async def execute_actions(parsed: ParsedResponse, user_id: str) -> dict:
    """Execute all parsed actions and return results."""
    from app.services.supabase_service import (
        create_task,
        complete_task,
        create_project,
        get_projects,
        delete_task,
        delete_project,
        get_tasks,
    )

    results = {"executed": [], "errors": [], "created_project_ids": {}, "deleted_tasks": [], "deleted_projects": []}

    for action in parsed.actions:
        try:
            if action.type == "create_project":
                project_data = action.data.copy()
                project_data["user_id"] = user_id
                project_data["status"] = "active"
                result = await create_project(project_data)
                if result:
                    results["created_project_ids"][project_data.get("name", "")] = result.get("id")
                    results["executed"].append({"action": "create_project", "project_id": result.get("id"), "name": project_data.get("name")})

            elif action.type == "create_task":
                task_data = action.data.copy()
                task_data["user_id"] = user_id
                task_data["status"] = "pending"

                project_name = task_data.pop("project_name", None)
                if project_name:
                    project_id = results["created_project_ids"].get(project_name)
                    if not project_id:
                        projects = await get_projects(user_id)
                        for p in projects:
                            if p.get("name", "").lower() == project_name.lower():
                                project_id = p.get("id")
                                break
                    if project_id:
                        task_data["project_id"] = project_id

                result = await create_task(task_data)
                if result:
                    results["executed"].append({"action": "create_task", "task_id": result.get("id"), "title": task_data.get("title")})

            elif action.type == "complete_task":
                task_id = action.data.get("task_id")
                if task_id:
                    result = await complete_task(task_id)
                    if result:
                        results["executed"].append({"action": "complete_task", "task_id": task_id})

            elif action.type == "delete_task":
                task_id = action.data.get("task_id")
                if task_id:
                    success = await delete_task(task_id, user_id)
                    if success:
                        results["deleted_tasks"].append(task_id)
                        results["executed"].append({"action": "delete_task", "task_id": task_id})

            elif action.type == "delete_tasks":
                task_ids = action.data.get("task_ids", [])
                for tid in task_ids:
                    success = await delete_task(tid, user_id)
                    if success:
                        results["deleted_tasks"].append(tid)
                        results["executed"].append({"action": "delete_task", "task_id": tid})

            elif action.type == "delete_all_tasks":
                all_tasks = await get_tasks(user_id)
                for task in all_tasks:
                    success = await delete_task(task["id"], user_id)
                    if success:
                        results["deleted_tasks"].append(task["id"])
                        results["executed"].append({"action": "delete_task", "task_id": task["id"]})

            elif action.type == "delete_project":
                project_id = action.data.get("project_id")
                if project_id:
                    cascade = action.data.get("cascade", True)
                    success = await delete_project(project_id, user_id, cascade)
                    if success:
                        results["deleted_projects"].append(project_id)
                        results["executed"].append({"action": "delete_project", "project_id": project_id})

            elif action.type == "delete_all_projects":
                all_projects = await get_projects(user_id)
                for proj in all_projects:
                    success = await delete_project(proj["id"], user_id, cascade=True)
                    if success:
                        results["deleted_projects"].append(proj["id"])
                        results["executed"].append({"action": "delete_project", "project_id": proj["id"]})

        except Exception as e:
            logger.error(f"Error executing action {action.type}: {e}")
            results["errors"].append({"action": action.type, "error": str(e)})

    return results