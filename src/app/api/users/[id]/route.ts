import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    
    const { id } = await params
    const body = await request.json()
    const { full_name, role, status, designation } = body
    
    const supabase = await createClient()
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', id)
      .single()
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Prevent removing SUPER_ADMIN from own account
    const currentUser = await supabase.auth.getUser()
    if (currentUser.data.user?.id === id && role && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove your own SUPER_ADMIN role' },
        { status: 400 }
      )
    }
    
    const updateData: Record<string, unknown> = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status
    if (designation !== undefined) updateData.designation = designation
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      user: data
    })
  } catch (error: unknown) {
    console.error('Update user error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    
    const { id } = await params
    const supabase = await createClient()
    
    // Check for foreign key dependencies
    const dependencies = []
    
    // Check attendance records
    const { count: attendanceCount } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
    
    if (attendanceCount && attendanceCount > 0) {
      dependencies.push('attendance records')
    }
    
    // Check project members
    const { count: memberCount } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
    
    if (memberCount && memberCount > 0) {
      dependencies.push('project memberships')
    }
    
    // Check tasks
    const { count: taskCount } = await supabase
      .from('project_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', id)
    
    if (taskCount && taskCount > 0) {
      dependencies.push('assigned tasks')
    }
    
    // If dependencies exist, deactivate instead of delete
    if (dependencies.length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'INACTIVE' })
        .eq('id', id)
      
      if (updateError) {
        throw new Error(`Failed to deactivate user: ${updateError.message}`)
      }
      
      return NextResponse.json({ 
        success: true,
        message: `User deactivated due to existing dependencies: ${dependencies.join(', ')}`
      })
    }
    
    // Safe to delete
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
    
    if (profileError) {
      throw new Error(`Failed to delete profile: ${profileError.message}`)
    }
    
    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    
    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error: unknown) {
    console.error('Delete user error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    )
  }
}
