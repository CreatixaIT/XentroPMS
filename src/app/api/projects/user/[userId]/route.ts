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
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        project_code,
        project_members!inner(
          user_id
        )
      `)
      .eq('project_members.user_id', userId)
    
    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      projects: projects || []
    })
  } catch (error: unknown) {
    console.error('Get user projects error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
