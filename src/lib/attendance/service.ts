import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, requireActiveAccount, requireSuperAdmin } from '@/lib/auth/authorization'
import type { AttendanceRecord, AttendanceSettings, AttendanceHistoryParams, AttendanceStats, AttendanceStatus } from './types'

/**
 * Get today's attendance for the current user (session-based)
 */
export async function getTodayAttendance(): Promise<AttendanceRecord | null> {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  // Get business date in Asia/Dhaka
  const { data: dateResult } = await supabase
    .rpc('get_business_date')
  
  if (!dateResult.data) {
    throw new Error('Failed to get business date')
  }

  const businessDate = dateResult.data

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('attendance_date', businessDate)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

/**
 * Get current attendance status with session details
 */
export async function getCurrentAttendanceStatus() {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_current_attendance_status', {
      p_user_id: user.id
    })

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return {
      has_open_session: false,
      latest_time_in: null,
      latest_session_id: null,
      total_working_time: 0
    }
  }

  return data[0]
}

/**
 * Get today's sessions for the current user
 */
export async function getTodaySessions() {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  // Get business date
  const { data: dateResult } = await supabase
    .rpc('get_business_date')
  
  if (!dateResult.data) {
    throw new Error('Failed to get business date')
  }

  const businessDate = dateResult.data

  const { data, error } = await supabase
    .rpc('get_attendance_sessions', {
      p_user_id: user.id,
      p_business_date: businessDate
    })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get attendance status for the current user (session-based)
 */
export async function getAttendanceStatus(): Promise<AttendanceStatus> {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  // Use the new session-based function
  const { data, error } = await supabase
    .rpc('get_current_attendance_status', {
      p_user_id: user.id
    })

  if (error) {
    console.error('Error getting attendance status:', error)
    return 'error'
  }

  if (!data || data.length === 0) {
    return 'not_recorded'
  }

  const status = data[0]

  if (status.has_open_session) {
    return 'timed_in'
  }

  // Has sessions but no open session
  if (status.total_working_time && status.total_working_time > 0) {
    return 'complete'
  }

  return 'not_recorded'
}

/**
 * Record Time In
 */
export async function recordTimeIn(latitude: number, longitude: number, accuracy: number): Promise<AttendanceRecord> {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  // Validate coordinates
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude')
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude')
  }
  if (accuracy < 0) {
    throw new Error('Invalid accuracy')
  }

  // Call server-side function
  const { data, error } = await supabase
    .rpc('create_attendance_time_in', {
      p_user_id: user.id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy
    })

  if (error) {
    throw error
  }

  // Fetch the created record
  const { data: record, error: fetchError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('id', data)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return record
}

/**
 * Record Time Out
 */
export async function recordTimeOut(latitude: number, longitude: number, accuracy: number): Promise<AttendanceRecord> {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  // Validate coordinates
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude')
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude')
  }
  if (accuracy < 0) {
    throw new Error('Invalid accuracy')
  }

  // Call server-side function
  const { data, error } = await supabase
    .rpc('update_attendance_time_out', {
      p_user_id: user.id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy
    })

  if (error) {
    throw error
  }

  // Fetch the updated record
  const { data: record, error: fetchError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('id', data)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return record
}

/**
 * Get attendance history for the current user
 */
export async function getAttendanceHistory(params: AttendanceHistoryParams = {}): Promise<AttendanceRecord[]> {
  const user = await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  let query = supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', user.id)
    .order('attendance_date', { ascending: false })

  if (params.start_date) {
    query = query.gte('attendance_date', params.start_date)
  }

  if (params.end_date) {
    query = query.lte('attendance_date', params.end_date)
  }

  if (params.limit) {
    query = query.limit(params.limit)
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get active workplace settings
 */
export async function getActiveWorkplaceSettings(): Promise<AttendanceSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

/**
 * SUPER_ADMIN: Get all attendance records with filters
 */
export async function getAllAttendance(params: AttendanceHistoryParams = {}): Promise<AttendanceRecord[]> {
  await requireSuperAdmin()

  const supabase = await createClient()

  let query = supabase
    .from('attendance_records')
    .select('*, profiles(full_name, designation)')
    .order('attendance_date', { ascending: false })

  if (params.user_id) {
    query = query.eq('user_id', params.user_id)
  }

  if (params.start_date) {
    query = query.gte('attendance_date', params.start_date)
  }

  if (params.end_date) {
    query = query.lte('attendance_date', params.end_date)
  }

  if (params.limit) {
    query = query.limit(params.limit)
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * SUPER_ADMIN: Get attendance statistics
 */
export async function getAttendanceStats(date?: string): Promise<AttendanceStats> {
  await requireSuperAdmin()

  const supabase = await createClient()

  // Use provided date or business date
  let targetDate = date
  if (!targetDate) {
    const { data: dateResult } = await supabase.rpc('get_business_date')
    if (dateResult.data) {
      targetDate = dateResult.data
    }
  }

  // Get total employees
  const { count: totalEmployees } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')

  // Get attendance for the date
  const { data: attendanceRecords } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('attendance_date', targetDate)

  const presentToday = attendanceRecords?.length || 0
  const timedIn = attendanceRecords?.filter(r => r.time_in && !r.time_out).length || 0
  const timedOut = attendanceRecords?.filter(r => r.time_in && r.time_out).length || 0
  const notTimedIn = (totalEmployees || 0) - presentToday

  const completionPercentage = totalEmployees && totalEmployees > 0
    ? Math.round((presentToday / totalEmployees) * 100)
    : 0

  return {
    total_employees: totalEmployees || 0,
    present_today: presentToday,
    not_timed_in: notTimedIn,
    timed_in: timedIn,
    timed_out: timedOut,
    completion_percentage: completionPercentage
  }
}

/**
 * SUPER_ADMIN: Update workplace settings
 */
export async function updateWorkplaceSettings(
  id: string,
  workplace_name: string,
  latitude: number,
  longitude: number,
  allowed_radius_meters: number,
  is_active: boolean
): Promise<AttendanceSettings> {
  await requireSuperAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_settings')
    .update({
      workplace_name,
      latitude,
      longitude,
      allowed_radius_meters,
      is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * SUPER_ADMIN: Create workplace settings
 */
export async function createWorkplaceSettings(
  workplace_name: string,
  latitude: number,
  longitude: number,
  allowed_radius_meters: number,
  is_active: boolean
): Promise<AttendanceSettings> {
  await requireSuperAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_settings')
    .insert({
      workplace_name,
      latitude,
      longitude,
      allowed_radius_meters,
      is_active
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * SUPER_ADMIN: Get all workplace settings
 */
export async function getAllWorkplaceSettings(): Promise<AttendanceSettings[]> {
  await requireSuperAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}
