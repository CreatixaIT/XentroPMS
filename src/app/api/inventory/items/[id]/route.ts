import { NextRequest, NextResponse } from 'next/server'
import { getInventoryItem, updateInventoryItem, archiveInventoryItem } from '@/lib/inventory/service'
import { updateItemSchema } from '@/lib/validations/inventory'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const item = await getInventoryItem(id)
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      item 
    })
  } catch (error: unknown) {
    console.error('Get inventory item error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
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
    const validatedData = updateItemSchema.parse(body)
    
    const item = await updateInventoryItem(id, validatedData)
    
    return NextResponse.json({ 
      success: true,
      item 
    })
  } catch (error: unknown) {
    console.error('Update inventory item error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await archiveInventoryItem(id)
    
    return NextResponse.json({ 
      success: true
    })
  } catch (error: unknown) {
    console.error('Archive inventory item error:', error)
    
    return NextResponse.json(
      { error: 'Failed to archive inventory item' },
      { status: 500 }
    )
  }
}
