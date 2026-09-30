export type UserRole = 'SUPER_ADMIN' | 'TEAM_LEADER' | 'EMPLOYEE'
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED' | 'BLOCKED'

export interface Profile {
  id: string
  email: string
  full_name: string
  designation: string
  phone: string
  nid: string
  address: string
  role: UserRole
  status: AccountStatus
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface InsertProfile {
  id: string
  email: string
  full_name: string
  designation: string
  phone: string
  nid: string
  address: string
  role?: UserRole
  status?: AccountStatus
}

export interface UpdateProfile {
  full_name?: string
  designation?: string
  phone?: string
  address?: string
  role?: UserRole
  status?: AccountStatus
}
