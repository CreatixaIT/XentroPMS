export interface ProjectBudget {
  id: string
  project_id: string
  budget_amount: number
  currency: string
  status: 'ACTIVE' | 'INACTIVE' | 'REVISED'
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectExpense {
  id: string
  project_id: string
  category_id: string | null
  expense_date: string
  description: string
  amount: number
  currency: string
  status: 'SUBMITTED' | 'APPROVED' | 'VOIDED'
  submitted_by: string
  created_by: string
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  expense_categories?: ExpenseCategory
  submitted_by_profile?: {
    id: string
    full_name: string
    email: string
  }
  approved_by_profile?: {
    id: string
    full_name: string
    email: string
  }
}

export interface FinancialSummary {
  planned_budget: number
  actual_spending: number
  remaining_budget: number
  currency: string
  expenses_by_category: {
    category_name: string
    total_amount: number
  }[]
}
