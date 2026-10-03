import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireSuperAdmin()
    const supabase = await createClient()
    
    // Get all active budgets
    const { data: budgets } = await supabase
      .from('project_budgets')
      .select('project_id, budget_amount, currency')
      .eq('status', 'ACTIVE')
    
    const totalPlannedBudget = (budgets || []).reduce((sum, b) => sum + Number(b.budget_amount), 0)
    const currency = budgets?.[0]?.currency || 'BDT'
    
    // Get all approved expenses (excluding voided)
    const { data: expenses } = await supabase
      .from('project_expenses')
      .select(`
        id,
        amount,
        project_id,
        expense_date,
        status,
        description,
        currency,
        expense_categories(name),
        projects(name)
      `)
      .eq('status', 'APPROVED')
      .order('expense_date', { ascending: false })
      .limit(50)
    
    const totalActualSpending = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)
    const totalRemainingBudget = totalPlannedBudget - totalActualSpending
    
    // Calculate spending by category
    const expensesByCategory: Record<string, number> = {}
    ;(expenses || []).forEach((exp) => {
      // @ts-expect-error - Supabase nested join typing
      const categoryName = exp.expense_categories?.name || 'Uncategorized'
      expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Number(exp.amount)
    })
    
    // Get project-level summaries
    const projectSummaries = (budgets || []).map((budget) => {
      const projectExpenses = (expenses || []).filter((e) => e.project_id === budget.project_id)
      const projectSpending = projectExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      
      return {
        project_id: budget.project_id,
        // @ts-expect-error - Supabase nested join typing
        project_name: projectExpenses[0]?.projects?.name || 'Unknown Project',
        planned_budget: Number(budget.budget_amount),
        actual_spending: projectSpending,
        remaining_budget: Number(budget.budget_amount) - projectSpending,
        currency: budget.currency
      }
    })
    
    // Format recent expenses
    const recentExpenses = (expenses || []).slice(0, 20).map((exp) => ({
      id: exp.id,
      description: exp.description,
      amount: Number(exp.amount),
      currency: exp.currency,
      status: exp.status,
      expense_date: exp.expense_date,
      // @ts-expect-error - Supabase nested join typing
      project_name: exp.projects?.name || 'Unknown',
      // @ts-expect-error - Supabase nested join typing
      category_name: exp.expense_categories?.name || 'Uncategorized'
    }))
    
    const summary = {
      total_planned_budget: totalPlannedBudget,
      total_actual_spending: totalActualSpending,
      total_remaining_budget: totalRemainingBudget,
      currency,
      expenses_by_category: Object.entries(expensesByCategory).map(([category_name, total_amount]) => ({
        category_name,
        total_amount
      })),
      recent_expenses: recentExpenses,
      project_summaries: projectSummaries
    }
    
    return NextResponse.json({ 
      success: true,
      summary
    })
  } catch (error: unknown) {
    console.error('Get financial overview error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial overview' },
      { status: 500 }
    )
  }
}
