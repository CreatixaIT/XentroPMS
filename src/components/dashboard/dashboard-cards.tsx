'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Clock, 
  CheckSquare, 
  FolderKanban, 
  Package, 
  DollarSign, 
  Bell
} from 'lucide-react'
import type { DashboardSummary, AttendanceSummary, TaskSummary, ProjectSummary, InventorySummary, NotificationSummary } from '@/lib/dashboard/types'

interface DashboardCardsProps {
  summary: DashboardSummary
}

export function DashboardCards({ summary }: DashboardCardsProps) {
  const [todayHours, setTodayHours] = useState<{
    business_date: string
    total_completed_hours: string
    current_session_hours: string | null
    has_open_session: boolean
  } | null>(null)

  useEffect(() => {
    async function fetchTodayHours() {
      try {
        const response = await fetch('/api/attendance/today-hours')
        if (response.ok) {
          const data = await response.json()
          setTodayHours(data)
        }
      } catch (error) {
        console.error('Error fetching today hours:', error)
      }
    }
    fetchTodayHours()
    
    // Refresh every 30 seconds to update live session duration
    const interval = setInterval(fetchTodayHours, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Today's Working Hours Card */}
      <TodayWorkingHoursCard todayHours={todayHours} />
      
      {/* Attendance Card */}
      <AttendanceCard summary={summary.attendance} />
      
      {/* Work To Do Card */}
      <TaskCard summary={summary.tasks} />
      
      {/* Work Finished Card */}
      <CompletedTaskCard summary={summary.tasks} />
      
      {/* Ongoing Projects Card */}
      <ActiveProjectsCard summary={summary.projects} />
      
      {/* Completed Projects Card */}
      <CompletedProjectsCard summary={summary.projects} />
      
      {/* Inventory Card */}
      <InventoryCard summary={summary.inventory} />
      
      {/* Daily Budget Card */}
      <BudgetCard />
      
      {/* Notifications Card */}
      <NotificationCard summary={summary.notifications} />
    </div>
  )
}

function TodayWorkingHoursCard({ todayHours }: { todayHours: {
    business_date: string
    total_completed_hours: string
    current_session_hours: string | null
    total_with_current_hours?: string
    has_open_session: boolean
  } | null }) {
  return (
    <Link href="/attendance">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Working Hours</CardTitle>
          <Clock className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          {todayHours ? (
            <>
              <div className="text-xs text-slate-500 mb-1">
                {todayHours.business_date}
              </div>
              <div className="text-2xl font-bold mb-2">
                {todayHours.total_with_current_hours || todayHours.total_completed_hours}
              </div>
              {todayHours.current_session_hours && (
                <p className="text-xs text-blue-600">
                  Current session: {todayHours.current_session_hours} (live)
                </p>
              )}
              {!todayHours.current_session_hours && todayHours.total_completed_hours === '0h 0m' && (
                <p className="text-xs text-slate-500">
                  No working time recorded yet
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-2xl font-bold mb-2">Loading...</div>
              <p className="text-xs text-slate-500">Fetching working hours</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function AttendanceCard({ summary }: { summary: AttendanceSummary }) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return 'text-green-600'
      case 'absent': return 'text-red-600'
      case 'not_recorded': return 'text-slate-500'
      default: return 'text-slate-500'
    }
  }

  const getStatusText = (status: string | null, timeIn: string | null, timeOut: string | null) => {
    if (timeIn && timeOut) {
      return 'Complete'
    }
    if (timeIn && !timeOut) {
      return 'Timed In'
    }
    switch (status) {
      case 'present': return 'Present'
      case 'absent': return 'Absent'
      case 'not_recorded': return 'Not recorded'
      default: return 'Unknown'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
    return date.toLocaleTimeString('en-US', options)
  }

  return (
    <Link href="/attendance">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance</CardTitle>
          <Clock className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            <span className={getStatusColor(summary.status)}>
              {getStatusText(summary.status, summary.time_in, summary.time_out)}
            </span>
          </div>
          {summary.time_in && summary.time_out && (
            <p className="text-xs text-slate-500">
              {formatTime(summary.time_in)} → {formatTime(summary.time_out!)}
            </p>
          )}
          {summary.time_in && !summary.time_out && (
            <p className="text-xs text-slate-500">
              In: {formatTime(summary.time_in)}
            </p>
          )}
          {!summary.time_in && !summary.time_out && (
            <p className="text-xs text-slate-500">
              No attendance recorded today
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function TaskCard({ summary }: { summary: TaskSummary }) {
  return (
    <Link href="/tasks">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Work To Do</CardTitle>
          <CheckSquare className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.pending_count}</div>
          <p className="text-xs text-slate-500">Pending tasks</p>
          {summary.upcoming_tasks.length > 0 && (
            <div className="mt-3 space-y-1">
              {summary.upcoming_tasks.slice(0, 2).map((task) => (
                <p key={task.id} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {task.title}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function CompletedTaskCard({ summary }: { summary: TaskSummary }) {
  return (
    <Link href="/tasks">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Work Finished</CardTitle>
          <CheckSquare className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.completed_count}</div>
          <p className="text-xs text-slate-500">Completed tasks</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ActiveProjectsCard({ summary }: { summary: ProjectSummary }) {
  return (
    <Link href="/projects">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ongoing Projects</CardTitle>
          <FolderKanban className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.active_count}</div>
          <p className="text-xs text-slate-500">Active projects</p>
          {summary.active_projects.length > 0 && (
            <div className="mt-3 space-y-1">
              {summary.active_projects.slice(0, 2).map((project) => (
                <p key={project.id} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {project.name}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function CompletedProjectsCard({ summary }: { summary: ProjectSummary }) {
  return (
    <Link href="/projects">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
          <FolderKanban className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.completed_count}</div>
          <p className="text-xs text-slate-500">Completed projects</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function InventoryCard({ summary }: { summary: InventorySummary }) {
  return (
    <Link href="/inventory">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory</CardTitle>
          <Package className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_items}</div>
          <p className="text-xs text-slate-500">Total items</p>
          {summary.low_stock_count > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {summary.low_stock_count} low stock items
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function BudgetCard() {
  return (
    <Link href="/budget">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">৳0</div>
          <p className="text-xs text-slate-500">Today&apos;s expenses</p>
          <p className="text-xs text-slate-400 mt-1">No expense data yet</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function NotificationCard({ summary }: { summary: NotificationSummary }) {
  return (
    <Link href="/notifications">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notifications</CardTitle>
          <Bell className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.unread_count}</div>
          <p className="text-xs text-slate-500">Unread notifications</p>
          {summary.latest_notifications.length > 0 && (
            <div className="mt-3 space-y-1">
              {summary.latest_notifications.slice(0, 2).map((notification) => (
                <p key={notification.id} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {notification.title}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
