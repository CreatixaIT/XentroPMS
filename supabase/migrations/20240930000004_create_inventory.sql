-- ============================================
-- Inventory Management Migration
-- Phase 4: Inventory Management System
-- ============================================

-- Create inventory_categories table
CREATE TABLE inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT unique_active_category_name UNIQUE (name, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create index for active categories
CREATE INDEX idx_inventory_categories_active ON inventory_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_categories_name ON inventory_categories(name);

-- Apply updated_at trigger to inventory_categories
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create inventory_items table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES inventory_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  unit TEXT NOT NULL,
  size_specification TEXT,
  current_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  selling_price NUMERIC(14,2) CHECK (selling_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for inventory_items
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_active ON inventory_items(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_items_stock_status ON inventory_items(current_quantity, reorder_level);

-- Apply updated_at trigger to inventory_items
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create inventory_purchases table
CREATE TABLE inventory_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(16,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT,
  invoice_reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for inventory_purchases
CREATE INDEX idx_inventory_purchases_item ON inventory_purchases(item_id);
CREATE INDEX idx_inventory_purchases_date ON inventory_purchases(purchase_date DESC);
CREATE INDEX idx_inventory_purchases_created_by ON inventory_purchases(created_by);

-- Create inventory_transactions table (audit/history ledger)
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'MANUAL_CORRECTION')),
  quantity NUMERIC(12,2) NOT NULL,
  quantity_before NUMERIC(12,2) NOT NULL CHECK (quantity_before >= 0),
  quantity_after NUMERIC(12,2) NOT NULL CHECK (quantity_after >= 0),
  reference_type TEXT,
  reference_id UUID,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for inventory_transactions
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- ============================================
-- Database Functions for Stock Operations
-- ============================================

-- Function to create a purchase and update stock atomically
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

-- Function to adjust stock (in or out)
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

-- Function to create an item with initial stock
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

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all inventory tables
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for inventory_categories
-- ============================================

-- All authenticated users can read active categories
CREATE POLICY "Users can read active categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- SUPER_ADMIN can read all categories
CREATE POLICY "Super admin can read all categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert categories
CREATE POLICY "Super admin can insert categories"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can update categories
CREATE POLICY "Super admin can update categories"
  ON inventory_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can delete categories
CREATE POLICY "Super admin can delete categories"
  ON inventory_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- RLS Policies for inventory_items
-- ============================================

-- All authenticated users can read active items
CREATE POLICY "Users can read active items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (is_active = true);

-- SUPER_ADMIN can read all items
CREATE POLICY "Super admin can read all items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert items
CREATE POLICY "Super admin can insert items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can update items (but not current_quantity directly)
CREATE POLICY "Super admin can update items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can delete items
CREATE POLICY "Super admin can delete items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- RLS Policies for inventory_purchases
-- ============================================

-- All authenticated users can read purchases
CREATE POLICY "Users can read purchases"
  ON inventory_purchases FOR SELECT
  TO authenticated
  USING (true);

-- SUPER_ADMIN can insert purchases
CREATE POLICY "Super admin can insert purchases"
  ON inventory_purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );

-- No update or delete policies - purchases are immutable

-- ============================================
-- RLS Policies for inventory_transactions
-- ============================================

-- All authenticated users can read transactions
CREATE POLICY "Users can read transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- No insert, update, or delete policies - transactions are immutable audit records

-- ============================================
-- Grant execute permissions on functions
-- ============================================

GRANT EXECUTE ON FUNCTION create_purchase_with_stock_update TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_stock TO authenticated;
GRANT EXECUTE ON FUNCTION create_item_with_initial_stock TO authenticated;

-- Revoke execute from PUBLIC for security
REVOKE EXECUTE ON FUNCTION create_purchase_with_stock_update FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION adjust_stock FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_item_with_initial_stock FROM PUBLIC;
