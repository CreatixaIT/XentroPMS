import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser, requireSuperAdmin } from '@/lib/auth/authorization'
import { getProjects, createProject } from '@/lib/projects/service'
import { createProjectSchema, projectListSchema } from '@/lib/validations/projects'

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser()
    
    const searchParams = request.nextUrl.searchParams
    const params = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | undefined) || undefined,
      sort_by: (searchParams.get('sort_by') as 'name' | 'created_at' | 'start_date' | 'target_end_date' | 'status' | undefined) || undefined,
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc' | undefined) || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    const validatedParams = projectListSchema.parse(params)
    
    const result = await getProjects(validatedParams)
    
    return NextResponse.json({ 
      success: true,
      ...result
    })
  } catch (error: unknown) {
    console.error('Get projects error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()
    const user = await requireAuthenticatedUser()
    
    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)
    
    const project = await createProject(validatedData, user.id)
    
    return NextResponse.json({ 
      success: true,
      project 
    })
  } catch (error: unknown) {
    console.error('Create project error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Only SUPER_ADMIN can create projects' },
        { status: 403 }
      )
    }
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    )
  }
}
