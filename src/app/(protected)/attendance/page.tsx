'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AttendanceRecord, AttendanceStatus } from '@/lib/attendance/types'

export default function AttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ full_name: string; designation: string } | null>(null)
  const [status, setStatus] = useState<AttendanceStatus>('not_recorded')
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{
    type: 'in' | 'out'
    time: string
    date: string
    locationVerified: boolean
  } | null>(null)
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [currentDhakaTime, setCurrentDhakaTime] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<{
    has_open_session: boolean
    latest_time_in: string | null
    latest_session_id: string | null
    total_working_time: string | null
  } | null>(null)
  const [sessions, setSessions] = useState<{
    id: string
    time_in: string
    time_out: string | null
    duration: string | null
  }[]>([])

  // Update Bangladesh time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }
      setCurrentDhakaTime(now.toLocaleTimeString('en-US', options))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAttendance = useCallback(async () => {
    try {
      setError(null)
      
      // Fetch user data from API
      const userResponse = await fetch('/api/user')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser({
          full_name: userData.user.full_name,
          designation: userData.user.designation
        })
      }

      // Load session-based status
      const statusResponse = await fetch('/api/attendance/status')
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        console.log('Attendance status data:', statusData)
        setSessionStatus(statusData.status)
        setSessions(statusData.sessions || [])
        
        // Set attendance status based on session data
        if (statusData.status?.has_open_session) {
          setStatus('timed_in')
        } else if (statusData.status?.total_working_time > 0) {
          setStatus('complete')
        } else {
          setStatus('not_recorded')
        }
      } else {
        const errorData = await statusResponse.json()
        console.error('Status API error:', errorData)
        setError(`Failed to load attendance status: ${errorData.error || 'Unknown error'}`)
      }

      // Also load attendance record for display (optional, not used in current UI)
      await fetch('/api/attendance/today')
    } catch (error) {
      console.error('Error loading attendance:', error)
      setError(error instanceof Error ? error.message : 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/attendance/history?limit=10')
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }, [])

  // Load user data and attendance
  useEffect(() => {
    ;(async () => {
      await loadAttendance()
      await loadHistory()
    })()
  }, [loadAttendance, loadHistory])

  // Load admin status and users
  useEffect(() => {
    async function loadAdminStatus() {
      try {
        const adminResponse = await fetch('/api/auth/check-admin')
        const adminData = await adminResponse.json()
        setIsAdmin(adminData.is_admin)
      } catch (error) {
        console.error('Error loading admin status:', error)
      }
    }
    
    loadAdminStatus()
  }, [])

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied. Please enable location services in your browser settings.'))
              break
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable. Please check your device settings.'))
              break
            case error.TIMEOUT:
              reject(new Error('Location request timed out. Please try again.'))
              break
            default:
              reject(new Error('An unknown error occurred while getting your location.'))
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  const handleTimeIn = async () => {
    setError(null)
    setLocationError(null)
    setRecording(true)

    try {
      const position = await getLocation()
      
      const response = await fetch('/api/attendance/time-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Failed to record time in'
        if (errorMsg.includes('location') || errorMsg.includes('radius') || errorMsg.includes('Location')) {
          setLocationError(errorMsg)
        } else {
          setError(errorMsg)
        }
        return
      }

      // Show confirmation
      const now = new Date()
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }

      setConfirmationData({
        type: 'in',
        time: now.toLocaleTimeString('en-US', timeOptions),
        date: now.toLocaleDateString('en-US', dateOptions),
        locationVerified: data.attendance.time_in_location_verified
      })
      setShowConfirmation(true)

      // Reload attendance
      await loadAttendance()
      await loadHistory()
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Failed to get location')
    } finally {
      setRecording(false)
    }
  }

  const handleTimeOut = async () => {
    setError(null)
    setLocationError(null)
    setRecording(true)

    try {
      const position = await getLocation()
      
      const response = await fetch('/api/attendance/time-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Failed to record time out'
        if (errorMsg.includes('location') || errorMsg.includes('radius') || errorMsg.includes('Location')) {
          setLocationError(errorMsg)
        } else {
          setError(errorMsg)
        }
        return
      }

      // Show confirmation
      const now = new Date()
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }

      setConfirmationData({
        type: 'out',
        time: now.toLocaleTimeString('en-US', timeOptions),
        date: now.toLocaleDateString('en-US', dateOptions),
        locationVerified: data.attendance.time_out_location_verified
      })
      setShowConfirmation(true)

      // Reload attendance
      await loadAttendance()
      await loadHistory()
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Failed to get location')
    } finally {
      setRecording(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
    return date.toLocaleDateString('en-US', options)
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

  const formatDuration = (duration: string | number | null) => {
    if (!duration) return '0h 0m'
    
    // If duration is an interval string like "03:30:00"
    if (typeof duration === 'string') {
      const parts = duration.split(':')
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        return `${hours}h ${minutes}m`
      }
    }
    
    // If duration is in seconds
    if (typeof duration === 'number') {
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
    
    return '0h 0m'
  }

  const calculateTotalWorkingTime = () => {
    if (!sessions || sessions.length === 0) return '0h 0m'
    
    let totalSeconds = 0
    sessions.forEach(s => {
      if (s.duration) {
        if (typeof s.duration === 'string') {
          const parts = s.duration.split(':')
          if (parts.length >= 2) {
            totalSeconds += parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60
          }
        } else if (typeof s.duration === 'number') {
          totalSeconds += s.duration
        }
      }
    })
    
    return formatDuration(totalSeconds)
  }

  const formatSessionDuration = (session: { time_out: string | null; time_in: string }) => {
    if (!session.time_out) return null // Don't show duration for open sessions
    
    const timeIn = new Date(session.time_in)
    const timeOut = new Date(session.time_out)
    const diffMs = timeOut.getTime() - timeIn.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    
    return formatDuration(diffSeconds)
  }

  const getTodayInfo = () => {
    const now = new Date()
    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    return {
      date: now.toLocaleDateString('en-US', dateOptions),
      day: now.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'long' })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Loading attendance...</div>
      </div>
    )
  }

  const todayInfo = getTodayInfo()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {user?.full_name} • {user?.designation}
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => router.push('/attendance/employees')}
          >
            <Users className="h-4 w-4 mr-2" />
            View Employees
          </Button>
        )}
      </div>

      {/* Location explanation */}
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Your location is required to verify that you are at the workplace when recording attendance.
        </AlertDescription>
      </Alert>

      {/* Current time and date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {todayInfo.date}
            </div>
            <div className="text-slate-500">{todayInfo.day}</div>
            <div className="text-3xl font-bold text-blue-600">
              {currentDhakaTime}
            </div>
            <div className="text-xs text-slate-400">Bangladesh Time</div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {locationError && (
            <Alert variant="destructive">
              <MapPin className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          )}

          {status === 'not_recorded' && (
            <div className="text-center space-y-4">
              <div className="text-slate-500">Not Working</div>
              <Button
                onClick={handleTimeIn}
                disabled={recording}
                size="lg"
                className="w-full"
              >
                {recording ? 'Recording...' : 'Time In'}
              </Button>
            </div>
          )}

          {status === 'timed_in' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Currently Working</span>
              </div>
              
              {sessionStatus?.latest_time_in && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Started:</span>
                    <span>{formatTime(sessionStatus.latest_time_in)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleTimeIn}
                disabled={true}
                size="lg"
                className="w-full"
                variant="outline"
              >
                Time In
              </Button>
              
              <Button
                onClick={handleTimeOut}
                disabled={recording}
                size="lg"
                className="w-full"
              >
                {recording ? 'Recording...' : 'Time Out'}
              </Button>
            </div>
          )}

          {status === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Not Working</span>
              </div>

              <Button
                onClick={handleTimeIn}
                disabled={recording}
                size="lg"
                className="w-full"
              >
                {recording ? 'Recording...' : 'Time In'}
              </Button>
              
              <Button
                disabled={true}
                size="lg"
                className="w-full"
                variant="outline"
              >
                Time Out
              </Button>
            </div>
          )}

          {status === 'outside_radius' && (
            <Alert variant="destructive">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                You are outside the workplace location. Please move to the workplace area to record attendance.
              </AlertDescription>
            </Alert>
          )}

          {/* Today's sessions */}
          {sessions && sessions.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="font-medium text-sm">Today&apos;s Sessions</div>
              {sessions.map((session) => (
                <div key={session.id} className="flex justify-between text-sm">
                  <span>
                    {formatTime(session.time_in)}
                    {session.time_out ? ` — ${formatTime(session.time_out)}` : ' — Currently Working'}
                  </span>
                  {formatSessionDuration(session) && (
                    <span className="text-slate-500">
                      {formatSessionDuration(session)}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Today&apos;s Total:</span>
                <span>{formatDuration(calculateTotalWorkingTime())}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No attendance history yet
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{formatDate(record.attendance_date)}</div>
                    <div className="text-sm text-slate-500">
                      {record.time_in ? `In: ${formatTime(record.time_in)}` : 'Not timed in'}
                      {record.time_out && ` • Out: ${formatTime(record.time_out)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {record.time_in_location_verified && record.time_out_location_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-center">
                {confirmationData.type === 'in' ? 'Time In Recorded' : 'Time Out Recorded'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-lg font-medium">{confirmationData.date}</div>
                <div className="text-2xl font-bold text-blue-600">{confirmationData.time}</div>
                <div className={`flex items-center justify-center gap-2 ${
                  confirmationData.locationVerified ? 'text-green-600' : 'text-red-600'
                }`}>
                  {confirmationData.locationVerified ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span>{confirmationData.locationVerified ? 'Workplace location verified' : 'Location not verified'}</span>
                </div>
              </div>
              <Button
                onClick={() => setShowConfirmation(false)}
                className="w-full"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
