import { z } from 'zod'

export const timeInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0)
})

export const timeOutSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0)
})

export const workplaceSettingsSchema = z.object({
  workplace_name: z.string().min(1, 'Workplace name is required'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  allowed_radius_meters: z.number().min(1, 'Radius must be at least 1 meter'),
  is_active: z.boolean()
})

export const attendanceHistorySchema = z.object({
  user_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
})

export type TimeInInput = z.infer<typeof timeInSchema>
export type TimeOutInput = z.infer<typeof timeOutSchema>
export type WorkplaceSettingsInput = z.infer<typeof workplaceSettingsSchema>
export type AttendanceHistoryInput = z.infer<typeof attendanceHistorySchema>
