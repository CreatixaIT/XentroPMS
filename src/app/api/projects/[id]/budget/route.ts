import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, requireProjectAccess } from '@/lib/auth/authorization'
import { getProjectBudget, upsertProjectBudget } from '@/lib/finance/service'
import { createBudgetSchema } from '@/lib/validations/finance'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const budget = await getProjectBudget(id)
    
    return NextResponse.json({ 
      success: true,
      data: budget
    })
  } catch (error: unknown) {
    console.error('Get project budget error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project budget' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireSuperAdmin()
    
    const body = await request.json()
    const validatedData = createBudgetSchema.parse(body)
    
    const budget = await upsertProjectBudget(id, validatedData)
    
    return NextResponse.json({ 
      success: true,
      data: budget
    })
  } catch (error: unknown) {
    console.error('Upsert project budget error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save budget' },
      { status: 500 }
    )
  }
}
