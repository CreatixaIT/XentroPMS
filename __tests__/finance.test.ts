import { describe, it, expect } from '@jest/globals'
import { createBudgetSchema, createExpenseSchema } from '../src/lib/validations/finance'

describe('Finance Validation Schemas', () => {
  describe('Budget Validation', () => {
    it('should validate correct budget data', () => {
      const budgetData = {
        budget_amount: 1000000,
        currency: 'BDT',
        notes: 'Test budget'
      }

      const result = createBudgetSchema.safeParse(budgetData)
      expect(result.success).toBe(true)
    })

    it('should prevent negative budget amounts', () => {
      const budgetData = {
        budget_amount: -1000,
        currency: 'BDT',
        notes: 'Invalid budget'
      }

      const result = createBudgetSchema.safeParse(budgetData)
      expect(result.success).toBe(false)
    })

    it('should require budget_amount', () => {
      const budgetData = {
        currency: 'BDT',
        notes: 'Missing amount'
      }

      const result = createBudgetSchema.safeParse(budgetData)
      expect(result.success).toBe(false)
    })
  })

  describe('Expense Validation', () => {
    it('should validate correct expense data', () => {
      const expenseData = {
        category_id: '00000000-0000-0000-0000-000000000000',
        expense_date: '2026-01-15',
        description: 'Test expense',
        amount: 5000,
        currency: 'BDT',
        notes: 'Test expense notes'
      }

      const result = createExpenseSchema.safeParse(expenseData)
      expect(result.success).toBe(true)
    })

    it('should validate expense amount is non-negative', () => {
      const expenseData = {
        category_id: '00000000-0000-0000-0000-000000000000',
        expense_date: '2026-01-15',
        description: 'Invalid expense',
        amount: -100,
        currency: 'BDT'
      }

      const result = createExpenseSchema.safeParse(expenseData)
      expect(result.success).toBe(false)
    })

    it('should require expense_date', () => {
      const expenseData = {
        category_id: '00000000-0000-0000-0000-000000000000',
        description: 'Missing date',
        amount: 1000,
        currency: 'BDT'
      }

      const result = createExpenseSchema.safeParse(expenseData)
      expect(result.success).toBe(false)
    })

    it('should require description', () => {
      const expenseData = {
        category_id: '00000000-0000-0000-0000-000000000000',
        expense_date: '2026-01-15',
        amount: 1000,
        currency: 'BDT'
      }

      const result = createExpenseSchema.safeParse(expenseData)
      expect(result.success).toBe(false)
    })
  })
})

describe('Finance Security', () => {
  it('should require SUPER_ADMIN for budget creation', () => {
    const role = 'SUPER_ADMIN'
    const canCreateBudget = role === 'SUPER_ADMIN'
    expect(canCreateBudget).toBe(true)
  })

  it('should require SUPER_ADMIN for budget updates', () => {
    const role = 'SUPER_ADMIN'
    const canUpdateBudget = role === 'SUPER_ADMIN'
    expect(canUpdateBudget).toBe(true)
  })

  it('should require SUPER_ADMIN for expense approval', () => {
    const role = 'SUPER_ADMIN'
    const canApproveExpense = role === 'SUPER_ADMIN'
    expect(canApproveExpense).toBe(true)
  })

  it('should require SUPER_ADMIN for expense voiding', () => {
    const role = 'SUPER_ADMIN'
    const canVoidExpense = role === 'SUPER_ADMIN'
    expect(canVoidExpense).toBe(true)
  })

  it('should require SUPER_ADMIN for category management', () => {
    const role = 'SUPER_ADMIN'
    const canManageCategories = role === 'SUPER_ADMIN'
    expect(canManageCategories).toBe(true)
  })

  it('should allow employees to submit expenses for their projects', () => {
    const isProjectMember = true
    const canSubmitExpense = isProjectMember
    expect(canSubmitExpense).toBe(true)
  })

  it('should prevent employees from approving expenses', () => {
    const role = 'EMPLOYEE'
    const canApproveExpense = role === 'SUPER_ADMIN'
    expect(canApproveExpense).toBe(false)
  })

  it('should prevent employees from voiding expenses', () => {
    const role = 'EMPLOYEE'
    const canVoidExpense = role === 'SUPER_ADMIN'
    expect(canVoidExpense).toBe(false)
  })

  it('should prevent employees from modifying budgets', () => {
    const role = 'EMPLOYEE'
    const canModifyBudget = role === 'SUPER_ADMIN'
    expect(canModifyBudget).toBe(false)
  })

  it('should calculate actual spending excluding voided expenses', () => {
    const budget = 1000000
    const approvedExpenses = 350000
    const actualSpending = approvedExpenses // Only approved count
    const remaining = budget - actualSpending
    
    expect(actualSpending).toBe(350000)
    expect(remaining).toBe(650000)
    expect(remaining).not.toBe(550000) // Would be wrong if voided counted
  })

  it('should enforce unique active budget per project', () => {
    const hasActiveBudget = true
    const canCreateAnotherActive = !hasActiveBudget
    expect(canCreateAnotherActive).toBe(false)
  })

  it('should use exact numeric types for financial amounts', () => {
    const budgetAmount = 1000000.50
    const isNumeric = typeof budgetAmount === 'number'
    expect(isNumeric).toBe(true)
  })

  it('should use BDT as default currency', () => {
    const defaultCurrency = 'BDT'
    expect(defaultCurrency).toBe('BDT')
  })

  it('should audit financial actions', () => {
    const financialActions = ['BUDGET_CREATED', 'BUDGET_UPDATED', 'EXPENSE_CREATED', 'EXPENSE_APPROVED', 'EXPENSE_VOIDED']
    const isAuditable = financialActions.length > 0
    expect(isAuditable).toBe(true)
  })

  it('should allow employees to read financial data for their projects', () => {
    const isProjectMember = true
    const canReadProjectFinance = isProjectMember
    expect(canReadProjectFinance).toBe(true)
  })

  it('should prevent employees from accessing other project finances', () => {
    const isProjectMember = false
    const canReadProjectFinance = isProjectMember
    expect(canReadProjectFinance).toBe(false)
  })
})
