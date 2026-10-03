export interface AttendanceRecord {
  id: string
  user_id: string
  attendance_date: string
  time_in: string | null
  time_out: string | null
  time_in_latitude: number | null
  time_in_longitude: number | null
  time_out_latitude: number | null
  time_out_longitude: number | null
  time_in_accuracy: number | null
  time_out_accuracy: number | null
  time_in_location_verified: boolean
  time_out_location_verified: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceSession {
  id: string
  attendance_record_id: string
  user_id: string
  business_date: string
  time_in: string
  time_out: string | null
  time_in_latitude: number | null
  time_in_longitude: number | null
  time_in_accuracy: number | null
  time_out_latitude: number | null
  time_out_longitude: number | null
  time_out_accuracy: number | null
  time_in_location_verified: boolean
  time_out_location_verified: boolean
  created_at: string
  updated_at: string
  duration?: string | null
}

export interface AttendanceSettings {
  id: string
  workplace_name: string
  latitude: number
  longitude: number
  allowed_radius_meters: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GeolocationData {
  latitude: number
  longitude: number
  accuracy: number
}

export interface TimeInRequest {
  latitude: number
  longitude: number
  accuracy: number
}

export interface TimeOutRequest {
  latitude: number
  longitude: number
  accuracy: number
}

export interface AttendanceHistoryParams {
  user_id?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface AttendanceStats {
  total_employees: number
  present_today: number
  not_timed_in: number
  timed_in: number
  timed_out: number
  completion_percentage: number
}

export type AttendanceStatus = 'not_recorded' | 'timed_in' | 'complete' | 'outside_radius' | 'error'
