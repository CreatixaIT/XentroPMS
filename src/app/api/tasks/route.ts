import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/authorization'
import { getTasks } from '@/lib/projects/service'
import { taskListSchema } from '@/lib/validations/projects'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    
    const searchParams = request.nextUrl.searchParams
    const params = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | undefined) || undefined,
      priority: (searchParams.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined) || undefined,
      project_id: searchParams.get('project_id') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      sort_by: (searchParams.get('sort_by') as 'title' | 'due_date' | 'priority' | 'status' | 'created_at' | undefined) || undefined,
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc' | undefined) || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    const validatedParams = taskListSchema.parse(params)
    
    // Filter by assigned user if not SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
      validatedParams.assigned_to = user.id
    }
    
    const result = await getTasks(validatedParams)
    
    return NextResponse.json({ 
      success: true,
      ...result
    })
  } catch (error: unknown) {
    console.error('Get tasks error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
