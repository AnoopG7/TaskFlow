import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/providers/ThemeProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type UserProfile, type AgentPreferences } from "@/lib/api"
import { profileUpdateSchema, type ProfileUpdateInput, agentPreferencesSchema, type AgentPreferencesInput } from "@/lib/schemas"
import {
  User,
  Bell,
  Monitor,
  Sun,
  Moon,
  Save,
  Clock,
  Zap,
  MessageSquare,
  RotateCcw,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showBanner } = useBanner()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [agentPrefs, setAgentPrefs] = useState<AgentPreferences | null>(null)
  const [resettingPrefs, setResettingPrefs] = useState(false)

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting, isDirty: profileDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
  })

  // Agent preferences form
  const {
    register: registerAgent,
    handleSubmit: handleAgentSubmit,
    reset: resetAgent,
    formState: { errors: agentErrors, isSubmitting: agentSubmitting, isDirty: agentDirty },
    watch: watchAgent,
  } = useForm<AgentPreferencesInput>({
    resolver: zodResolver(agentPreferencesSchema),
  })

  const dndEnabled = watchAgent("dnd_enabled")

  // Load both profile and preferences
  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([api.getProfile(), api.getAgentPreferences()])
      .then(([profileRes, prefsRes]) => {
        setProfile(profileRes)
        setAgentPrefs(prefsRes)

        resetProfile({
          name: profileRes.name,
          email: profileRes.email ?? "",
          timezone: profileRes.timezone,
          work_hours: profileRes.work_hours,
          brief_time: profileRes.brief_time ?? "07:00",
          telegram_chat_id: profileRes.telegram_chat_id ?? "",
        })

        resetAgent({
          notification_enabled: prefsRes.notification_enabled ?? true,
          dnd_enabled: prefsRes.dnd_enabled ?? false,
          dnd_start: prefsRes.dnd_start ?? "20:00",
          dnd_end: prefsRes.dnd_end ?? "08:00",
          morning_brief_time: prefsRes.morning_brief_time ?? "07:00",
          custom_agent_instructions: prefsRes.custom_agent_instructions ?? "",
          telegram_chat_id: prefsRes.telegram_chat_id ?? "",
          telegram_notifications_enabled: prefsRes.telegram_notifications_enabled ?? true,
          enable_morning_brief: prefsRes.enable_morning_brief ?? true,
          enable_evening_debrief: prefsRes.enable_evening_debrief ?? true,
          enable_risk_detection: prefsRes.enable_risk_detection ?? true,
          enable_overload_warnings: prefsRes.enable_overload_warnings ?? true,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, resetProfile, resetAgent])

  const onProfileSubmit = async (data: ProfileUpdateInput) => {
    if (!user) return
    try {
      const result = await api.createOrUpdateProfile({ ...data, user_id: user.user_id })
      setProfile(result)
      showBanner("success", "Profile settings saved!")
    } catch {
      showBanner("error", "Failed to save profile settings")
    }
  }

  const onAgentSubmit = async (data: AgentPreferencesInput) => {
    if (!user) return
    try {
      const result = await api.updateAgentPreferences(data)
      setAgentPrefs(result)
      showBanner("success", "Agent preferences saved!")
    } catch {
      showBanner("error", "Failed to save agent preferences")
    }
  }

  const handleResetPreferences = async () => {
    if (!user) return
    if (!confirm("Reset all agent preferences to defaults?")) return

    setResettingPrefs(true)
    try {
      const result = await api.resetAgentPreferences()
      resetAgent(result as AgentPreferencesInput)
      setAgentPrefs(result)
      showBanner("success", "Preferences reset to defaults")
    } catch {
      showBanner("error", "Failed to reset preferences")
    } finally {
      setResettingPrefs(false)
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
    <div className="space-y-8 max-w-3xl animate-fade-in pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your profile and agent preferences</p>
      </div>

      {/* ─── PROFILE SECTION ─── */}
      <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
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
                {...registerProfile("name")}
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              {profileErrors.name && <p className="text-xs text-destructive mt-1">{profileErrors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <input
                {...registerProfile("email")}
                type="email"
                disabled
                className="w-full rounded-lg bg-muted border border-border px-4 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email is tied to your Supabase Auth account</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Timezone</label>
              <select
                {...registerProfile("timezone")}
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value="IST">IST (India)</option>
                <option value="UTC">UTC</option>
                <option value="EST">EST (US East)</option>
                <option value="PST">PST (US West)</option>
                <option value="GMT">GMT (UK)</option>
                <option value="CET">CET (Central Europe)</option>
                <option value="JST">JST (Japan)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Telegram Chat ID</label>
              <input
                {...registerProfile("telegram_chat_id")}
                placeholder="Your Telegram chat ID (optional)"
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-foreground mb-2">How to get your Telegram Chat ID:</p>
                <ol className="text-xs text-muted-foreground space-y-1.5">
                  <li>1. Open Telegram and search for <span className="text-primary font-medium">@userinfobot</span></li>
                  <li>2. Click <span className="text-primary font-medium">Start</span> or send <span className="text-primary font-medium">/start</span></li>
                  <li>3. Copy your numeric Chat ID (e.g., 6941167090)</li>
                  <li>4. Paste it here and save</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Once linked, you can create tasks and get notifications directly from Telegram.
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

          <div className="flex gap-3 flex-wrap">
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

        {/* Save Profile */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileSubmitting || !profileDirty}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="h-4 w-4" />
            {profileSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {/* ─── AGENT PREFERENCES SECTION ─── */}
      {agentPrefs && (
        <form onSubmit={handleAgentSubmit(onAgentSubmit)} className="space-y-6">
          {/* Notifications */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...registerAgent("notification_enabled")}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <span className="text-sm text-foreground">Enable notifications</span>
              </label>

              <div className="space-y-3 pl-7">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Morning brief time</label>
                  <input
                    {...registerAgent("morning_brief_time")}
                    type="time"
                    className="w-48 rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...registerAgent("telegram_notifications_enabled")}
                    className="w-4 h-4 rounded border-border bg-background"
                  />
                  <span className="text-sm text-foreground">Send via Telegram</span>
                </label>
              </div>
            </div>
          </section>

          {/* Do Not Disturb */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Do Not Disturb
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...registerAgent("dnd_enabled")}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <span className="text-sm text-foreground">Enable DND schedule</span>
              </label>

              {dndEnabled && (
                <div className="space-y-3 pl-7 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">DND starts</label>
                    <input
                      {...registerAgent("dnd_start")}
                      type="time"
                      className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">DND ends</label>
                    <input
                      {...registerAgent("dnd_end")}
                      type="time"
                      className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground pl-7">No notifications will be sent during these hours</p>
            </div>
          </section>

          {/* Agent Triggers */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Agent Triggers
            </div>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...registerAgent("enable_morning_brief")}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <div>
                  <p className="text-sm text-foreground">Morning brief</p>
                  <p className="text-xs text-muted-foreground">Daily task overview</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...registerAgent("enable_evening_debrief")}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <div>
                  <p className="text-sm text-foreground">Evening debrief</p>
                  <p className="text-xs text-muted-foreground">Daily summary & insights</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...registerAgent("enable_risk_detection")}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <div>
                  <p className="text-sm text-foreground">Risk detection</p>
                  <p className="text-xs text-muted-foreground">Alerts for high-risk tasks</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...registerAgent("enable_overload_warnings")}
                  className="w-4 h-4 rounded border-border bg-background"
                />
                <div>
                  <p className="text-sm text-foreground">Overload warnings</p>
                  <p className="text-xs text-muted-foreground">Alert if too many tasks scheduled</p>
                </div>
              </label>
            </div>
          </section>

          {/* Custom Instructions */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" />
              Agent Instructions
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Custom guidelines (max 1000 chars)</label>
              <textarea
                {...registerAgent("custom_agent_instructions")}
                placeholder="e.g., 'Always consider async team members in time estimates' or 'Mark security tasks as high priority'"
                rows={4}
                className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">These instructions will guide the AI agent in task analysis</p>
            </div>
          </section>

          {/* Save & Reset */}
          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={handleResetPreferences}
              disabled={resettingPrefs}
              className="flex items-center gap-2 rounded-xl border border-destructive/50 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              {resettingPrefs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset to Defaults
            </button>

            <button
              type="submit"
              disabled={agentSubmitting || !agentDirty}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Save className="h-4 w-4" />
              {agentSubmitting ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
