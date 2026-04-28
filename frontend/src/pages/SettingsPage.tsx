import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/providers/ThemeProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type UserProfile } from "@/lib/api"
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/schemas"
import { User, Bell, Monitor, Sun, Moon, Save } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showBanner } = useBanner()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
  })

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api
      .getProfile(user.user_id)
      .then((p) => {
        setProfile(p)
        reset({
          name: p.name,
          email: p.email ?? "",
          timezone: p.timezone,
          work_hours: p.work_hours,
          brief_time: p.brief_time ?? "07:00",
          telegram_chat_id: p.telegram_chat_id ?? "",
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, reset])

  const onSubmit = async (data: ProfileUpdateInput) => {
    if (!user) return
    try {
      const result = await api.createOrUpdateProfile({ ...data, user_id: user.user_id })
      setProfile(result)
      showBanner("success", "Settings saved!")
    } catch {
      showBanner("error", "Failed to save settings")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your TaskFlow preferences</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Profile */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4 text-primary" />
            Profile
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Name</label>
              <input
                {...register("name")}
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <input
                {...register("email")}
                type="email"
                disabled
                className="w-full rounded-lg bg-muted border border-border px-4 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed — tied to your Supabase Auth account</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Timezone</label>
              <select
                {...register("timezone")}
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value="IST">IST (India)</option>
                <option value="UTC">UTC</option>
                <option value="EST">EST (US East)</option>
                <option value="PST">PST (US West)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" />
            Notifications
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Morning brief time</label>
              <input
                {...register("brief_time")}
                type="time"
                className="w-48 rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Telegram Chat ID</label>
              <input
                {...register("telegram_chat_id")}
                placeholder="Your Telegram chat ID"
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Message @userinfobot on Telegram to get your chat ID
              </p>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Monitor className="h-4 w-4 text-primary" />
            Appearance
          </div>

          <div className="flex gap-3">
            {[
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                  theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
