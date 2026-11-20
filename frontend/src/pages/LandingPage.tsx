import { Link } from "react-router-dom"
import { CalendarClock, FolderOpen, Send, Sparkles } from "lucide-react"
import { Wordmark } from "@/components/ui"
import { buttonClass } from "@/lib/button"
import SampleDaySheet from "@/components/SampleDaySheet"

const REPO_URL = "https://github.com/AnoopG7/TaskFlow"

const DAY = [
  {
    time: "07:00",
    title: "Morning brief",
    body: "What's due today, what's at risk, and which task to start with. Waiting in the app, or sent to Telegram.",
    marker: false,
  },
  {
    time: "10:30",
    title: "Ask the assistant",
    body: "“Move the README task to Monday.” “What should I do next?” It reads and changes your real task list.",
    marker: true,
  },
  {
    time: "14:00",
    title: "Risk alerts",
    body: "When the time left before a due date no longer covers the estimate, you hear about it while there's still room to act.",
    marker: false,
  },
  {
    time: "20:00",
    title: "Evening debrief",
    body: "What got done today and what rolls over to tomorrow.",
    marker: false,
  },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: "Estimates and risks",
    body: "Add a task and the assistant suggests how long it will take, flags what could go wrong, and proposes subtasks.",
  },
  {
    icon: CalendarClock,
    title: "A day you can see",
    body: "The Today sheet lays your work day out hour by hour, with each task at its due time and a line for now.",
  },
  {
    icon: FolderOpen,
    title: "Projects",
    body: "Group related tasks and watch each project's progress as work moves from to do to done.",
  },
  {
    icon: Send,
    title: "Telegram",
    body: "Link your chat to add tasks, mark them done and get check-ins without opening the app.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-ink">
      {/* Header */}
      <header className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-4 sm:px-6">
        <Link to="/" className="rounded-md" aria-label="TaskFlow home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
          <Link to="/login" className={buttonClass("ghost", "sm")}>
            Sign in
          </Link>
          <Link to="/signup" className={buttonClass("primary", "sm")}>
            Get started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1160px] items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-16 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="font-display text-[44px] leading-[1.02] font-semibold text-balance text-ink sm:text-[60px]">
              Plan the day you <span className="marker">actually have.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-soft">
              TaskFlow is a daily planner with an assistant built in. It estimates how long work will take, warns you
              when something is about to slip, and checks in with you morning and evening.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className={buttonClass("primary", "md", "h-11 px-5 text-[15px]")}>
                Create an account
              </Link>
              <Link to="/login" className={buttonClass("secondary", "md", "h-11 px-5 text-[15px]")}>
                Sign in
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[#1c2f6e] px-5 py-10 sm:px-10 sm:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: "linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "100% 32px" }}
            />
            <div className="relative flex justify-center">
              <SampleDaySheet />
            </div>
          </div>
        </section>

        {/* A day with TaskFlow */}
        <section className="border-y border-rule bg-sheet">
          <div className="mx-auto grid max-w-[1160px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16">
            <div>
              <h2 className="font-display text-[32px] leading-tight font-semibold text-ink">A day with TaskFlow</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                The assistant works on the schedule you set in Settings, and stays quiet during your quiet hours.
              </p>
            </div>
            <ol className="relative">
              {DAY.map((d) => (
                <li key={d.time} className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-t border-rule py-6 first:border-t-0 first:pt-0 sm:grid-cols-[88px_minmax(0,1fr)]">
                  <span className="font-display tabular pt-0.5 text-[20px] font-semibold text-ink-faint">{d.time}</span>
                  <div className="max-w-xl">
                    <h3 className="text-[17px] font-semibold text-ink">
                      {d.marker ? <span className="marker">{d.title}</span> : d.title}
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{d.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-[1160px] px-4 py-20 sm:px-6">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <f.icon className="h-5 w-5 text-pen" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="mt-4 text-[16px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-[1160px] px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-rule bg-sheet px-6 py-10 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="font-display text-[28px] leading-tight font-semibold text-ink">Start with today.</h2>
              <p className="mt-2 text-[15px] text-ink-soft">Add a few tasks and the sheet fills in around them.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup" className={buttonClass("primary", "md", "h-11 px-5 text-[15px]")}>
                Create an account
              </Link>
              <Link to="/login" className={buttonClass("ghost", "md", "h-11 px-5 text-[15px]")}>
                I have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-3 px-4 py-8 text-[13px] text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Built with React, FastAPI, Supabase and Groq.</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-pen">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
