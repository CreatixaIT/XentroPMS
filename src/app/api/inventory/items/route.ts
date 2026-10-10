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
        { error: 'Invalid input data. Please check all required fields.' },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()

      if (errorMessage.includes('sku') && errorMessage.includes('already exists')) {
        return NextResponse.json(
          { error: 'An item with this SKU already exists. Please use a unique SKU.' },
          { status: 409 }
        )
      }

      if (errorMessage.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'You do not have permission to create inventory items.' },
          { status: 403 }
        )
      }

      if (errorMessage.includes('category') || errorMessage.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Invalid category. Please select a valid category.' },
          { status: 400 }
        )
      }

      if (errorMessage.includes('negative')) {
        return NextResponse.json(
          { error: 'Quantity, cost, and price values cannot be negative.' },
          { status: 400 }
        )
      }

      if (errorMessage.includes('required')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      // Return the actual error message for other cases
      return NextResponse.json(
        { error: error.message || 'Failed to create inventory item' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}
