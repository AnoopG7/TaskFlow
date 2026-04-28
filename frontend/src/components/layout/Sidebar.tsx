import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  LogOut,
  Zap,
} from "lucide-react"
import { useTheme } from "@/providers/ThemeProvider"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/chat", icon: MessageSquare, label: "Agent" },
  { to: "/settings", icon: Settings, label: "Settings" },
]

export default function Sidebar() {
  const { resolved, setTheme } = useTheme()
  const { logout, user } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col border-r border-border bg-card text-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight text-foreground">TaskFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Footer */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.user_id.slice(0, 8)}...</p>
          </div>
        )}
        <button
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {resolved === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {resolved === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
