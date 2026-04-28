import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type Project } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { projectCreateSchema } from "@/lib/schemas"
import type { z } from "zod"
import { cn } from "@/lib/utils"
import { FolderKanban, Plus, X, Palette, ArrowRight, BarChart3 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const PROJECT_COLORS: { name: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan"; class: string }[] = [
  { name: "blue", class: "bg-blue-500" },
  { name: "violet", class: "bg-violet-500" },
  { name: "emerald", class: "bg-emerald-500" },
  { name: "amber", class: "bg-amber-500" },
  { name: "rose", class: "bg-rose-500" },
  { name: "cyan", class: "bg-cyan-500" },
]

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showBanner } = useBanner()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadProjects = () => {
    if (!user) return
    setLoading(true)
    api.getProjects().then((r) => setProjects(r.projects)).catch(() => {}).finally(() => setLoading(false))
  }

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

  const onSubmit = async (data: FormValues) => {
    if (!user) return
    try {
      await api.createProject(data)
      showBanner("success", "Project created!")
      reset()
      setShowForm(false)
      loadProjects()
    } catch {
      showBanner("error", "Failed to create project")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Project"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in"
        >
          <input
            {...register("name")}
            placeholder="Project name..."
            className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 outline-none"
            autoFocus
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}

          <textarea
            {...register("description")}
            placeholder="Description (optional)"
            rows={2}
            className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none"
          />

          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No projects yet. Create one to organize your tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const colorClass = PROJECT_COLORS.find((c) => c.name === p.color)?.class || "bg-blue-500"
            const totalTasks = p.total_tasks || 0
            const completedTasks = p.completed_tasks || 0
            const completionPercentage = p.completion_percentage || 0

            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/50 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn("h-3 w-3 rounded-full flex-shrink-0", colorClass)} />
                    <h3 className="font-semibold group-hover:text-primary transition-colors truncate">{p.name}</h3>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                </div>

                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                )}

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>{completedTasks} of {totalTasks} tasks</span>
                  </div>

                  {totalTasks > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">{Math.round(completionPercentage)}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                  Created {formatDistanceToNow(new Date(p.created_at + "Z"), { addSuffix: true })}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
