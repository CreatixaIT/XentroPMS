'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    designation: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFormData({
          full_name: data.full_name,
          designation: data.designation,
          phone: data.phone,
          address: data.address,
        })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formDataObj = new FormData(e.currentTarget)
    const result = await updateProfile(formDataObj)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.success) {
      setSuccess(result.message)
      // Refresh the page to reload profile
      window.location.reload()
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>View and edit your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  name="designation"
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>NID</Label>
                <Input value={profile.nid} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-500">NID cannot be changed</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={profile.role} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input value={profile.status} disabled className="bg-slate-50" />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
