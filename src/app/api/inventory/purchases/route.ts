import { NextRequest, NextResponse } from 'next/server'
import { createPurchase } from '@/lib/inventory/service'
import { createPurchaseSchema } from '@/lib/validations/inventory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createPurchaseSchema.parse(body)
    
    const purchase = await createPurchase(validatedData)
    
    return NextResponse.json({ 
      success: true,
      purchase 
    })
  } catch (error: unknown) {
    console.error('Create purchase error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    )
  }
}
