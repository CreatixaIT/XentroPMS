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

### users
Extended user profile information (Supabase auth.users is the base table).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'team_leader', 'employee')),
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department ON profiles(department);
```

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

### notifications
User notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

## Row Level Security (RLS)

### Enable RLS
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### Example RLS Policies

#### Profiles
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Team leaders can view profiles in their department
CREATE POLICY "Team leaders can view department profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'team_leader'
    )
    AND department = (
      SELECT department FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Projects
```sql
-- Users can view projects they're assigned to
CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM tasks WHERE assigned_to = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Team leaders can view department projects
CREATE POLICY "Team leaders can view department projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'team_leader'
    )
  );

-- Admins can view all projects
CREATE POLICY "Admins can view all projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Attendance
```sql
-- Users can view own attendance
CREATE POLICY "Users can view own attendance"
  ON attendance FOR SELECT
  USING (user_id = auth.uid());

-- Team leaders can view department attendance
CREATE POLICY "Team leaders can view department attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'team_leader'
      AND department = (SELECT department FROM profiles WHERE id = attendance.user_id)
    )
  );

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can insert own attendance (for check-in)
CREATE POLICY "Users can insert own attendance"
  ON attendance FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update own attendance (for check-out)
CREATE POLICY "Users can update own attendance"
  ON attendance FOR UPDATE
  USING (user_id = auth.uid());
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

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION updated_at_column();
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
