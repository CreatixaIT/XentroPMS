import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, requireSuperAdmin } from '@/lib/auth/authorization'
import { getExpenseCategories, createExpenseCategory } from '@/lib/finance/service'
import { createExpenseCategorySchema } from '@/lib/validations/finance'

export async function GET() {
  try {
    await requireAuthenticatedUser()
    
    const categories = await getExpenseCategories()
    
    return NextResponse.json({ 
      success: true,
      data: categories
    })
  } catch (error: unknown) {
    console.error('Get expense categories error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()
    
    const body = await request.json()
    const validatedData = createExpenseCategorySchema.parse(body)
    
    const category = await createExpenseCategory(validatedData)
    
    return NextResponse.json({ 
      success: true,
      data: category
    })
  } catch (error: unknown) {
    console.error('Create expense category error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create category' },
      { status: 500 }
    )
  }
}
