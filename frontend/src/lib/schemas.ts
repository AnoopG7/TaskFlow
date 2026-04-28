/**
 * Zod schemas — shared validation for forms and API responses.
 */
import { z } from "zod"

/* ── Task ──────────────────────────────── */

export const taskPriorities = ["low", "medium", "high", "critical"] as const
export type TaskPriority = (typeof taskPriorities)[number]

export const taskStatuses = ["pending", "in_progress", "completed"] as const
export type TaskStatus = (typeof taskStatuses)[number]

export const taskCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  priority: z.enum(taskPriorities).default("medium"),
  due_date: z.string().optional(),
  project_id: z.string().optional(),
  estimated_hours: z.coerce.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  auto_prioritize: z.boolean().default(false),
})

export type TaskCreateInput = z.infer<typeof taskCreateSchema>

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  priority: z.enum(taskPriorities).optional(),
  status: z.enum(taskStatuses).optional(),
  due_date: z.string().optional(),
  estimated_hours: z.coerce.number().min(0).optional(),
  actual_hours: z.coerce.number().min(0).optional(),
  project_id: z.string().optional(),
})

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>

/* ── Profile ────────────────────────────── */

export const profileCreateSchema = z.object({
  user_id: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional(),
  timezone: z.string().default("IST"),
  work_hours: z.object({ start: z.number(), end: z.number() }).default({ start: 9, end: 17 }),
  notification_channels: z.object({ primary: z.string(), secondary: z.string() }).default({ primary: "telegram", secondary: "email" }),
  telegram_chat_id: z.string().optional(),
})

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>

export const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  work_hours: z.object({ start: z.number(), end: z.number() }).optional(),
  notification_channels: z.object({ primary: z.string(), secondary: z.string() }).optional(),
  telegram_chat_id: z.string().optional(),
  brief_time: z.string().optional(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

/* ── Project ────────────────────────────── */

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().optional(),
  color: z.string().default("blue"),
})

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
