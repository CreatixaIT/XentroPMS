import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireSuperAdmin()
    
    const supabase = await createClient()
    
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status, designation, created_at')
      .order('full_name', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      users: users || []
    })
  } catch (error: unknown) {
    console.error('Get users error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
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
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      user: { id: authData.user.id, email, full_name, role }
    })
  } catch (error: unknown) {
    console.error('Create user error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    )
  }
}
