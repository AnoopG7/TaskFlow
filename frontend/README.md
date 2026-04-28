# TaskFlow Frontend - AI-Powered Task Management UI

A modern React web application for intelligent task management with AI-powered insights, real-time updates, and seamless Telegram integration.

## Overview

TaskFlow frontend is built with **React 19** and **Vite**, providing a fast, responsive interface for the daily planner agent. It features real-time task management, productivity analytics, project organization, and an AI chatbot for natural language task management.

### Key Features

- **Dashboard**: Overview of tasks, projects, and productivity metrics
- **Task Management**: Create, edit, and organize tasks with priorities and deadlines
- **AI Chat**: Conversational interface with the agent for smart task suggestions
- **Project Organization**: Group tasks by project with visual indicators
- **Smart Notifications**: Real-time updates and status tracking
- **Theme Support**: Light/Dark mode with persistent preferences
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Authentication**: Supabase-based secure login and signup

## Tech Stack

- **Framework**: React 19.2.4
- **Build Tool**: Vite 8.0.4
- **Routing**: React Router DOM 7.14.2
- **UI Framework**: TailwindCSS 4.2.4
- **Form Handling**: React Hook Form 7.73.1 + Zod validation
- **State Management**: React Context API
- **HTTP Client**: Axios (via `src/lib/api.ts`)
- **Icons**: Lucide React 1.9.0
- **Authentication**: Supabase Auth
- **TypeScript**: For type safety

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx                # Application entry point
│   ├── App.tsx                 # Root component with routing
│   ├── components/
│   │   └── layout/
│   │       ├── AppShell.tsx    # Main layout wrapper
│   │       └── Sidebar.tsx     # Navigation sidebar
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Main dashboard view
│   │   ├── TasksPage.tsx       # Tasks management page
│   │   ├── ProjectsPage.tsx    # Projects page
│   │   ├── ChatPage.tsx        # AI agent chat interface
│   │   ├── SettingsPage.tsx    # User settings
│   │   ├── LoginPage.tsx       # Login form
│   │   └── SignupPage.tsx      # Sign up form
│   ├── providers/
│   │   ├── AuthProvider.tsx    # Authentication context
│   │   ├── ThemeProvider.tsx   # Dark/Light theme
│   │   └── BannerProvider.tsx  # Toast/Banner notifications
│   ├── lib/
│   │   ├── api.ts              # API client & endpoints
│   │   ├── schemas.ts          # Zod validation schemas
│   │   └── utils.ts            # Utility functions
│   └── vite-env.d.ts           # Vite type definitions
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── eslint.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier available)
- TaskFlow backend running locally or accessible via API

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your `.env.local` file:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Application will run at `http://localhost:5173`

## Available Scripts

### Development

```bash
npm run dev       # Start Vite dev server with hot reload
npm run build     # Build for production (TypeScript + Vite)
npm run lint      # Run ESLint to check code quality
npm run preview   # Preview production build locally
```

## Core Pages & Features

### Dashboard (`pages/DashboardPage.tsx`)
Main landing page after login showing:
- Overview of today's tasks
- Productivity metrics
- Recent completions
- Quick task creation
- Upcoming deadlines

### Tasks (`pages/TasksPage.tsx`)
Full task management interface:
- List all tasks with filters (status, priority, project)
- Create new tasks with AI auto-prioritization
- Edit existing tasks
- Mark tasks as complete
- Track time estimates vs actual
- Delete tasks

**Task Properties**:
- Title and description
- Priority: low, medium, high, critical
- Status: pending, in_progress, completed, cancelled
- Due date/deadline
- Estimated hours (AI-generated)
- Actual hours (tracked after completion)
- Project assignment
- Tags for categorization

### Projects (`pages/ProjectsPage.tsx`)
Project management interface:
- Create new projects
- View tasks grouped by project
- Project status tracking
- Visual project indicators (colors)
- Bulk task operations per project

### Chat (`pages/ChatPage.tsx`)
AI Agent chat interface:
- Send natural language messages to the agent
- Get task suggestions and recommendations
- Morning brief generation
- Evening debrief
- Task creation via conversation
- Persistent chat sessions
- Message history

**Chat Commands**:
- "What should I do today?" → Morning brief
- "Create a task to..." → Natural language task creation
- "Show me my tasks" → List tasks
- "What's my productivity?" → Analytics

### Settings (`pages/SettingsPage.tsx`)
User configuration:
- Profile information (name, timezone)
- Work hours configuration
- Notification preferences
- Theme selection
- Account management
- Logout

### Authentication
- **LoginPage**: Supabase email/password login
- **SignupPage**: New user registration with Supabase

## State Management

### AuthProvider
Manages authentication state:
```tsx
const { user, isAuthenticated, login, logout, signup } = useAuth()
```

### ThemeProvider
Manages light/dark theme:
```tsx
const { theme, setTheme } = useTheme()
```

### BannerProvider
Manages toast notifications:
```tsx
const { showBanner } = useBanner()
```

## API Integration

### API Client (`lib/api.ts`)

All API calls are made through a centralized client:

