import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, requireSuperAdmin, requireProjectAccess } from '@/lib/auth/authorization'
import type { ProjectBudget, ExpenseCategory, ProjectExpense, FinancialSummary } from './types'

/**
 * Get project budget
 */
export async function getProjectBudget(projectId: string): Promise<ProjectBudget | null> {
  await requireProjectAccess(projectId)
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_budgets')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE')
    .single()
  
  if (error) {
    console.error('Error fetching project budget:', error)
    return null
  }
  
  return data
}

/**
 * Create or update project budget
 */
export async function upsertProjectBudget(
  projectId: string,
  data: {
    budget_amount: number
    currency?: string
    notes?: string
  }
): Promise<ProjectBudget> {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  // Check if active budget exists
  const { data: existing } = await supabase
    .from('project_budgets')
    .select('id, budget_amount')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE')
    .single()
  
  let budget: ProjectBudget
  let oldAmount = 0
  
  if (existing) {
    oldAmount = existing.budget_amount || 0
    // Update existing budget
    const { data: updated, error } = await supabase
      .from('project_budgets')
      .update({
        budget_amount: data.budget_amount,
        currency: data.currency || 'BDT',
        notes: data.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) throw error
    budget = updated
    
    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'BUDGET_UPDATED',
      target_type: 'project_budget',
      target_id: budget.id,
      metadata: {
        project_id: projectId,
        old_amount: oldAmount,
        new_amount: data.budget_amount
      }
    })
  } else {
    // Create new budget
    const { data: created, error } = await supabase
      .from('project_budgets')
      .insert({
        project_id: projectId,
        budget_amount: data.budget_amount,
        currency: data.currency || 'BDT',
        status: 'ACTIVE',
        notes: data.notes,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) throw error
    budget = created
    
    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'BUDGET_CREATED',
      target_type: 'project_budget',
      target_id: budget.id,
      metadata: {
        project_id: projectId,
        amount: data.budget_amount
      }
    })
  }
  
  return budget
}

/**
 * Get expense categories
 */
export async function getExpenseCategories(includeInactive = false): Promise<ExpenseCategory[]> {
  await requireAuthenticatedUser()
  
  const supabase = await createClient()
  
  let query = supabase
    .from('expense_categories')
    .select('*')
    .order('name')
  
  if (!includeInactive) {
    query = query.eq('status', 'ACTIVE')
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching expense categories:', error)
    return []
  }
  
  return data || []
}

/**
 * Create expense category
 */
export async function createExpenseCategory(
  data: {
    name: string
    description?: string
  }
): Promise<ExpenseCategory> {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  const { data: category, error } = await supabase
    .from('expense_categories')
    .insert({
      name: data.name,
      description: data.description || null,
      status: 'ACTIVE',
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action: 'EXPENSE_CATEGORY_CREATED',
    target_type: 'expense_category',
    target_id: category.id,
    metadata: { name: data.name }
  })
  
  return category
}

/**
 * Update expense category
 */
export async function updateExpenseCategory(
  categoryId: string,
  data: {
    name: string
    description?: string
  }
): Promise<ExpenseCategory> {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  const { data: category, error } = await supabase
    .from('expense_categories')
    .update({
      name: data.name,
      description: data.description || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', categoryId)
    .select()
    .single()
  
  if (error) throw error
  
  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action: 'EXPENSE_CATEGORY_UPDATED',
    target_type: 'expense_category',
    target_id: category.id,
    metadata: { name: data.name }
  })
  
  return category
}

/**
 * Delete expense category
 */
export async function deleteExpenseCategory(categoryId: string): Promise<void> {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', categoryId)
  
  if (error) throw error
  
  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action: 'EXPENSE_CATEGORY_DELETED',
    target_type: 'expense_category',
    target_id: categoryId,
    metadata: {}
  })
}

/**
 * Get project expenses
 */
