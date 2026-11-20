import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/providers/AuthProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type Task } from "@/lib/api"
import { taskCreateSchema, taskPriorities } from "@/lib/schemas"
import type { z } from "zod"
import { Plus, Search, Trash2, X } from "lucide-react"
import { byStatusThenPriority, isOverdue, PRIORITY_LABEL } from "@/lib/taxonomy"
import { Button, EmptyState, Field, Input, PageHeader, Panel, Segmented, Select, Spinner } from "@/components/ui"
import TaskRow from "@/components/TaskRow"

type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "overdue" | "cancelled"

export default function TasksPage() {
  const { user } = useAuth()
  const { showBanner } = useBanner()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("any")
  const [searchQuery, setSearchQuery] = useState("")

  const loadTasks = useCallback(() => {
    if (!user) return
    api
      .getTasks()
      .then((res) => setTasks(res.tasks))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

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

  const closeForm = () => {
    setShowForm(false)
    setSearchParams({})
  }

  const onSubmit = async (data: FormValues) => {
    if (!user) return
    try {
      await api.createTask(data)
      reset()
      closeForm()
      showBanner("success", "Task added")
      loadTasks()
    } catch {
      showBanner("error", "Couldn't add the task. Check your connection and try again.")
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTask(id)
      showBanner("success", "Task deleted")
      loadTasks()
    } catch {
      showBanner("error", "Couldn't delete the task.")
    }
  }

  const matchesStatus = (t: Task, f: StatusFilter) => {
    if (f === "all") return true
    if (f === "overdue") return isOverdue(t)
    return t.status === f
  }

  const q = searchQuery.toLowerCase()
  const filtered = tasks
    .filter((t) => matchesStatus(t, statusFilter))
    .filter((t) => priorityFilter === "any" || t.priority === priorityFilter)
    .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))
    .sort(byStatusThenPriority)

  const count = (f: StatusFilter) => tasks.filter((t) => matchesStatus(t, f)).length
  const activeCount = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length
  const isFiltering = statusFilter !== "all" || priorityFilter !== "any" || !!searchQuery

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={`${activeCount} open, ${count("completed")} done`}
        actions={
          showForm ? (
            <Button variant="ghost" onClick={closeForm}>
              <X className="h-4 w-4" />
              Close
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          )
        }
      />

      {showForm && (
        <Panel className="mb-6 animate-scale-in">
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5">
            <input
              {...register("title")}
              placeholder="What needs doing?"
              aria-label="Task title"
              className="font-display w-full bg-transparent text-xl font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
              autoFocus
            />
            {errors.title && <p className="mt-1 text-[13px] text-risk">{errors.title.message}</p>}
            <textarea
              {...register("description")}
              placeholder="Notes, links, acceptance criteria"
              aria-label="Description"
              rows={2}
              className="mt-2 w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />

            <div className="mt-4 grid gap-4 border-t border-rule pt-4 sm:grid-cols-3">
              <Field label="Priority" htmlFor="priority">
                <Select id="priority" {...register("priority")}>
                  {taskPriorities.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due" htmlFor="due_date">
                <Input id="due_date" {...register("due_date")} type="datetime-local" />
              </Field>
              <Field label="Estimate (hours)" htmlFor="estimated_hours" error={errors.estimated_hours?.message}>
                <Input id="estimated_hours" {...register("estimated_hours")} type="number" step="0.5" min="0" placeholder="e.g. 2" />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input type="checkbox" {...register("auto_prioritize")} className="h-4 w-4 accent-[var(--pen)]" />
                Let the assistant set priority
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  Add task
                </Button>
              </div>
            </div>
          </form>
        </Panel>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All", count: tasks.length },
            { value: "pending", label: "To do", count: count("pending") },
            { value: "in_progress", label: "In progress", count: count("in_progress") },
            { value: "overdue", label: "Overdue", count: count("overdue") },
            { value: "completed", label: "Done", count: count("completed") },
            { value: "cancelled", label: "Cancelled", count: count("cancelled") },
          ]}
        />
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-56 md:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              type="search"
              aria-label="Search tasks"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 w-auto"
          >
            <option value="any">Any priority</option>
            {taskPriorities.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Panel>
        {loading ? (
          <Spinner label="Loading tasks" />
        ) : filtered.length === 0 ? (
          tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              body="Add your first task. The assistant estimates the time and flags risks as soon as it's saved."
              action={
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  New task
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No matching tasks"
              body="Try a different filter or search term."
              action={
                isFiltering ? (
                  <Button
                    onClick={() => {
                      setStatusFilter("all")
                      setPriorityFilter("any")
                      setSearchQuery("")
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <ul className="divide-y divide-rule">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusChange={loadTasks}
                showProjectTag
                actions={
                  <Button variant="danger-ghost" size="icon" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`} title="Delete task">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
