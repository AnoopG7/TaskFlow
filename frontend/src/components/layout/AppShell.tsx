import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="ml-[220px] flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
