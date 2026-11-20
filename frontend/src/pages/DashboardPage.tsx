import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { format, isSameDay } from "date-fns"
import { Plus, Sunrise } from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { api, type Task } from "@/lib/api"
import { cn } from "@/lib/utils"
import { fmt, hasDueTime, isOverdue, parseDate, relative, PRIORITY_WEIGHT, STATUS_LABEL } from "@/lib/taxonomy"
import { Panel, PanelHeader, PriorityMark, Spinner } from "@/components/ui"
import { buttonClass } from "@/lib/button"

const DAY_START = 8
const DAY_END = 19

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function hoursLabel(h: number) {
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

/* ── Today sheet ─────────────────────────────────────────── */

function TimelineTask({ task }: { task: Task }) {
  const done = task.status === "completed"
  const late = isOverdue(task)
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-md border px-3 py-2",
        done
          ? "border-rule bg-wash"
          : late
            ? "border-risk/30 bg-risk-wash"
            : task.status === "in_progress"
              ? "border-pen/25 bg-pen-wash"
              : "border-rule-strong bg-sheet"
      )}
    >
      <PriorityMark priority={task.priority} />
      <span className={cn("min-w-0 flex-1 truncate text-[14px] font-medium", done ? "text-ink-faint line-through" : "text-ink")}>
        {task.title}
      </span>
      <span className="tabular shrink-0 text-[12px] text-ink-soft">
        {[hasDueTime(task.due_date) ? fmt(task.due_date, "HH:mm") : "", task.estimated_hours ? hoursLabel(task.estimated_hours) : ""]
          .filter(Boolean)
          .join(", ")}
      </span>
    </div>
  )
}

