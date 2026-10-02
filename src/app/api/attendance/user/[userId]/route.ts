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
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    
    const { data: attendance, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false })
      .limit(limit)
    
    if (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      history: attendance || []
    })
  } catch (error: unknown) {
    console.error('Get user attendance error:', error)
    
    if (error instanceof Error && error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    )
  }
}
