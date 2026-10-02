'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  status: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_code: '',
    client_name: '',
    location: '',
    start_date: '',
    target_end_date: ''
  })

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch('/api/auth/check-admin')
        const data = await response.json()
        setIsAdmin(data.is_admin)
        
        if (!data.is_admin) {
          // Redirect non-admin users
          router.push('/projects')
          return
        }
        
        if (data.is_admin) {
          const usersResponse = await fetch('/api/users')
          if (usersResponse.ok) {
            const usersData = await usersResponse.json()
            setUsers(usersData.users.filter((u: User) => u.status === 'ACTIVE'))
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        router.push('/projects')
      }
    }
    
    checkAdmin()
  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        member_ids: selectedMembers.length > 0 ? selectedMembers : undefined
      }
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/projects/${data.project.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Project</h1>
        <p className="text-muted-foreground">Create a new project</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="project_code">Project Code</Label>
              <Input
                id="project_code"
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="target_end_date">Target End Date</Label>
                <Input
                  id="target_end_date"
                  type="date"
                  value={formData.target_end_date}
                  onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
                />
              </div>
            </div>

            {isAdmin && (
              <div>
                <Label>Project Members</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users available</p>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={selectedMembers.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                          className="rounded"
                        />
                        <label
                          htmlFor={`user-${user.id}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.email} • {user.role}
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedMembers.length} member(s) selected
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
