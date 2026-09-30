import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/authorization'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        designation: user.designation,
        role: user.role,
        status: user.status
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
