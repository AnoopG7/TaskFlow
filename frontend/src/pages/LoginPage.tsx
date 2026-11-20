import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { APIError } from "@/lib/api"
import { Eye, EyeOff } from "lucide-react"
import AuthLayout from "@/components/layout/AuthLayout"
import { Button, Field, Input } from "@/components/ui"

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) newErrors.email = "Enter your email address."
    else if (!email.includes("@")) newErrors.email = "That email address is missing an @."
    if (!password) newErrors.password = "Enter your password."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})

    try {
      await login(email, password)
      navigate("/")
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 403 || err.detail?.includes("confirm")) {
          setErrors({ email: "Confirm your email first. The link is in your inbox." })
        } else {
          setErrors({ password: err.detail || "Email or password is incorrect." })
        }
      } else if (err instanceof Error) {
        setErrors({ password: err.message })
      } else {
        setErrors({ password: "Sign-in failed. Try again in a moment." })
      }
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || authLoading

  return (
    <AuthLayout>
      <h1 className="font-display text-[30px] leading-tight font-semibold text-ink">Sign in</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">Pick up where you left off today.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            invalid={!!errors.email}
            disabled={isDisabled}
            autoFocus
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!errors.password}
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

        <Button type="submit" variant="primary" loading={isDisabled} className="w-full justify-center">
          {isDisabled ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-ink-soft">
        New to TaskFlow?{" "}
        <Link to="/signup" className="font-medium text-pen underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