export async function getProjectExpenses(
  projectId: string,
  filters?: {
    status?: 'SUBMITTED' | 'APPROVED' | 'VOIDED'
    category_id?: string
    date_from?: string
    date_to?: string
  }
): Promise<ProjectExpense[]> {
  await requireProjectAccess(projectId)
  
  const supabase = await createClient()
  
  let query = supabase
    .from('project_expenses')
    .select(`
      *,
      expense_categories(id, name),
      submitted_by_profile(id, full_name, email),
      approved_by_profile(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  
  if (filters?.date_from) {
    query = query.gte('expense_date', filters.date_from)
  }
  
  if (filters?.date_to) {
    query = query.lte('expense_date', filters.date_to)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching project expenses:', error)
    return []
  }
  
  return data || []
}

/**
 * Create project expense
 */
export async function createProjectExpense(
  projectId: string,
  data: {
    category_id?: string
    expense_date: string
    description: string
    amount: number
    currency?: string
    notes?: string
  }
): Promise<ProjectExpense> {
  const user = await requireProjectAccess(projectId)
  const supabase = await createClient()
  
  // Verify user is a project member
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
  
  if (!member && user.role !== 'SUPER_ADMIN') {
    throw new Error('You are not a member of this project')
  }
  
  const { data: expense, error } = await supabase
    .from('project_expenses')
    .insert({
      project_id: projectId,
      category_id: data.category_id || null,
      expense_date: data.expense_date,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'BDT',
      status: 'SUBMITTED',
      submitted_by: user.id,
      created_by: user.id,
      notes: data.notes || null
    })
    .select(`
      *,
      expense_categories(id, name),
      submitted_by_profile(id, full_name, email)
    `)
    .single()
  
  if (error) throw error
  
  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action: 'EXPENSE_SUBMITTED',
    target_type: 'project_expense',
    target_id: expense.id,
    metadata: {
      project_id: projectId,
      amount: data.amount,
      status: 'SUBMITTED'
    }
  })
  
  return expense
}

/**
 * Approve expense
 */
export async function approveExpense(expenseId: string): Promise<ProjectExpense> {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  const { data: expense, error } = await supabase
    .from('project_expenses')
    .update({
      status: 'APPROVED',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', expenseId)
    .select(`
      *,
      expense_categories(id, name),
      submitted_by_profile(id, full_name, email),
      approved_by_profile(id, full_name, email)
    `)
    .single()
  
  if (error) throw error
  
  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action: 'EXPENSE_APPROVED',
    target_type: 'project_expense',
    target_id: expense.id,
    metadata: {
      amount: expense.amount,
      project_id: expense.project_id
    }
  })
  
  return expense
}

/**
 * Void expense
 */
export async function voidExpense(expenseId: string): Promise<ProjectExpense> {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  const { data: expense, error } = await supabase
    .from('project_expenses')
    .update({
      status: 'VOIDED'
    })
    .eq('id', expenseId)
    .select(`
      *,
      expense_categories(id, name),
      submitted_by_profile(id, full_name, email),
      approved_by_profile(id, full_name, email)
    `)
    .single()
  
  if (error) throw error
  
  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    action: 'EXPENSE_VOIDED',
    target_type: 'project_expense',
    target_id: expense.id,
    metadata: {
      amount: expense.amount,
      project_id: expense.project_id
    }
  })
  
  return expense
}

/**
 * Get financial summary for a project
 */
export async function getFinancialSummary(projectId: string): Promise<FinancialSummary> {
  await requireProjectAccess(projectId)
  
  const supabase = await createClient()
  
  // Get active budget
  const { data: budget } = await supabase
    .from('project_budgets')
    .select('budget_amount, currency')
    .eq('project_id', projectId)
    .eq('status', 'ACTIVE')
    .single()
  
  const plannedBudget = budget?.budget_amount || 0
  const currency = budget?.currency || 'BDT'
  
  // Get actual spending (approved expenses only, voided excluded)
  const { data: expenses } = await supabase
    .from('project_expenses')
    .select('amount')
    .eq('project_id', projectId)
    .eq('status', 'APPROVED')
  
  const actualSpending = (expenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0)
  const remainingBudget = plannedBudget - actualSpending
  
  // Get expenses by category
  const { data: categoryExpenses } = await supabase
    .from('project_expenses')
    .select(`
      amount,
      expense_categories!inner(name)
    `)
    .eq('project_id', projectId)
    .eq('status', 'APPROVED')
  
  const expensesByCategory: Record<string, number> = {}
  ;(categoryExpenses || []).forEach((exp) => {
    const categoryName = (exp as { expense_categories?: { name: string }[] }).expense_categories?.[0]?.name || 'Uncategorized'
    expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Number(exp.amount)
  })
  
  return {
    planned_budget: plannedBudget,
    actual_spending: actualSpending,
    remaining_budget: remainingBudget,
    currency,
    expenses_by_category: Object.entries(expensesByCategory).map(([category_name, total_amount]) => ({
      category_name,
      total_amount
    }))
  }
}
