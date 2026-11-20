import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type Project } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { projectCreateSchema } from "@/lib/schemas"
import type { z } from "zod"
import { ChevronRight, Plus } from "lucide-react"
import { projectHex, relative } from "@/lib/taxonomy"
import { Button, EmptyState, Field, Input, Modal, PageHeader, Panel, Spinner, Textarea } from "@/components/ui"
import ColorPicker from "@/components/ColorPicker"

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  )
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const { showBanner } = useBanner()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadProjects = () => {
    if (!user) return
    api
      .getProjects()
      .then((r) => setProjects(r.projects))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProjects() }, [user])

  type FormValues = z.input<typeof projectCreateSchema>
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(projectCreateSchema) as never,
    defaultValues: { color: "blue" },
  })

  const selectedColor = watch("color")

  const closeForm = () => {
    setShowForm(false)
    reset()
  }

  const onSubmit = async (data: FormValues) => {
    if (!user) return
    try {
      await api.createProject(data)
      showBanner("success", "Project created")
      closeForm()
      loadProjects()
    } catch {
      showBanner("error", "Couldn't create the project.")
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={
          projects.length ? `${projects.length} project${projects.length !== 1 ? "s" : ""}` : "Group related tasks and track how far along they are."
        }
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      <Modal
        open={showForm}
        onClose={closeForm}
        title="New project"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" form="project-create" variant="primary" loading={isSubmitting}>
              Create project
            </Button>
          </>
        }
      >
        <form id="project-create" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <Field label="Name" htmlFor="p-name" error={errors.name?.message}>
            <Input id="p-name" {...register("name")} placeholder="e.g. Portfolio site relaunch" autoFocus invalid={!!errors.name} />
          </Field>
          <Field label="Description" htmlFor="p-desc">
            <Textarea id="p-desc" {...register("description")} rows={3} placeholder="What does done look like?" />
          </Field>
          <Field label="Colour">
            <ColorPicker value={selectedColor} onChange={(c) => setValue("color", c)} />
          </Field>
        </form>
      </Modal>

      {loading ? (
        <Spinner label="Loading projects" />
      ) : projects.length === 0 ? (
        <Panel>
          <EmptyState
            title="No projects yet"
            body="A project collects related tasks so you can see progress in one place."
            action={
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel>
          <ul className="divide-y divide-rule">
            {projects.map((p) => {
              const hex = projectHex(p.color)
              const total = p.total_tasks || 0
              const completed = p.completed_tasks || 0
              const pct = p.completion_percentage || 0
              return (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="group grid grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-4 transition-colors hover:bg-wash/40 sm:grid-cols-[4px_minmax(0,1fr)_200px_auto] sm:px-5"
                  >
                    <span className="h-full min-h-10 w-1 rounded-full" style={{ backgroundColor: hex }} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-3">
                        <p className="truncate text-[15px] font-semibold text-ink">{p.name}</p>
                        {p.status !== "active" && <span className="shrink-0 text-[12px] capitalize text-ink-faint">{p.status}</span>}
                      </div>
                      {p.description ? (
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-soft">{p.description}</p>
                      ) : (
                        <p className="mt-0.5 text-[13px] text-ink-faint">Created {relative(p.created_at, true)}</p>
                      )}
                      <div className="mt-2.5 sm:hidden">
                        <ProgressBar value={pct} color={hex} />
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                        <span className="tabular text-ink-soft">
                          {completed} of {total} done
                        </span>
                        <span className="tabular font-semibold text-ink">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar value={pct} color={hex} />
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </div>
  )
}
