import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperAdmin()
    
    const { userId } = await params
    const supabase = await createClient()
    
    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        completed_at,
        project:projects(
          id,
          name
        )
      `)
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true, nullsFirst: false })
    
    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      tasks: tasks || []
    })
  } catch (error: unknown) {
    console.error('Get user tasks error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
