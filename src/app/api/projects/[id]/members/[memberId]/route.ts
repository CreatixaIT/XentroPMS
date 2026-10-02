import { NextRequest, NextResponse } from 'next/server'
import { requireProjectManager } from '@/lib/auth/authorization'
import { removeProjectMember } from '@/lib/projects/service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params
    const user = await requireProjectManager(id)
    
    await removeProjectMember(id, memberId, user.id)
    
    return NextResponse.json({ 
      success: true
    })
  } catch (error: unknown) {
    console.error('Remove project member error:', error)
    
    return NextResponse.json(
      { error: 'Failed to remove project member' },
      { status: 500 }
    )
  }
}
