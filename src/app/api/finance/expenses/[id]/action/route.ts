import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { approveExpense, voidExpense } from '@/lib/finance/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    
    const { id } = await params
    const body = await request.json()
    const { action } = body
    
    if (action === 'approve') {
      const expense = await approveExpense(id)
      return NextResponse.json({ 
        success: true,
        data: expense
      })
    } else if (action === 'void') {
      const expense = await voidExpense(id)
      return NextResponse.json({ 
        success: true,
        data: expense
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error: unknown) {
    console.error('Expense action error:', error)
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    )
  }
}
