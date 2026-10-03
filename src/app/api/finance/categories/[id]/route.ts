import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { updateExpenseCategory, deleteExpenseCategory } from '@/lib/finance/service'
import { createExpenseCategorySchema } from '@/lib/validations/finance'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    
    const body = await request.json()
    const validatedData = createExpenseCategorySchema.parse(body)
    
    const category = await updateExpenseCategory(id, validatedData)
    
    return NextResponse.json({ 
      success: true,
      data: category
    })
  } catch (error: unknown) {
    console.error('Update expense category error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    
    await deleteExpenseCategory(id)
    
    return NextResponse.json({ 
      success: true
    })
  } catch (error: unknown) {
    console.error('Delete expense category error:', error)
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete category' },
      { status: 500 }
    )
  }
}