function TodaySheet({ tasks, now }: { tasks: Task[]; now: Date }) {
  const timed = tasks.filter((t) => hasDueTime(t.due_date))
  const untimed = tasks.filter((t) => !timed.includes(t))

  const dueHours = timed.map((t) => parseDate(t.due_date)!.getHours())
  // Work-day window, stretched only to fit tasks due outside it
  const start = Math.min(DAY_START, ...dueHours)
  const end = Math.max(DAY_END, ...dueHours)
  const hours = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Today"
        aside={
          <span className="tabular text-[13px] text-ink-soft">
            {tasks.length === 0 ? "Nothing due" : `${tasks.length} due`}
          </span>
        }
      />

      {tasks.length === 0 && (
        <p className="border-b border-rule px-4 py-3 text-sm text-ink-soft sm:px-5">
          Nothing is due today. Give a task a due time and it lands on this sheet at that hour.
        </p>
      )}

      {untimed.length > 0 && (
        <div className="space-y-2 border-b border-rule px-4 py-3 sm:px-5">
          <p className="text-[13px] font-medium text-ink-soft">Due today, any time</p>
          {untimed.map((t) => (
            <TimelineTask key={t.id} task={t} />
          ))}
        </div>
      )}

      <ol className="relative pt-5 pb-2" aria-label="Hours of the day">
        {hours.map((h) => {
          const inHour = timed
            .filter((t) => parseDate(t.due_date)!.getHours() === h)
            .sort((a, b) => parseDate(a.due_date)!.getTime() - parseDate(b.due_date)!.getTime())
          const isNowHour = now.getHours() === h
          const past = h < now.getHours()
          return (
            <li key={h} className="relative grid grid-cols-[56px_1fr] gap-3 px-4 sm:grid-cols-[64px_1fr] sm:px-5">
              <span
                className={cn(
                  "tabular -mt-[9px] pt-0 text-[12px] leading-[18px]",
                  isNowHour ? "font-semibold text-ink" : past ? "text-ink-faint" : "text-ink-soft"
                )}
              >
                {String(h).padStart(2, "0")}:00
              </span>
              <div className={cn("relative min-h-[44px] border-t pb-2 pt-2", past ? "border-rule" : "border-rule-strong/70")}>
                {isNowHour && (
                  <div
                    className="pointer-events-none absolute -left-2 right-0 z-10 flex items-center"
                    style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                    aria-label={`Now, ${format(now, "HH:mm")}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-marker ring-2 ring-sheet" />
                    <span className="h-[3px] flex-1 rounded-full bg-marker animate-draw-now" />
                  </div>
                )}
                <div className="relative z-20 space-y-1.5">
                  {inHour.map((t) => (
                    <TimelineTask key={t.id} task={t} />
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

    </Panel>
  )
}

/* ── Side column ─────────────────────────────────────────── */

function StatusBreakdown({ tasks }: { tasks: Task[] }) {
  const groups = [
    { key: "pending", tone: "bg-ink-faint" },
    { key: "in_progress", tone: "bg-pen" },
    { key: "completed", tone: "bg-done" },
  ].map((g) => ({ ...g, count: tasks.filter((t) => t.status === g.key).length }))
  const total = groups.reduce((s, g) => s + g.count, 0)
  const overdue = tasks.filter(isOverdue).length

  return (
    <Panel>
      <PanelHeader title="All tasks" aside={<Link to="/tasks" className="text-[13px] font-medium text-pen hover:underline underline-offset-4">Open list</Link>} />
      <div className="px-4 py-4 sm:px-5">
        <div className="flex h-2 overflow-hidden rounded-full bg-wash" aria-hidden="true">
          {total > 0 &&
            groups.map((g) => (
              <span key={g.key} className={cn("h-full", g.tone)} style={{ width: `${(g.count / total) * 100}%` }} />
            ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {groups.map((g) => (
            <div key={g.key} className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", g.tone)} />
              <dt className="text-[13px] text-ink-soft">{STATUS_LABEL[g.key]}</dt>
              <dd className="tabular ml-auto text-[14px] font-semibold text-ink">{g.count}</dd>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-risk" />
            <dt className="text-[13px] text-ink-soft">Overdue</dt>
            <dd className={cn("tabular ml-auto text-[14px] font-semibold", overdue ? "text-risk" : "text-ink")}>{overdue}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  )
}

function NeedsAttention({ overdue, soon }: { overdue: Task[]; soon: Task[] }) {
  const items = [...overdue.map((t) => ({ t, late: true })), ...soon.map((t) => ({ t, late: false }))].slice(0, 6)
  return (
    <Panel>
      <PanelHeader title="Coming up" />
      {items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-ink-soft sm:px-5">Nothing overdue and nothing due in the next two days.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {items.map(({ t, late }) => (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <span className="pt-1">
                <PriorityMark priority={t.priority} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{t.title}</p>
                <p className={cn("text-[13px]", late ? "text-risk" : "text-ink-soft")}>
                  {late ? "Overdue, was due " : "Due "}
                  {relative(t.due_date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const now = useNow()

  useEffect(() => {
    if (!user) return
    api
      .getTasks()
      .then((res) => setTasks(res.tasks))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const { today, overdue, soon, plannedHours, openToday } = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "cancelled")
    const today = active.filter((t) => {
      const d = parseDate(t.due_date)
      return d && isSameDay(d, now)
    })
    const openToday = today.filter((t) => t.status !== "completed")
    const overdue = active
      .filter((t) => isOverdue(t) && !today.includes(t))
      .sort((a, b) => (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2))
    const soon = active
      .filter((t) => {
        if (t.status === "completed" || today.includes(t)) return false
        const d = parseDate(t.due_date)
        if (!d) return false
        const h = (d.getTime() - now.getTime()) / 36e5
        return h > 0 && h <= 48
      })
      .sort((a, b) => parseDate(a.due_date)!.getTime() - parseDate(b.due_date)!.getTime())
    const plannedHours = openToday.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)
    return { today, overdue, soon, plannedHours, openToday }
  }, [tasks, now])

  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = user?.name?.split(" ")[0]

  if (loading) return <Spinner label="Loading your day" />

  const summary =
    openToday.length === 0
      ? "Nothing left due today."
      : `${openToday.length} task${openToday.length === 1 ? "" : "s"} left today${plannedHours > 0 ? `, about ${hoursLabel(plannedHours)} of work` : ""}.`

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-8">
        <div>
          <p className="text-[15px] text-ink-soft">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="font-display mt-1 text-[34px] leading-[1.05] font-semibold text-ink sm:text-[44px]">
            {format(now, "EEEE")}
            <span className="text-ink-faint">, {format(now, "d MMMM")}</span>
          </h1>
          <p className="mt-2 text-[15px] text-ink">{summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/chat?trigger=morning_brief" className={buttonClass("secondary", "md")}>
            <Sunrise className="h-4 w-4" />
            Get my brief
          </Link>
          <Link to="/tasks?new=1" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" />
            New task
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TodaySheet tasks={today} now={now} />
        <div className="space-y-6">
          <NeedsAttention overdue={overdue} soon={soon} />
          <StatusBreakdown tasks={tasks} />
        </div>
      </div>
    </div>
  )
}
