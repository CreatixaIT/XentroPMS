import { NextRequest, NextResponse } from 'next/server'
import { getItemTransactions } from '@/lib/inventory/service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    
    const transactions = await getItemTransactions(id, limit, offset)
    
    return NextResponse.json({ 
      success: true,
      transactions 
    })
  } catch (error: unknown) {
    console.error('Get item transactions error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch item transactions' },
      { status: 500 }
    )
  }
}
