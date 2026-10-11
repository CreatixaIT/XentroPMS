'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Package, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  designation?: string
}

interface AttendanceRecord {
  id: string
  attendance_date: string
  time_in: string | null
  time_out: string | null
  time_in_location_verified: boolean
  time_out_location_verified: boolean
  status: string
  attendance_sessions?: Array<{
    id: string
    time_in: string
    time_out: string | null
    duration_seconds: number | null
  }>
  total_working_hours?: string
  total_working_seconds?: number
  has_incomplete_session?: boolean
}

interface AttendanceSession {
  id: string
  time_in: string
  time_out: string | null
  duration_seconds: number | null
}

interface AttendanceReportData {
  success: boolean
  report_type: string
  start_date: string | null
  end_date: string | null
  data: AttendanceRecord[]
  summary: {
    total_records: number
    total_working_hours: string
    total_working_seconds: number
    records_with_incomplete_sessions: number
  }
}

interface Project {
  id: string
  name: string
  status: string
  project_code: string | null
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  completed_at: string | null
  project: {
    id: string
    name: string
  }
}

export default function EmployeeAttendancePage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Reporting filters
  const [reportType, setReportType] = useState<'history' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('history')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch('/api/auth/check-admin')
        const data = await response.json()
        if (!data.is_admin) {
          setError('Access denied: SUPER_ADMIN access required')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setError('Failed to verify access permissions')
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users.filter((u: User) => u.status === 'ACTIVE'))
        } else if (response.status === 403) {
          // User is not SUPER_ADMIN
          console.error('Unauthorized: SUPER_ADMIN access required')
        }
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }
    
    loadUsers()
  }, [])

  useEffect(() => {
    if (!selectedUserId) return

    async function loadEmployeeData() {
      setLoading(true)
      setError(null)
      try {
        const user = users.find(u => u.id === selectedUserId)
        setSelectedUser(user || null)

        // Load attendance with reporting
        const params = new URLSearchParams()
        params.append('report_type', reportType)
        if (startDate) params.append('start_date', startDate)
        if (endDate) params.append('end_date', endDate)
        
        const attendanceResponse = await fetch(`/api/attendance/user/${selectedUserId}?${params}`)
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json()
          
          if (attendanceData.report_type === 'history') {
            setAttendance(attendanceData.history || [])
            setReportData(null)
          } else {
            setAttendance(attendanceData.data || [])
            setReportData(attendanceData)
          }
        } else {
          const errorData = await attendanceResponse.json()
          setError(`Failed to load attendance: ${errorData.error || 'Unknown error'}`)
        }

        // Load projects
        const projectsResponse = await fetch(`/api/projects/user/${selectedUserId}`)
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          setProjects(projectsData.projects || [])
        } else {
          console.error('Failed to load projects')
        }

        // Load tasks
        const tasksResponse = await fetch(`/api/tasks/user/${selectedUserId}`)
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json()
          setTasks(tasksData.tasks || [])
        } else {
          console.error('Failed to load tasks')
        }
      } catch (error) {
        console.error('Error loading employee data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load employee data')
      } finally {
        setLoading(false)
      }
    }
    
    loadEmployeeData()
  }, [selectedUserId, users, reportType, startDate, endDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTaskStatusBadge = (status: string) => {
    const styles = {
      TODO: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      BLOCKED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-green-100 text-green-800'
    }
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800'
    }
    return (
      <Badge className={styles[priority as keyof typeof styles]}>
        {priority}
      </Badge>
    )
  }

  const isTaskOverdue = (task: Task) => {
    if (task.status === 'COMPLETED') return false
    if (!task.due_date) return false
    return new Date(task.due_date) < new Date()
  }

  const isTaskCompletedLate = (task: Task) => {
    if (task.status !== 'COMPLETED') return false
    if (!task.due_date || !task.completed_at) return false
    return new Date(task.completed_at) > new Date(task.due_date)
  }

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED')
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED')
  const overdueTasks = tasks.filter(t => isTaskOverdue(t))
  const completedLateTasks = tasks.filter(t => isTaskCompletedLate(t))

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 font-medium mb-2">Access Denied</div>
          <div className="text-slate-500">{error}</div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Employee Attendance & Details</h1>
          <p className="text-muted-foreground">View employee attendance, projects, and tasks</p>
        </div>
      </div>

      {/* Employee Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an employee" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} ({user.email}) - {user.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Employee Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Full Name</div>
                  <div className="font-medium">{selectedUser.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{selectedUser.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Role</div>
                  <Badge>{selectedUser.role}</Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={selectedUser.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {selectedUser.status}
                  </Badge>
                </div>
                {selectedUser.designation && (
                  <div>
                    <div className="text-sm text-muted-foreground">Designation</div>
                    <div className="font-medium">{selectedUser.designation}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Reporting Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Reporting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={(value: 'history' | 'daily' | 'weekly' | 'monthly' | 'yearly' | null) => setReportType(value || 'history')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="history">History (Last 30 days)</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={reportType === 'history'}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={reportType === 'history'}
                  />
                </div>
              </div>
              {reportData && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Period Total</div>
                      <div className="text-xl font-bold">{reportData.summary.total_working_hours}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Records</div>
                      <div className="text-xl font-bold">{reportData.summary.total_records}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Incomplete Sessions</div>
                      <div className="text-xl font-bold text-orange-600">
                        {reportData.summary.records_with_incomplete_sessions}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : attendance.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No attendance records found
                </div>
              ) : (
                <div className="space-y-4">
                  {attendance.map(record => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{formatDate(record.attendance_date)}</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {record.total_working_hours || '0h 0m'}
                          </div>
                        </div>
                        {record.has_incomplete_session && (
                          <Badge variant="destructive">Incomplete</Badge>
                        )}
                      </div>
                      
                      {/* Sessions */}
                      {record.attendance_sessions && record.attendance_sessions.length > 0 && (
                        <div className="space-y-2 ml-4">
                          {record.attendance_sessions.map((session: AttendanceSession) => (
                            <div key={session.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded">
                              <div>
                                <span>{formatTime(session.time_in)}</span>
                                {session.time_out ? (
                                  <span> — {formatTime(session.time_out)}</span>
                                ) : (
                                  <span className="text-blue-600"> — Currently Working</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {session.duration_seconds && (
                                  <span className="text-slate-500">
                                    {Math.floor(session.duration_seconds / 3600)}h {Math.floor((session.duration_seconds % 3600) / 60)}m
                                  </span>
                                )}
                                {!session.time_out && (
                                  <Badge variant="outline" className="text-xs">Open</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Projects ({projects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No projects assigned
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map(project => (
                    <div key={project.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.project_code && (
                          <div className="text-sm text-muted-foreground">{project.project_code}</div>
                        )}
                      </div>
                      <Badge>{project.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tasks ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overdue Tasks */}
                {overdueTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-600 mb-2">Overdue ({overdueTasks.length})</h3>
                    <div className="space-y-2">
                      {overdueTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between border-l-4 border-red-500 pl-3 py-1">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.project.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTaskStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Late Tasks */}
                {completedLateTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-orange-600 mb-2">Completed Late ({completedLateTasks.length})</h3>
                    <div className="space-y-2">
                      {completedLateTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between border-l-4 border-orange-500 pl-3 py-1">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.project.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTaskStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Tasks */}
                {pendingTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-blue-600 mb-2">In Progress / Pending ({pendingTasks.length})</h3>
                    <div className="space-y-2">
                      {pendingTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between border-l-4 border-blue-500 pl-3 py-1">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.project.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTaskStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-green-600 mb-2">Completed ({completedTasks.length})</h3>
                    <div className="space-y-2">
                      {completedTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between border-l-4 border-green-500 pl-3 py-1">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.project.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTaskStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tasks.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No tasks assigned
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
