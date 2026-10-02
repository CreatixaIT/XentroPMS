-- Complete RLS Recursion Fix including project_members helper
-- This migration fixes all RLS recursion issues including project_members self-referential queries
-- Migration: 20240930000006_fix_rls_recursion_complete.sql

-- ============================================
-- Step 1: Create hardened session-based helper functions
-- ============================================

-- Create or replace is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'SUPER_ADMIN'
    );
END;
$$;

-- Create or replace is_team_leader() function
CREATE OR REPLACE FUNCTION public.is_team_leader()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'TEAM_LEADER'
    );
END;
$$;

-- Create or replace is_employee() function
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'EMPLOYEE'
    );
END;
$$;

-- Create or replace is_team_leader_active() function
CREATE OR REPLACE FUNCTION public.is_team_leader_active()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'TEAM_LEADER'
        AND status = 'ACTIVE'
    );
END;
$$;

-- Create or replace is_employee_active() function
CREATE OR REPLACE FUNCTION public.is_employee_active()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'EMPLOYEE'
        AND status = 'ACTIVE'
    );
END;
$$;

-- Create or replace is_super_admin_active() function
CREATE OR REPLACE FUNCTION public.is_super_admin_active()
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND status = 'ACTIVE'
    );
END;
$$;

-- Create helper function to check if user is project member
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
    );
END;
$$;

-- Grant execute permissions to authenticated role and postgres for all functions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.is_team_leader() TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.is_employee() TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.is_team_leader_active() TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.is_employee_active() TO authenticated, postgres;
GRANT EXECUTE ON FUNCTION public.is_super_admin_active() TO authenticated, postgres;

-- Grant execute permissions for is_project_member (ignore if already granted)
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.is_project_member TO authenticated, postgres;
EXCEPTION WHEN OTHERS THEN
    -- Function might already have permissions, ignore
END $$;

-- Revoke execute from PUBLIC for security
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_team_leader() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_employee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_team_leader_active() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_employee_active() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_active() FROM PUBLIC;

-- Revoke execute from PUBLIC for is_project_member (ignore if already revoked)
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.is_project_member FROM PUBLIC;
EXCEPTION WHEN OTHERS THEN
    -- Function might already be revoked, ignore
END $$;

-- ============================================
-- Step 2: Fix profiles table policies (self-referential)
-- ============================================

DROP POLICY IF EXISTS "SUPER_ADMIN can read all profiles" ON profiles;
CREATE POLICY "SUPER_ADMIN can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can update all profiles" ON profiles;
CREATE POLICY "SUPER_ADMIN can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can insert profiles" ON profiles;
CREATE POLICY "SUPER_ADMIN can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ============================================
-- Step 3: Fix audit_logs table policies
-- ============================================

DROP POLICY IF EXISTS "SUPER_ADMIN can read audit logs" ON audit_logs;
CREATE POLICY "SUPER_ADMIN can read audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can insert audit logs" ON audit_logs;
CREATE POLICY "SUPER_ADMIN can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ============================================
-- Step 4: Fix notifications table policies
-- ============================================

DROP POLICY IF EXISTS "SUPER_ADMIN can read all notifications" ON notifications;
CREATE POLICY "SUPER_ADMIN can read all notifications"
  ON notifications FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can insert notifications" ON notifications;
CREATE POLICY "SUPER_ADMIN can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ============================================
-- Step 5: Fix attendance_settings table policies
-- ============================================

DROP POLICY IF EXISTS "SUPER_ADMIN can read attendance settings" ON attendance_settings;
CREATE POLICY "SUPER_ADMIN can read attendance settings"
  ON attendance_settings FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can insert attendance settings" ON attendance_settings;
CREATE POLICY "SUPER_ADMIN can insert attendance settings"
  ON attendance_settings FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can update attendance settings" ON attendance_settings;
CREATE POLICY "SUPER_ADMIN can update attendance settings"
  ON attendance_settings FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================
-- Step 6: Fix attendance_records table policies
-- ============================================

DROP POLICY IF EXISTS "SUPER_ADMIN can read all attendance records" ON attendance_records;
CREATE POLICY "SUPER_ADMIN can read all attendance records"
  ON attendance_records FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can insert attendance records" ON attendance_records;
CREATE POLICY "SUPER_ADMIN can insert attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "SUPER_ADMIN can update attendance records" ON attendance_records;
CREATE POLICY "SUPER_ADMIN can update attendance records"
  ON attendance_records FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "TEAM_LEADER can read own attendance records" ON attendance_records;
CREATE POLICY "TEAM_LEADER can read own attendance records"
  ON attendance_records FOR SELECT
  USING (
    auth.uid() = user_id
    AND public.is_team_leader()
  );

-- ============================================
-- Step 7: Fix inventory_categories table policies
-- ============================================

