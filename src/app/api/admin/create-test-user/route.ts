import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    await requireSuperAdmin()
    
    const supabase = await createAdminClient()
    
    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'user1@gmail.com')
      .single()
    
    if (existingProfile) {
      return NextResponse.json({ 
        success: true,
        message: 'Test user already exists',
        user: { email: 'user1@gmail.com', role: 'EMPLOYEE', status: 'ACTIVE' }
      })
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'user1@gmail.com',
      password: 'User_2026',
      email_confirm: true
    })
    
    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { success: false, error: authError.message || 'Failed to create user account' },
        { status: 400 }
      )
    }
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'user1@gmail.com',
        full_name: 'Test User 1',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        designation: 'Test Employee'
      })
    
    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Rollback
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: profileError.message || 'Failed to create user profile' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Test user created successfully',
      user: { 
        id: authData.user.id, 
        email: 'user1@gmail.com', 
        full_name: 'Test User 1',
        role: 'EMPLOYEE',
        status: 'ACTIVE'
      }
    })
  } catch (error: unknown) {
    console.error('Create test user error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create test user' },
      { status: 500 }
    )
  }
}
