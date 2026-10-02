import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, requireTaskAccess } from '@/lib/auth/authorization'
import { getTaskById, updateTask, getTaskDailyUpdates } from '@/lib/projects/service'
import { updateTaskSchema } from '@/lib/validations/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireTaskAccess(id)
    
    const task = await getTaskById(id)
    const updates = await getTaskDailyUpdates(id)
    
    return NextResponse.json({ 
      success: true,
      task,
      updates
    })
  } catch (error: unknown) {
    console.error('Get task error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)
    
    // SUPER_ADMIN can update any task
    if (user.role === 'SUPER_ADMIN') {
      const updatedTask = await updateTask(id, validatedData, user.id)
      return NextResponse.json({
        success: true,
        task: updatedTask
      })
    }
    
    // Check authorization for other roles
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    const { data: task } = await supabase
      .from('project_tasks')
      .select('project_id, assigned_to, created_by')
      .eq('id', id)
      .single()
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Employees can only update their own assigned tasks (status only)
    if (user.role === 'EMPLOYEE') {
      if (task.assigned_to !== user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only update your own assigned tasks' },
          { status: 403 }
        )
      }
      
      // Employees can only update status
      const allowedFields = ['status']
      const providedFields = Object.keys(validatedData)
      const hasDisallowedField = providedFields.some(field => !allowedFields.includes(field))
      
      if (hasDisallowedField) {
        return NextResponse.json(
          { success: false, error: 'Employees can only update task status' },
          { status: 403 }
        )
      }
    }
    
    // Team leaders can update tasks in their projects
    if (user.role === 'TEAM_LEADER') {
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', task.project_id)
        .eq('user_id', user.id)
        .single()
      
      if (!member) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this project' },
          { status: 403 }
        )
      }
    }
    
    const updatedTask = await updateTask(id, validatedData, user.id)
    
    return NextResponse.json({ 
      success: true,
      task: updatedTask
    })
  } catch (error: unknown) {
    console.error('Update task error:', error)
    
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
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
