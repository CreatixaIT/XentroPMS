-- Fix task project RLS recursion
-- This migration fixes the infinite recursion when creating tasks by using hardened helper functions
-- Migration: 20240930000011_fix_task_project_rls_recursion.sql

-- Create hardened helper function to check if user can insert tasks for a project
CREATE OR REPLACE FUNCTION public.can_insert_task_for_project(p_project_id UUID)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- SUPER_ADMIN can insert tasks for any project
    IF public.is_super_admin(auth.uid()) THEN
        RETURN TRUE;
    END IF;
    
    -- Project creator can insert tasks
    IF EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id
        AND created_by = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Project members can insert tasks
    IF public.is_project_member(p_project_id) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Grant execute permissions
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.can_insert_task_for_project TO authenticated, postgres;
    REVOKE EXECUTE ON FUNCTION public.can_insert_task_for_project FROM PUBLIC;
EXCEPTION WHEN OTHERS THEN
    -- Function might already have permissions, ignore
END $$;

-- Drop old project_tasks INSERT policies
DROP POLICY IF EXISTS "super_admin_full_access_tasks" ON project_tasks;
DROP POLICY IF EXISTS "project_creator_manage_tasks" ON project_tasks;
DROP POLICY IF EXISTS "team_leader_manage_tasks" ON project_tasks;

-- Create new INSERT policy using hardened helper
CREATE POLICY "can_insert_task" ON project_tasks
  FOR INSERT
  WITH CHECK (public.can_insert_task_for_project(project_id));

-- Keep existing SELECT/UPDATE policies that were already fixed
-- SUPER_ADMIN full access for SELECT/UPDATE
CREATE POLICY "super_admin_full_access_tasks" ON project_tasks
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_full_access_tasks_update" ON project_tasks
  FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- Project creator can manage tasks
CREATE POLICY "project_creator_manage_tasks" ON project_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_tasks.project_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "project_creator_manage_tasks_update" ON project_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_tasks.project_id
      AND created_by = auth.uid()
    )
  );

-- Team leaders can manage tasks in their projects
CREATE POLICY "team_leader_manage_tasks" ON project_tasks
  FOR SELECT
  USING (
    public.is_team_leader_active()
    AND public.is_project_member(project_id)
  );

CREATE POLICY "team_leader_manage_tasks_update" ON project_tasks
  FOR UPDATE
  USING (
    public.is_team_leader_active()
    AND public.is_project_member(project_id)
  );

-- Employees can read tasks assigned to them or in their projects
CREATE POLICY "employee_read_tasks" ON project_tasks
  FOR SELECT
  USING (
    public.is_employee_active()
    AND (
      project_tasks.assigned_to = auth.uid()
      OR public.is_project_member(project_id)
    )
  );

-- Employees can update their own assigned tasks (status only)
CREATE POLICY "employee_update_own_task" ON project_tasks
  FOR UPDATE
  USING (
    public.is_employee_active()
    AND project_tasks.assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_employee_active()
    AND project_tasks.assigned_to = auth.uid()
  );
