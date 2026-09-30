import { NextRequest, NextResponse } from 'next/server'
import { getAllAttendance } from '@/lib/attendance/service'
import { attendanceHistorySchema } from '@/lib/validations/attendance'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const params = {
      user_id: searchParams.get('user_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }
    
    // Validate input
    const validatedParams = attendanceHistorySchema.parse(params)
    
    // Get all attendance (admin only)
    const attendance = await getAllAttendance(validatedParams)
    
    return NextResponse.json({ 
      success: true,
      attendance 
    })
  } catch (error: unknown) {
    console.error('Admin attendance error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
