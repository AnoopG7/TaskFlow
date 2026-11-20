import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { APIError } from "@/lib/api"
import { Eye, EyeOff, MailCheck } from "lucide-react"
import AuthLayout from "@/components/layout/AuthLayout"
import { Button, Field, Input } from "@/components/ui"
import { buttonClass } from "@/lib/button"

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup, loading: authLoading } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validate = (): string | null => {
    if (!name.trim()) return "Enter your name."
    if (!email.trim()) return "Enter your email address."
    if (!email.includes("@")) return "That email address is missing an @."
    if (!password) return "Choose a password."
    if (password.length < 8) return "Use at least 8 characters for your password."
    if (password !== confirmPassword) return "The two passwords don't match."
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const result = await signup(email, password, name)

      if (result.status === "logged_in") {
        navigate("/")
      } else {
        setEmailSent(true)
      }
    } catch (err) {
      if (err instanceof APIError) {
        let message = err.detail || "Account creation failed."
        if (message.includes("already registered")) {
          message = "This email already has an account. Sign in instead."
        } else if (message.includes("password")) {
          message = "That password is too weak. Use at least 8 characters."
        }
        setError(message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Account creation failed. Try again in a moment.")
      }
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || authLoading

  if (emailSent) {
    return (
      <AuthLayout>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-done-wash text-done">
          <MailCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-6 font-display text-[30px] leading-tight font-semibold text-ink">Check your inbox</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Open it to activate
          your account, then sign in.
        </p>
        <Link to="/login" className={buttonClass("primary", "md", "mt-8 w-full justify-center")}>
          Go to sign in
        </Link>
        <p className="mt-6 text-[13px] text-ink-soft">No email after a few minutes? Check your spam folder.</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-[30px] leading-tight font-semibold text-ink">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">Takes a minute. Your first plan takes another.</p>

      {error && (
        <div role="alert" className="mt-6 rounded-md border border-risk/25 bg-risk-wash px-3 py-2.5 text-sm text-risk">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Name" htmlFor="name">
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isDisabled} autoFocus />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isDisabled}
          />
        </Field>

        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDisabled}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isDisabled}
          />
        </Field>

        <Button type="submit" variant="primary" loading={isDisabled} className="mt-2 w-full justify-center">
          {isDisabled ? "Creating account" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-pen underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
