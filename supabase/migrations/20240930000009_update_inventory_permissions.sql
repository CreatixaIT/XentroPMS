-- Update inventory RLS policies to allow EMPLOYEE full inventory access
-- Migration: 20240930000009_update_inventory_permissions.sql

-- Update inventory_items policies to allow EMPLOYEE operations
DROP POLICY IF EXISTS "Super admin can insert items" ON inventory_items;
CREATE POLICY "Authenticated users can insert items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_active = true
  );

DROP POLICY IF EXISTS "Super admin can update items" ON inventory_items;
CREATE POLICY "Authenticated users can update items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (is_active = true);

DROP POLICY IF EXISTS "Super admin can delete items" ON inventory_items;
CREATE POLICY "Authenticated users can delete items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (is_active = true);