```typescript
import { api } from '@/lib/api'

// Tasks
await api.tasks.list({ status: 'pending' })
await api.tasks.create({ title: 'New task' })
await api.tasks.update(id, { status: 'completed' })
await api.tasks.delete(id)

// Projects
await api.projects.list()
await api.projects.create({ name: 'Project name' })

// Agent
await api.agent.chat({ message: 'User message' })
await api.agent.morningBrief()
await api.agent.eveningDebrief()
```

### Base URL

Set via `VITE_API_URL` environment variable. Default: `http://localhost:8000`

## Validation Schemas (`lib/schemas.ts`)

Zod schemas for form validation:
- `TaskCreateSchema` - New task validation
- `TaskUpdateSchema` - Task update validation
- `ProjectCreateSchema` - Project validation
- `LoginSchema` - Login form validation
- `SignupSchema` - Signup form validation

## Styling

### TailwindCSS
Primary styling framework with:
- Custom color palette
- Responsive breakpoints
- Dark mode support
- Component utilities

### Component Library
Uses Lucide React for consistent icons:
- `Calendar`, `Clock`, `CheckCircle`, `AlertCircle`, etc.

## Form Handling

### React Hook Form + Zod
Efficient, scalable form handling with:
- Minimal re-renders
- Built-in validation via Zod schemas
- Error handling and display
- TypeScript support

Example:
```tsx
const form = useForm({
  resolver: zodResolver(TaskCreateSchema),
  defaultValues: { ... }
})
```

## Deployment

### Vercel (Recommended)

1. **Push code to GitHub**
2. **Connect repository to Vercel**
3. **Set environment variables** in Vercel dashboard:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy** (automatic on push to main)

Production URL: `https://daily-planner.vercel.app`

### Manual Deployment

```bash
npm run build    # Creates optimized dist/ folder
# Deploy dist/ folder to any static hosting service
```

## Performance Optimization

- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Responsive images
- **Caching**: Browser and CDN caching
- **Tree Shaking**: Unused code elimination
- **Minification**: Automatic via Vite

**Build Output**:
```
dist/
├── index.html
├── assets/
│   ├── main-xxx.js     # Main bundle (~100-150KB)
│   ├── vendor-xxx.js   # Vendor bundle (~200-250KB)
│   └── style-xxx.css   # Compiled styles
└── favicon.ico
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Responsive Breakpoints

- `sm`: 640px (tablets)
- `md`: 768px (small laptops)
- `lg`: 1024px (desktops)
- `xl`: 1280px (large screens)

## Dark Mode

Theme switching via `ThemeProvider`:
```tsx
// In component
const { theme, setTheme } = useTheme()
setTheme('dark' | 'light')

// Persisted in localStorage
```

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Focus management on modals

## Security

- **JWT Authentication**: Supabase handles JWT tokens
- **HTTPS Only**: Production deployments use HTTPS
- **XSS Protection**: React's built-in escaping
- **CSRF Token**: Not needed (API uses JWT)
- **Secure Storage**: Tokens stored in localStorage (consider HttpOnly cookies for production)

## Error Handling

Global error handling via `BannerProvider`:
- Network errors
- API errors
- Validation errors
- Authentication errors

Display via toast notifications with:
- Error message
- Error code
- Retry option (if applicable)

## Debugging

### Enable Debug Logging
```typescript
// In development
console.log('API Response:', response)
```

### React DevTools
Chrome extension for debugging React components and state

### Vite Inspector
Built-in inspector for component inspection

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Hot Module Reload Not Working
- Restart dev server: `npm run dev`
- Clear browser cache

### API Connection Issues
- Verify `VITE_API_URL` in `.env.local`
- Check backend is running
- Check CORS settings on backend

### Authentication Issues
- Verify Supabase credentials in `.env.local`
- Check Supabase project settings
- Clear localStorage: `localStorage.clear()`

### Dark Mode Not Persisting
- Check `localStorage` is enabled
- Verify `ThemeProvider` wraps app

## Component Guidelines

### Creating New Pages
1. Create file in `src/pages/`
2. Add route in `App.tsx`
3. Wrap with `ProtectedRoute` if authenticated-only
4. Use `useAuth()` for auth context

### Creating New Components
1. Use TypeScript for type safety
2. Use React Hook Form for forms
3. Use Zod for validation
4. Use Lucide React for icons
5. Use TailwindCSS for styling

## Testing

Currently uses ESLint for code quality:
```bash
npm run lint
```

## Contributing

1. Create feature branch: `git checkout -b feature/description`
2. Make changes following code style
3. Run linter: `npm run lint`
4. Commit changes: `git commit -m "Clear message"`
5. Push and create pull request

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | (from dashboard) |

## Performance Metrics

### Lighthouse Scores (Target)
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 90+
- **SEO**: 90+

### Load Times
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1

## Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Voice input for tasks
- [ ] Email digest summaries
- [ ] Integration with calendar APIs
- [ ] Task templates
- [ ] Team collaboration features

## License

Proprietary - Daily Planner Agent Project

## Support

For issues and feature requests, refer to the project documentation or contact the development team.
