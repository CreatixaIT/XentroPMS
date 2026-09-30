import { NextRequest, NextResponse } from 'next/server'
import { getCategory, updateCategory } from '@/lib/inventory/service'
import { updateCategorySchema } from '@/lib/validations/inventory'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const category = await getCategory(id)
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      category 
    })
  } catch (error: unknown) {
    console.error('Get category error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    
    // Validate input
    const validatedData = updateCategorySchema.parse(body)
    
    const category = await updateCategory(id, validatedData)
    
    return NextResponse.json({ 
      success: true,
      category 
    })
  } catch (error: unknown) {
    console.error('Update category error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}
