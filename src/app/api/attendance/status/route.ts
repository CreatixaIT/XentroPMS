import { NextResponse } from 'next/server'
import { getCurrentAttendanceStatus, getTodaySessions } from '@/lib/attendance/service'

export async function GET() {
  try {
    const status = await getCurrentAttendanceStatus()
    const sessions = await getTodaySessions()

    return NextResponse.json({ 
      success: true,
      status,
      sessions
    })
  } catch (error: unknown) {
    console.error('Get attendance status error:', error)
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get attendance status' },
      { status: 500 }
    )
  }
}
