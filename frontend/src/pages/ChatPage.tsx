import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { api, type Session } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageSquare,
  History,
  Zap,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Message {
  role: "user" | "assistant"
  content: string
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

  // Load sessions
  useEffect(() => {
    if (!user) return
    api.getSessions(user.user_id).then((r) => setSessions(r.sessions)).catch(() => {})
  }, [user])

  // Handle trigger from URL
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
        .finally(() => setSending(false))
    }
  }, [searchParams, user])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

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
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
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
      /* */
    }
  }

  const startNewChat = () => {
    setMessages([])
    setSessionId(null)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 animate-fade-in">
      {/* History sidebar (togglable) */}
      {showHistory && (
        <div className="w-64 flex-shrink-0 rounded-xl border border-border bg-card overflow-y-auto animate-slide-in-left">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Chat History</h3>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
            >
              <Zap className="h-4 w-4" />
              New conversation
            </button>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                className={cn(
                  "w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  sessionId === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="truncate">{s.title || "Untitled"}</p>
                  <p className="text-[11px] mt-0.5">
                    {formatDistanceToNow(new Date(s.started_at + "Z"), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              title="Toggle history"
            >
              <History className="h-4 w-4" />
            </button>
            <div>
              <h2 className="font-semibold text-sm">TaskFlow Agent</h2>
              <p className="text-xs text-muted-foreground">Ask about tasks, get briefings, or manage your day</p>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="text-xs text-primary hover:underline"
          >
            New chat
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 mb-4">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Hi, I'm TaskFlow</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                Your proactive task management assistant. Ask me to create tasks, check your schedule, or get a daily brief.
              </p>
              <div className="flex gap-2 mt-6">
                {[
                  "What's on my plate today?",
                  "Show at-risk tasks",
                  "Create a new task",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted/60 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 max-w-[80%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                    : "bg-secondary"
                )}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-xl px-4 py-3 text-sm",
                  msg.role === "assistant"
                    ? "bg-muted/50"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Message TaskFlow..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
