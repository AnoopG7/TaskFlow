import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost"
export type ButtonSize = "sm" | "md" | "icon"

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-pen text-pen-ink hover:brightness-110 active:brightness-95",
  secondary: "bg-sheet text-ink border border-rule-strong hover:bg-wash",
  ghost: "text-ink-soft hover:bg-wash hover:text-ink",
  danger: "bg-risk text-white hover:brightness-110",
  "danger-ghost": "text-ink-soft hover:bg-risk-wash hover:text-risk",
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
}

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center rounded-md font-medium whitespace-nowrap transition-[background-color,color,filter]",
    buttonVariants[variant],
    buttonSizes[size],
    className
  )
}

