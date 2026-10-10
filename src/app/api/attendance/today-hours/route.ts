import { NextResponse } from 'next/server'
import { getCurrentAttendanceStatus, getTodaySessions } from '@/lib/attendance/service'

export async function GET() {
  try {
    const status = await getCurrentAttendanceStatus()
    const sessions = await getTodaySessions()

    // Calculate total completed working time (sum of completed sessions only)
    let totalCompletedSeconds = 0
    let currentSessionElapsedSeconds = 0

    if (sessions && sessions.length > 0) {
      sessions.forEach((session: { time_in: string; time_out: string | null }) => {
        if (session.time_out) {
          // Completed session - add to total
          const timeIn = new Date(session.time_in)
          const timeOut = new Date(session.time_out)
          const diffMs = timeOut.getTime() - timeIn.getTime()
          totalCompletedSeconds += Math.floor(diffMs / 1000)
        } else if (!session.time_out && session.time_in) {
          // Open session - calculate elapsed time
          const timeIn = new Date(session.time_in)
          const now = new Date()
          const diffMs = now.getTime() - timeIn.getTime()
          currentSessionElapsedSeconds = Math.floor(diffMs / 1000)
        }
      })
    }

    const formatDuration = (seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }

    // Get Bangladesh business date
    const now = new Date()
    const businessDate = now.toLocaleDateString('en-US', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return NextResponse.json({
      success: true,
      business_date: businessDate,
      total_completed_hours: formatDuration(totalCompletedSeconds),
      total_completed_seconds: totalCompletedSeconds,
      current_session_hours: currentSessionElapsedSeconds > 0 ? formatDuration(currentSessionElapsedSeconds) : null,
      current_session_seconds: currentSessionElapsedSeconds,
      has_open_session: status.has_open_session,
      latest_time_in: status.latest_time_in
    })
  } catch (error: unknown) {
    console.error('Get today hours error:', error)

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get today hours' },
      { status: 500 }
    )
  }
}
