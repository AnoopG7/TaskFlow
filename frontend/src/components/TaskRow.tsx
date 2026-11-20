import type { ReactNode } from "react"
import { CalendarClock, Hourglass, FolderOpen } from "lucide-react"
import type { Task } from "@/lib/api"
import { cn } from "@/lib/utils"
import { fmt, hasDueTime, isOverdue, parseDate, relative } from "@/lib/taxonomy"
import { PriorityMark } from "@/components/ui"
import TaskStatusSelector from "@/components/TaskStatusSelector"

function dueText(task: Task) {
  if (!parseDate(task.due_date)) return ""
  if (!hasDueTime(task.due_date)) return fmt(task.due_date, "d MMM")
  return `${fmt(task.due_date, "d MMM, HH:mm")} (${relative(task.due_date)})`
}

export default function TaskRow({
  task,
  onStatusChange,
  actions,
  showProjectTag = false,
}: {
  task: Task
  onStatusChange: () => void
  actions?: ReactNode
  showProjectTag?: boolean
}) {
  const done = task.status === "completed" || task.status === "cancelled"
  const late = isOverdue(task)

  return (
    <li className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 px-4 py-3.5 transition-colors hover:bg-wash/40 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-5">
      <span className="pt-[5px]">
        <PriorityMark priority={task.priority} />
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium leading-snug", done ? "text-ink-faint line-through decoration-ink-faint/60" : "text-ink")}>
          {task.title}
        </p>
        {task.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-soft">{task.description}</p>}

        {(task.due_date || task.estimated_hours || (showProjectTag && task.project_id)) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
            {task.due_date && (
              <span className={cn("inline-flex items-center gap-1.5", late ? "font-medium text-risk" : "text-ink-soft")}>
                <CalendarClock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                {late ? `Overdue, ${dueText(task)}` : dueText(task)}
              </span>
            )}
            {task.estimated_hours ? (
              <span className="tabular inline-flex items-center gap-1.5 text-ink-soft">
                <Hourglass className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                {task.estimated_hours}h estimated
              </span>
            ) : null}
            {showProjectTag && task.project_id && (
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                In a project
              </span>
            )}
          </div>
        )}
      </div>

      <div className="col-start-2 mt-2.5 flex items-center justify-between gap-1 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:justify-start">
        <TaskStatusSelector taskId={task.id} currentStatus={task.status} onStatusChange={onStatusChange} />
        {actions && (
          <div className="flex items-center opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            {actions}
          </div>
        )}
      </div>
    </li>
  )
}
