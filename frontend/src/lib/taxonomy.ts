/**
 * Shared vocabulary for priorities, statuses and project colours,
 * plus safe date helpers. Pages import from here instead of keeping
 * their own copies.
 */
import { endOfDay, format, formatDistanceToNow, isValid } from "date-fns"

export type Priority = "critical" | "high" | "medium" | "low"
export type Status = "pending" | "in_progress" | "completed" | "cancelled"

export const PRIORITY_WEIGHT: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "To do",
  in_progress: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
}

export const STATUS_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  pending: { dot: "bg-ink-faint", text: "text-ink-soft", bg: "bg-wash" },
  in_progress: { dot: "bg-pen", text: "text-pen", bg: "bg-pen-wash" },
  completed: { dot: "bg-done", text: "text-done", bg: "bg-done-wash" },
  cancelled: { dot: "bg-risk", text: "text-risk", bg: "bg-risk-wash" },
}

export type ProjectColor = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan"

/** Muted, ink-like swatches so project colours sit quietly next to the UI. */
export const PROJECT_COLORS: { name: ProjectColor; label: string; hex: string }[] = [
  { name: "blue", label: "Blue", hex: "#3b63c4" },
  { name: "violet", label: "Violet", hex: "#7a5bc0" },
  { name: "emerald", label: "Green", hex: "#2f8a62" },
  { name: "amber", label: "Amber", hex: "#c48a1c" },
  { name: "rose", label: "Rose", hex: "#c4506a" },
  { name: "cyan", label: "Teal", hex: "#23899a" },
]

export function projectHex(color?: string | null): string {
  return PROJECT_COLORS.find((c) => c.name === color)?.hex ?? PROJECT_COLORS[0].hex
}

/**
 * Parse an API timestamp. `assumeUtc` appends "Z" only when the string has no
 * offset already (server-generated timestamps like created_at are naive UTC).
 * Returns null instead of an Invalid Date so formatters never throw.
 */
export function parseDate(value: string | null | undefined, assumeUtc = false): Date | null {
  if (!value) return null
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const d = new Date(assumeUtc && !hasZone ? `${value}Z` : value)
  return isValid(d) ? d : null
}

export function relative(value: string | null | undefined, assumeUtc = false): string {
  const d = parseDate(value, assumeUtc)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : ""
}

export function fmt(value: string | null | undefined, pattern: string, assumeUtc = false): string {
  const d = parseDate(value, assumeUtc)
  return d ? format(d, pattern) : ""
}

/** A due time of exactly 00:00 is treated as "some time that day". */
export function hasDueTime(value: string | null | undefined): boolean {
  const d = parseDate(value)
  return !!d && (d.getHours() !== 0 || d.getMinutes() !== 0)
}

export function isOverdue(task: { due_date: string | null; status: string }): boolean {
  if (task.status === "completed" || task.status === "cancelled") return false
  const d = parseDate(task.due_date)
  if (!d) return false
  const deadline = hasDueTime(task.due_date) ? d.getTime() : endOfDay(d).getTime()
  return deadline < Date.now()
}

export function byStatusThenPriority<T extends { status: string; priority: string; due_date: string | null }>(a: T, b: T) {
  const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 }
  const sa = order[a.status] ?? 1
  const sb = order[b.status] ?? 1
  if (sa !== sb) return sa - sb
  const pa = PRIORITY_WEIGHT[a.priority] ?? 2
  const pb = PRIORITY_WEIGHT[b.priority] ?? 2
  if (pa !== pb) return pa - pb
  const da = parseDate(a.due_date)?.getTime()
  const db = parseDate(b.due_date)?.getTime()
  if (da && db) return da - db
  if (da) return -1
  if (db) return 1
  return 0
}
