import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "@/providers/AuthProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { BannerProvider } from "@/providers/BannerProvider"
import AppShell from "@/components/layout/AppShell"
import LandingPage from "@/pages/LandingPage"
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import DashboardPage from "@/pages/DashboardPage"
import TasksPage from "@/pages/TasksPage"
import ProjectsPage from "@/pages/ProjectsPage"
import ProjectDetailPage from "@/pages/ProjectDetailPage"
import ChatPage from "@/pages/ChatPage"
import SettingsPage from "@/pages/SettingsPage"

/** Signed in: the app. Signed out: the landing page at "/", login everywhere else. */
function AppGate() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  if (isAuthenticated) return <AppShell />
  if (pathname === "/") return <LandingPage />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />}
      />
      <Route
        element={<AppGate />}
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <BannerProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BannerProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
