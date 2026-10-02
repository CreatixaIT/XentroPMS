import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess, requireProjectManager } from '@/lib/auth/authorization'
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
      { error: 'Failed to fetch project tasks' },
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
    const validatedData = createTaskSchema.parse(body)
    
    const task = await createTask(id, validatedData, user.id)
    
    return NextResponse.json({ 
      success: true,
      task
    })
  } catch (error: unknown) {
    console.error('Create task error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not a member')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
