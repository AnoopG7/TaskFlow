import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { api, type Session } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ArrowUp, History, SquarePen, X } from "lucide-react"
import { relative } from "@/lib/taxonomy"
import { Button, LogoMark } from "@/components/ui"
import MessageText from "@/components/MessageText"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "What should I work on next?",
  "Which tasks are at risk this week?",
  "Add a task: review the API PR by Friday 5pm",
]

function HistoryList({
  sessions,
  activeId,
  onPick,
  onNew,
}: {
  sessions: Session[]
  activeId: string | null
  onPick: (s: Session) => void
  onNew: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <h2 className="text-[14px] font-semibold text-ink">Conversations</h2>
        <Button size="sm" variant="ghost" onClick={onNew}>
          <SquarePen className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="px-2 py-6 text-[13px] text-ink-soft">Past conversations show up here.</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left transition-colors",
                activeId === s.id ? "bg-wash" : "hover:bg-wash/60"
              )}
            >
              <span className="block truncate text-[14px] text-ink">{s.title || "Untitled conversation"}</span>
              <span className="block text-[12px] text-ink-faint">{relative(s.started_at, true)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!user) return
    api.getSessions(user.user_id).then((r) => setSessions(r.sessions)).catch(() => {})
  }, [user])

  // Handle trigger from URL (e.g. ?trigger=morning_brief)
  useEffect(() => {
    const trigger = searchParams.get("trigger")
    if (trigger && user) {
      setSending(true)
      api
        .triggerAgent(user.user_id, trigger)
        .then((r) => {
          setMessages([{ role: "assistant", content: r.response }])
          setSessionId(r.session_id)
        })
        .catch(() => setMessages([{ role: "assistant", content: "The brief couldn't be generated right now. Ask me directly instead." }]))
        .finally(() => setSending(false))
    }
  }, [searchParams, user])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, sending])

  // Grow the composer with its content, up to a limit
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || sending) return
    const text = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setSending(true)

    try {
      const res = await api.chat({
        user_id: user.user_id,
        message: text,
        session_id: sessionId ?? undefined,
      })
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }])
      if (res.session_id) setSessionId(res.session_id)
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "That message didn't go through. Check your connection and send it again." },
      ])
    } finally {
      setSending(false)
    }
  }, [input, user, sending, sessionId])

  const loadSession = async (session: Session) => {
    if (!user) return
    try {
      const res = await api.getSessionHistory(user.user_id, session.id)
      setMessages(res.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })))
      setSessionId(session.id)
      setShowHistory(false)
    } catch {
      /* keep current conversation */
    }
  }

  const startNewChat = () => {
    setMessages([])
    setSessionId(null)
    setShowHistory(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative flex h-[calc(100dvh-144px)] gap-4 lg:h-[calc(100dvh-64px)]">
      {/* Desktop history column */}
      {showHistory && (
        <aside className="hidden w-64 shrink-0 overflow-hidden rounded-lg border border-rule bg-sheet animate-slide-in-left md:block">
          <HistoryList sessions={sessions} activeId={sessionId} onPick={loadSession} onNew={startNewChat} />
        </aside>
      )}

      {/* Mobile history sheet */}
      {showHistory && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in" onClick={() => setShowHistory(false)}>
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-sheet animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
            <HistoryList sessions={sessions} activeId={sessionId} onPick={loadSession} onNew={startNewChat} />
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-rule bg-sheet">
        <header className="flex items-center justify-between gap-3 border-b border-rule px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              aria-label={showHistory ? "Hide conversations" : "Show conversations"}
              aria-pressed={showHistory}
            >
              {showHistory ? <X className="h-4 w-4" /> : <History className="h-4 w-4" />}
            </Button>
            <div>
              <h1 className="text-[15px] font-semibold text-ink">Assistant</h1>
              <p className="hidden text-[12.5px] text-ink-soft sm:block">Reads and updates your tasks, projects and schedule.</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={startNewChat}>
            <SquarePen className="h-3.5 w-3.5" />
            New conversation
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6">
            {messages.length === 0 && !sending && (
              <div className="pt-[8vh]">
                <h2 className="font-display text-[26px] leading-tight font-semibold text-ink">What's on your plate?</h2>
                <p className="mt-2 max-w-md text-[15px] text-ink-soft">
                  Ask about your tasks, or tell the assistant to add, reschedule or close them. It answers with your real data.
                </p>
                <div className="mt-6 flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q)
                        inputRef.current?.focus()
                      }}
                      className="rounded-md border border-rule-strong px-3 py-2 text-left text-[14px] text-ink transition-colors hover:border-pen hover:bg-pen-wash"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-pen-wash px-4 py-2.5 text-[15px] text-ink">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <LogoMark className="mt-0.5 h-6 w-6" />
                    <div className="min-w-0 flex-1">
                      <MessageText content={msg.content} />
                    </div>
                  </div>
                )
              )}

              {sending && (
                <div className="flex items-center gap-3" role="status">
                  <LogoMark className="h-6 w-6" />
                  <span className="flex gap-1" aria-label="Assistant is working">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" style={{ animationDelay: `${d * 160}ms` }} />
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-rule p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="mx-auto flex max-w-[720px] items-end gap-2 rounded-lg border border-rule-strong bg-sheet py-1.5 pr-1.5 pl-3 focus-within:border-pen focus-within:ring-3 focus-within:ring-pen/15"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              aria-label="Message the assistant"
              placeholder="Ask or tell the assistant something"
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-none"
              disabled={sending}
            />
            <Button type="submit" variant="primary" size="icon" disabled={!input.trim() || sending} aria-label="Send message">
              <ArrowUp className="h-4 w-4" />
            </Button>
          </form>
          <p className="mx-auto mt-1.5 hidden max-w-[720px] text-[12px] text-ink-faint sm:block">Enter to send, Shift + Enter for a new line.</p>
        </div>
      </section>
    </div>
  )
}
