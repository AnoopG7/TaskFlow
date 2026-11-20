import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/taxonomy"
import { ChevronDown, Loader2 } from "lucide-react"

interface TaskStatusSelectorProps {
  taskId: string
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
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

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKey)
    }
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
      setAllowedStatuses([])
    } catch {
      // Error handled by parent
    } finally {
      setUpdating(false)
    }
  }

  const style = STATUS_STYLE[currentStatus] || STATUS_STYLE.pending

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled || updating}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Status: ${STATUS_LABEL[currentStatus] || currentStatus}. Change status`}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-[filter]",
          style.bg,
          style.text,
          disabled ? "cursor-not-allowed opacity-50" : "hover:brightness-95 dark:hover:brightness-125"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
        {STATUS_LABEL[currentStatus] || currentStatus}
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronDown className={cn("h-3 w-3 opacity-70 transition-transform", isOpen && "rotate-180")} />
        )}
      </button>

      {isOpen && !disabled && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1.5 sm:left-auto sm:right-0 min-w-[168px] overflow-hidden rounded-md border border-rule bg-sheet py-1 shadow-[0_12px_32px_-8px_rgba(16,20,29,.25)] animate-scale-in"
        >
          <p className="px-3 pt-1.5 pb-1 text-[12px] text-ink-faint">Move to</p>
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
            </div>
          ) : allowedStatuses.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-ink-soft">No other status available</p>
          ) : (
            allowedStatuses.map((status) => {
              const s = STATUS_STYLE[status] || STATUS_STYLE.pending
              return (
                <button
                  key={status}
                  role="menuitem"
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  disabled={updating}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-wash disabled:opacity-50"
                >
                  <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                  {STATUS_LABEL[status] || status}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
