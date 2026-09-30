import { NextRequest, NextResponse } from 'next/server'
import { getCategories, createCategory } from '@/lib/inventory/service'
import { createCategorySchema } from '@/lib/validations/inventory'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('include_inactive') === 'true'
    
    const categories = await getCategories(includeInactive)
    
    return NextResponse.json({ 
      success: true,
      categories 
    })
  } catch (error: unknown) {
    console.error('Get categories error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createCategorySchema.parse(body)
    
    const category = await createCategory(validatedData)
    
    return NextResponse.json({ 
      success: true,
      category 
    })
  } catch (error: unknown) {
    console.error('Create category error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
