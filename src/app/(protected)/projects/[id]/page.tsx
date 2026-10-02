'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Package, CheckCircle, Clock, ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

interface Project {
  id: string
  name: string
  description: string | null
  project_code: string | null
  client_name: string | null
  location: string | null
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
}

interface Member {
  id: string
  role: string
  user_id: string
  profiles: {
    id: string
    email: string
    full_name: string
    designation: string
  }
}

interface Component {
  id: string
  name: string
  description: string | null
  quantity: number | null
  unit: string | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  due_date: string | null
  completed_at: string | null
  profiles: {
    id: string
    full_name: string
    email: string
  } | null
}

interface Activity {
  id: string
  activity_type: string
  description: string
  created_at: string
  profiles: {
    id: string
    full_name: string
    email: string
  } | null
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  status: string
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [showWorkUpdateDialog, setShowWorkUpdateDialog] = useState(false)
  const [workUpdate, setWorkUpdate] = useState({
    completed: '',
    working_on: '',
    remains: '',
    blockers: '',
    progress: 0
  })
  const [submittingUpdate, setSubmittingUpdate] = useState(false)

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setProjectId(resolvedParams.id)
    }
    init()
  }, [params])

  useEffect(() => {
    async function loadAdminAndUsers() {
      try {
        const adminResponse = await fetch('/api/auth/check-admin')
        const adminData = await adminResponse.json()
        setIsAdmin(adminData.is_admin)
        
        if (adminData.is_admin) {
          const usersResponse = await fetch('/api/users')
          if (usersResponse.ok) {
            const usersData = await usersResponse.json()
            const existingMemberIds = members.map(m => m.user_id)
            setAvailableUsers(usersData.users.filter((u: User) => 
              u.status === 'ACTIVE' && !existingMemberIds.includes(u.id)
            ))
          }
        }
      } catch (error) {
        console.error('Error loading admin status:', error)
      }
    }
    
    loadAdminAndUsers()
  }, [members])

  const loadProject = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        setMembers(data.members)
        setComponents(data.components)
        setTasks(data.tasks)
        setActivity(data.activity)
        setProgress(data.progress || 0)
      }
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProject()
  }, [loadProject])

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        loadProject()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: 'MEMBER' })
      })

      if (response.ok) {
        loadProject()
        setShowAddMemberDialog(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadProject()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const handleSubmitWorkUpdate = async () => {
    setSubmittingUpdate(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Daily Work Update',
          description: `Completed: ${workUpdate.completed}\nWorking on: ${workUpdate.working_on}\nRemains: ${workUpdate.remains}\nBlockers: ${workUpdate.blockers}`,
          priority: 'MEDIUM',
          project_id: projectId
        })
      })

      if (response.ok) {
        loadProject()
        setShowWorkUpdateDialog(false)
        setWorkUpdate({
          completed: '',
          working_on: '',
          remains: '',
          blockers: '',
          progress: 0
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit work update')
      }
    } catch (error) {
      console.error('Error submitting work update:', error)
      alert('Failed to submit work update')
    } finally {
      setSubmittingUpdate(false)
    }
  }

  const getStatusBadge = (status: ProjectStatus) => {
    const styles = {
      PLANNING: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={styles[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Project not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.project_code || 'No code'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <Button onClick={() => setShowWorkUpdateDialog(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Update Work
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setShowAddMemberDialog(true)}>
              <Users className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
          <Select
            value={project.status}
            onValueChange={(value) => handleStatusChange(value as ProjectStatus)}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLANNING">Planning</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{components.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div>{project.description || 'No description'}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Client</div>
                <div>{project.client_name || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Location</div>
                <div>{project.location || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                <div>{project.start_date || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Target End Date</div>
                <div>{project.target_end_date || 'Not set'}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div>{getStatusBadge(project.status)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No activity yet
              </div>
            ) : (
              <div className="space-y-4">
                {activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-4 border-b pb-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.profiles?.full_name || 'System'}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Project Members ({members.length})</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowAddMemberDialog(true)}>
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No members added yet
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="font-medium">{member.profiles.full_name}</div>
                    <div className="text-sm text-muted-foreground">{member.profiles.designation}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{member.role.replace('_', ' ')}</Badge>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      {showAddMemberDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add Project Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available users</p>
                ) : (
                  availableUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleAddMember(user.id)}
                    >
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.email} • {user.role}
                        </div>
                      </div>
                      <Button size="sm">Add</Button>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowAddMemberDialog(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work Update Dialog */}
      {showWorkUpdateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Today&apos;s Work Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>What I completed</Label>
                  <Textarea
                    rows={3}
                    value={workUpdate.completed}
                    onChange={(e) => setWorkUpdate({ ...workUpdate, completed: e.target.value })}
                    placeholder="Describe what you completed today..."
                  />
                </div>
                <div>
                  <Label>What I am currently working on</Label>
                  <Textarea
                    rows={3}
                    value={workUpdate.working_on}
                    onChange={(e) => setWorkUpdate({ ...workUpdate, working_on: e.target.value })}
                    placeholder="Describe what you are working on..."
                  />
                </div>
                <div>
                  <Label>What remains</Label>
                  <Textarea
                    rows={3}
                    value={workUpdate.remains}
                    onChange={(e) => setWorkUpdate({ ...workUpdate, remains: e.target.value })}
                    placeholder="Describe what work remains..."
                  />
                </div>
                <div>
                  <Label>Problems / Blockers</Label>
                  <Textarea
                    rows={3}
                    value={workUpdate.blockers}
                    onChange={(e) => setWorkUpdate({ ...workUpdate, blockers: e.target.value })}
                    placeholder="Any blockers or issues..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitWorkUpdate}
                    disabled={submittingUpdate}
                    className="flex-1"
                  >
                    {submittingUpdate ? 'Submitting...' : 'Submit Update'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowWorkUpdateDialog(false)
                      setWorkUpdate({
                        completed: '',
                        working_on: '',
                        remains: '',
                        blockers: '',
                        progress: 0
                      })
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle>Project Components ({components.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {components.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No components added yet
            </div>
          ) : (
            <div className="space-y-4">
              {components.map((component) => (
                <div key={component.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="font-medium">{component.name}</div>
                    {component.description && (
                      <div className="text-sm text-muted-foreground">{component.description}</div>
                    )}
                  </div>
                  <div className="text-sm">
                    {component.quantity !== null && (
                      <span>{component.quantity} {component.unit || ''}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Project Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No tasks created yet
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between border-b pb-4 cursor-pointer hover:bg-muted/50 p-2 rounded"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getTaskStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                      {task.due_date && (
                        <span className="text-sm text-muted-foreground">
                          Due: {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.profiles && (
                    <div className="text-sm text-muted-foreground">
                      {task.profiles.full_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
