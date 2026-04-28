/**
 * AuthProvider — Manages Supabase auth state (JWT token, user profile).
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { api, type AuthResponse, type SignupResponse } from "@/lib/api"

interface AuthContextType {
  isAuthenticated: boolean
  user: AuthResponse | null
  loading: boolean
  error: Error | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<SignupResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getStoredAuth(): { user: AuthResponse | null; isAuthenticated: boolean } {
  const userData = localStorage.getItem("tf-auth-user")
  const token = localStorage.getItem("tf-auth-token")
  if (!token || !userData) return { user: null, isAuthenticated: false }
  try {
    return { user: JSON.parse(userData) as AuthResponse, isAuthenticated: true }
  } catch {
    localStorage.removeItem("tf-auth-user")
    localStorage.removeItem("tf-auth-token")
    return { user: null, isAuthenticated: false }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth()
  const [user, setUser] = useState<AuthResponse | null>(stored.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(stored.isAuthenticated)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.login({ email, password })
      setUser(response)
      localStorage.setItem("tf-auth-user", JSON.stringify(response))
      setIsAuthenticated(true)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Login failed")
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string): Promise<SignupResponse> => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.signup({ email, password, name })
      if (response.status === "logged_in" && response.token) {
        const authUser: AuthResponse = {
          token: response.token,
          user_id: response.user_id || "",
          name: response.name || "",
        }
        setUser(authUser)
        localStorage.setItem("tf-auth-user", JSON.stringify(authUser))
        setIsAuthenticated(true)
      }
      return response
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Signup failed")
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("tf-auth-user")
    localStorage.removeItem("tf-auth-token")
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
