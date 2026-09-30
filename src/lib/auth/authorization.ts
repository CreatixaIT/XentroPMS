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
    .select('id, email, role, status, full_name')
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
    return await requireAuthenticatedUser()
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
