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
    const offset = parseInt(searchParams.get('offset') || '0')
    const reportType = searchParams.get('report_type') || 'history' // history, daily, weekly, monthly, yearly
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    if (reportType === 'history') {
      // Original behavior - simple history
      const { data: attendance, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .order('attendance_date', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (error) {
        throw new Error(`Failed to fetch attendance: ${error.message}`)
      }
      
      return NextResponse.json({ 
        success: true,
        history: attendance || []
      })
    }
    
    // Enhanced reporting with sessions
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        attendance_sessions(id, time_in, time_out, time_in_location_verified, time_out_location_verified)
      `)
      .eq('user_id', userId)
    
    // Apply date filters
    if (startDate) {
      query = query.gte('attendance_date', startDate)
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate)
    }
    
    const { data: attendance, error } = await query.order('attendance_date', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`)
    }
    
    // Calculate totals and process sessions
    const processedAttendance = (attendance || []).map((record: any) => {
      const sessions = record.attendance_sessions || []
      
      // Calculate total working time from completed sessions only
      let totalSeconds = 0
      const processedSessions = sessions.map((session: any) => {
        if (session.time_out) {
          const timeIn = new Date(session.time_in)
          const timeOut = new Date(session.time_out)
          const diffMs = timeOut.getTime() - timeIn.getTime()
          const diffSeconds = Math.floor(diffMs / 1000)
          totalSeconds += diffSeconds
          
          return {
            ...session,
            duration_seconds: diffSeconds
          }
        }
        
        return {
          ...session,
          duration_seconds: null
        }
      })
      
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      
      return {
        ...record,
        attendance_sessions: processedSessions,
        total_working_hours: `${hours}h ${minutes}m`,
        total_working_seconds: totalSeconds,
        has_incomplete_session: sessions.some((s: any) => !s.time_out)
      }
    })
    
    // Calculate period totals
    const totalPeriodSeconds = processedAttendance.reduce((sum: number, record: any) => 
      sum + (record.total_working_seconds || 0), 0
    )
    const totalPeriodHours = Math.floor(totalPeriodSeconds / 3600)
    const totalPeriodMinutes = Math.floor((totalPeriodSeconds % 3600) / 60)
    
    return NextResponse.json({ 
      success: true,
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
      data: processedAttendance,
      summary: {
        total_records: processedAttendance.length,
        total_working_hours: `${totalPeriodHours}h ${totalPeriodMinutes}m`,
        total_working_seconds: totalPeriodSeconds,
        records_with_incomplete_sessions: processedAttendance.filter((r: any) => r.has_incomplete_session).length
      }
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
