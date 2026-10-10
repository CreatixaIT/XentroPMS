-- Fix inventory function security - forward-only migration
-- Migration: 20261011000001_fix_inventory_function_security.sql
-- 
-- This migration updates inventory functions to:
-- 1. Use SET search_path = '' to prevent SQL injection
-- 2. Add authorization checks to create_item_with_initial_stock
-- 3. Add duplicate SKU validation
-- 4. Revoke execute permissions from PUBLIC

-- Update create_purchase_with_stock_update with search_path fix
CREATE OR REPLACE FUNCTION create_purchase_with_stock_update(
  p_item_id UUID,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC,
  p_user_id UUID,
  p_purchase_date DATE DEFAULT CURRENT_DATE,
  p_supplier_name TEXT DEFAULT NULL,
  p_invoice_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock NUMERIC;
  v_new_stock NUMERIC;
  v_purchase_id UUID;
BEGIN
  -- Lock the item row to prevent concurrent modifications
  SELECT current_quantity INTO v_current_stock
  FROM inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Validate inputs
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  IF p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Unit cost cannot be negative';
  END IF;

  -- Calculate new stock
  v_new_stock := v_current_stock + p_quantity;

  -- Update item stock
  UPDATE inventory_items
  SET current_quantity = v_new_stock,
      updated_at = NOW()
  WHERE id = p_item_id;

  -- Create purchase record
  INSERT INTO inventory_purchases (
    item_id, quantity, unit_cost, purchase_date,
    supplier_name, invoice_reference, notes, created_by
  ) VALUES (
    p_item_id, p_quantity, p_unit_cost, p_purchase_date,
    p_supplier_name, p_invoice_reference, p_notes, p_user_id
  ) RETURNING id INTO v_purchase_id;

  -- Create transaction record
  INSERT INTO inventory_transactions (
    item_id, transaction_type, quantity,
    quantity_before, quantity_after,
    reference_type, reference_id, reason, created_by
  ) VALUES (
    p_item_id, 'PURCHASE', p_quantity,
    v_current_stock, v_new_stock,
    'PURCHASE', v_purchase_id, 'Stock purchase', p_user_id
  );

  RETURN v_purchase_id;
END;
$$;

-- Update adjust_stock with search_path fix
CREATE OR REPLACE FUNCTION adjust_stock(
  p_item_id UUID,
  p_adjustment_type TEXT,
  p_quantity NUMERIC,
  p_reason TEXT,
  p_user_id UUID
) RETURNS VOID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock NUMERIC;
  v_new_stock NUMERIC;
  v_transaction_type TEXT;
BEGIN
  -- Validate adjustment type
  IF p_adjustment_type NOT IN ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'MANUAL_CORRECTION') THEN
    RAISE EXCEPTION 'Invalid adjustment type';
  END IF;

  -- Lock the item row
  SELECT current_quantity INTO v_current_stock
  FROM inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  -- Determine transaction type and calculate new stock
  IF p_adjustment_type = 'ADJUSTMENT_OUT' THEN
    IF v_current_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for adjustment';
    END IF;
    v_new_stock := v_current_stock - p_quantity;
    v_transaction_type := 'ADJUSTMENT_OUT';
  ELSE
    v_new_stock := v_current_stock + p_quantity;
    v_transaction_type := p_adjustment_type;
  END IF;

  -- Update item stock
  UPDATE inventory_items
  SET current_quantity = v_new_stock,
      updated_at = NOW()
  WHERE id = p_item_id;

  -- Create transaction record
  INSERT INTO inventory_transactions (
    item_id, transaction_type, quantity,
    quantity_before, quantity_after,
    reason, created_by
  ) VALUES (
    p_item_id, v_transaction_type, p_quantity,
    v_current_stock, v_new_stock,
    p_reason, p_user_id
  );
END;
$$;

-- Update create_item_with_initial_stock with security fixes
CREATE OR REPLACE FUNCTION create_item_with_initial_stock(
  p_category_id UUID,
  p_name TEXT,
  p_sku TEXT,
  p_description TEXT,
  p_unit TEXT,
  p_size_specification TEXT,
  p_user_id UUID,
  p_initial_quantity NUMERIC DEFAULT 0,
  p_reorder_level NUMERIC DEFAULT 0,
  p_unit_cost NUMERIC DEFAULT 0,
  p_selling_price NUMERIC DEFAULT NULL
) RETURNS UUID
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Authorization check
  IF p_user_id != auth.uid() AND NOT public.is_super_admin_active() THEN
    RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN can create inventory items';
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Item name is required';
  END IF;

  IF p_sku IS NULL OR p_sku = '' THEN
    RAISE EXCEPTION 'SKU is required';
  END IF;

  IF p_unit IS NULL OR p_unit = '' THEN
    RAISE EXCEPTION 'Unit is required';
  END IF;

  IF p_initial_quantity < 0 THEN
    RAISE EXCEPTION 'Initial quantity cannot be negative';
  END IF;

  IF p_reorder_level < 0 THEN
    RAISE EXCEPTION 'Reorder level cannot be negative';
  END IF;

  IF p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Unit cost cannot be negative';
  END IF;

  IF p_selling_price IS NOT NULL AND p_selling_price < 0 THEN
    RAISE EXCEPTION 'Selling price cannot be negative';
  END IF;

  -- Check for duplicate SKU
  IF EXISTS (SELECT 1 FROM public.inventory_items WHERE sku = p_sku AND is_active = true) THEN
    RAISE EXCEPTION 'An item with this SKU already exists';
  END IF;

  -- Create the item
  INSERT INTO inventory_items (
    category_id, name, sku, description, unit,
    size_specification, current_quantity, reorder_level,
    unit_cost, selling_price, created_by
  ) VALUES (
    p_category_id, p_name, p_sku, p_description, p_unit,
    p_size_specification, p_initial_quantity, p_reorder_level,
    p_unit_cost, p_selling_price, p_user_id
  ) RETURNING id INTO v_item_id;

  -- If initial quantity > 0, create a transaction record
  IF p_initial_quantity > 0 THEN
    INSERT INTO inventory_transactions (
      item_id, transaction_type, quantity,
      quantity_before, quantity_after,
      reason, created_by
    ) VALUES (
      v_item_id, 'MANUAL_CORRECTION', p_initial_quantity,
      0, p_initial_quantity,
      'Initial stock on item creation', p_user_id
    );
  END IF;

  RETURN v_item_id;
END;
$$;

-- Revoke execute permissions from PUBLIC for security
REVOKE EXECUTE ON FUNCTION create_purchase_with_stock_update FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION adjust_stock FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_item_with_initial_stock FROM PUBLIC;

-- Ensure execute permissions are granted to authenticated
GRANT EXECUTE ON FUNCTION create_purchase_with_stock_update TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_stock TO authenticated;
GRANT EXECUTE ON FUNCTION create_item_with_initial_stock TO authenticated;
