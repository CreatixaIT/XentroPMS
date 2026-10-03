import { NextRequest, NextResponse } from 'next/server'
import { recordTimeIn } from '@/lib/attendance/service'
import { timeInSchema } from '@/lib/validations/attendance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = timeInSchema.parse(body)
    
    // Record time in
    const attendance = await recordTimeIn(
      validatedData.latitude,
      validatedData.longitude,
      validatedData.accuracy
    )
    
    return NextResponse.json({ 
      success: true,
      message: 'Time in recorded successfully.',
      attendance 
    })
  } catch (error: unknown) {
    console.error('Time in error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('open session')) {
      return NextResponse.json(
        { success: false, error: 'You are already timed in. Please record Time Out first.' },
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
      { success: false, error: error instanceof Error ? error.message : 'Failed to record time in' },
      { status: 500 }
    )
  }
}
