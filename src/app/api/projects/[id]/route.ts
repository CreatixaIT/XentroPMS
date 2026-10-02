import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, requireProjectAccess } from '@/lib/auth/authorization'
import { getProjectById, updateProject, updateProjectStatus, getProjectMembers, getProjectComponents, getProjectTasks, getProjectActivity, getProjectProgress } from '@/lib/projects/service'
import { updateProjectSchema, projectStatusSchema } from '@/lib/validations/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const project = await getProjectById(id)
    const members = await getProjectMembers(id)
    const components = await getProjectComponents(id)
    const tasks = await getProjectTasks(id)
    const activity = await getProjectActivity(id, 10)
    const progress = await getProjectProgress(id)
    
    return NextResponse.json({ 
      success: true,
      project,
      members,
      components,
      tasks,
      activity,
      progress
    })
  } catch (error: unknown) {
    console.error('Get project error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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
    
    // Check if this is a status update
    if (body.status !== undefined) {
      const validatedData = projectStatusSchema.parse(body)
      
      // Only project creator or SUPER_ADMIN can change status
      const supabase = await (await import('@/lib/supabase/server')).createClient()
      const { data: project } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', id)
        .single()
      
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      
      if (user.role !== 'SUPER_ADMIN' && project.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Only project creator or SUPER_ADMIN can change project status' },
          { status: 403 }
        )
      }
      
      // Special check for COMPLETED status
      if (validatedData.status === 'COMPLETED') {
        if (user.role !== 'SUPER_ADMIN' && project.created_by !== user.id) {
          return NextResponse.json(
            { error: 'Only project creator or SUPER_ADMIN can complete a project' },
            { status: 403 }
          )
        }
      }
      
      const updatedProject = await updateProjectStatus(id, validatedData.status, user.id)
      
      return NextResponse.json({ 
        success: true,
        project: updatedProject
      })
    }
    
    // Regular project update
    const validatedData = updateProjectSchema.parse(body)
    
    // Only project creator or SUPER_ADMIN can update project
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', id)
      .single()
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    if (user.role !== 'SUPER_ADMIN' && project.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only project creator or SUPER_ADMIN can update project' },
        { status: 403 }
      )
    }
    
    const updatedProject = await updateProject(id, validatedData)
    
    return NextResponse.json({ 
      success: true,
      project: updatedProject
    })
  } catch (error: unknown) {
    console.error('Update project error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}
