import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional()
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional()
})

export const createItemSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Item name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1, 'Unit is required').max(20),
  size_specification: z.string().max(100).optional(),
  initial_quantity: z.number().min(0, 'Initial quantity cannot be negative').default(0),
  reorder_level: z.number().min(0, 'Reorder level cannot be negative').default(0),
  unit_cost: z.number().min(0, 'Unit cost cannot be negative').default(0),
  selling_price: z.number().min(0, 'Selling price cannot be negative').optional()
})

export const updateItemSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1).max(20).optional(),
  size_specification: z.string().max(100).optional(),
  reorder_level: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  is_active: z.boolean().optional()
})

export const createPurchaseSchema = z.object({
  item_id: z.string().uuid('Invalid item ID'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit_cost: z.number().min(0, 'Unit cost cannot be negative'),
  purchase_date: z.string().optional(),
  supplier_name: z.string().max(200).optional(),
  invoice_reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional()
})

export const stockAdjustmentSchema = z.object({
  item_id: z.string().uuid('Invalid item ID'),
  adjustment_type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'MANUAL_CORRECTION']),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required').max(500)
})

export const inventoryListSchema = z.object({
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  stock_status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  sort_by: z.enum(['name', 'quantity', 'unit_cost', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
export type InventoryListInput = z.infer<typeof inventoryListSchema>
