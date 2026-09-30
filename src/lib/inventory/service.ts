import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, requireActiveAccount, requireSuperAdmin } from '@/lib/auth/authorization'
import type {
  InventoryCategory,
  InventoryItem,
  InventoryPurchase,
  InventoryTransaction,
  InventoryStats,
  InventoryListParams,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateItemInput,
  UpdateItemInput,
  CreatePurchaseInput,
  StockAdjustmentInput,
  StockStatus
} from './types'

/**
 * Calculate stock status based on current quantity and reorder level
 */
export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.current_quantity === 0) {
    return 'OUT_OF_STOCK'
  }
  if (item.current_quantity <= item.reorder_level) {
    return 'LOW_STOCK'
  }
  return 'IN_STOCK'
}

/**
 * Get inventory statistics
 */
export async function getInventoryStats(): Promise<InventoryStats> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  // Get total active items
  const { count: totalItems } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Get total active categories
  const { count: totalCategories } = await supabase
    .from('inventory_categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Get low stock items
  const { count: lowStockCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('current_quantity', 'reorder_level')
    .gt('current_quantity', 0)

  // Get out of stock items
  const { count: outOfStockCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('current_quantity', 0)

  // Get total inventory value
  const { data: items } = await supabase
    .from('inventory_items')
    .select('current_quantity, unit_cost')
    .eq('is_active', true)

  const totalInventoryValue = items?.reduce(
    (sum, item) => sum + (item.current_quantity * item.unit_cost),
    0
  ) || 0

  return {
    total_items: totalItems || 0,
    total_categories: totalCategories || 0,
    low_stock_count: lowStockCount || 0,
    out_of_stock_count: outOfStockCount || 0,
    total_inventory_value: totalInventoryValue
  }
}

/**
 * Get all inventory categories
 */
export async function getCategories(includeInactive = false): Promise<InventoryCategory[]> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  let query = supabase
    .from('inventory_categories')
    .select('*')
    .order('name')

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: string): Promise<InventoryCategory | null> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

/**
 * Create a new category
 */
export async function createCategory(input: CreateCategoryInput): Promise<InventoryCategory> {
  await requireSuperAdmin()

  const supabase = await createClient()
  const user = await requireAuthenticatedUser()

  const { data, error } = await supabase
    .from('inventory_categories')
    .insert({
      name: input.name,
      description: input.description || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Update a category
 */
export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<InventoryCategory> {
  await requireSuperAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Get inventory items with filtering and pagination
 */
export async function getInventoryItems(params: InventoryListParams = {}): Promise<{
  items: InventoryItem[]
  total: number
}> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  let query = supabase
    .from('inventory_items')
    .select('*, category:inventory_categories(*)', { count: 'exact' })
    .eq('is_active', true)

  // Search by name or SKU
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`)
  }

  // Filter by category
  if (params.category_id) {
    query = query.eq('category_id', params.category_id)
  }

  // Filter by stock status
  if (params.stock_status) {
    switch (params.stock_status) {
      case 'IN_STOCK':
        query = query.gt('current_quantity', 'reorder_level')
        break
      case 'LOW_STOCK':
        query = query.lte('current_quantity', 'reorder_level').gt('current_quantity', 0)
        break
      case 'OUT_OF_STOCK':
        query = query.eq('current_quantity', 0)
        break
    }
  }

  // Sorting
  const sortColumn = params.sort_by || 'name'
  const sortOrder = params.sort_order || 'asc'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

  // Pagination
  const limit = params.limit || 50
  const offset = params.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw error
  }

  return {
    items: data || [],
    total: count || 0
  }
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, category:inventory_categories(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

/**
 * Create a new inventory item with initial stock
 */
export async function createInventoryItem(input: CreateItemInput): Promise<InventoryItem> {
  await requireSuperAdmin()

  const supabase = await createClient()
  const user = await requireAuthenticatedUser()

  // Call database function to create item with initial stock
  const { data, error } = await supabase.rpc('create_item_with_initial_stock', {
    p_category_id: input.category_id,
    p_name: input.name,
    p_sku: input.sku,
    p_description: input.description || null,
    p_unit: input.unit,
    p_size_specification: input.size_specification || null,
    p_initial_quantity: input.initial_quantity || 0,
    p_reorder_level: input.reorder_level || 0,
    p_unit_cost: input.unit_cost || 0,
    p_selling_price: input.selling_price || null,
    p_user_id: user.id
  })

  if (error) {
    throw error
  }

  // Fetch the created item with category
  const { data: item } = await supabase
    .from('inventory_items')
    .select('*, category:inventory_categories(*)')
    .eq('id', data)
    .single()

  return item
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(id: string, input: UpdateItemInput): Promise<InventoryItem> {
  await requireSuperAdmin()

  const supabase = await createClient()

  // Prevent direct modification of current_quantity
  if ('current_quantity' in input) {
    throw new Error('Cannot modify current_quantity directly. Use stock adjustments instead.')
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .update(input)
    .eq('id', id)
    .select('*, category:inventory_categories(*)')
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Archive an inventory item (soft delete)
 */
export async function archiveInventoryItem(id: string): Promise<void> {
  await requireSuperAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory_items')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    throw error
  }
}

/**
 * Get transaction history for an item
 */
export async function getItemTransactions(
  itemId: string,
  limit = 50,
  offset = 0
): Promise<InventoryTransaction[]> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*, item:inventory_items(*)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get purchase history for an item
 */
export async function getItemPurchases(
  itemId: string,
  limit = 50,
  offset = 0
): Promise<InventoryPurchase[]> {
  await requireAuthenticatedUser()
  await requireActiveAccount()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_purchases')
    .select('*, item:inventory_items(*)')
    .eq('item_id', itemId)
    .order('purchase_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Create a purchase and update stock atomically
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<InventoryPurchase> {
  await requireSuperAdmin()

  const supabase = await createClient()
  const user = await requireAuthenticatedUser()

  // Call database function to create purchase with stock update
  const { data, error } = await supabase.rpc('create_purchase_with_stock_update', {
    p_item_id: input.item_id,
    p_quantity: input.quantity,
    p_unit_cost: input.unit_cost,
    p_purchase_date: input.purchase_date || new Date().toISOString().split('T')[0],
    p_supplier_name: input.supplier_name || null,
    p_invoice_reference: input.invoice_reference || null,
    p_notes: input.notes || null,
    p_user_id: user.id
  })

  if (error) {
    throw error
  }

  // Fetch the created purchase with item
  const { data: purchase } = await supabase
    .from('inventory_purchases')
    .select('*, item:inventory_items(*)')
    .eq('id', data)
    .single()

  return purchase
}

/**
 * Adjust stock (in or out)
 */
export async function adjustStock(input: StockAdjustmentInput): Promise<void> {
  await requireSuperAdmin()

  const supabase = await createClient()
  const user = await requireAuthenticatedUser()

  // Call database function to adjust stock
  const { error } = await supabase.rpc('adjust_stock', {
    p_item_id: input.item_id,
    p_adjustment_type: input.adjustment_type,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_user_id: user.id
  })

  if (error) {
    throw error
  }
}
