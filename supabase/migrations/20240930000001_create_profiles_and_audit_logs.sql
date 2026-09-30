-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  phone TEXT NOT NULL,
  nid TEXT NOT NULL,
  address TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('SUPER_ADMIN', 'TEAM_LEADER', 'EMPLOYEE')),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED', 'BLOCKED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Create indexes for profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- SUPER_ADMIN can read all profiles
CREATE POLICY "SUPER_ADMIN can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Users can update allowed fields of their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id AND
    -- Prevent changing role and status
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent changing role and status
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- SUPER_ADMIN can update all profiles
CREATE POLICY "SUPER_ADMIN can update all profiles"
  ON profiles FOR UPDATE
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

-- SUPER_ADMIN can insert profiles (for admin creation)
CREATE POLICY "SUPER_ADMIN can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- RLS Policies for audit_logs

-- SUPER_ADMIN can read all audit logs
CREATE POLICY "SUPER_ADMIN can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert audit logs
CREATE POLICY "SUPER_ADMIN can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, designation, phone, nid, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'designation', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'nid', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (p_actor_id, p_action, p_target_type, p_target_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
