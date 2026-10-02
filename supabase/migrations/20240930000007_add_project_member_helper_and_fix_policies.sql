-- Add is_project_member helper function and fix remaining RLS recursion
-- This migration adds the missing helper function and updates policies that use project_members
-- Migration: 20240930000007_add_project_member_helper_and_fix_policies.sql

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

-- Grant execute permissions (ignore if already granted)
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.is_project_member TO authenticated, postgres;
    REVOKE EXECUTE ON FUNCTION public.is_project_member FROM PUBLIC;
EXCEPTION WHEN OTHERS THEN
    -- Function might already have permissions, ignore
END $$;

-- Fix project_members policies
DROP POLICY IF EXISTS "project_member_read_members" ON project_members;
CREATE POLICY "project_member_read_members"
  ON project_members FOR SELECT
  USING (public.is_project_member(project_id));

-- Fix project_components policies
DROP POLICY IF EXISTS "project_member_read_components" ON project_components;
CREATE POLICY "project_member_read_components"
  ON project_components FOR SELECT
  USING (public.is_project_member(project_id));

-- Fix projects policies that use project_members
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

-- Fix project_tasks policies that use project_members
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

-- Fix project_activity policy that uses project_members
DROP POLICY IF EXISTS "project_member_read_activity" ON project_activity;
CREATE POLICY "project_member_read_activity"
  ON project_activity FOR SELECT
  USING (public.is_project_member(project_id));
