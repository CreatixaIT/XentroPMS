import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess, requireProjectManager } from '@/lib/auth/authorization'
import { getProjectMembers, addProjectMember } from '@/lib/projects/service'
import { addProjectMemberSchema } from '@/lib/validations/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const members = await getProjectMembers(id)
    
    return NextResponse.json({ 
      success: true,
      members
    })
  } catch (error: unknown) {
    console.error('Get project members error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch project members' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireProjectManager(id)
    
    const body = await request.json()
    const validatedData = addProjectMemberSchema.parse(body)
    
    const member = await addProjectMember(id, validatedData, user.id)
    
    // Send notification to added member
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    await supabase.from('notifications').insert({
      user_id: validatedData.user_id,
      type: 'PROJECT_ASSIGNED',
      title: 'Project Assignment',
      message: `You have been added to a project`,
      metadata: { project_id: id, role: validatedData.role }
    })
    
    return NextResponse.json({ 
      success: true,
      member
    })
  } catch (error: unknown) {
    console.error('Add project member error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('already a member')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add project member' },
      { status: 500 }
    )
  }
}
