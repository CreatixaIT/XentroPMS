import { NextRequest, NextResponse } from 'next/server'
import { adjustStock } from '@/lib/inventory/service'
import { stockAdjustmentSchema } from '@/lib/validations/inventory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = stockAdjustmentSchema.parse(body)
    
    await adjustStock(validatedData)
    
    return NextResponse.json({ 
      success: true
    })
  } catch (error: unknown) {
    console.error('Adjust stock error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}
