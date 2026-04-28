/**
 * API Client — typed wrapper for backend /api/* endpoints.
 * Auth token management, proper error handling.
 */

/* ── Types ──────────────────────────────── */

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  priority: string
  status: string
  estimated_hours: number | null
  actual_hours: number | null
  due_date: string | null
  start_date: string | null
  completed_date: string | null
  recurring: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  status: string
  color: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id?: string
  user_id: string
  name: string
  email?: string
  timezone: string
  work_hours: { start: number; end: number }
  notification_channels: { primary: string; secondary: string }
  do_not_disturb?: { enabled: boolean; start: string; end: string }
  brief_time?: string
  telegram_chat_id?: string
  created_at?: string
  updated_at?: string
}

export interface SignupRequest {
  email: string
  password: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user_id: string
  name: string
}

export interface SignupResponse {
  status: "confirm_email" | "logged_in"
  message: string
  user_id: string | null
  token: string | null
  name: string | null
}

export interface ChatRequest {
  user_id: string
  message?: string
  session_id?: string
}

export interface ChatResponse {
  response: string
  session_id: string | null
  actions: Record<string, unknown>
}

export interface Session {
  id: string
  title: string
  session_type: string
  started_at: string
  ended_at: string | null
}

export interface AgentMemory {
  memory: Record<string, unknown> | null
  estimation_bias: number
  frequently_missed: string[]
}

/* ── Error ──────────────────────────────── */

export class APIError extends Error {
  status: number
  detail?: string

  constructor(status: number, detail?: string) {
    super(detail || `HTTP ${status}`)
    this.name = "APIError"
    this.status = status
    this.detail = detail
  }
}

/* ── Client ─────────────────────────────── */

class APIClient {
  private baseURL = (() => {
    const url = import.meta.env.VITE_API_URL
    if (url) return url.replace(/\/+$/, "") + "/api"
    return "/api"
  })()

  /* ── Token management ──────────────── */

  private getAuthToken(): string | null {
    return localStorage.getItem("tf-auth-token")
  }

  private setAuthToken(token: string): void {
    localStorage.setItem("tf-auth-token", token)
  }

  clearAuthToken(): void {
    localStorage.removeItem("tf-auth-token")
  }

  /* ── Request helpers ───────────────── */

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    const token = this.getAuthToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
    return headers
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      ...init,
      headers: { ...this.getHeaders(), ...init?.headers },
    })

    let data: Record<string, unknown>
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      data = { detail: res.statusText }
    }

    if (!res.ok) {
      const detail = (data?.detail as string) || res.statusText
      throw new APIError(res.status, detail)
    }

    return data as T
  }

  /* ── Auth ──────────────────────────── */

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const res = await this.request<SignupResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(req),
    })
    if (res.token) this.setAuthToken(res.token)
    return res
  }

  async login(req: LoginRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(req),
    })
    this.setAuthToken(res.token)
    return res
  }

  logout(): void {
    this.clearAuthToken()
    localStorage.removeItem("tf-auth-user")
  }

  /* ── Tasks ─────────────────────────── */

  async getTasks(userId: string, filters?: { status?: string; priority?: string }): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams({ user_id: userId })
    if (filters?.status) params.set("status", filters.status)
    if (filters?.priority) params.set("priority", filters.priority)
    return this.request(`/tasks?${params}`)
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request(`/tasks/${taskId}`)
  }

  async createTask(userId: string, data: Record<string, unknown>): Promise<Task> {
    return this.request("/tasks?" + new URLSearchParams({ user_id: userId }), {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateTask(taskId: string, data: Record<string, unknown>): Promise<Task> {
    return this.request(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async completeTask(taskId: string, actualHours?: number): Promise<Task> {
    const params = actualHours ? `?actual_hours=${actualHours}` : ""
    return this.request(`/tasks/${taskId}/complete${params}`, { method: "POST" })
  }

  async deleteTask(taskId: string): Promise<{ status: string }> {
    return this.request(`/tasks/${taskId}`, { method: "DELETE" })
  }

  /* ── Projects ──────────────────────── */

  async getProjects(userId: string): Promise<{ projects: Project[] }> {
    return this.request(`/projects?user_id=${userId}`)
  }

  async createProject(userId: string, data: Record<string, unknown>): Promise<Project> {
    return this.request("/projects?" + new URLSearchParams({ user_id: userId }), {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  /* ── Agent / Chat ──────────────────── */

  async chat(req: ChatRequest): Promise<ChatResponse> {
    return this.request("/agent/chat", {
      method: "POST",
      body: JSON.stringify(req),
    })
  }

  async getSessions(userId: string, limit = 10): Promise<{ sessions: Session[] }> {
    return this.request(`/agent/sessions/${userId}?limit=${limit}`)
  }

  async getSessionHistory(userId: string, sessionId: string): Promise<{ session_id: string; messages: Array<{ role: string; content: string }> }> {
    return this.request(`/agent/sessions/${userId}/${sessionId}/history`)
  }

  async triggerAgent(userId: string, triggerType: string): Promise<ChatResponse> {
    return this.request(`/agent/trigger/${triggerType}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    })
  }

  async getAgentMemory(userId: string): Promise<AgentMemory> {
    return this.request(`/agent/memory?user_id=${userId}`)
  }

  /* ── Profile ───────────────────────── */

  async getProfile(userId: string): Promise<UserProfile> {
    return this.request(`/auth/profile?user_id=${userId}`)
  }

  async createOrUpdateProfile(data: Record<string, unknown>): Promise<UserProfile> {
    return this.request("/auth/profile", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const api = new APIClient()
