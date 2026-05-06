"""
Enhanced task parser that can extract multiple tasks from natural language input.
Uses Groq LLM to intelligently parse task descriptions and create multiple tasks.
"""

import logging
from typing import Optional
from pydantic import BaseModel, Field
import json
import re

logger = logging.getLogger(__name__)


class ParsedTask(BaseModel):
    """A task extracted from natural language"""
    title: str = Field(..., description="Task title")
    description: Optional[str] = None
    priority: str = Field(default="medium", description="low/medium/high/critical")
    estimated_hours: Optional[float] = Field(None, description="Estimated hours to complete")
    tags: list[str] = []


class ParseResult(BaseModel):
    """Result of parsing natural language input"""
    tasks: list[ParsedTask]
    parsing_confidence: float = Field(..., description="0.0-1.0 confidence in parsing")
    original_text: str


async def parse_task_input(text: str, user_instructions: Optional[str] = None) -> ParseResult:
    """
    Parse natural language input and extract one or more tasks.

    Handles formats like:
    - Single task: "Implement user authentication"
    - Multi-task: "Build login system (JWT, password reset, email verification)"
    - List format: "1. Design DB schema 2. Implement CRUD 3. Write tests"
    - Narrative: "Need to refactor auth module then add 2FA support"
    """
    from app.services.groq_service import complete

    prompt = f"""Parse the following task description and extract individual tasks.
Return a JSON object with this structure:
{{
  "tasks": [
    {{
      "title": "Task title",
      "description": "Optional description",
      "priority": "low|medium|high|critical",
      "estimated_hours": 1.5 or null,
      "tags": ["tag1", "tag2"]
    }}
  ],
  "confidence": 0.95
}}

User instructions (if any):
{user_instructions or "None"}

Task description to parse:
{text}

Guidelines:
- Extract ALL tasks mentioned, even implicitly (e.g., "refactor X" implies "understand current code", "plan refactor", "implement", "test")
- For complex tasks, break down into subtasks if they seem substantial enough to be separate tasks
- Estimate hours based on typical developer experience
- Assign priorities based on context and dependencies
- Use lowercase for priority values
- Return valid JSON only, no other text"""

    messages = [{"role": "user", "content": prompt}]

    try:
        response = await complete(messages, temperature=0.5, max_tokens=2000)

        # Extract JSON from response
        json_match = re.search(r"\{[\s\S]*\}", response)
        if not json_match:
            logger.warning(f"Could not find JSON in parser response: {response}")
            # Fallback: create single task
            return ParseResult(
                tasks=[ParsedTask(title=text, description="Parsed from natural language")],
                parsing_confidence=0.3,
                original_text=text,
            )

        parsed = json.loads(json_match.group())

        # Validate and construct ParsedTask objects
        tasks = []
        for task_data in parsed.get("tasks", []):
            try:
                task = ParsedTask(
                    title=task_data.get("title", "Untitled")[:500],
                    description=task_data.get("description", "")[:1000],
                    priority=task_data.get("priority", "medium"),
                    estimated_hours=task_data.get("estimated_hours"),
                    tags=task_data.get("tags", [])[:10],
                )
                tasks.append(task)
            except Exception as e:
                logger.warning(f"Error constructing task: {e}")
                continue

        confidence = min(1.0, max(0.0, parsed.get("confidence", 0.7)))

        return ParseResult(
            tasks=tasks if tasks else [ParsedTask(title=text)],
            parsing_confidence=confidence,
            original_text=text,
        )

    except Exception as e:
        logger.error(f"Error parsing tasks: {e}")
        # Fallback
        return ParseResult(
            tasks=[ParsedTask(title=text)],
            parsing_confidence=0.1,
            original_text=text,
        )


async def validate_parsed_tasks(tasks: list[ParsedTask]) -> tuple[list[ParsedTask], list[str]]:
    """
    Validate parsed tasks and return any warnings.

    Returns:
        (validated_tasks, warnings)
    """
    warnings = []
    validated = []

    for i, task in enumerate(tasks):
        # Check title
        if not task.title or len(task.title.strip()) == 0:
            warnings.append(f"Task {i + 1}: Empty title")
            continue

        # Check priority
        if task.priority not in ["low", "medium", "high", "critical"]:
            warnings.append(f"Task {i + 1}: Invalid priority '{task.priority}', using 'medium'")
            task.priority = "medium"

        # Check estimated_hours
        if task.estimated_hours is not None:
            if task.estimated_hours < 0:
                warnings.append(f"Task {i + 1}: Negative hours, using 0")
                task.estimated_hours = 0
            elif task.estimated_hours > 24:
                warnings.append(f"Task {i + 1}: Hours > 24, capping at 24")
                task.estimated_hours = 24

        validated.append(task)

    return validated, warnings


async def parse_and_create_batch(
    user_id: str, text: str, user_instructions: Optional[str] = None, project_id: Optional[str] = None
) -> dict:
    """
    Parse input, validate, and create multiple tasks in one batch operation.

    Returns dict with:
    - success: bool
    - tasks_created: list of created task dicts
    - parsing_warnings: list of warnings
    - parse_result: ParseResult object
    """
    from app.services.supabase_service import create_task as db_create_task

    # Parse
    parse_result = await parse_task_input(text, user_instructions)

    # Validate
    validated_tasks, warnings = await validate_parsed_tasks(parse_result.tasks)

    if not validated_tasks:
        return {
            "success": False,
            "tasks_created": [],
            "parsing_warnings": warnings,
            "parse_result": parse_result.model_dump(),
            "error": "No valid tasks after parsing",
        }

    # Create tasks in batch
    created_tasks = []
    creation_errors = []

    for task in validated_tasks:
        try:
            task_data = {
                "user_id": user_id,
                "title": task.title,
                "description": task.description or "",
                "priority": task.priority,
                "estimated_hours": task.estimated_hours,
                "tags": task.tags,
                "project_id": project_id,
                "status": "pending",
            }

            result = await db_create_task(task_data)
            if result:
                created_tasks.append(result)
            else:
                creation_errors.append(f"Failed to create '{task.title}'")

        except Exception as e:
            logger.error(f"Error creating task: {e}")
            creation_errors.append(f"Error creating '{task.title}': {str(e)}")

    return {
        "success": len(created_tasks) > 0,
        "tasks_created": created_tasks,
        "parsing_warnings": warnings,
        "parse_result": parse_result.model_dump(),
        "creation_errors": creation_errors,
    }
