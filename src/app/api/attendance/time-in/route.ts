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
      attendance 
    })
  } catch (error: unknown) {
    console.error('Time in error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('already recorded')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('No active workplace')) {
      return NextResponse.json(
        { error: 'No active workplace configuration found. Please contact administrator.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to record time in' },
      { status: 500 }
    )
  }
}
