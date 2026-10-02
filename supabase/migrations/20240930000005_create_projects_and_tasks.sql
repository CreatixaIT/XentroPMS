-- Migration: Create Projects and Tasks Management System
-- This migration creates tables for projects, project members, components, tasks, daily updates, and activity

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_code TEXT UNIQUE,
    client_name TEXT,
    location TEXT,
    start_date DATE,
    target_end_date DATE,
    actual_end_date DATE,
    status TEXT NOT NULL DEFAULT 'PLANNING',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_project_status CHECK (status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT valid_dates CHECK (
        (start_date IS NULL OR target_end_date IS NULL OR start_date <= target_end_date) AND
        (actual_end_date IS NULL OR start_date IS NULL OR actual_end_date >= start_date)
    )
);

-- Indexes for projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_project_code ON projects(project_code) WHERE project_code IS NOT NULL;
CREATE INDEX idx_projects_dates ON projects(start_date, target_end_date);

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_member_role CHECK (role IN ('PROJECT_MANAGER', 'TEAM_LEADER', 'MEMBER')),
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

-- Indexes for project members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- ============================================
-- PROJECT COMPONENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_quantity CHECK (quantity >= 0)
);

-- Indexes for project components
CREATE INDEX idx_project_components_project_id ON project_components(project_id);

-- ============================================
-- PROJECT TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'TODO',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_task_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
    CONSTRAINT valid_task_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT valid_due_date CHECK (due_date IS NULL OR due_date >= CURRENT_DATE)
);

-- Indexes for project tasks
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON project_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_priority ON project_tasks(priority);
CREATE INDEX idx_project_tasks_due_date ON project_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_project_tasks_created_by ON project_tasks(created_by);

-- ============================================
-- TASK DAILY UPDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_daily_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    update_date DATE NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT unique_daily_update UNIQUE (task_id, user_id, update_date)
);

-- Indexes for task daily updates
CREATE INDEX idx_task_daily_updates_task_id ON task_daily_updates(task_id);
CREATE INDEX idx_task_daily_updates_user_id ON task_daily_updates(user_id);
CREATE INDEX idx_task_daily_updates_date ON task_daily_updates(update_date);

-- ============================================
-- PROJECT ACTIVITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'PROJECT_CREATED',
        'PROJECT_UPDATED',
        'MEMBER_ADDED',
        'MEMBER_REMOVED',
        'COMPONENT_ADDED',
        'COMPONENT_UPDATED',
        'COMPONENT_REMOVED',
        'TASK_CREATED',
        'TASK_ASSIGNED',
        'TASK_UPDATED',
        'TASK_COMPLETED',
        'DAILY_UPDATE_ADDED',
        'PROJECT_STATUS_CHANGED',
        'PROJECT_COMPLETED',
        'PROJECT_CANCELLED'
    ))
);

-- Indexes for project activity
CREATE INDEX idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX idx_project_activity_user_id ON project_activity(user_id);
CREATE INDEX idx_project_activity_type ON project_activity(activity_type);
CREATE INDEX idx_project_activity_created_at ON project_activity(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS RLS POLICIES
-- ============================================

-- SUPER_ADMIN can do everything
CREATE POLICY "super_admin_full_access_projects" ON projects
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SUPER_ADMIN'
            AND profiles.status = 'ACTIVE'
        )
    );

-- Project creator can do everything with their projects
CREATE POLICY "project_creator_full_access" ON projects
    FOR ALL
    USING (
        created_by = auth.uid()
    );

-- Project members can read projects they are members of
CREATE POLICY "project_member_read" ON projects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

-- TEAM_LEADER can read projects they are members of
CREATE POLICY "team_leader_read_projects" ON projects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'TEAM_LEADER'
            AND profiles.status = 'ACTIVE'
        )
        AND EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

-- EMPLOYEE can read projects they are members of
CREATE POLICY "employee_read_projects" ON projects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'EMPLOYEE'
            AND profiles.status = 'ACTIVE'
        )
        AND EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
    );

-- ============================================
-- PROJECT MEMBERS RLS POLICIES
-- ============================================

-- SUPER_ADMIN full access
CREATE POLICY "super_admin_full_access_members" ON project_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SUPER_ADMIN'
            AND profiles.status = 'ACTIVE'
        )
    );

-- Project creator can manage members
CREATE POLICY "project_creator_manage_members" ON project_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_members.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Project members can read members of their projects
CREATE POLICY "project_member_read_members" ON project_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- ============================================
-- PROJECT COMPONENTS RLS POLICIES
-- ============================================

