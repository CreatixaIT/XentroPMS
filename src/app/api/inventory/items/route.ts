import { NextRequest, NextResponse } from 'next/server'
import { getInventoryItems, createInventoryItem } from '@/lib/inventory/service'
import { createItemSchema, inventoryListSchema } from '@/lib/validations/inventory'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const params = {
      search: searchParams.get('search') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      stock_status: (searchParams.get('stock_status') as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | undefined) || undefined,
      sort_by: (searchParams.get('sort_by') as 'name' | 'quantity' | 'unit_cost' | 'created_at' | undefined) || undefined,
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc' | undefined) || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    // Validate input
    const validatedParams = inventoryListSchema.parse(params)
    
    const result = await getInventoryItems(validatedParams)
    
    return NextResponse.json({ 
      success: true,
      ...result
    })
  } catch (error: unknown) {
    console.error('Get inventory items error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createItemSchema.parse(body)
    
    const item = await createInventoryItem(validatedData)
    
    return NextResponse.json({ 
      success: true,
      item 
    })
  } catch (error: unknown) {
    console.error('Create inventory item error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}
