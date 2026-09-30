import { NextRequest, NextResponse } from 'next/server'
import { getAllWorkplaceSettings, createWorkplaceSettings } from '@/lib/attendance/service'
import { workplaceSettingsSchema } from '@/lib/validations/attendance'

export async function GET() {
  try {
    // Get all workplace settings (admin only)
    const settings = await getAllWorkplaceSettings()
    
    return NextResponse.json({ 
      success: true,
      settings 
    })
  } catch (error: unknown) {
    console.error('Workplace settings error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch workplace settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = workplaceSettingsSchema.parse(body)
    
    // Create workplace settings (admin only)
    const settings = await createWorkplaceSettings(
      validatedData.workplace_name,
      validatedData.latitude,
      validatedData.longitude,
      validatedData.allowed_radius_meters,
      validatedData.is_active
    )
    
    return NextResponse.json({ 
      success: true,
      settings 
    })
  } catch (error: unknown) {
    console.error('Create workplace settings error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create workplace settings' },
      { status: 500 }
    )
  }
}
