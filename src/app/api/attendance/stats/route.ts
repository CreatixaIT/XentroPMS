import { NextRequest, NextResponse } from 'next/server'
import { getAttendanceStats } from '@/lib/attendance/service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || undefined
    
    // Get attendance statistics (admin only)
    const stats = await getAttendanceStats(date)
    
    return NextResponse.json({ 
      success: true,
      stats 
    })
  } catch (error: unknown) {
    console.error('Attendance stats error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch attendance statistics' },
      { status: 500 }
    )
  }
}
