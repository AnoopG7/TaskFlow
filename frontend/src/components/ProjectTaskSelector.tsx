import { useState, useCallback, useRef } from "react"
import { api, type Task } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Search, X, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react"

interface ProjectTaskSelectorProps {
  projectId: string
  onTasksLinked?: () => void
  multi?: boolean
  onClose?: () => void
}

const priorityBadges: Record<string, string> = {
  critical: "bg-red-500/20 text-red-700 dark:text-red-400",
  high: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  medium: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  low: "bg-zinc-400/20 text-zinc-600 dark:text-zinc-400",
}

const statusBadges: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-700 dark:text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
}

export default function ProjectTaskSelector({
  projectId,
  onTasksLinked,
  multi = false,
  onClose,
}: ProjectTaskSelectorProps) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Search tasks with debounce
  const performSearch = useCallback(async (searchQuery: string) => {
    setSearching(true)
    setError(null)
    try {
      const results = await api.searchTasks(searchQuery, projectId)
      // Only show tasks not already in the project
      setSearchResults(results.tasks.filter(t => t.project_id !== projectId))
    } catch {
      setError("Search failed")
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [projectId])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (value.length === 0) {
      setSearchResults([])
      return
    }

    if (value.length < 2) return

    debounceTimer.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      if (!multi) newSelected.clear()
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleConfirm = async () => {
    if (selectedTasks.size === 0) return

    setLinking(true)
    setError(null)
    try {
      const result = await api.linkTasksToProject(projectId, Array.from(selectedTasks))
      if (result.success) {
        setSelectedTasks(new Set())
        setQuery("")
        setSearchResults([])
        setIsOpen(false)
        onTasksLinked?.()
        onClose?.()
      } else {
        setError("Failed to link tasks")
      }
    } catch {
      setError("Failed to link tasks")
    } finally {
      setLinking(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedTasks(new Set())
    setQuery("")
    setSearchResults([])
    onClose?.()
  }

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Search and add existing tasks...
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="font-semibold text-foreground">Add Tasks to Project</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Search your tasks by name and select {multi ? "multiple" : "one"} to link
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="border-b border-border p-4 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Type at least 2 characters to search..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-transparent pl-9 pr-3 py-2 text-sm outline-none"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="flex items-center gap-3 p-4 text-destructive bg-destructive/5 border-b border-destructive/10">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {query.length < 2 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Start typing to search your tasks
                </div>
              ) : searchResults.length === 0 && !searching ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No unlinked tasks match "{query}"
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {searchResults.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTaskSelection(task.id)}
                      className={cn(
                        "w-full text-left rounded-lg border transition-all hover:shadow-sm p-3",
                        selectedTasks.has(task.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                          selectedTasks.has(task.id)
                            ? "bg-primary border-primary"
                            : "border-border"
                        )}>
                          {selectedTasks.has(task.id) && (
                            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", priorityBadges[task.priority] || "")}>
                              {task.priority}
                            </span>
                            <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", statusBadges[task.status] || "")}>
                              {task.status.replace("_", " ")}
                            </span>
                            {task.due_date && (
                              <span className="text-[11px] text-muted-foreground">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.project_id && task.project_id !== projectId && (
                              <span className="text-[11px] text-amber-600 font-medium">
                                In another project
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 bg-muted/30 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedTasks.size === 0 || linking}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {linking && <Loader2 className="h-3 w-3 animate-spin" />}
                  Link {selectedTasks.size > 0 ? `(${selectedTasks.size})` : ""} Task{selectedTasks.size !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
