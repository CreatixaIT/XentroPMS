import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth/authorization'

export async function GET() {
  try {
    const isAdmin = await isSuperAdmin()
    
    return NextResponse.json({ 
      is_admin: isAdmin
    })
  } catch (error: unknown) {
    console.error('Check admin error:', error)
    
    return NextResponse.json({ 
      is_admin: false
    })
  }
}
