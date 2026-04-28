import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { api, type Task } from "@/lib/api"
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: string
}

function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", color)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-zinc-400",
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api
      .getTasks(user.user_id)
      .then((res) => setTasks(res.tasks))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const pending = tasks.filter((t) => t.status === "pending")
  const inProgress = tasks.filter((t) => t.status === "in_progress")
  const completed = tasks.filter((t) => t.status === "completed")
  const overdue = pending.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date()
  )
  const dueSoon = pending
    .filter((t) => {
      if (!t.due_date) return false
      const h = (new Date(t.due_date).getTime() - Date.now()) / 36e5
      return h > 0 && h <= 48
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {user?.name || "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {pending.length > 0
              ? `You have ${pending.length} pending task${pending.length !== 1 ? "s" : ""}.`
              : "All caught up! No pending tasks."}
          </p>
        </div>
        <Link
          to="/tasks?new=1"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending"
          value={pending.length}
          icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          color="bg-blue-500/10"
        />
        <StatCard
          label="In Progress"
          value={inProgress.length}
          icon={<TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
          color="bg-violet-500/10"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          color="bg-emerald-500/10"
          trend={tasks.length > 0 ? `${Math.round((completed.length / tasks.length) * 100)}% done` : undefined}
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
          color="bg-red-500/10"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Priority Tasks</h2>
            <Link to="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pending.length === 0 && (
              <p className="px-5 py-8 text-center text-muted-foreground text-sm">
                No pending tasks — create one to get started!
              </p>
            )}
            {pending.slice(0, 6).map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", priorityColors[task.priority] || "bg-zinc-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Alerts */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              <Link
                to="/tasks?new=1"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4 text-primary" />
                Create a task
              </Link>
              <Link
                to="/chat"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-primary" />
                Talk to TaskFlow
              </Link>
              <Link
                to="/chat?trigger=morning_brief"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-primary" />
                Get morning brief
              </Link>
            </div>
          </div>

          {/* Overdue Warning */}
          {overdue.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-3">
                <AlertTriangle className="h-4 w-4" />
                {overdue.length} Overdue Task{overdue.length !== 1 ? "s" : ""}
              </div>
              {overdue.slice(0, 3).map((t) => (
                <p key={t.id} className="text-xs text-muted-foreground truncate pl-6 mt-1">
                  • {t.title}
                </p>
              ))}
            </div>
          )}

          {/* Due Soon */}
          {dueSoon.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-3">
                <Clock className="h-4 w-4" />
                {dueSoon.length} Due Soon
              </div>
              {dueSoon.slice(0, 3).map((t) => (
                <p key={t.id} className="text-xs text-muted-foreground truncate pl-6 mt-1">
                  • {t.title}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
