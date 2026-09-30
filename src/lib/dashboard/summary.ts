import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardSummary } from './types'

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get attendance summary (now implemented)
  const attendance = await getAttendanceSummary(supabase, user.id)
  
  // Get task summary (placeholder - tasks not implemented yet)
  const tasks = await getTaskSummary()
  
  // Get project summary (placeholder - projects not implemented yet)
  const projects = await getProjectSummary()
  
  // Get inventory summary (placeholder - inventory not implemented yet)
  const inventory = await getInventorySummary()
  
  // Get notification summary
  const notifications = await getNotificationSummary(supabase, user.id)

  return {
    attendance,
    tasks,
    projects,
    inventory,
    notifications,
  }
}

async function getAttendanceSummary(supabase: SupabaseClient, userId: string) {
  // Get business date in Asia/Dhaka
  const { data: dateResult } = await supabase.rpc('get_business_date')
  
  if (!dateResult.data) {
    return {
      status: 'not_recorded' as const,
      time_in: null,
      time_out: null,
      date: new Date().toISOString().split('T')[0],
    }
  }

  const businessDate = dateResult.data

  // Get today's attendance
  const { data: attendance, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_date', businessDate)
    .single()

  if (error || !attendance) {
    return {
      status: 'not_recorded' as const,
      time_in: null,
      time_out: null,
      date: businessDate,
    }
  }

  // Determine status
  let status: 'present' | 'absent' | 'not_recorded' | null = 'not_recorded'
  if (attendance.time_in && !attendance.time_out) {
    status = 'present'
  } else if (attendance.time_in && attendance.time_out) {
    status = 'present'
  }

  return {
    status,
    time_in: attendance.time_in,
    time_out: attendance.time_out,
    date: attendance.attendance_date,
  }
}

async function getTaskSummary() {
  // Tasks not implemented yet - return placeholder
  return {
    pending_count: 0,
    completed_count: 0,
    upcoming_tasks: [],
  }
}

async function getProjectSummary() {
  // Projects not implemented yet - return placeholder
  return {
    active_count: 0,
    completed_count: 0,
    active_projects: [],
  }
}

async function getInventorySummary() {
  // Inventory not implemented yet - return placeholder
  return {
    total_items: 0,
    low_stock_count: 0,
    available_count: 0,
  }
}

async function getNotificationSummary(supabase: SupabaseClient, userId: string) {
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, created_at, read_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching notifications:', error)
    return {
      unread_count: 0,
      latest_notifications: [],
    }
  }

  const unread_count = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  return {
    unread_count: unread_count.count || 0,
    latest_notifications: notifications || [],
  }
}
