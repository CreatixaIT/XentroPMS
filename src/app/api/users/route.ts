import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireSuperAdmin()
    
    const supabase = await createClient()
    
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status, designation, created_at')
      .order('full_name', { ascending: true })
    
    if (error) {
      console.error('Fetch users error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      users: users || []
    })
  } catch (error: unknown) {
    console.error('Get users error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()
    
    const body = await request.json()
    const { full_name, email, role, designation, password } = body
    
    if (!full_name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const supabase = await createAdminClient()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
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
        email,
        full_name,
        role: role || 'EMPLOYEE',
        status: 'ACTIVE',
        designation: designation || null
      })
    
    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: profileError.message || 'Failed to create user profile' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      user: { id: authData.user.id, email, full_name, role: role || 'EMPLOYEE' }
    })
  } catch (error: unknown) {
    console.error('Create user error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    )
  }
}
