-- Apply attendance sessions and helper fixes to production
-- This migration combines migration 00014 with schema-qualified helper calls
-- Safe for production application
-- Migration: 20261012000002_apply_attendance_sessions_to_production.sql

-- ============================================
-- STEP 1: Create attendance_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    time_in TIMESTAMPTZ NOT NULL,
    time_out TIMESTAMPTZ,
    time_in_latitude NUMERIC,
    time_in_longitude NUMERIC,
    time_in_accuracy NUMERIC CHECK (time_in_accuracy >= 0),
    time_out_latitude NUMERIC,
    time_out_longitude NUMERIC,
    time_out_accuracy NUMERIC CHECK (time_out_accuracy >= 0),
    time_in_location_verified BOOLEAN NOT NULL DEFAULT false,
    time_out_location_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_session CHECK (
        time_out IS NULL OR time_out > time_in
    )
);

-- Create indexes for attendance_sessions
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_user_id ON attendance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_business_date ON attendance_sessions(business_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_user_date ON attendance_sessions(user_id, business_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_record_id ON attendance_sessions(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_time_in ON attendance_sessions(time_in DESC);

-- Apply updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_attendance_sessions_updated_at ON attendance_sessions;
CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Partial unique index to prevent multiple open sessions
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_single_open_session
  ON attendance_sessions(user_id)
  WHERE time_out IS NULL;

-- ============================================
-- STEP 3: Enable RLS on attendance_sessions
-- ============================================

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance sessions
DROP POLICY IF EXISTS "Users can read own attendance sessions" ON attendance_sessions;
CREATE POLICY "Users can read own attendance sessions"
  ON attendance_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "SUPER_ADMIN can read all attendance sessions" ON attendance_sessions;
CREATE POLICY "SUPER_ADMIN can read all attendance sessions"
  ON attendance_sessions FOR SELECT
  USING (public.is_super_admin_active());

DROP POLICY IF EXISTS "SUPER_ADMIN can manage attendance sessions" ON attendance_sessions;
CREATE POLICY "SUPER_ADMIN can manage attendance sessions"
  ON attendance_sessions FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

-- ============================================
-- STEP 4: Update create_attendance_time_in with schema-qualified helpers
-- ============================================

CREATE OR REPLACE FUNCTION create_attendance_time_in(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id UUID;
  v_session_id UUID;
  v_business_date DATE;
  v_setting RECORD;
  v_distance NUMERIC;
  v_location_verified BOOLEAN;
BEGIN
  -- Authorization: p_user_id must match authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot record attendance for another user';
  END IF;
  
  -- Get business date in Asia/Dhaka
  v_business_date := public.get_business_date();
  
  -- Get or create attendance record for today (UNIQUE constraint preserved)
  INSERT INTO public.attendance_records (user_id, attendance_date)
  VALUES (p_user_id, v_business_date)
  ON CONFLICT (user_id, attendance_date) DO NOTHING
  RETURNING id INTO v_record_id;
  
  -- If the record already existed, get its ID
  IF v_record_id IS NULL THEN
    SELECT id INTO v_record_id
    FROM public.attendance_records
    WHERE user_id = p_user_id AND attendance_date = v_business_date;
  END IF;
  
  -- Get active workplace setting
  SELECT * INTO v_setting
  FROM public.attendance_settings
  WHERE is_active = true
    LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active workplace configuration found';
  END IF;
  
  -- Calculate distance and verify location
  v_distance := public.calculate_distance(p_latitude, p_longitude, v_setting.latitude, v_setting.longitude);
  v_location_verified := v_distance <= v_setting.allowed_radius_meters;
  
  -- Create attendance session (partial unique index prevents duplicate open sessions)
  INSERT INTO public.attendance_sessions (
    attendance_record_id,
    user_id,
    business_date,
    time_in,
    time_in_latitude,
    time_in_longitude,
    time_in_accuracy,
    time_in_location_verified
  ) VALUES (
    v_record_id,
    p_user_id,
    v_business_date,
    NOW(),
    p_latitude,
    p_longitude,
    p_accuracy,
    v_location_verified
  )
  RETURNING id INTO v_session_id;
  
  -- Update attendance_record time_in to earliest session time
  UPDATE public.attendance_records
  SET time_in = (
    SELECT MIN(s.time_in)
    FROM public.attendance_sessions AS s
    WHERE s.attendance_record_id = v_record_id
  )
  WHERE id = v_record_id;
  
  RETURN v_session_id;
END;
$$;

-- ============================================
-- STEP 5: Update update_attendance_time_out with schema-qualified helpers
-- ============================================

CREATE OR REPLACE FUNCTION update_attendance_time_out(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC
)
RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_record_id UUID;
  v_business_date DATE;
  v_setting RECORD;
  v_distance NUMERIC;
  v_location_verified BOOLEAN;
BEGIN
  -- Authorization: p_user_id must match authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot record attendance for another user';
  END IF;
  
  v_business_date := public.get_business_date();
  
  SELECT s.id, s.attendance_record_id
  INTO v_session_id, v_record_id
  FROM public.attendance_sessions AS s
  WHERE s.user_id = p_user_id
    AND s.business_date = v_business_date
    AND s.time_out IS NULL
  ORDER BY s.time_in DESC
    LIMIT 1;
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found. Please record Time In first.';
  END IF;
  
  SELECT a.* INTO v_setting
  FROM public.attendance_settings AS a
  WHERE a.is_active = true
    LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active workplace configuration found';
  END IF;
  
  v_distance := public.calculate_distance(p_latitude, p_longitude, v_setting.latitude, v_setting.longitude);
  v_location_verified := v_distance <= v_setting.allowed_radius_meters;
  
  UPDATE public.attendance_sessions AS s
  SET time_out = NOW(),
      time_out_latitude = p_latitude,
      time_out_longitude = p_longitude,
      time_out_accuracy = p_accuracy,
      time_out_location_verified = v_location_verified
  WHERE s.id = v_session_id;
  
  UPDATE public.attendance_records AS ar
  SET time_out = (
    SELECT MAX(s.time_out)
    FROM public.attendance_sessions AS s
    WHERE s.attendance_record_id = v_record_id
      AND s.time_out IS NOT NULL
  )
  WHERE ar.id = v_record_id;
  
  RETURN v_session_id;
END;
$$;

-- ============================================
-- STEP 6: Create get_attendance_sessions function
-- ============================================

CREATE OR REPLACE FUNCTION get_attendance_sessions(p_user_id UUID, p_business_date DATE)
RETURNS TABLE(
  id UUID,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  duration INTERVAL
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Authorization: p_user_id must match authenticated user or SUPER_ADMIN
  IF p_user_id != auth.uid() AND NOT public.is_super_admin_active() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access another user''s attendance';
  END IF;
  
  RETURN QUERY
  SELECT
    id,
    time_in,
    time_out,
    CASE 
      WHEN time_out IS NOT NULL THEN time_out - time_in
      ELSE NULL
    END as duration
  FROM public.attendance_sessions
  WHERE user_id = p_user_id
  AND business_date = p_business_date
  ORDER BY time_in ASC;
END;
$$;

-- ============================================
-- STEP 7: Create get_current_attendance_status function
-- ============================================

CREATE OR REPLACE FUNCTION get_current_attendance_status(
  p_user_id UUID
)
RETURNS TABLE(
  has_open_session BOOLEAN,
  latest_time_in TIMESTAMPTZ,
  latest_session_id UUID,
  total_working_time INTERVAL
)
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_date DATE;
BEGIN
  IF p_user_id != auth.uid() AND NOT public.is_super_admin_active() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access another user''s attendance';
  END IF;

  v_business_date := public.get_business_date();

  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1
      FROM public.attendance_sessions AS s
      WHERE s.user_id = p_user_id
        AND s.business_date = v_business_date
        AND s.time_out IS NULL
    ),
    (
      SELECT s.time_in
      FROM public.attendance_sessions AS s
      WHERE s.user_id = p_user_id
        AND s.business_date = v_business_date
      ORDER BY s.time_in DESC
      LIMIT 1
    ),
    (
      SELECT s.id
      FROM public.attendance_sessions AS s
      WHERE s.user_id = p_user_id
        AND s.business_date = v_business_date
        AND s.time_out IS NULL
      ORDER BY s.time_in DESC
      LIMIT 1
    ),
    (
      SELECT COALESCE(SUM(s.time_out - s.time_in), INTERVAL '0')
      FROM public.attendance_sessions AS s
      WHERE s.user_id = p_user_id
        AND s.business_date = v_business_date
        AND s.time_out IS NOT NULL
    );
END;
$$;

-- ============================================
-- STEP 8: Grant and revoke permissions
-- ============================================

-- Revoke execute from PUBLIC for security
REVOKE EXECUTE ON FUNCTION create_attendance_time_in(UUID, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_attendance_time_out(UUID, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_attendance_sessions(UUID, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_current_attendance_status(UUID) FROM PUBLIC;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION create_attendance_time_in(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION update_attendance_time_out(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_sessions(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_attendance_status(UUID) TO authenticated;
