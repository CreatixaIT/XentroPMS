import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess, requireProjectManager } from '@/lib/auth/authorization'
import { getProjectComponents, createProjectComponent } from '@/lib/projects/service'
import { createProjectComponentSchema } from '@/lib/validations/projects'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireProjectAccess(id)
    
    const components = await getProjectComponents(id)
    
    return NextResponse.json({ 
      success: true,
      components
    })
  } catch (error: unknown) {
    console.error('Get project components error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch project components' },
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
    const validatedData = createProjectComponentSchema.parse(body)
    
    const component = await createProjectComponent(id, validatedData, user.id)
    
    return NextResponse.json({ 
      success: true,
      component
    })
  } catch (error: unknown) {
    console.error('Create project component error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create project component' },
      { status: 500 }
    )
  }
}
