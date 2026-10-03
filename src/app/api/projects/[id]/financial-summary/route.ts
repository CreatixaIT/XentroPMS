import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/auth/authorization'
import { getFinancialSummary } from '@/lib/finance/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const summary = await getFinancialSummary(id)
    
    return NextResponse.json({ 
      success: true,
      data: summary
    })
  } catch (error: unknown) {
    console.error('Get financial summary error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial summary' },
      { status: 500 }
    )
  }
}
