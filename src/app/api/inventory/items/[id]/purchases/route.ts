import { NextRequest, NextResponse } from 'next/server'
import { getItemPurchases } from '@/lib/inventory/service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    
    const purchases = await getItemPurchases(id, limit, offset)
    
    return NextResponse.json({ 
      success: true,
      purchases 
    })
  } catch (error: unknown) {
    console.error('Get item purchases error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch item purchases' },
      { status: 500 }
    )
  }
}
