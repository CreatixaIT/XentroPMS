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

## Future Tables (Not Yet Implemented)

The following tables are planned for future phases but have not been created yet:
- projects
- tasks
- attendance
- inventory_categories
- inventory_items
- inventory_transactions
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

### attendance
Employee attendance tracking.

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
```

### inventory
Company inventory management.

```sql
CREATE TABLE inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  min_stock_level INTEGER DEFAULT 0,
  location TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'low_stock', 'out_of_stock', 'reserved')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_category_id ON inventory_items(category_id);
CREATE INDEX idx_inventory_status ON inventory_items(status);
```

### inventory_transactions
Inventory movement tracking.

```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
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
