/**
 * API Client — typed wrapper for backend /api/* endpoints.
 * All authenticated endpoints send X-User-ID header.
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
  status: "active" | "archived" | "completed"
  color: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan"
  total_tasks?: number
  completed_tasks?: number
  pending_tasks?: number
  in_progress_tasks?: number
  cancelled_tasks?: number
  completion_percentage?: number
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

export interface AgentPreferences {
  user_id?: string
  notification_enabled: boolean
  dnd_enabled: boolean
  dnd_start: string
  dnd_end: string
  morning_brief_time: string
  custom_agent_instructions?: string
  telegram_chat_id?: string
  telegram_notifications_enabled: boolean
  enable_morning_brief: boolean
  enable_evening_debrief: boolean
  enable_risk_detection: boolean
  enable_overload_warnings: boolean
  created_at?: string
  updated_at?: string
}

export interface ParseAndCreateResponse {
  success: boolean
  tasks_created: Array<{ id: string; title: string; priority: string; status: string }>
  parsing_warnings: string[]
  creation_errors: string[]
  parse_result?: { parsing_confidence: number }
  error?: string
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

  /* ── User ID ───────────────────────── */

  private getUserId(): string | null {
    try {
      const raw = localStorage.getItem("tf-auth-user")
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed.user_id || null
    } catch {
      return null
    }
  }

  /* ── Request helpers ───────────────── */

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    const token = this.getAuthToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
    const userId = this.getUserId()
    if (userId) headers["X-User-ID"] = userId
    return headers
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
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

  async getTasks(filters?: { status?: string; priority?: string }): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.priority) params.set("priority", filters.priority)
    const qs = params.toString()
    return this.request(`/tasks${qs ? "?" + qs : ""}`)
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request(`/tasks/${taskId}`)
  }

  async createTask(data: Record<string, unknown>): Promise<Task> {
    return this.request("/tasks", {
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

  async searchTasks(query: string, excludeProjectId?: string): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams({ q: query })
    if (excludeProjectId) params.set("exclude_project_id", excludeProjectId)
    return this.request(`/tasks/search?${params}`)
  }

  async parseAndCreateTasks(data: { description: string; project_id?: string | null; user_instructions?: string | null }): Promise<ParseAndCreateResponse> {
    return this.request("/tasks/batch/parse-and-create", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getTaskAllowedTransitions(taskId: string): Promise<{
    task_id: string
    current_status: string
    allowed_transitions: string[]
    status_descriptions: Record<string, string>
  }> {
    return this.request(`/tasks/${taskId}/allowed-transitions`)
  }

  /* ── Projects ──────────────────────── */

  async getProjects(): Promise<{ projects: Project[]; total: number }> {
    return this.request("/projects")
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request(`/projects/${projectId}`)
  }

  async createProject(data: Record<string, unknown>): Promise<Project> {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateProject(projectId: string, data: Record<string, unknown>): Promise<Project> {
    return this.request(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteProject(projectId: string, cascade: boolean = true): Promise<void> {
    await this.request(`/projects/${projectId}?cascade=${cascade}`, { method: "DELETE" })
  }

  async getProjectTasks(projectId: string, filters?: { status?: string; priority?: string; limit?: number; offset?: number }): Promise<{ tasks: Task[]; total: number; limit: number; offset: number }> {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.priority) params.set("priority", filters.priority)
    if (filters?.limit) params.set("limit", filters.limit.toString())
    if (filters?.offset) params.set("offset", filters.offset.toString())
    return this.request(`/projects/${projectId}/tasks?${params}`)
  }

  async linkTasksToProject(projectId: string, taskIds: string[]): Promise<{ success: boolean; linked: number; tasks: Task[] }> {
    return this.request(`/projects/${projectId}/tasks/link`, {
      method: "POST",
      body: JSON.stringify({ task_ids: taskIds }),
    })
  }

  async unlinkTaskFromProject(projectId: string, taskId: string): Promise<{ status: string; task_id: string }> {
    return this.request(`/projects/${projectId}/tasks/unlink/${taskId}`, { method: "POST" })
  }

  async getProjectAnalytics(projectId: string): Promise<Record<string, unknown>> {
    return this.request(`/projects/${projectId}/analytics`)
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

  /* ── Preferences ───────────────────── */

  async getAgentPreferences(): Promise<AgentPreferences> {
    return this.request("/auth/preferences")
  }

  async updateAgentPreferences(data: Record<string, unknown>): Promise<AgentPreferences> {
    return this.request("/auth/preferences", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async resetAgentPreferences(): Promise<AgentPreferences> {
    return this.request("/auth/preferences/reset", { method: "POST" })
  }

  /* ── Profile ───────────────────────── */

  async getProfile(): Promise<UserProfile> {
    return this.request("/auth/profile")
  }

  async createOrUpdateProfile(data: Record<string, unknown>): Promise<UserProfile> {
    return this.request("/auth/profile", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const api = new APIClient()
