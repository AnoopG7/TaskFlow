import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Check, X, Info } from "lucide-react"

type BannerType = "success" | "error" | "info"

interface BannerContextType {
  showBanner: (type: BannerType, message: string) => void
}

const BannerContext = createContext<BannerContextType | undefined>(undefined)

const icons = { success: Check, error: X, info: Info }
const iconTone = {
  success: "bg-done text-white",
  error: "bg-risk text-white",
  info: "bg-pen text-pen-ink",
}

function Banner({ banner }: { banner: { id: number; type: BannerType; message: string } | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] lg:bottom-6">
      {banner && (
        <div
          key={banner.id}
          role={banner.type === "error" ? "alert" : "status"}
          className="absolute bottom-0 left-1/2 flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-lg bg-[#161c2b] py-2.5 pr-4 pl-2.5 text-sm text-white shadow-[0_12px_32px_-8px_rgba(16,20,29,.5)] animate-toast-in dark:bg-[#ececec] dark:text-[#1b1b1b]"
          style={{ transform: "translateX(-50%)" }}
        >
          {(() => {
            const Icon = icons[banner.type]
            return (
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", iconTone[banner.type])}>
                <Icon className="h-3 w-3" strokeWidth={3} />
              </span>
            )
          })()}
          {banner.message}
        </div>
      )}
    </div>
  )
}

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<{ id: number; type: BannerType; message: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showBanner = useCallback((type: BannerType, message: string) => {
    if (timer.current) clearTimeout(timer.current)
    setBanner({ id: Date.now(), type, message })
    timer.current = setTimeout(() => setBanner(null), 3200)
  }, [])

  return (
    <BannerContext.Provider value={{ showBanner }}>
      <Banner banner={banner} />
      {children}
    </BannerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBanner() {
  const ctx = useContext(BannerContext)
  if (!ctx) throw new Error("useBanner must be inside BannerProvider")
  return ctx
}
