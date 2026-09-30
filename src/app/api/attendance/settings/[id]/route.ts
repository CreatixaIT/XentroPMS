import { NextRequest, NextResponse } from 'next/server'
import { updateWorkplaceSettings } from '@/lib/attendance/service'
import { workplaceSettingsSchema } from '@/lib/validations/attendance'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    
    // Validate input
    const validatedData = workplaceSettingsSchema.parse(body)
    
    // Update workplace settings (admin only)
    const settings = await updateWorkplaceSettings(
      id,
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
    console.error('Update workplace settings error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update workplace settings' },
      { status: 500 }
    )
  }
}
