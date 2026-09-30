-- Create attendance_settings table for workplace configuration
CREATE TABLE attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplace_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude NUMERIC NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  allowed_radius_meters NUMERIC NOT NULL CHECK (allowed_radius_meters > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active workplace setting
CREATE INDEX idx_attendance_settings_active ON attendance_settings(is_active) WHERE is_active = true;

-- Apply updated_at trigger to attendance_settings
CREATE TRIGGER update_attendance_settings_updated_at
  BEFORE UPDATE ON attendance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create attendance_records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  time_in_latitude NUMERIC,
  time_in_longitude NUMERIC,
  time_out_latitude NUMERIC,
  time_out_longitude NUMERIC,
  time_in_accuracy NUMERIC CHECK (time_in_accuracy >= 0),
  time_out_accuracy NUMERIC CHECK (time_out_accuracy >= 0),
  time_in_location_verified BOOLEAN NOT NULL DEFAULT false,
  time_out_location_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, attendance_date)
);

-- Create indexes for attendance_records
CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date DESC);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, attendance_date DESC);
CREATE INDEX idx_attendance_records_time_in ON attendance_records(time_in DESC);

-- Apply updated_at trigger to attendance_records
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_settings

-- SUPER_ADMIN can read all attendance settings
CREATE POLICY "SUPER_ADMIN can read attendance settings"
  ON attendance_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert attendance settings
CREATE POLICY "SUPER_ADMIN can insert attendance settings"
  ON attendance_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can update attendance settings
CREATE POLICY "SUPER_ADMIN can update attendance settings"
  ON attendance_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- RLS Policies for attendance_records

-- Users can read their own attendance records
CREATE POLICY "Users can read own attendance records"
  ON attendance_records FOR SELECT
  USING (auth.uid() = user_id);

-- SUPER_ADMIN can read all attendance records
CREATE POLICY "SUPER_ADMIN can read all attendance records"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- TEAM_LEADER can read attendance of their team (placeholder - needs team structure)
-- For now, TEAM_LEADER can only read their own attendance
CREATE POLICY "TEAM_LEADER can read own attendance records"
  ON attendance_records FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'TEAM_LEADER'
    )
  );

-- Attendance records should only be created through server-side functions
-- No INSERT policy for regular users

-- SUPER_ADMIN can insert attendance records (for administrative purposes)
CREATE POLICY "SUPER_ADMIN can insert attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- No UPDATE policy for regular users - attendance cannot be modified directly
-- SUPER_ADMIN can update attendance records (for administrative purposes)
CREATE POLICY "SUPER_ADMIN can update attendance records"
  ON attendance_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- No DELETE policy - attendance records should not be deleted

-- Function to calculate distance between two points using Haversine formula
-- Returns distance in meters
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  earth_radius NUMERIC := 6371000; -- Earth's radius in meters
  d_lat NUMERIC;
  d_lon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  d_lat := RADIANS(lat2 - lat1);
  d_lon := RADIANS(lon2 - lon1);
  
  a := SIN(d_lat / 2) * SIN(d_lat / 2) +
      COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
      SIN(d_lon / 2) * SIN(d_lon / 2);
      
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get business date in Asia/Dhaka timezone
CREATE OR REPLACE FUNCTION get_business_date()
RETURNS DATE AS $$
BEGIN
  RETURN (NOW() AT TIME ZONE 'Asia/Dhaka')::DATE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if location is within allowed radius
CREATE OR REPLACE FUNCTION is_location_within_radius(
  user_lat NUMERIC,
  user_lon NUMERIC,
  setting_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  setting RECORD;
  distance NUMERIC;
BEGIN
  -- Get active workplace setting
  SELECT * INTO setting
  FROM attendance_settings
  WHERE is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- No active setting configured, reject
    RETURN false;
  END IF;
  
  -- Calculate distance
  distance := calculate_distance(user_lat, user_lon, setting.latitude, setting.longitude);
  
  -- Check if within allowed radius
  RETURN distance <= setting.allowed_radius_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to create attendance record with Time In
CREATE OR REPLACE FUNCTION create_attendance_time_in(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_business_date DATE;
  v_setting RECORD;
  v_distance NUMERIC;
  v_location_verified BOOLEAN;
BEGIN
  -- Get business date in Asia/Dhaka
  v_business_date := get_business_date();
  
  -- Check if attendance already exists for today
  IF EXISTS (
    SELECT 1 FROM attendance_records
    WHERE user_id = p_user_id AND attendance_date = v_business_date
  ) THEN
    RAISE EXCEPTION 'Attendance already recorded for today';
  END IF;
  
  -- Get active workplace setting
  SELECT * INTO v_setting
  FROM attendance_settings
  WHERE is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active workplace configuration found';
  END IF;
  
  -- Calculate distance and verify location
  v_distance := calculate_distance(p_latitude, p_longitude, v_setting.latitude, v_setting.longitude);
  v_location_verified := v_distance <= v_setting.allowed_radius_meters;
  
  -- Create attendance record
  INSERT INTO attendance_records (
    user_id,
    attendance_date,
    time_in,
    time_in_latitude,
    time_in_longitude,
    time_in_accuracy,
    time_in_location_verified
  ) VALUES (
    p_user_id,
    v_business_date,
    NOW(),
    p_latitude,
    p_longitude,
    p_accuracy,
    v_location_verified
  )
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update attendance record with Time Out
CREATE OR REPLACE FUNCTION update_attendance_time_out(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_business_date DATE;
  v_setting RECORD;
  v_distance NUMERIC;
  v_location_verified BOOLEAN;
BEGIN
  -- Get business date in Asia/Dhaka
  v_business_date := get_business_date();
  
  -- Check if attendance exists for today
  SELECT id INTO v_record_id
  FROM attendance_records
  WHERE user_id = p_user_id AND attendance_date = v_business_date;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No attendance record found for today. Time In must be recorded first';
  END IF;
  
  -- Check if Time Out already recorded
  IF EXISTS (
    SELECT 1 FROM attendance_records
    WHERE id = v_record_id AND time_out IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Time Out already recorded for today';
  END IF;
  
  -- Get active workplace setting
  SELECT * INTO v_setting
  FROM attendance_settings
  WHERE is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active workplace configuration found';
  END IF;
  
  -- Calculate distance and verify location
  v_distance := calculate_distance(p_latitude, p_longitude, v_setting.latitude, v_setting.longitude);
  v_location_verified := v_distance <= v_setting.allowed_radius_meters;
  
  -- Update attendance record
  UPDATE attendance_records
  SET
    time_out = NOW(),
    time_out_latitude = p_latitude,
    time_out_longitude = p_longitude,
    time_out_accuracy = p_accuracy,
    time_out_location_verified = v_location_verified
  WHERE id = v_record_id
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default workplace setting (Dhaka coordinates as placeholder)
-- SUPER_ADMIN should update this to actual workplace location
INSERT INTO attendance_settings (
  workplace_name,
  latitude,
  longitude,
  allowed_radius_meters,
  is_active
) VALUES (
  'Main Office',
  23.8103, -- Dhaka coordinates (placeholder)
  90.4125,
  100, -- 100 meters default radius
  true
);
