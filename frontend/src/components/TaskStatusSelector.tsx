import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ChevronDown, Loader2 } from "lucide-react"

interface TaskStatusSelectorProps {
  taskId: string
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
}

const statusStyles: Record<string, { bg: string; dot: string; text: string }> = {
  pending: { bg: "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700", dot: "bg-slate-500", text: "text-slate-700 dark:text-slate-300" },
  in_progress: { bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300" },
  completed: { bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  cancelled: { bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800", dot: "bg-red-500", text: "text-red-700 dark:text-red-300" },
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

export default function TaskStatusSelector({
  taskId,
  currentStatus,
  onStatusChange,
  disabled = false,
}: TaskStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Load allowed transitions when opened
  const handleOpen = async () => {
    if (disabled || loading) return
    setIsOpen(!isOpen)

    if (!isOpen && allowedStatuses.length === 0) {
      setLoading(true)
      try {
        const res = await api.getTaskAllowedTransitions(taskId)
        setAllowedStatuses(res.allowed_transitions)
      } catch {
        setAllowedStatuses([])
      } finally {
        setLoading(false)
      }
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    try {
      await api.updateTask(taskId, { status: newStatus })
      onStatusChange?.(newStatus)
      setIsOpen(false)
      // Reset allowed transitions since status changed
      setAllowedStatuses([])
    } catch {
      // Error handled by parent
    } finally {
      setUpdating(false)
    }
  }

  const style = statusStyles[currentStatus] || statusStyles.pending

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Compact pill button */}
      <button
        onClick={handleOpen}
        disabled={disabled || updating}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
          style.bg, style.text,
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:shadow-sm cursor-pointer",
          isOpen && "ring-2 ring-primary/30"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
        {statusLabels[currentStatus] || currentStatus}
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-fade-in min-w-[160px]">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : allowedStatuses.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
              No transitions available
            </div>
          ) : (
            <div className="py-1">
              {allowedStatuses.map((status) => {
                const s = statusStyles[status] || statusStyles.pending
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={updating}
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    <span className={cn("font-medium text-xs", s.text)}>
                      {statusLabels[status] || status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
