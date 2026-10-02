import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/auth/authorization'
import { getProjectTasks, createTask } from '@/lib/projects/service'
import { createTaskSchema } from '@/lib/validations/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const tasks = await getProjectTasks(id)
    
    return NextResponse.json({ 
      success: true,
      tasks
    })
  } catch (error: unknown) {
    console.error('Get project tasks error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project tasks' },
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
    const user = await requireProjectAccess(id)
    
    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)
    
    // If user is not SUPER_ADMIN, verify they are a project member
    if (user.role !== 'SUPER_ADMIN') {
      const supabase = await (await import('@/lib/supabase/server')).createClient()
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .single()
      
      if (!member) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this project' },
          { status: 403 }
        )
      }
      
      // Members can only create tasks for themselves
      validatedData.assigned_to = user.id
    }
    
    const task = await createTask(id, validatedData, user.id)
    
    return NextResponse.json({ 
      success: true,
      task
    })
  } catch (error: unknown) {
    console.error('Create task error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not a member')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
