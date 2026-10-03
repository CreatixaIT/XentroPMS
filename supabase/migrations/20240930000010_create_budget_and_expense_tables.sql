-- Phase 6: Budget and Expense Management
-- Migration: 20240930000010_create_budget_and_expense_tables.sql

-- ============================================
-- EXPENSE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_category_name UNIQUE (name)
);

-- Indexes for expense categories
CREATE INDEX idx_expense_categories_status ON expense_categories(status);
CREATE INDEX idx_expense_categories_created_by ON expense_categories(created_by);

-- ============================================
-- PROJECT BUDGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    budget_amount NUMERIC(15, 2) NOT NULL CHECK (budget_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'REVISED')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for project budgets
CREATE INDEX idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX idx_project_budgets_status ON project_budgets(status);
CREATE INDEX idx_project_budgets_created_by ON project_budgets(created_by);

-- Ensure only one active budget per project
CREATE UNIQUE INDEX idx_project_budgets_unique_active ON project_budgets(project_id) 
WHERE status = 'ACTIVE';

-- ============================================
-- PROJECT EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'VOIDED')),
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for project expenses
CREATE INDEX idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX idx_project_expenses_category_id ON project_expenses(category_id);
CREATE INDEX idx_project_expenses_status ON project_expenses(status);
CREATE INDEX idx_project_expenses_date ON project_expenses(expense_date);
CREATE INDEX idx_project_expenses_submitted_by ON project_expenses(submitted_by);
CREATE INDEX idx_project_expenses_created_by ON project_expenses(created_by);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- EXPENSE CATEGORIES RLS POLICIES
-- ============================================

-- SUPER_ADMIN can do everything
CREATE POLICY "super_admin_full_access_categories" ON expense_categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'SUPER_ADMIN'
        )
    );

-- All authenticated users can read active categories
CREATE POLICY "users_read_active_categories" ON expense_categories
    FOR SELECT
    TO authenticated
    USING (status = 'ACTIVE');

-- ============================================
-- PROJECT BUDGETS RLS POLICIES
-- ============================================

-- SUPER_ADMIN can do everything
CREATE POLICY "super_admin_full_access_budgets" ON project_budgets
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'SUPER_ADMIN'
        )
    );

-- Project members can read budgets for their projects
CREATE POLICY "project_member_read_budgets" ON project_budgets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = project_budgets.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- ============================================
-- PROJECT EXPENSES RLS POLICIES
-- ============================================

-- SUPER_ADMIN can do everything
CREATE POLICY "super_admin_full_access_expenses" ON project_expenses
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'SUPER_ADMIN'
        )
    );

-- Project members can read expenses for their projects
CREATE POLICY "project_member_read_expenses" ON project_expenses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = project_expenses.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- Project members can insert expenses for their projects
CREATE POLICY "project_member_insert_expenses" ON project_expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = project_expenses.project_id
            AND project_members.user_id = auth.uid()
        )
        AND submitted_by = auth.uid()
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at columns
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_expenses_updated_at BEFORE UPDATE ON project_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED EXPENSE CATEGORIES
-- ============================================

INSERT INTO expense_categories (name, description, created_by) VALUES
    ('Materials', 'Construction materials and supplies', (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
    ('Transport', 'Transportation and logistics costs', (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
    ('Labour', 'Labor and workforce costs', (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
    ('Equipment', 'Equipment rental and purchase', (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
    ('Accommodation', 'Accommodation and housing costs', (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
    ('Other', 'Miscellaneous expenses', (SELECT id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1))
ON CONFLICT (name) DO NOTHING;
