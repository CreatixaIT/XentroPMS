import { NextRequest, NextResponse } from 'next/server'
import { recordTimeOut } from '@/lib/attendance/service'
import { timeOutSchema } from '@/lib/validations/attendance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = timeOutSchema.parse(body)
    
    // Record time out
    const attendance = await recordTimeOut(
      validatedData.latitude,
      validatedData.longitude,
      validatedData.accuracy
    )
    
    return NextResponse.json({ 
      success: true,
      attendance 
    })
  } catch (error: unknown) {
    console.error('Time out error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('already recorded')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('No attendance record found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('No active workplace')) {
      return NextResponse.json(
        { success: false, error: 'No active workplace configuration found. Please contact administrator.' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('outside allowed radius')) {
      return NextResponse.json(
        { success: false, error: 'Location verification failed: You are outside the allowed workplace radius.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record time out' },
      { status: 500 }
    )
  }
}