-- SUPER_ADMIN full access
CREATE POLICY "super_admin_full_access_components" ON project_components
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SUPER_ADMIN'
            AND profiles.status = 'ACTIVE'
        )
    );

-- Project creator can manage components
CREATE POLICY "project_creator_manage_components" ON project_components
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_components.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Project members can read components
CREATE POLICY "project_member_read_components" ON project_components
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = project_components.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- ============================================
-- PROJECT TASKS RLS POLICIES
-- ============================================

-- SUPER_ADMIN full access
CREATE POLICY "super_admin_full_access_tasks" ON project_tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SUPER_ADMIN'
            AND profiles.status = 'ACTIVE'
        )
    );

-- Project creator can manage tasks
CREATE POLICY "project_creator_manage_tasks" ON project_tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_tasks.project_id
            AND projects.created_by = auth.uid()
        )
    );

-- Team leaders can manage tasks in their projects
CREATE POLICY "team_leader_manage_tasks" ON project_tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'TEAM_LEADER'
            AND profiles.status = 'ACTIVE'
        )
        AND EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = project_tasks.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- Employees can read tasks assigned to them or in their projects
CREATE POLICY "employee_read_tasks" ON project_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'EMPLOYEE'
            AND profiles.status = 'ACTIVE'
        )
        AND (
            project_tasks.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM project_members
                WHERE project_members.project_id = project_tasks.project_id
                AND project_members.user_id = auth.uid()
            )
        )
    );

-- Employees can update their own assigned tasks (status only)
CREATE POLICY "employee_update_own_task" ON project_tasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'EMPLOYEE'
            AND profiles.status = 'ACTIVE'
        )
        AND project_tasks.assigned_to = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'EMPLOYEE'
            AND profiles.status = 'ACTIVE'
        )
        AND project_tasks.assigned_to = auth.uid()
    );

-- ============================================
-- TASK DAILY UPDATES RLS POLICIES
-- ============================================

-- SUPER_ADMIN full access
CREATE POLICY "super_admin_full_access_updates" ON task_daily_updates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SUPER_ADMIN'
            AND profiles.status = 'ACTIVE'
        )
    );

-- Task assignee can create and read their own updates
CREATE POLICY "assignee_manage_updates" ON task_daily_updates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_tasks
            WHERE project_tasks.id = task_daily_updates.task_id
            AND project_tasks.assigned_to = auth.uid()
        )
        AND task_daily_updates.user_id = auth.uid()
    );

-- Project creator can read updates for their project tasks
CREATE POLICY "project_creator_read_updates" ON task_daily_updates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_tasks
            JOIN projects ON projects.id = project_tasks.project_id
            WHERE project_tasks.id = task_daily_updates.task_id
            AND projects.created_by = auth.uid()
        )
    );

-- ============================================
-- PROJECT ACTIVITY RLS POLICIES
-- ============================================

-- SUPER_ADMIN full access
CREATE POLICY "super_admin_full_access_activity" ON project_activity
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SUPER_ADMIN'
            AND profiles.status = 'ACTIVE'
        )
    );

-- Project members can read activity for their projects
CREATE POLICY "project_member_read_activity" ON project_activity
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = project_activity.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_components_updated_at BEFORE UPDATE ON project_components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_daily_updates_updated_at BEFORE UPDATE ON task_daily_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to add project activity
CREATE OR REPLACE FUNCTION add_project_activity(
    p_project_id UUID,
    p_user_id UUID,
    p_activity_type TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO project_activity (project_id, user_id, activity_type, description, metadata)
    VALUES (p_project_id, p_user_id, p_activity_type, p_description, p_metadata)
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = p_project_id
        AND project_members.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is project creator
CREATE OR REPLACE FUNCTION is_project_creator(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = p_project_id
        AND projects.created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = p_user_id
        AND profiles.role = 'SUPER_ADMIN'
        AND profiles.status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate project progress
CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total_tasks INTEGER;
    v_completed_tasks INTEGER;
    v_progress NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_tasks
    FROM project_tasks
    WHERE project_tasks.project_id = p_project_id;
    
    IF v_total_tasks = 0 THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO v_completed_tasks
    FROM project_tasks
    WHERE project_tasks.project_id = p_project_id
    AND project_tasks.status = 'COMPLETED';
    
    v_progress = (v_completed_tasks::NUMERIC / v_total_tasks::NUMERIC) * 100;
    RETURN ROUND(v_progress, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
