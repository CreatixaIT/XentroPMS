import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, requireSuperAdmin } from '@/lib/auth/authorization'
import { getExpenseCategories, createExpenseCategory } from '@/lib/finance/service'
import { createExpenseCategorySchema } from '@/lib/validations/finance'

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser()
    
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('include_inactive') === 'true'
    
    const categories = await getExpenseCategories(includeInactive === true)
    
    return NextResponse.json({ 
      success: true,
      categories
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
