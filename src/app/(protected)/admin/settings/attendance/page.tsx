'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Save, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AttendanceSettings } from '@/lib/attendance/types'

export default function AdminAttendanceSettingsPage() {
  const [settings, setSettings] = useState<AttendanceSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    workplace_name: '',
    latitude: '',
    longitude: '',
    allowed_radius_meters: '',
    is_active: true
  })

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/attendance/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await loadSettings()
    })()
  }, [loadSettings])

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/attendance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workplace_name: formData.workplace_name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          allowed_radius_meters: parseFloat(formData.allowed_radius_meters),
          is_active: formData.is_active
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create settings')
        return
      }

      setSuccess('Workplace settings created successfully')
      setShowCreateForm(false)
      setFormData({
        workplace_name: '',
        latitude: '',
        longitude: '',
        allowed_radius_meters: '',
        is_active: true
      })
      await loadSettings()
    } catch {
      setError('Failed to create settings')
    }
  }

  const handleUpdate = async (id: string) => {
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/attendance/settings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workplace_name: formData.workplace_name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          allowed_radius_meters: parseFloat(formData.allowed_radius_meters),
          is_active: formData.is_active
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update settings')
        return
      }

      setSuccess('Workplace settings updated successfully')
      setEditingId(null)
      setFormData({
        workplace_name: '',
        latitude: '',
        longitude: '',
        allowed_radius_meters: '',
        is_active: true
      })
      await loadSettings()
    } catch {
      setError('Failed to update settings')
    }
  }

  const startEdit = (setting: AttendanceSettings) => {
    setEditingId(setting.id)
    setFormData({
      workplace_name: setting.workplace_name,
      latitude: setting.latitude.toString(),
      longitude: setting.longitude.toString(),
      allowed_radius_meters: setting.allowed_radius_meters.toString(),
      is_active: setting.is_active
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({
      workplace_name: '',
      latitude: '',
      longitude: '',
      allowed_radius_meters: '',
      is_active: true
    })
  }

  const startCreate = () => {
    setShowCreateForm(true)
    setFormData({
      workplace_name: '',
      latitude: '',
      longitude: '',
      allowed_radius_meters: '100',
      is_active: true
    })
  }

  const cancelCreate = () => {
    setShowCreateForm(false)
    setFormData({
      workplace_name: '',
      latitude: '',
      longitude: '',
      allowed_radius_meters: '',
      is_active: true
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Attendance Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure workplace location and attendance verification</p>
      </div>

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

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Workplace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workplace_name">Workplace Name</Label>
              <Input
                id="workplace_name"
                value={formData.workplace_name}
                onChange={(e) => setFormData({ ...formData, workplace_name: e.target.value })}
                placeholder="Main Office"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="23.8103"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="90.4125"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowed_radius_meters">Allowed Radius (meters)</Label>
              <Input
                id="allowed_radius_meters"
                type="number"
                value={formData.allowed_radius_meters}
                onChange={(e) => setFormData({ ...formData, allowed_radius_meters: e.target.value })}
                placeholder="100"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={cancelCreate} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Workplace Configurations</CardTitle>
            <Button onClick={startCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Workplace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No workplace configurations found</div>
          ) : (
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="border rounded-lg p-4">
                  {editingId === setting.id ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`edit_name_${setting.id}`}>Workplace Name</Label>
                        <Input
                          id={`edit_name_${setting.id}`}
                          value={formData.workplace_name}
                          onChange={(e) => setFormData({ ...formData, workplace_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edit_lat_${setting.id}`}>Latitude</Label>
                          <Input
                            id={`edit_lat_${setting.id}`}
                            type="number"
                            step="any"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit_lon_${setting.id}`}>Longitude</Label>
                          <Input
                            id={`edit_lon_${setting.id}`}
                            type="number"
                            step="any"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit_radius_${setting.id}`}>Allowed Radius (meters)</Label>
                        <Input
                          id={`edit_radius_${setting.id}`}
                          type="number"
                          value={formData.allowed_radius_meters}
                          onChange={(e) => setFormData({ ...formData, allowed_radius_meters: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit_active_${setting.id}`}
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`edit_active_${setting.id}`}>Active</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdate(setting.id)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={cancelEdit} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-slate-500" />
                          <span className="font-medium">{setting.workplace_name}</span>
                          {setting.is_active && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <Button onClick={() => startEdit(setting)} variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                      <div className="text-sm text-slate-500 space-y-1">
                        <div>Latitude: {setting.latitude}</div>
                        <div>Longitude: {setting.longitude}</div>
                        <div>Allowed Radius: {setting.allowed_radius_meters} meters</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Note: Browser geolocation provides approximate location verification and is not an absolute guarantee of physical presence.
          GPS accuracy can vary based on device and environmental conditions.
        </AlertDescription>
      </Alert>
    </div>
  )
}
