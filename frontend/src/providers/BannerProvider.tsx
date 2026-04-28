import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react"

type BannerType = "success" | "error" | "info"

interface BannerContextType {
  showBanner: (type: BannerType, message: string) => void
}

const BannerContext = createContext<BannerContextType | undefined>(undefined)

function Banner() {
  const [banner, setBanner] = useState<{ type: BannerType; message: string } | null>(null)

  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ type, message })
    setTimeout(() => setBanner(null), 3000)
  }, [])

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: AlertCircle,
  }

  const colors = {
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
    error: "bg-red-500/10 border-red-500/30 text-red-500",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-500",
  }

  if (!banner) return null

  const Icon = icons[banner.type]

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className={cn("flex items-center gap-2 px-4 py-3 rounded-lg border text-sm", colors[banner.type])}>
        <Icon className="h-4 w-4" />
        {banner.message}
      </div>
    </div>
  )
}

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<{ type: BannerType; message: string } | null>(null)

  const showBanner = useCallback((type: BannerType, message: string) => {
    setBanner({ type, message })
    setTimeout(() => setBanner(null), 3000)
  }, [])

  return (
    <BannerContext.Provider value={{ showBanner }}>
      <Banner />
      {children}
    </BannerContext.Provider>
  )
}

export function useBanner() {
  const ctx = useContext(BannerContext)
  if (!ctx) throw new Error("useBanner must be inside BannerProvider")
  return ctx
}