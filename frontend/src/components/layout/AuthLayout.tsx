import type { ReactNode } from "react"
import { Wordmark } from "@/components/ui"

/** Illustrative day sheet shown beside the auth forms on wide screens. */
function SampleDaySheet() {
  const rows = [
    { time: "09:00", title: "Review sprint board", est: "0.5h", tone: "done" as const },
    { time: "10:00", title: "Implement auth flow", est: "3h", tone: "now" as const },
    { time: "13:00", title: "Write API tests", est: "1.5h", tone: "risk" as const },
    { time: "15:00", title: "Weekly sync notes", est: "0.5h", tone: "todo" as const },
  ]
  return (
    <div className="w-full max-w-[400px] rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/10">
      <div className="flex items-baseline justify-between pb-4">
        <p className="font-display text-xl font-semibold text-white">Thursday</p>
        <p className="tabular text-sm text-white/60">5.5h planned of 8h</p>
      </div>
      <ol className="relative space-y-1">
        {rows.map((r) => (
          <li key={r.time} className="relative flex items-center gap-4 py-2">
            <span className="tabular w-12 shrink-0 text-[13px] text-white/50">{r.time}</span>
            <span
              className={
                r.tone === "now"
                  ? "flex-1 rounded-md bg-[#ffe45c] px-3 py-2 text-[14px] font-medium text-[#3d3300]"
                  : "flex-1 rounded-md bg-white/[0.07] px-3 py-2 text-[14px] text-white/85"
              }
            >
              <span className={r.tone === "done" ? "line-through decoration-white/40 text-white/50" : ""}>{r.title}</span>
              <span className={r.tone === "now" ? "float-right tabular text-[#3d3300]/70" : "float-right tabular text-white/40"}>{r.est}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-start gap-3 rounded-md bg-white/[0.05] p-3 text-[13px] leading-snug text-white/75">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ef7a6c]" />
        API tests are due at 17:00 but the estimate leaves 30 minutes of slack. Start them before lunch?
      </div>
    </div>
  )
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-sheet lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Wordmark />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </div>

      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1c2f6e] p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "100% 32px",
          }}
        />
        <div className="relative max-w-md">
          <p className="font-display text-[34px] leading-[1.1] font-semibold text-balance">Plan the day you actually have.</p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            TaskFlow estimates how long work will take, flags what is at risk of slipping, and checks in with you
            morning, midday and evening, here or on Telegram.
          </p>
        </div>
        <div className="relative flex justify-center py-8">
          <SampleDaySheet />
        </div>
        <p className="relative text-[13px] text-white/45">Sample day. Your own tasks appear after you sign in.</p>
      </aside>
    </div>
  )
}
