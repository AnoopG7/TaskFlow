import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/providers/AuthProvider"
import { api, type Task } from "@/lib/api"
import { taskCreateSchema, taskPriorities } from "@/lib/schemas"
import type { z } from "zod"
import { cn } from "@/lib/utils"
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  Calendar,
  Clock,
  Trash2,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

const priorityColors: Record<string, string> = {
  critical: "border-l-red-500 bg-red-500/5",
  high: "border-l-amber-500 bg-amber-500/5",
  medium: "border-l-blue-500 bg-blue-500/5",
  low: "border-l-zinc-400",
}

const priorityDots: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-zinc-400",
}

export default function TasksPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1")
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const loadTasks = useCallback(() => {
    if (!user) return
    setLoading(true)
    api
      .getTasks(user.user_id)
      .then((res) => setTasks(res.tasks))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { loadTasks() }, [loadTasks])

  // RHF + Zod
  type FormValues = z.input<typeof taskCreateSchema>
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(taskCreateSchema) as never,
    defaultValues: { priority: "medium", tags: [], auto_prioritize: false },
  })

  const onSubmit = async (data: FormValues) => {
    if (!user) return
    try {
      await api.createTask(user.user_id, data)
      reset()
      setShowForm(false)
      setSearchParams({})
      loadTasks()
    } catch {
      /* toast in the future */
    }
  }

  const toggleComplete = async (task: Task) => {
    try {
      if (task.status === "completed") {
        await api.updateTask(task.id, { status: "pending" })
      } else {
        await api.completeTask(task.id)
      }
      loadTasks()
    } catch {
      /* toast */
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTask(id)
      loadTasks()
    } catch {
      /* toast */
    }
  }

  // Filter & Search
  const filtered = tasks
    .filter((t) => {
      if (filter === "all") return true
      if (filter === "pending") return t.status === "pending"
      if (filter === "completed") return t.status === "completed"
      if (filter === "overdue") return t.status === "pending" && t.due_date && new Date(t.due_date) < new Date()
      return taskPriorities.includes(filter as (typeof taskPriorities)[number]) && t.priority === filter
    })
    .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Pending first, then by priority weight, then by due date
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1
      const pw: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      if ((pw[a.priority] ?? 2) !== (pw[b.priority] ?? 2)) return (pw[a.priority] ?? 2) - (pw[b.priority] ?? 2)
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return 0
    })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.filter((t) => t.status === "pending").length} pending • {tasks.filter((t) => t.status === "completed").length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Task"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in"
        >
          <div>
            <input
              {...register("title")}
              placeholder="Task title..."
              className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 outline-none"
              autoFocus
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <textarea
            {...register("description")}
            placeholder="Add a description (optional)"
            rows={2}
            className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none"
          />

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                {...register("priority")}
                className="bg-secondary text-sm rounded-lg px-3 py-1.5 border border-border outline-none focus-ring"
              >
                {taskPriorities.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                {...register("due_date")}
                type="datetime-local"
                className="bg-secondary text-sm rounded-lg px-3 py-1.5 border border-border outline-none focus-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                {...register("estimated_hours")}
                type="number"
                step="0.5"
                min="0"
                placeholder="Est. hours"
                className="w-24 bg-secondary text-sm rounded-lg px-3 py-1.5 border border-border outline-none focus-ring"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" {...register("auto_prioritize")} className="rounded" />
              AI prioritize
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      )}

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2 text-sm outline-none focus-ring"
          />
        </div>
        {["all", "pending", "completed", "overdue", "critical", "high"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
              filter === f
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {searchQuery ? "No tasks match your search." : "No tasks yet. Create one above!"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-4 rounded-xl border-l-4 border border-border px-5 py-4 transition-all hover:shadow-sm",
                priorityColors[task.priority] || "",
                task.status === "completed" && "opacity-60"
              )}
            >
              <button
                onClick={() => toggleComplete(task)}
                className="mt-0.5 flex-shrink-0 transition-colors"
              >
                {task.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", priorityDots[task.priority])} />
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className={cn(
                      "text-[11px]",
                      new Date(task.due_date) < new Date() && task.status !== "completed"
                        ? "text-red-500 font-medium"
                        : "text-muted-foreground"
                    )}>
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(task.due_date), "MMM d")} •{" "}
                      {formatDistanceToNow(new Date(task.due_date + "Z"), { addSuffix: true })}
                    </span>
                  )}
                  {task.estimated_hours && (
                    <span className="text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {task.estimated_hours}h est
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
