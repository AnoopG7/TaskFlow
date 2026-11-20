import { useEffect, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/providers/ThemeProvider"
import { useBanner } from "@/providers/BannerProvider"
import { api, type UserProfile, type AgentPreferences } from "@/lib/api"
import { profileUpdateSchema, type ProfileUpdateInput, agentPreferencesSchema, type AgentPreferencesInput } from "@/lib/schemas"
import { Monitor, Sun, Moon, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, Field, Input, Modal, PageHeader, Panel, Select, Spinner, Switch, Textarea } from "@/components/ui"

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-4 px-4 py-6 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      <div className="min-w-0 max-w-xl space-y-5">{children}</div>
    </div>
  )
}

function ToggleRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6">
      <span>
        <span className="block text-[14px] font-medium text-ink">{title}</span>
        {description && <span className="block text-[13px] text-ink-soft">{description}</span>}
      </span>
      <span className="pt-0.5">{children}</span>
    </label>
  )
}

function SaveBar({ dirty, saving, label }: { dirty: boolean; saving: boolean; label: string }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-rule bg-wash/40 px-4 py-3 sm:px-6">
      <span className={cn("text-[13px]", dirty ? "text-ink" : "text-ink-faint")}>{dirty ? "Unsaved changes" : "All changes saved"}</span>
      <Button type="submit" variant="primary" size="sm" disabled={!dirty} loading={saving}>
        {label}
      </Button>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showBanner } = useBanner()
  const [loading, setLoading] = useState(true)
  const [, setProfile] = useState<UserProfile | null>(null)
  const [agentPrefs, setAgentPrefs] = useState<AgentPreferences | null>(null)
  const [resettingPrefs, setResettingPrefs] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

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
      showBanner("success", "Profile saved")
    } catch {
      showBanner("error", "Couldn't save your profile.")
    }
  }

  const onAgentSubmit = async (data: AgentPreferencesInput) => {
    if (!user) return
    try {
      const result = await api.updateAgentPreferences(data)
      setAgentPrefs(result)
      showBanner("success", "Assistant settings saved")
    } catch {
      showBanner("error", "Couldn't save assistant settings.")
    }
  }

  const handleResetPreferences = async () => {
    if (!user) return
    setResettingPrefs(true)
    try {
      const result = await api.resetAgentPreferences()
      resetAgent(result as AgentPreferencesInput)
      setAgentPrefs(result)
      showBanner("success", "Assistant settings reset")
    } catch {
      showBanner("error", "Couldn't reset assistant settings.")
    } finally {
      setResettingPrefs(false)
      setConfirmReset(false)
    }
  }
  if (loading) return <Spinner label="Loading settings" />

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Your profile, how the assistant reaches you, and how it works." />

      <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
        <Panel className="overflow-hidden">
          <div className="divide-y divide-rule">
            <Section title="Profile" description="Your timezone sets when briefings arrive and how due times are read.">
              <Field label="Name" htmlFor="s-name" error={profileErrors.name?.message}>
                <Input id="s-name" {...registerProfile("name")} />
              </Field>
              <Field label="Email" htmlFor="s-email" hint="Your sign-in email. It can't be changed here.">
                <Input id="s-email" {...registerProfile("email")} type="email" disabled />
              </Field>
              <Field label="Timezone" htmlFor="s-tz">
                <Select id="s-tz" {...registerProfile("timezone")}>
                  <option value="IST">India (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="EST">US East (EST)</option>
                  <option value="PST">US West (PST)</option>
                  <option value="GMT">UK (GMT)</option>
                  <option value="CET">Central Europe (CET)</option>
                  <option value="JST">Japan (JST)</option>
                </Select>
              </Field>
            </Section>

            <Section
              title="Telegram"
              description="Link Telegram to add tasks, mark them done and get check-ins from your phone."
            >
              <Field label="Telegram chat ID" htmlFor="s-tg">
                <Input id="s-tg" {...registerProfile("telegram_chat_id")} inputMode="numeric" placeholder="e.g. 6941167090" className="tabular" />
              </Field>
              <div className="rounded-md bg-wash/70 p-4">
                <p className="text-[13px] font-medium text-ink">Finding your chat ID</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-ink-soft marker:text-ink-faint">
                  <li>
                    In Telegram, search for <span className="font-medium text-ink">@userinfobot</span>.
                  </li>
                  <li>
                    Tap <span className="font-medium text-ink">Start</span> or send <span className="font-medium text-ink">/start</span>.
                  </li>
                  <li>Copy the number it replies with and paste it above.</li>
                </ol>
              </div>
            </Section>
          </div>
          <SaveBar dirty={profileDirty} saving={profileSubmitting} label="Save profile" />
        </Panel>
      </form>

      <Panel>
        <Section title="Appearance" description="Applies on this device only.">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 sm:max-w-sm">
            {[
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-[13px] font-medium transition-colors",
                  theme === value ? "border-pen bg-pen-wash text-pen" : "border-rule-strong text-ink-soft hover:bg-wash hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </Section>
      </Panel>

      {agentPrefs && (
        <form onSubmit={handleAgentSubmit(onAgentSubmit)}>
          <Panel className="overflow-hidden">
            <div className="divide-y divide-rule">
              <Section title="Notifications" description="When and where the assistant checks in with you.">
                <ToggleRow title="Send notifications" description="Briefings, reminders and warnings.">
                  <Switch {...registerAgent("notification_enabled")} />
                </ToggleRow>
                <ToggleRow title="Deliver on Telegram" description="Needs a linked chat ID.">
                  <Switch {...registerAgent("telegram_notifications_enabled")} />
                </ToggleRow>
                <Field label="Morning brief at" htmlFor="s-brief">
                  <Input id="s-brief" {...registerAgent("morning_brief_time")} type="time" className="tabular w-40" />
                </Field>
              </Section>

              <Section title="Quiet hours" description="No notifications are sent between these times.">
                <ToggleRow title="Use quiet hours">
                  <Switch {...registerAgent("dnd_enabled")} />
                </ToggleRow>
                {dndEnabled && (
                  <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
                    <Field label="From" htmlFor="s-dnd-start">
                      <Input id="s-dnd-start" {...registerAgent("dnd_start")} type="time" className="tabular" />
                    </Field>
                    <Field label="Until" htmlFor="s-dnd-end">
                      <Input id="s-dnd-end" {...registerAgent("dnd_end")} type="time" className="tabular" />
                    </Field>
                  </div>
                )}
              </Section>

              <Section title="Check-ins" description="Choose which messages the assistant sends on its own.">
                <ToggleRow title="Morning brief" description="What's due today and what to start with.">
                  <Switch {...registerAgent("enable_morning_brief")} />
                </ToggleRow>
                <ToggleRow title="Evening debrief" description="What got done and what rolls over.">
                  <Switch {...registerAgent("enable_evening_debrief")} />
                </ToggleRow>
                <ToggleRow title="Risk alerts" description="When a task looks likely to miss its due date.">
                  <Switch {...registerAgent("enable_risk_detection")} />
                </ToggleRow>
                <ToggleRow title="Overload warnings" description="When a day holds more hours than you have.">
                  <Switch {...registerAgent("enable_overload_warnings")} />
                </ToggleRow>
              </Section>

              <Section title="Instructions" description="Standing guidance the assistant follows when it estimates and prioritises.">
                <Field label="Your instructions" htmlFor="s-instr" hint="Up to 1,000 characters." error={agentErrors.custom_agent_instructions?.message}>
                  <Textarea
                    id="s-instr"
                    {...registerAgent("custom_agent_instructions")}
                    rows={4}
                    maxLength={1000}
                    placeholder="e.g. Treat anything touching auth or payments as high priority."
                  />
                </Field>
              </Section>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-wash/40 px-4 py-3 sm:px-6">
              <Button size="sm" variant="danger-ghost" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to defaults
              </Button>
              <div className="flex items-center gap-3">
                <span className={cn("text-[13px]", agentDirty ? "text-ink" : "text-ink-faint")}>
                  {agentDirty ? "Unsaved changes" : "All changes saved"}
                </span>
                <Button type="submit" variant="primary" size="sm" disabled={!agentDirty} loading={agentSubmitting}>
                  Save assistant settings
                </Button>
              </div>
            </div>
          </Panel>
        </form>
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        title="Reset assistant settings?"
        description="Notifications, quiet hours, check-ins and your instructions go back to their defaults."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleResetPreferences} loading={resettingPrefs}>
              Reset
            </Button>
          </>
        }
      />
    </div>
  )
}
