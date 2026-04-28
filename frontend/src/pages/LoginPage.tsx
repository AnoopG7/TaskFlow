import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/providers/AuthProvider"
import { APIError } from "@/lib/api"
import { Zap, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"

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
    if (!email.trim()) newErrors.email = "Email is required"
    else if (!email.includes("@")) newErrors.email = "Invalid email format"
    if (!password) newErrors.password = "Password is required"
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
          setErrors({ email: "Please confirm your email first. Check your inbox." })
        } else {
          setErrors({ password: err.detail || "Invalid email or password" })
        }
      } else if (err instanceof Error) {
        setErrors({ password: err.message })
      } else {
        setErrors({ password: "Something went wrong" })
      }
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || authLoading

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-border bg-card shadow-lg p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-foreground">TaskFlow</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-border focus:ring-primary/50 focus:border-primary"
                }`}
                disabled={isDisabled}
                autoFocus
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground text-sm pr-10 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 ${
                    errors.password
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-border focus:ring-primary/50 focus:border-primary"
                  }`}
                  disabled={isDisabled}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {isDisabled ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
