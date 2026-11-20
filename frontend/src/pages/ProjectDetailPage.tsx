import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type Task, type Project } from "@/lib/api"
import { projectUpdateSchema } from "@/lib/schemas"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { ChevronLeft, Pencil, Search, Trash2, Unlink } from "lucide-react"
import { byStatusThenPriority, projectHex, relative } from "@/lib/taxonomy"
import { Button, EmptyState, Field, Input, Modal, Panel, Segmented, Spinner, Textarea } from "@/components/ui"
import ColorPicker from "@/components/ColorPicker"
import ProjectTaskSelector from "@/components/ProjectTaskSelector"
import TaskRow from "@/components/TaskRow"

type Filter = "all" | "pending" | "in_progress" | "completed" | "cancelled"

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
  const [deleting, setDeleting] = useState(false)
  const [taskFilter, setTaskFilter] = useState<Filter>("all")
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

  const loadProjectData = useCallback(async () => {
    if (!projectId || !user) return
    try {
      const [projectRes, tasksRes] = await Promise.all([api.getProject(projectId), api.getProjectTasks(projectId)])
      setProject(projectRes)
      setTasks(tasksRes.tasks)
      reset({
        name: projectRes.name,
        description: projectRes.description || "",
        color: projectRes.color,
        status: projectRes.status,
      })
    } catch {
      showBanner("error", "Couldn't load that project.")
      navigate("/projects")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      showBanner("success", "Project saved")
    } catch {
      showBanner("error", "Couldn't save the project.")
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return
    setDeleting(true)
    try {
      await api.deleteProject(projectId, true)
      showBanner("success", "Project deleted")
      navigate("/projects")
    } catch {
      showBanner("error", "Couldn't delete the project.")
      setDeleting(false)
    }
  }

  const handleUnlinkTask = async (taskId: string) => {
    if (!projectId) return
    try {
      await api.unlinkTaskFromProject(projectId, taskId)
      setTasks(tasks.filter((t) => t.id !== taskId))
      showBanner("success", "Task removed from project")
    } catch {
      showBanner("error", "Couldn't remove the task.")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId)
      setTasks(tasks.filter((t) => t.id !== taskId))
      showBanner("success", "Task deleted")
    } catch {
      showBanner("error", "Couldn't delete the task.")
    }
  }

  if (loading) return <Spinner label="Loading project" />

  if (!project) {
    return <EmptyState title="Project not found" body="It may have been deleted." action={<Link to="/projects" className="text-pen underline-offset-4 hover:underline">Back to projects</Link>} />
  }

  const hex = projectHex(project.color)
  const total = tasks.length
  const count = (s: string) => tasks.filter((t) => t.status === s).length
  const completed = count("completed")
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const q = searchQuery.toLowerCase()
  const filtered = tasks
    .filter((t) => taskFilter === "all" || t.status === taskFilter)
    .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))
    .sort(byStatusThenPriority)

  return (
    <div>
      <Link to="/projects" className="-ml-1 inline-flex items-center gap-1 rounded text-[14px] text-ink-soft hover:text-ink">
        <ChevronLeft className="h-4 w-4" />
        Projects
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="flex min-w-0 gap-4">
          <span className="mt-1.5 w-1.5 shrink-0 self-stretch rounded-full" style={{ backgroundColor: hex }} aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="font-display text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">{project.name}</h1>
            {project.description && <p className="mt-1 max-w-2xl text-[15px] text-ink-soft">{project.description}</p>}
            <p className="mt-2 text-[13px] text-ink-faint">
              <span className="capitalize">{project.status}</span>, created {relative(project.created_at, true)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowEditForm(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button size="sm" variant="danger-ghost" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </header>

      <Panel className="mb-6 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <p className="font-display tabular text-[28px] leading-none font-semibold text-ink">
            {pct}%<span className="ml-2 font-sans text-[14px] font-normal text-ink-soft">complete</span>
          </p>
          <dl className="flex gap-6 text-[13px]">
            {[
              ["Tasks", total],
              ["To do", count("pending")],
              ["In progress", count("in_progress")],
              ["Done", completed],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-ink-soft">{k}</dt>
                <dd className="tabular text-[15px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: hex }} />
        </div>
      </Panel>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Filter by status"
          value={taskFilter}
          onChange={setTaskFilter}
          options={[
            { value: "all", label: "All", count: total },
            { value: "pending", label: "To do", count: count("pending") },
            { value: "in_progress", label: "In progress", count: count("in_progress") },
            { value: "completed", label: "Done", count: completed },
            { value: "cancelled", label: "Cancelled", count: count("cancelled") },
          ]}
        />
        <div className="flex gap-2">
          {total > 0 && (
            <div className="relative flex-1 md:w-48 md:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input type="search" aria-label="Search tasks in project" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-9 text-[13px]" />
            </div>
          )}
          <ProjectTaskSelector projectId={projectId!} onTasksLinked={loadProjectData} multi />
        </div>
      </div>

      <Panel>
        {total === 0 ? (
          <EmptyState title="No tasks in this project" body="Use “Add existing tasks” to pull in work you've already captured." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matching tasks" body="Try a different filter or search term." />
        ) : (
          <ul className="divide-y divide-rule">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusChange={loadProjectData}
                actions={
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleUnlinkTask(task.id)} aria-label={`Remove ${task.title} from project`} title="Remove from project">
                      <Unlink className="h-4 w-4" />
                    </Button>
                    <Button variant="danger-ghost" size="icon" onClick={() => handleDeleteTask(task.id)} aria-label={`Delete ${task.title}`} title="Delete task">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        title="Edit project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditForm(false)}>
              Cancel
            </Button>
            <Button type="submit" form="project-edit" variant="primary" loading={isSubmitting}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="project-edit" onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 pt-1">
          <Field label="Name" htmlFor="pe-name" error={errors.name?.message}>
            <Input id="pe-name" {...register("name")} invalid={!!errors.name} />
          </Field>
          <Field label="Description" htmlFor="pe-desc">
            <Textarea id="pe-desc" {...register("description")} rows={3} />
          </Field>
          <Field label="Colour">
            <ColorPicker value={selectedColor} onChange={(c) => setValue("color", c, { shouldDirty: true })} />
          </Field>
        </form>
      </Modal>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
        title={`Delete “${project.name}”?`}
        description="The project is removed for good. Its tasks stay in your task list, unlinked."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteProject} loading={deleting}>
              Delete project
            </Button>
          </>
        }
      />
    </div>
  )
}
