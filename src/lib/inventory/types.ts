export interface InventoryCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_active: boolean
}

export interface InventoryItem {
  id: string
  category_id: string
  name: string
  sku: string
  description: string | null
  unit: string
  size_specification: string | null
  current_quantity: number
  reorder_level: number
  unit_cost: number
  selling_price: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  category?: InventoryCategory
}

export interface InventoryPurchase {
  id: string
  item_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  purchase_date: string
  supplier_name: string | null
  invoice_reference: string | null
  notes: string | null
  created_by: string
  created_at: string
  item?: InventoryItem
}

export interface InventoryTransaction {
  id: string
  item_id: string
  transaction_type: 'PURCHASE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'MANUAL_CORRECTION'
  quantity: number
  quantity_before: number
  quantity_after: number
  reference_type: string | null
  reference_id: string | null
  reason: string | null
  created_by: string
  created_at: string
  item?: InventoryItem
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface InventoryStats {
  total_items: number
  total_categories: number
  low_stock_count: number
  out_of_stock_count: number
  total_inventory_value: number
}

export interface InventoryListParams {
  search?: string
  category_id?: string
  stock_status?: StockStatus
  sort_by?: 'name' | 'quantity' | 'unit_cost' | 'created_at'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface CreateCategoryInput {
  name: string
  description?: string
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  is_active?: boolean
}

export interface CreateItemInput {
  category_id: string
  name: string
  sku: string
  description?: string
  unit: string
  size_specification?: string
  initial_quantity?: number
  reorder_level?: number
  unit_cost?: number
  selling_price?: number
}

export interface UpdateItemInput {
  category_id?: string
  name?: string
  description?: string
  unit?: string
  size_specification?: string
  reorder_level?: number
  unit_cost?: number
  selling_price?: number
  is_active?: boolean
}

export interface CreatePurchaseInput {
  item_id: string
  quantity: number
  unit_cost: number
  purchase_date?: string
  supplier_name?: string
  invoice_reference?: string
  notes?: string
}

export interface StockAdjustmentInput {
  item_id: string
  adjustment_type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'MANUAL_CORRECTION'
  quantity: number
  reason: string
}
