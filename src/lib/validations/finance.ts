import { z } from 'zod'

export const createBudgetSchema = z.object({
  budget_amount: z.coerce.number().min(0, 'Budget amount must be positive'),
  currency: z.string().default('BDT'),
  notes: z.string().optional()
})

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  description: z.string().max(500, 'Description too long').optional()
})

export const createExpenseSchema = z.object({
  category_id: z.string().uuid('Invalid category ID').optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  currency: z.string().default('BDT'),
  notes: z.string().max(500, 'Notes too long').optional()
})

export const updateExpenseSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'VOIDED']).optional()
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
