import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROJECT_COLORS, type ProjectColor } from "@/lib/taxonomy"

export default function ColorPicker({ value, onChange }: { value?: string; onChange: (c: ProjectColor) => void }) {
  return (
    <div role="radiogroup" aria-label="Project colour" className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map((c) => {
        const selected = value === c.name
        return (
          <button
            key={c.name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.label}
            title={c.label}
            onClick={() => onChange(c.name)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md ring-offset-2 ring-offset-sheet transition-shadow",
              selected ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-rule-strong"
            )}
            style={{ backgroundColor: c.hex }}
          >
            {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}
