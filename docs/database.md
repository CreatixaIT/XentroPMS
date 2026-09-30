# Database

## Overview

Xentro PMS uses Supabase PostgreSQL as its database. The schema is designed with normalization, proper relationships, and Row Level Security (RLS) in mind.

## Schema Design Principles

### Standard Fields
Every important table includes:
- `id` - UUID primary key
- `created_at` - Timestamp (UTC)
- `updated_at` - Timestamp (UTC)
- `created_by` - UUID reference to user (where appropriate)

### Relationships
- Foreign keys for all relationships
- CASCADE delete where appropriate
- Proper indexing for foreign keys

### Indexes
- User IDs
- Project IDs
- Task IDs
- Attendance dates
- Inventory categories
- Notification recipients
- Status fields where useful

## Core Tables

### profiles
Extended user profile information (Supabase auth.users is the base table).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  phone TEXT NOT NULL,
  nid TEXT NOT NULL,
  address TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('SUPER_ADMIN', 'TEAM_LEADER', 'EMPLOYEE')),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED', 'BLOCKED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
```

### audit_logs
Audit trail for security-sensitive actions.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### notifications
User notifications for alerts and updates.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMPLETED', 'PROJECT_ASSIGNED', 'PROJECT_UPDATED', 'PROJECT_COMPLETED', 'INVENTORY_ALERT', 'SYSTEM', 'ADMIN')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### RLS Policies for Notifications

```sql
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own notifications (if needed for internal use)
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SUPER_ADMIN can read all notifications (for administrative purposes)
CREATE POLICY "SUPER_ADMIN can read all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert notifications (for admin actions)
CREATE POLICY "SUPER_ADMIN can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );
```

### attendance_settings
Workplace location configuration for attendance geofencing.

```sql
CREATE TABLE attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplace_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude NUMERIC NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  allowed_radius_meters NUMERIC NOT NULL CHECK (allowed_radius_meters > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_settings_active ON attendance_settings(is_active) WHERE is_active = true;
```

### attendance_records
Employee attendance records with geolocation verification.

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  time_in_latitude NUMERIC,
  time_in_longitude NUMERIC,
  time_out_latitude NUMERIC,
  time_out_longitude NUMERIC,
  time_in_accuracy NUMERIC CHECK (time_in_accuracy >= 0),
  time_out_accuracy NUMERIC CHECK (time_out_accuracy >= 0),
  time_in_location_verified BOOLEAN NOT NULL DEFAULT false,
  time_out_location_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, attendance_date)
);

CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date DESC);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, attendance_date DESC);
CREATE INDEX idx_attendance_records_time_in ON attendance_records(time_in DESC);
```

### RLS Policies for Attendance Settings

```sql
-- SUPER_ADMIN can read all attendance settings
CREATE POLICY "SUPER_ADMIN can read attendance settings"
  ON attendance_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert/update attendance settings
CREATE POLICY "SUPER_ADMIN can manage attendance settings"
  ON attendance_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );
```

### RLS Policies for Attendance Records

```sql
-- Users can read their own attendance records
CREATE POLICY "Users can read own attendance records"
  ON attendance_records FOR SELECT
  USING (auth.uid() = user_id);

-- SUPER_ADMIN can read all attendance records
CREATE POLICY "SUPER_ADMIN can read all attendance records"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- TEAM_LEADER can read own attendance records
CREATE POLICY "TEAM_LEADER can read own attendance records"
  ON attendance_records FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'TEAM_LEADER'
    )
  );

-- SUPER_ADMIN can insert/update attendance records (for administrative purposes)
CREATE POLICY "SUPER_ADMIN can manage attendance records"
  ON attendance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- No DELETE policy - attendance records should not be deleted
```

### inventory_categories
Inventory item categories for organization.

```sql
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

CREATE INDEX idx_inventory_categories_active ON inventory_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_categories_name ON inventory_categories(name);
```

### inventory_items
Inventory items with stock tracking.

```sql
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

CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_active ON inventory_items(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_items_stock_status ON inventory_items(current_quantity, reorder_level);
```

### inventory_purchases
Purchase records for stock additions (immutable).

```sql
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

CREATE INDEX idx_inventory_purchases_item ON inventory_purchases(item_id);
CREATE INDEX idx_inventory_purchases_date ON inventory_purchases(purchase_date DESC);
CREATE INDEX idx_inventory_purchases_created_by ON inventory_purchases(created_by);
```

### inventory_transactions
Immutable transaction history for all stock changes.

```sql
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

CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
```

### RLS Policies for Inventory Categories

```sql
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

-- SUPER_ADMIN can insert/update/delete categories
CREATE POLICY "Super admin can manage categories"
  ON inventory_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );
```

### RLS Policies for Inventory Items

```sql
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

-- SUPER_ADMIN can insert/update/delete items
CREATE POLICY "Super admin can manage items"
  ON inventory_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );
```

### RLS Policies for Inventory Purchases

```sql
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
```

### RLS Policies for Inventory Transactions

```sql
-- All authenticated users can read transactions
CREATE POLICY "Users can read transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- No insert, update, or delete policies - transactions are immutable audit records
```

### Database Functions for Inventory

```sql
-- Create purchase and update stock atomically
CREATE OR REPLACE FUNCTION create_purchase_with_stock_update(
  p_item_id UUID,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC,
  p_purchase_date DATE DEFAULT CURRENT_DATE,
  p_supplier_name TEXT DEFAULT NULL,
  p_invoice_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID
)
RETURNS UUID AS $$
-- Locks item row, validates inputs, updates stock, creates purchase and transaction records
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjust stock (in or out)
CREATE OR REPLACE FUNCTION adjust_stock(
  p_item_id UUID,
  p_adjustment_type TEXT,
  p_quantity NUMERIC,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS VOID AS $$
-- Validates adjustment type, locks item, validates stock, updates quantity, creates transaction
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create item with initial stock
CREATE OR REPLACE FUNCTION create_item_with_initial_stock(
  p_category_id UUID,
  p_name TEXT,
  p_sku TEXT,
  p_description TEXT,
  p_unit TEXT,
  p_size_specification TEXT,
  p_initial_quantity NUMERIC DEFAULT 0,
  p_reorder_level NUMERIC DEFAULT 0,
  p_unit_cost NUMERIC DEFAULT 0,
  p_selling_price NUMERIC DEFAULT NULL,
  p_user_id UUID
)
RETURNS UUID AS $$
-- Validates inputs, creates item, creates initial stock transaction if quantity > 0
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Database Functions for Attendance

```sql
-- Calculate distance between two points using Haversine formula (returns meters)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
-- Implementation uses Earth radius of 6,371,000 meters
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get business date in Asia/Dhaka timezone
CREATE OR REPLACE FUNCTION get_business_date()
RETURNS DATE AS $$
BEGIN
  RETURN (NOW() AT TIME ZONE 'Asia/Dhaka')::DATE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if location is within allowed radius
CREATE OR REPLACE FUNCTION is_location_within_radius(
  user_lat NUMERIC,
  user_lon NUMERIC,
  setting_id UUID
)
RETURNS BOOLEAN AS $$
-- Calculates distance and compares to allowed radius
$$ LANGUAGE plpgsql;

-- Create attendance record with Time In
CREATE OR REPLACE FUNCTION create_attendance_time_in(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC
)
RETURNS UUID AS $$
-- Validates uniqueness, location, and creates record with server timestamp
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update attendance record with Time Out
CREATE OR REPLACE FUNCTION update_attendance_time_out(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC
)
RETURNS UUID AS $$
-- Validates Time In exists, location, and updates with server timestamp
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Future Tables (Not Yet Implemented)

The following tables are planned for future phases but have not been created yet:
- projects
- tasks
- budget/expense tables

### projects
Project management for teams.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
```

### tasks
Task tracking within projects.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

## Row Level Security (RLS)

### Enable RLS
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### RLS Policies for Profiles

```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- SUPER_ADMIN can read all profiles
CREATE POLICY "SUPER_ADMIN can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Users can update allowed fields of their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id AND
    -- Prevent changing role and status
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent changing role and status
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- SUPER_ADMIN can update all profiles
CREATE POLICY "SUPER_ADMIN can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert profiles (for admin creation)
CREATE POLICY "SUPER_ADMIN can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );
```

### RLS Policies for Audit Logs

```sql
-- SUPER_ADMIN can read all audit logs
CREATE POLICY "SUPER_ADMIN can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- SUPER_ADMIN can insert audit logs
CREATE POLICY "SUPER_ADMIN can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );
```

## Database Functions

### Updated At Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Audit Log Function
```sql
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (p_actor_id, p_action, p_target_type, p_target_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Timezone Handling

### Storage
- All timestamps stored in UTC
- Use `TIMESTAMPTZ` for timezone-aware timestamps

### Display
- Convert to Asia/Dhaka timezone in application layer
- Display in user's local timezone where appropriate

### Attendance
- Check-in/check-out times stored in UTC
- Server timestamp is authoritative (not client clock)
- Displayed in Asia/Dhaka timezone

## Data Integrity

### Constraints
- NOT NULL on required fields
- CHECK constraints for enums and validations
- UNIQUE constraints where appropriate
- FOREIGN KEY constraints for relationships

### Triggers
- Automatic `updated_at` updates
- Status transitions validation
- Stock level validation

## Migration Strategy

### Development
- Use Supabase migrations in `supabase/migrations/`
- Version control all schema changes
- Test migrations locally before deployment

### Current Migrations
- `20240930000001_create_profiles_and_audit_logs.sql` - Profiles and audit logs
- `20240930000002_create_notifications.sql` - Notifications system
- `20240930000003_create_attendance.sql` - Attendance system with geolocation
- `20240930000004_create_inventory.sql` - Inventory management system

### Applying Migrations
```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push

# Apply specific migration
supabase migration up
```

### Production
- Backup before migrations
- Run migrations during maintenance window
- Verify data integrity after migration
- Rollback plan ready

## Backup Strategy

### Supabase Backups
- Enable daily backups in Supabase
- Point-in-time recovery available
- Backup retention: 30 days

### Additional Backups
- Export critical data regularly
- Store backups in secure location
- Test restore procedures

## Performance Optimization

### Indexes
- Index foreign keys
- Index frequently queried columns
- Composite indexes for common query patterns
- Monitor query performance

### Query Optimization
- Use specific SELECT statements
- Avoid SELECT *
- Use JOINs efficiently
- Limit result sets with pagination

### Connection Pooling
- Supabase provides connection pooling
- Configure appropriate pool size
- Monitor connection usage
