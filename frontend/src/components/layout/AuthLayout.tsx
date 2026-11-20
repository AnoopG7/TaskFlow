import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Wordmark } from "@/components/ui"
import SampleDaySheet from "@/components/SampleDaySheet"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-sheet lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="self-start rounded-md" aria-label="TaskFlow home">
          <Wordmark />
        </Link>
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
