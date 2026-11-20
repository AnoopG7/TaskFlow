import { Outlet, useLocation } from "react-router-dom"
import Sidebar, { MobileNav } from "./Sidebar"
import { cn } from "@/lib/utils"

export default function AppShell() {
  const { pathname } = useLocation()
  const isChat = pathname.startsWith("/chat")

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-[232px]">
        <div
          className={cn(
            "mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-10",
            isChat ? "pt-4 lg:pt-8 pb-[72px] lg:pb-8" : "pt-6 pb-24 lg:pt-10 lg:pb-16"
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
