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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      pending_count: 0,
      completed_count: 0,
      upcoming_tasks: [],
    }
  }

  // Get pending tasks (not completed) assigned to user
  const { count: pendingCount } = await supabase
    .from('project_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .not('status', 'eq', 'COMPLETED')

  // Get completed tasks assigned to user
  const { count: completedCount } = await supabase
    .from('project_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .eq('status', 'COMPLETED')

  // Get upcoming tasks (due soon)
  const { data: upcomingTasks } = await supabase
    .from('project_tasks')
    .select(`
      id,
      title,
      due_date,
      priority,
      status,
      projects (
        id,
        name
      )
    `)
    .eq('assigned_to', user.id)
    .not('status', 'eq', 'COMPLETED')
    .order('due_date', { ascending: true })
    .limit(5)

  return {
    pending_count: pendingCount || 0,
    completed_count: completedCount || 0,
    upcoming_tasks: upcomingTasks || [],
  }
}

async function getProjectSummary() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      active_count: 0,
      completed_count: 0,
      active_projects: [],
    }
  }

  // Get projects where user is a member or creator
  const { data: userProjects } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)

  const projectIds = userProjects?.map(p => p.project_id) || []

  // Also include projects created by user
  const { data: createdProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', user.id)

  const createdIds = createdProjects?.map(p => p.id) || []

  // Combine both sets
  const allProjectIds = [...new Set([...projectIds, ...createdIds])]

  if (allProjectIds.length === 0) {
    return {
      active_count: 0,
      completed_count: 0,
      active_projects: [],
    }
  }

  // Get active projects
  const { count: activeCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .in('id', allProjectIds)
    .eq('status', 'ACTIVE')

  // Get completed projects
  const { count: completedCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .in('id', allProjectIds)
    .eq('status', 'COMPLETED')

  // Get active projects with details
  const { data: activeProjects } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      status,
      start_date,
      target_end_date
    `)
    .in('id', allProjectIds)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    active_count: activeCount || 0,
    completed_count: completedCount || 0,
    active_projects: activeProjects || [],
  }
}

async function getInventorySummary() {
  const supabase = await createClient()
  
  // Get total active items
  const { count: totalItems } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Get low stock items
  const { count: lowStockCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('current_quantity', 'reorder_level')
    .gt('current_quantity', 0)

  // Get available items (in stock)
  const { count: availableCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('current_quantity', 'reorder_level')

  return {
    total_items: totalItems || 0,
    low_stock_count: lowStockCount || 0,
    available_count: availableCount || 0,
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
