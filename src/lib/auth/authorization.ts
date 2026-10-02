import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'SUPER_ADMIN' | 'TEAM_LEADER' | 'EMPLOYEE'
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED' | 'BLOCKED'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  status: AccountStatus
  full_name: string
  designation: string
}

/**
 * Get the current authenticated user with profile data
 * Throws an error if not authenticated
 */
export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }
  
  // Get profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, status, full_name, designation')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    // Profile should exist if user exists, but handle gracefully
    redirect('/login')
  }
  
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserRole,
    status: profile.status as AccountStatus,
    full_name: profile.full_name,
    designation: profile.designation,
  }
}

/**
 * Check if user has a specific role
 * Returns false if not authenticated or doesn't have the role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    return user.role === role
  } catch {
    return false
  }
}

/**
 * Require user to have a specific role
 * Redirects to login or unauthorized page if not
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (user.role !== role) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    return roles.includes(user.role)
  } catch {
    return false
  }
}

/**
 * Require user to have any of the specified roles
 */
export async function requireAnyRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (!roles.includes(user.role)) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user is SUPER_ADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
  return hasRole('SUPER_ADMIN')
}

/**
 * Require user to be SUPER_ADMIN
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  return requireRole('SUPER_ADMIN')
}

/**
 * Check if user account is active
 */
export function isAccountActive(status: AccountStatus): boolean {
  return status === 'ACTIVE'
}

/**
 * Require user account to be active
 */
export async function requireActiveAccount(): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (!isAccountActive(user.status)) {
    if (user.status === 'PENDING_VERIFICATION') {
      redirect('/verify-email')
    } else if (user.status === 'DISABLED') {
      redirect('/account-disabled')
    } else if (user.status === 'BLOCKED') {
      redirect('/account-blocked')
    }
  }
  
  return user
}

/**
 * Check if user can access admin functionality
 */
export async function canAccessAdmin(): Promise<boolean> {
  return isSuperAdmin()
}

/**
 * Require admin access
 */
export async function requireAdminAccess(): Promise<AuthUser> {
  return requireSuperAdmin()
}

/**
 * Get user without authentication requirement
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }
    
    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, status, full_name, designation')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return null
    }
    
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      status: profile.status as AccountStatus,
      full_name: profile.full_name,
      designation: profile.designation,
    }
  } catch {
    return null
  }
}

/**
 * Check if a user can update a specific profile
 * Users can update their own profile (with restrictions)
 * SUPER_ADMIN can update any profile
 */
export async function canUpdateProfile(targetUserId: string): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    
    // SUPER_ADMIN can update any profile
    if (user.role === 'SUPER_ADMIN') {
      return true
    }
    
    // Users can update their own profile
    return user.id === targetUserId
  } catch {
    return false
  }
}

/**
 * Require permission to update a profile
 */
export async function requireProfileUpdatePermission(targetUserId: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (user.role === 'SUPER_ADMIN') {
    return user
  }
  
  if (user.id !== targetUserId) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user can access a project
 * SUPER_ADMIN can access all projects
 * Project creator can access their projects
 * Project members can access projects they are members of
 */
export async function canAccessProject(projectId: string): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    const supabase = await createClient()
    
    // SUPER_ADMIN can access all projects
    if (user.role === 'SUPER_ADMIN') {
      return true
    }
    
    // Check if user is project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single()
    
    if (project && project.created_by === user.id) {
      return true
    }
    
    // Check if user is project member
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()
    
    return !!member
  } catch {
    return false
  }
}

/**
 * Require project access
 */
export async function requireProjectAccess(projectId: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (user.role === 'SUPER_ADMIN') {
    return user
  }
  
  const supabase = await createClient()
  
  // Check if user is project creator
  const { data: project } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single()
  
  if (project && project.created_by === user.id) {
    return user
  }
  
  // Check if user is project member
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  
  if (!member) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user can manage a project (edit, complete, etc.)
 * SUPER_ADMIN can manage all projects
 * Project creator can manage their projects
 */
export async function canManageProject(projectId: string): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    const supabase = await createClient()
    
    // SUPER_ADMIN can manage all projects
    if (user.role === 'SUPER_ADMIN') {
      return true
    }
    
    // Check if user is project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single()
    
    return project?.created_by === user.id
  } catch {
    return false
  }
}

/**
 * Require project management permission
 */
export async function requireProjectManager(projectId: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (user.role === 'SUPER_ADMIN') {
    return user
  }
  
  const supabase = await createClient()
  
  const { data: project } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single()
  
  if (!project || project.created_by !== user.id) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user can access a task
 * SUPER_ADMIN can access all tasks
 * Project creator can access tasks in their projects
 * Task assignee can access their assigned tasks
 * Project members can access tasks in their projects
 */
export async function canAccessTask(taskId: string): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    const supabase = await createClient()
    
    // SUPER_ADMIN can access all tasks
    if (user.role === 'SUPER_ADMIN') {
      return true
    }
    
    // Get task with project info
    const { data: task } = await supabase
      .from('project_tasks')
      .select('project_id, assigned_to')
      .eq('id', taskId)
      .single()
    
    if (!task) {
      return false
    }
    
    // Task assignee can access their task
    if (task.assigned_to === user.id) {
      return true
    }
    
    // Check if user is project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', task.project_id)
      .single()
    
    if (project && project.created_by === user.id) {
      return true
    }
    
    // Check if user is project member
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', task.project_id)
      .eq('user_id', user.id)
      .single()
    
    return !!member
  } catch {
    return false
  }
}

/**
 * Require task access
 */
export async function requireTaskAccess(taskId: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (user.role === 'SUPER_ADMIN') {
    return user
  }
  
  const supabase = await createClient()
  
  const { data: task } = await supabase
    .from('project_tasks')
    .select('project_id, assigned_to')
    .eq('id', taskId)
    .single()
  
  if (!task) {
    redirect('/unauthorized')
  }
  
  // Task assignee can access their task
  if (task.assigned_to === user.id) {
    return user
  }
  
  // Check if user is project creator
  const { data: project } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', task.project_id)
    .single()
  
  if (project && project.created_by === user.id) {
    return user
  }
  
  // Check if user is project member
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', task.project_id)
    .eq('user_id', user.id)
    .single()
  
  if (!member) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user is the task assignee
 */
export async function isTaskAssignee(taskId: string): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    const supabase = await createClient()
    
    const { data: task } = await supabase
      .from('project_tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single()
    
    return task?.assigned_to === user.id
  } catch {
    return false
  }
}

/**
 * Require user to be task assignee
 */
export async function requireTaskAssignee(taskId: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  const supabase = await createClient()
  
  const { data: task } = await supabase
    .from('project_tasks')
    .select('assigned_to')
    .eq('id', taskId)
    .single()
  
  if (!task || task.assigned_to !== user.id) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user can complete a project
 * Only project creator or SUPER_ADMIN can complete a project
 */
export async function canCompleteProject(projectId: string): Promise<boolean> {
  try {
    const user = await requireAuthenticatedUser()
    const supabase = await createClient()
    
    // SUPER_ADMIN can complete any project
    if (user.role === 'SUPER_ADMIN') {
      return true
    }
    
    // Check if user is project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single()
    
    return project?.created_by === user.id
  } catch {
    return false
  }
}

/**
 * Require project completion permission
 */
export async function requireProjectCompletionPermission(projectId: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser()
  
  if (user.role === 'SUPER_ADMIN') {
    return user
  }
  
  const supabase = await createClient()
  
  const { data: project } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single()
  
  if (!project || project.created_by !== user.id) {
    redirect('/unauthorized')
  }
  
  return user
}
