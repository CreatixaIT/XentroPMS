import { NextResponse } from 'next/server'
import { getTodayAttendance, getAttendanceStatus } from '@/lib/attendance/service'

export async function GET() {
  try {
    // Get today's attendance
    const attendance = await getTodayAttendance()
    
    // Get attendance status
    const status = await getAttendanceStatus()
    
    return NextResponse.json({ 
      success: true,
      attendance,
      status
    })
  } catch (error: unknown) {
    console.error('Today attendance error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch today attendance' },
      { status: 500 }
    )
  }
}
