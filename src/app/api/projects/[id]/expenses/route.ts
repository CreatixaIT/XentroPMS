import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/auth/authorization'
import { getProjectExpenses, createProjectExpense } from '@/lib/finance/service'
import { createExpenseSchema } from '@/lib/validations/finance'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const searchParams = request.nextUrl.searchParams
    const filters = {
      status: searchParams.get('status') as 'SUBMITTED' | 'APPROVED' | 'VOIDED' | undefined,
      category_id: searchParams.get('category_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined
    }
    
    const expenses = await getProjectExpenses(id, filters)
    
    return NextResponse.json({ 
      success: true,
      data: expenses
    })
  } catch (error: unknown) {
    console.error('Get project expenses error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project expenses' },
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
    const body = await request.json()
    const validatedData = createExpenseSchema.parse(body)
    
    const expense = await createProjectExpense(id, validatedData)
    
    return NextResponse.json({ 
      success: true,
      data: expense
    })
  } catch (error: unknown) {
    console.error('Create project expense error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not a member')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create expense' },
      { status: 500 }
    )
  }
}
