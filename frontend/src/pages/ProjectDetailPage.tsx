import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type Task, type Project } from "@/lib/api"
import { projectUpdateSchema } from "@/lib/schemas"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { cn } from "@/lib/utils"
import TaskStatusSelector from "@/components/TaskStatusSelector"
import ProjectTaskSelector from "@/components/ProjectTaskSelector"
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Palette,
  Calendar,
  Clock,
  BarChart3,
  X,
  Search,
  Unlink,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

const PROJECT_COLORS: { name: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan"; class: string }[] = [
  { name: "blue", class: "bg-blue-500" },
  { name: "violet", class: "bg-violet-500" },
  { name: "emerald", class: "bg-emerald-500" },
  { name: "amber", class: "bg-amber-500" },
  { name: "rose", class: "bg-rose-500" },
  { name: "cyan", class: "bg-cyan-500" },
]

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

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showBanner } = useBanner()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskFilter, setTaskFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  type FormValues = z.input<typeof projectUpdateSchema>
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(projectUpdateSchema) as never,
  })

  const selectedColor = watch("color")

  // Load project and tasks
  const loadProjectData = useCallback(async () => {
    if (!projectId || !user) return
    setLoading(true)
    try {
      const [projectRes, tasksRes] = await Promise.all([
        api.getProject(projectId),
        api.getProjectTasks(projectId),
      ])
      setProject(projectRes)
      setTasks(tasksRes.tasks)
      reset({
        name: projectRes.name,
        description: projectRes.description || "",
        color: projectRes.color,
        status: projectRes.status,
      })
    } catch {
      showBanner("error", "Failed to load project")
      navigate("/projects")
    } finally {
      setLoading(false)
    }
  }, [projectId, user])

  useEffect(() => {
    loadProjectData()
  }, [loadProjectData])

  const onEditSubmit = async (data: FormValues) => {
    if (!projectId) return
    try {
      const updated = await api.updateProject(projectId, data)
      setProject(updated)
      setShowEditForm(false)
      showBanner("success", "Project updated!")
    } catch {
      showBanner("error", "Failed to update project")
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return
    try {
      await api.deleteProject(projectId, true)
      showBanner("success", "Project deleted!")
      navigate("/projects")
    } catch {
      showBanner("error", "Failed to delete project")
    }
  }

  const handleStatusChange = () => {
    loadProjectData()
  }

  const handleUnlinkTask = async (taskId: string) => {
    if (!projectId) return
    try {
      await api.unlinkTaskFromProject(projectId, taskId)
      setTasks(tasks.filter(t => t.id !== taskId))
      showBanner("success", "Task removed from project")
    } catch {
      showBanner("error", "Failed to remove task")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId)
      setTasks(tasks.filter(t => t.id !== taskId))
      showBanner("success", "Task deleted")
    } catch {
      showBanner("error", "Failed to delete task")
    }
  }

  const handleTasksLinked = () => {
    // Reload tasks after linking
    loadProjectData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  // Calculate stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === "completed").length
  const pendingTasks = tasks.filter(t => t.status === "pending").length
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Filter tasks
  const filtered = tasks
    .filter((t) => {
      if (taskFilter === "all") return true
      if (taskFilter === "pending") return t.status === "pending"
      if (taskFilter === "completed") return t.status === "completed"
      if (taskFilter === "in_progress") return t.status === "in_progress"
      if (taskFilter === "cancelled") return t.status === "cancelled"
      return true
    })
    .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" || a.status === "in_progress" ? -1 : 1
      const pw: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      if ((pw[a.priority] ?? 2) !== (pw[b.priority] ?? 2)) return (pw[a.priority] ?? 2) - (pw[b.priority] ?? 2)
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return 0
    })

  const colorClass = PROJECT_COLORS.find((c) => c.name === project.color)?.class || "bg-blue-500"

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-4 w-4 rounded-full", colorClass)} />
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(project.created_at + "Z"), { addSuffix: true })} •{" "}
          Status: <span className="font-medium capitalize">{project.status}</span>
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <form
          onSubmit={handleSubmit(onEditSubmit)}
          className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in"
        >
          <div>
            <input
              {...register("name")}
              placeholder="Project name..."
              className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 outline-none"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <textarea
            {...register("description")}
            placeholder="Description (optional)"
            rows={2}
            className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none"
          />

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setValue("color", c.name)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform",
                    c.class,
                    selectedColor === c.name ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Project?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. Tasks will be unlinked from the project.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Tasks</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalTasks}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedTasks}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressTasks}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completion</p>
          <p className="text-2xl font-bold text-foreground mt-1">{completionPercentage}%</p>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Project Progress</span>
          <span className="text-xs text-muted-foreground">{completedTasks} of {totalTasks}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Add Tasks Section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Add Tasks</h3>
        <ProjectTaskSelector
          projectId={projectId!}
          onTasksLinked={handleTasksLinked}
          multi={true}
        />
      </div>

      {/* Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingTasks} pending • {completedTasks} completed
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {["all", "pending", "in_progress", "completed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setTaskFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                taskFilter === f
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-secondary text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {f.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
            </button>
          ))}
        </div>

        {/* Task Search */}
        {totalTasks > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2 text-sm outline-none focus-ring"
            />
          </div>
        )}

        {/* Task List */}
        {totalTasks === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No tasks in this project yet. Add one using the selector above!
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No tasks match your filter or search
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "rounded-xl border-l-4 border border-border px-5 py-4 transition-all hover:shadow-sm",
                  priorityColors[task.priority] || "",
                  task.status === "completed" && "opacity-60"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                      )}
                    </div>

                    {/* Status Selector */}
                    <TaskStatusSelector
                      taskId={task.id}
                      currentStatus={task.status}
                      onStatusChange={handleStatusChange}
                    />

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
                          {format(new Date(task.due_date), "MMM d")}
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

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleUnlinkTask(task.id)}
                      title="Remove from project"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
