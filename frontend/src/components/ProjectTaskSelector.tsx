import { useState, useCallback, useRef } from "react"
import { api, type Task } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Search, Loader2, Check, Link2 } from "lucide-react"
import { fmt } from "@/lib/taxonomy"
import { Button, Modal, PriorityMark, StatusPill } from "@/components/ui"

interface ProjectTaskSelectorProps {
  projectId: string
  onTasksLinked?: () => void
  multi?: boolean
  onClose?: () => void
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

  const performSearch = useCallback(
    async (searchQuery: string) => {
      setSearching(true)
      setError(null)
      try {
        const results = await api.searchTasks(searchQuery, projectId)
        setSearchResults(results.tasks.filter((t) => t.project_id !== projectId))
      } catch {
        setError("Search failed. Check your connection and try again.")
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    },
    [projectId]
  )

  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (value.length === 0) {
      setSearchResults([])
      return
    }
    if (value.length < 2) return
    debounceTimer.current = setTimeout(() => performSearch(value), 300)
  }

  const toggleTaskSelection = (taskId: string) => {
    const next = new Set(selectedTasks)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      if (!multi) next.clear()
      next.add(taskId)
    }
    setSelectedTasks(next)
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
        setError("Couldn't add those tasks to the project.")
      }
    } catch {
      setError("Couldn't add those tasks to the project.")
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

  const n = selectedTasks.size

  return (
    <>
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Link2 className="h-3.5 w-3.5" />
        Add existing tasks
      </Button>

      <Modal
        open={isOpen}
        onClose={handleClose}
        size="lg"
        title="Add tasks to this project"
        description={multi ? "Search your tasks and pick as many as you like." : "Search your tasks and pick one."}
        footer={
          <>
            <span className="mr-auto tabular text-[13px] text-ink-soft">{n} selected</span>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm} disabled={n === 0} loading={linking}>
              {n > 1 ? `Add ${n} tasks` : "Add task"}
            </Button>
          </>
        }
      >
        <div className="sticky top-0 z-10 -mx-5 border-b border-rule bg-sheet px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              autoFocus
              type="search"
              aria-label="Search tasks"
              placeholder="Search by title"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-rule-strong bg-sheet pl-9 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-pen focus:outline-none focus:ring-3 focus:ring-pen/15"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-soft" />}
          </div>
        </div>

        {error && <p role="alert" className="mt-3 rounded-md bg-risk-wash px-3 py-2 text-[13px] text-risk">{error}</p>}

        {query.length < 2 ? (
          <p className="py-12 text-center text-sm text-ink-soft">Type at least two letters to search.</p>
        ) : searchResults.length === 0 && !searching ? (
          <p className="py-12 text-center text-sm text-ink-soft">No tasks outside this project match "{query}".</p>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {searchResults.map((task) => {
              const selected = selectedTasks.has(task.id)
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleTaskSelection(task.id)}
                    aria-pressed={selected}
                    className={cn(
                      "-mx-2 flex w-[calc(100%+16px)] items-start gap-3 rounded-md px-2 py-3 text-left transition-colors",
                      selected ? "bg-pen-wash" : "hover:bg-wash/60"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors",
                        selected ? "border-pen bg-pen text-pen-ink" : "border-rule-strong bg-sheet"
                      )}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{task.title}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-soft">
                        <PriorityMark priority={task.priority} showLabel />
                        <StatusPill status={task.status} />
                        {task.due_date && <span>Due {fmt(task.due_date, "d MMM")}</span>}
                        {task.project_id && task.project_id !== projectId && (
                          <span className="font-medium text-warn">Moves from another project</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>
    </>
  )
}
