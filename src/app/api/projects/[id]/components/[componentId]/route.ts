import { NextRequest, NextResponse } from 'next/server'
import { requireProjectManager } from '@/lib/auth/authorization'
import { updateProjectComponent, deleteProjectComponent } from '@/lib/projects/service'
import { updateProjectComponentSchema } from '@/lib/validations/projects'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  try {
    const { id, componentId } = await params
    const user = await requireProjectManager(id)
    
    const body = await request.json()
    const validatedData = updateProjectComponentSchema.parse(body)
    
    const component = await updateProjectComponent(componentId, validatedData, id, user.id)
    
    return NextResponse.json({ 
      success: true,
      component
    })
  } catch (error: unknown) {
    console.error('Update project component error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update project component' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  try {
    const { id, componentId } = await params
    const user = await requireProjectManager(id)
    
    await deleteProjectComponent(componentId, id, user.id)
    
    return NextResponse.json({ 
      success: true
    })
  } catch (error: unknown) {
    console.error('Delete project component error:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete project component' },
      { status: 500 }
    )
  }
}
