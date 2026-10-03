-- Comprehensive fix for projects RLS recursion
-- This migration properly fixes all project_creator policies that cause recursion
-- Migration: 20240930000013_comprehensive_fix_projects_rls.sql

-- ============================================
-- Step 1: Create hardened helper for project creator check
-- ============================================

CREATE OR REPLACE FUNCTION public.is_project_creator(p_project_id UUID)
RETURNS BOOLEAN
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id
        AND created_by = auth.uid()
    );
END;
$$;

-- Grant execute permissions
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.is_project_creator TO authenticated, postgres;
    REVOKE EXECUTE ON FUNCTION public.is_project_creator FROM PUBLIC;
EXCEPTION WHEN OTHERS THEN
    -- Function might already have permissions, ignore
END $$;

-- ============================================
-- Step 2: Drop ALL problematic project_creator policies
-- ============================================

-- On projects table (no INSERT policy needed for project_creator, the DEFAULT created_by works)
DROP POLICY IF EXISTS "project_creator_full_access" ON projects;

-- On project_members
DROP POLICY IF EXISTS "project_creator_manage_members" ON project_members;

-- On project_components
DROP POLICY IF EXISTS "project_creator_manage_components" ON project_components;

-- On project_tasks
DROP POLICY IF EXISTS "project_creator_manage_tasks" ON project_tasks;

-- On task_daily_updates
DROP POLICY IF EXISTS "project_creator_read_updates" ON task_daily_updates;

-- Also drop the incomplete policies from 00011
DROP POLICY IF EXISTS "can_insert_task" ON project_tasks;
DROP POLICY IF EXISTS "super_admin_full_access_tasks" ON project_tasks;
DROP POLICY IF EXISTS "super_admin_full_access_tasks_update" ON project_tasks;
DROP POLICY IF EXISTS "project_creator_manage_tasks" ON project_tasks;
DROP POLICY IF EXISTS "project_creator_manage_tasks_update" ON project_tasks;

-- ============================================
-- Step 3: Re-create proper SUPER_ADMIN policies on projects
-- ============================================

CREATE POLICY "super_admin_full_access_projects"
  ON projects FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

-- ============================================
-- Step 4: Re-create proper project_creator policies using helper
-- ============================================

-- Project creator can manage members
CREATE POLICY "project_creator_manage_members"
  ON project_members FOR ALL
  USING (public.is_project_creator(project_id))
  WITH CHECK (public.is_project_creator(project_id));

-- Project creator can manage components
CREATE POLICY "project_creator_manage_components"
  ON project_components FOR ALL
  USING (public.is_project_creator(project_id))
  WITH CHECK (public.is_project_creator(project_id));

-- Project creator can manage tasks
CREATE POLICY "project_creator_manage_tasks"
  ON project_tasks FOR ALL
  USING (public.is_project_creator(project_id))
  WITH CHECK (public.is_project_creator(project_id));

-- Project creator can read task updates
CREATE POLICY "project_creator_read_updates"
  ON task_daily_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_tasks pt
      WHERE pt.id = task_daily_updates.task_id
      AND pt.created_by = auth.uid()
    )
  );

-- ============================================
-- Step 5: Re-create SUPER_ADMIN policies on other tables
-- ============================================

CREATE POLICY "super_admin_full_access_tasks"
  ON project_tasks FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

CREATE POLICY "super_admin_full_access_members"
  ON project_members FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

CREATE POLICY "super_admin_full_access_components"
  ON project_components FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

CREATE POLICY "super_admin_full_access_updates"
  ON task_daily_updates FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

CREATE POLICY "super_admin_full_access_activity"
  ON project_activity FOR ALL
  USING (public.is_super_admin_active())
  WITH CHECK (public.is_super_admin_active());

-- ============================================
-- Step 6: Ensure team_leader and employee policies use helpers
-- ============================================

-- These should already be correct from 00006, but let's verify

DROP POLICY IF EXISTS "team_leader_manage_tasks" ON project_tasks;
CREATE POLICY "team_leader_manage_tasks"
  ON project_tasks FOR ALL
  USING (
    public.is_team_leader_active()
    AND public.is_project_member(project_id)
  )
  WITH CHECK (
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
