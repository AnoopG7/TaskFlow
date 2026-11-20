import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/taxonomy"
import { buttonSizes, buttonVariants, type ButtonSize, type ButtonVariant } from "@/lib/button"

/* ── Brand mark ─────────────────────────────────────────── */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-7 w-7 shrink-0", className)}>
      <rect width="32" height="32" rx="7" fill="var(--pen)" />
      <rect x="7" y="9" width="18" height="2.4" rx="1.2" fill="var(--pen-ink)" opacity=".55" />
      <rect x="6" y="14.2" width="20" height="4.6" rx="1.4" fill="var(--marker)" />
      <rect x="7" y="21.6" width="12" height="2.4" rx="1.2" fill="var(--pen-ink)" opacity=".55" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[17px] font-semibold text-ink">TaskFlow</span>
    </span>
  )
}

/* ── Buttons ────────────────────────────────────────────── */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center rounded-md font-medium whitespace-nowrap transition-[background-color,color,filter] disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})

/* ── Form controls ──────────────────────────────────────── */

const controlBase =
  "w-full rounded-md border border-rule-strong bg-sheet px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint focus:border-pen focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-pen/15 disabled:bg-wash disabled:text-ink-soft disabled:cursor-not-allowed"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, "h-10", invalid && "border-risk focus:border-risk focus:ring-risk/15", className)}
        {...props}
      />
    )
  }
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select ref={ref} className={cn(controlBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlBase, "py-2.5 resize-y min-h-[88px]", className)} {...props} />
  }
)

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-risk">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

/** A checkbox styled as a switch; works with react-hook-form `register`. */
export const Switch = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function Switch({ className, ...props }, ref) {
    return (
      <span className={cn("relative inline-flex h-5 w-9 shrink-0", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-full opacity-0"
          {...props}
        />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-rule-strong transition-colors peer-checked:bg-pen peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pen" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(16,20,29,.25)] transition-transform peer-checked:translate-x-4" />
      </span>
    )
  }
)

/* ── Layout ─────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-lg border border-rule bg-sheet", className)}>{children}</section>
}

export function PanelHeader({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {aside}
    </div>
  )
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-soft" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-6 py-14 text-center", className)}>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/* ── Segmented filter ───────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-wash p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-[5px] px-3 text-[13px] font-medium transition-colors",
              active ? "bg-sheet text-ink shadow-[0_1px_2px_rgba(16,20,29,.08)]" : "text-ink-soft hover:text-ink"
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("tabular text-[12px]", active ? "text-ink-soft" : "text-ink-faint")}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Task vocabulary ────────────────────────────────────── */

const PRIORITY_LEVEL: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }

/** Four ascending bars; how many are inked shows the priority. */
export function PriorityMark({ priority, showLabel = false }: { priority: string; showLabel?: boolean }) {
  const level = PRIORITY_LEVEL[priority] ?? 2
  const label = PRIORITY_LABEL[priority] ?? priority
  const tone = priority === "critical" ? "bg-risk" : priority === "high" ? "bg-warn" : "bg-ink-soft"
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label} priority`}>
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-[1px]", i <= level ? tone : "bg-rule-strong")}
            style={{ height: `${3 + i * 2.25}px` }}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="text-[12px] text-ink-soft">{label}</span>
      ) : (
        <span className="sr-only">{label} priority</span>
      )}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

/* ── Modal ──────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg"
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[88vh] w-full flex-col rounded-t-xl border border-rule bg-sheet shadow-[0_24px_60px_-12px_rgba(16,20,29,.35)] sm:rounded-xl animate-scale-in",
          size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>}
        {footer && <div className="flex items-center justify-end gap-2 border-t border-rule px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