DROP POLICY IF EXISTS "Super admin can read all categories" ON inventory_categories;
CREATE POLICY "SUPER_ADMIN can read all categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can insert categories" ON inventory_categories;
CREATE POLICY "SUPER_ADMIN can insert categories"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update categories" ON inventory_categories;
CREATE POLICY "SUPER_ADMIN can update categories"
  ON inventory_categories FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete categories" ON inventory_categories;
CREATE POLICY "SUPER_ADMIN can delete categories"
  ON inventory_categories FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================
-- Step 8: Fix inventory_items table policies
-- ============================================

DROP POLICY IF EXISTS "Super admin can read all items" ON inventory_items;
CREATE POLICY "SUPER_ADMIN can read all items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can insert items" ON inventory_items;
CREATE POLICY "SUPER_ADMIN can insert items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update items" ON inventory_items;
CREATE POLICY "SUPER_ADMIN can update items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can delete items" ON inventory_items;
CREATE POLICY "SUPER_ADMIN can delete items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================
-- Step 9: Fix inventory_purchases table policies
-- ============================================

DROP POLICY IF EXISTS "Super admin can insert purchases" ON inventory_purchases;
CREATE POLICY "SUPER_ADMIN can insert purchases"
  ON inventory_purchases FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- ============================================
-- Step 10: Fix projects table policies
-- ============================================

DROP POLICY IF EXISTS "super_admin_full_access_projects" ON projects;
CREATE POLICY "super_admin_full_access_projects"
  ON projects FOR ALL
  USING (public.is_super_admin_active());

DROP POLICY IF EXISTS "team_leader_read_projects" ON projects;
CREATE POLICY "team_leader_read_projects"
  ON projects FOR SELECT
  USING (
    public.is_team_leader_active()
    AND public.is_project_member(id)
  );

DROP POLICY IF EXISTS "employee_read_projects" ON projects;
CREATE POLICY "employee_read_projects"
  ON projects FOR SELECT
  USING (
    public.is_employee_active()
    AND public.is_project_member(id)
  );

-- ============================================
-- Step 11: Fix project_members table policies
-- ============================================

DROP POLICY IF EXISTS "super_admin_full_access_members" ON project_members;
CREATE POLICY "super_admin_full_access_members"
  ON project_members FOR ALL
  USING (public.is_super_admin_active());

DROP POLICY IF EXISTS "project_member_read_members" ON project_members;
CREATE POLICY "project_member_read_members"
  ON project_members FOR SELECT
  USING (public.is_project_member(project_id));

-- ============================================
-- Step 12: Fix project_components table policies
-- ============================================

DROP POLICY IF EXISTS "super_admin_full_access_components" ON project_components;
CREATE POLICY "super_admin_full_access_components"
  ON project_components FOR ALL
  USING (public.is_super_admin_active());

DROP POLICY IF EXISTS "project_member_read_components" ON project_components;
CREATE POLICY "project_member_read_components"
  ON project_components FOR SELECT
  USING (public.is_project_member(project_id));

-- ============================================
-- Step 13: Fix project_tasks table policies
-- ============================================

DROP POLICY IF EXISTS "super_admin_full_access_tasks" ON project_tasks;
CREATE POLICY "super_admin_full_access_tasks"
  ON project_tasks FOR ALL
  USING (public.is_super_admin_active());

DROP POLICY IF EXISTS "team_leader_manage_tasks" ON project_tasks;
CREATE POLICY "team_leader_manage_tasks"
  ON project_tasks FOR ALL
  USING (
    public.is_team_leader_active()
    AND public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS "employee_read_tasks" ON project_tasks;
CREATE POLICY "employee_read_tasks"
  ON project_tasks FOR SELECT
  USING (
    public.is_employee_active()
    AND (
      project_tasks.assigned_to = auth.uid()
      OR public.is_project_member(project_id)
    )
  );

DROP POLICY IF EXISTS "employee_update_own_task" ON project_tasks;
CREATE POLICY "employee_update_own_task"
  ON project_tasks FOR UPDATE
  USING (
    public.is_employee_active()
    AND project_tasks.assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_employee_active()
    AND project_tasks.assigned_to = auth.uid()
  );

-- ============================================
-- Step 14: Fix task_daily_updates table policies
-- ============================================

DROP POLICY IF EXISTS "super_admin_full_access_updates" ON task_daily_updates;
CREATE POLICY "super_admin_full_access_updates"
  ON task_daily_updates FOR ALL
  USING (public.is_super_admin_active());

-- ============================================
-- Step 15: Fix project_activity table policies
-- ============================================

DROP POLICY IF EXISTS "super_admin_full_access_activity" ON project_activity;
CREATE POLICY "super_admin_full_access_activity"
  ON project_activity FOR ALL
  USING (public.is_super_admin_active());

DROP POLICY IF EXISTS "project_member_read_activity" ON project_activity;
CREATE POLICY "project_member_read_activity"
  ON project_activity FOR SELECT
  USING (public.is_project_member(project_id));
