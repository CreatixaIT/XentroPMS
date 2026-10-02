export interface DashboardSummary {
  attendance: AttendanceSummary
  tasks: TaskSummary
  projects: ProjectSummary
  inventory: InventorySummary
  notifications: NotificationSummary
}

export interface AttendanceSummary {
  status: 'present' | 'absent' | 'not_recorded' | null
  time_in: string | null
  time_out: string | null
  date: string
}

export interface TaskSummary {
  pending_count: number
  completed_count: number
  upcoming_tasks: Array<{
    id: string
    title: string
    due_date: string | null
    priority: string
    status: string
    projects: Array<{
      id: string
      name: string
    }>
  }>
}

export interface ProjectSummary {
  active_count: number
  completed_count: number
  active_projects: Array<{
    id: string
    name: string
    status: string
    start_date: string | null
    target_end_date: string | null
  }>
}

export interface InventorySummary {
  total_items: number
  low_stock_count: number
  available_count: number
}

export interface NotificationSummary {
  unread_count: number
  latest_notifications: Array<{
    id: string
    title: string
    message: string
    type: string
    created_at: string
    read_at: string | null
  }>
}
