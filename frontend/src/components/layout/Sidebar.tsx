import { NavLink } from "react-router-dom"
import { CalendarDays, ListChecks, FolderOpen, MessageCircle, Settings, Sun, Moon, LogOut } from "lucide-react"
import { useTheme } from "@/providers/ThemeProvider"
import { useAuth } from "@/providers/AuthProvider"
import { Wordmark } from "@/components/ui"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { to: "/", icon: CalendarDays, label: "Today" },
  { to: "/tasks", icon: ListChecks, label: "Tasks" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/chat", icon: MessageCircle, label: "Assistant" },
  { to: "/settings", icon: Settings, label: "Settings" },
]

function initials(name?: string) {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

export default function Sidebar() {
  const { resolved, setTheme } = useTheme()
  const { logout, user } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-rule bg-sheet lg:flex">
      <div className="flex h-16 items-center px-5">
        <Wordmark />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 px-3 pt-2">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex h-9 items-center gap-3 rounded-md px-3 text-[14px] font-medium transition-colors",
                isActive ? "bg-wash text-ink" : "text-ink-soft hover:bg-wash/60 hover:text-ink"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-marker transition-opacity",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <link.icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-rule p-3">
        <button
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-[14px] text-ink-soft transition-colors hover:bg-wash hover:text-ink"
        >
          {resolved === "dark" ? <Sun className="h-[17px] w-[17px]" strokeWidth={1.8} /> : <Moon className="h-[17px] w-[17px]" strokeWidth={1.8} />}
          {resolved === "dark" ? "Light theme" : "Dark theme"}
        </button>
        {user && (
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pen-wash text-[12px] font-semibold text-pen">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{user.name || "Your account"}</span>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-risk-wash hover:text-risk"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

/** Top bar + bottom tab bar for screens below `lg`. */
export function MobileNav() {
  const { resolved, setTheme } = useTheme()
  const { logout } = useAuth()

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-sheet/95 px-4 backdrop-blur lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-wash hover:text-ink"
          >
            {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-wash hover:text-risk"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rule bg-sheet pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                isActive ? "text-ink" : "text-ink-faint"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("flex h-6 w-10 items-center justify-center rounded-full", isActive && "bg-marker/70")}>
                  <link.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </span>
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
