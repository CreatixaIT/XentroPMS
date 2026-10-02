import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  project_code: z.string().max(50, 'Project code too long').optional(),
  client_name: z.string().max(200, 'Client name too long').optional(),
  location: z.string().max(500, 'Location too long').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional(),
  target_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional(),
  member_ids: z.array(z.string().uuid('Invalid user ID')).optional(),
}).refine(
  (data) => {
    if (data.start_date && data.target_end_date) {
      return new Date(data.start_date) <= new Date(data.target_end_date)
    }
    return true
  },
  {
    message: 'Start date must be before or equal to target end date',
    path: ['target_end_date']
  }
)

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  project_code: z.string().max(50, 'Project code too long').optional(),
  client_name: z.string().max(200, 'Client name too long').optional(),
  location: z.string().max(500, 'Location too long').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional(),
  target_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional(),
}).refine(
  (data) => {
    if (data.start_date && data.target_end_date) {
      return new Date(data.start_date) <= new Date(data.target_end_date)
    }
    return true
  },
  {
    message: 'Start date must be before or equal to target end date',
    path: ['target_end_date']
  }
)

export const projectListSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  sort_by: z.enum(['name', 'created_at', 'start_date', 'target_end_date', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const projectStatusSchema = z.object({
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
})

export const addProjectMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['PROJECT_MANAGER', 'TEAM_LEADER', 'MEMBER']).default('MEMBER')
})

export const updateProjectMemberSchema = z.object({
  role: z.enum(['PROJECT_MANAGER', 'TEAM_LEADER', 'MEMBER'])
})

export const createProjectComponentSchema = z.object({
  name: z.string().min(1, 'Component name is required').max(200, 'Component name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  quantity: z.coerce.number().min(0, 'Quantity must be positive').optional(),
  unit: z.string().max(50, 'Unit too long').optional()
})

export const updateProjectComponentSchema = z.object({
  name: z.string().min(1, 'Component name is required').max(200, 'Component name too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  quantity: z.coerce.number().min(0, 'Quantity must be positive').optional(),
  unit: z.string().max(50, 'Unit too long').optional()
})

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional()
}).refine(
  (data) => {
    if (data.due_date) {
      return new Date(data.due_date) >= new Date(new Date().toISOString().split('T')[0])
    }
    return true
  },
  {
    message: 'Due date must be today or in the future',
    path: ['due_date']
  }
)

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD').optional()
}).refine(
  (data) => {
    if (data.due_date) {
      return new Date(data.due_date) >= new Date(new Date().toISOString().split('T')[0])
    }
    return true
  },
  {
    message: 'Due date must be today or in the future',
    path: ['due_date']
  }
)

export const taskListSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  project_id: z.string().uuid('Invalid project ID').optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  sort_by: z.enum(['title', 'due_date', 'priority', 'status', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
})

export const createDailyUpdateSchema = z.object({
  progress_percentage: z.coerce.number().int().min(0, 'Progress must be between 0 and 100').max(100, 'Progress must be between 0 and 100'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long')
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectListInput = z.infer<typeof projectListSchema>
export type ProjectStatusInput = z.infer<typeof projectStatusSchema>
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberSchema>
export type CreateProjectComponentInput = z.infer<typeof createProjectComponentSchema>
export type UpdateProjectComponentInput = z.infer<typeof updateProjectComponentSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type TaskListInput = z.infer<typeof taskListSchema>
export type CreateDailyUpdateInput = z.infer<typeof createDailyUpdateSchema>
