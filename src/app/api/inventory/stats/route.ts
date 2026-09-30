import { NextResponse } from 'next/server'
import { getInventoryStats } from '@/lib/inventory/service'

export async function GET() {
  try {
    const stats = await getInventoryStats()
    
    return NextResponse.json({ 
      success: true,
      stats 
    })
  } catch (error: unknown) {
    console.error('Get inventory stats error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch inventory statistics' },
      { status: 500 }
    )
  }
}
