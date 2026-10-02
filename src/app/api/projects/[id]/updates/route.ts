import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAccess } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireProjectAccess(id)
    
    const body = await request.json()
    const { completed, working_on, remains, blockers, progress } = body
    
    if (!completed && !working_on && !remains && !blockers) {
      return NextResponse.json(
        { success: false, error: 'At least one field is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Verify user is a project member
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
    
    // Create project activity entry for daily update
    const { data: activity, error } = await supabase
      .from('project_activity')
      .insert({
        project_id: id,
        user_id: user.id,
        activity_type: 'DAILY_UPDATE_ADDED',
        description: 'Daily work update',
        metadata: {
          completed: completed || '',
          working_on: working_on || '',
          remains: remains || '',
          blockers: blockers || '',
          progress: progress || 0
        }
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create work update:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to submit work update' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      data: activity
    })
  } catch (error: unknown) {
    console.error('Create work update error:', error)
    
    if (error instanceof Error && error.message.includes('not a member')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit work update' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireProjectAccess(id)
    
    const supabase = await createClient()
    
    // SUPER_ADMIN can see all updates, employees only see their own
    let query = supabase
      .from('project_activity')
      .select('*, profiles(id, full_name, email)')
      .eq('project_id', id)
      .eq('activity_type', 'DAILY_UPDATE_ADDED')
      .order('created_at', { ascending: false })
    
    if (user.role !== 'SUPER_ADMIN') {
      query = query.eq('user_id', user.id)
    }
    
    const { data: updates, error } = await query
    
    if (error) {
      console.error('Failed to fetch work updates:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch work updates' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      data: updates || []
    })
  } catch (error: unknown) {
    console.error('Get work updates error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch work updates' },
      { status: 500 }
    )
  }
}
