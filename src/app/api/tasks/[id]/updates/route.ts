import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, requireTaskAccess } from '@/lib/auth/authorization'
import { createDailyUpdate, getTaskDailyUpdates } from '@/lib/projects/service'
import { createDailyUpdateSchema } from '@/lib/validations/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireTaskAccess(id)
    
    const updates = await getTaskDailyUpdates(id)
    
    return NextResponse.json({ 
      success: true,
      updates
    })
  } catch (error: unknown) {
    console.error('Get task updates error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch task updates' },
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
    const user = await requireAuthenticatedUser()
    
    const body = await request.json()
    const validatedData = createDailyUpdateSchema.parse(body)
    
    // Check if user is task assignee or project manager
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    const { data: task } = await supabase
      .from('project_tasks')
      .select('project_id, assigned_to')
      .eq('id', id)
      .single()
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Only task assignee or project creator/SUPER_ADMIN can add updates
    const isAssignee = task.assigned_to === user.id
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', task.project_id)
      .single()
    
    const isProjectCreator = project?.created_by === user.id
    const isSuperAdmin = user.role === 'SUPER_ADMIN'
    
    if (!isAssignee && !isProjectCreator && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only task assignee or project manager can add updates' },
        { status: 403 }
      )
    }
    
    const update = await createDailyUpdate(id, validatedData, user.id)
    
    return NextResponse.json({ 
      success: true,
      update
    })
  } catch (error: unknown) {
    console.error('Create daily update error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('already submitted')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create daily update' },
      { status: 500 }
    )
  }
}
