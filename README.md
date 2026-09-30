# Xentro PMS

Xentro Project Management Software - Internal company management application for employees, team leaders, and administrators.

## Overview

Xentro PMS is a modern, professional project management system built for internal company use. It provides tools for team management, task tracking, attendance monitoring, inventory management, and comprehensive analytics.

## Tech Stack

- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Email**: Resend
- **Validation**: Zod
- **Forms**: React Hook Form
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project configured
- Resend API key for email functionality

### Installation

1. Clone the repository:
```bash
git clone git@github.com:CreatixaIT/XentroPMS.git
cd "Xentro PMS"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key (client-side)
- `SUPABASE_SECRET_KEY` - Your Supabase secret key (server-side privileged operations)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (required for auth.admin operations)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Legacy anon key (backward compatibility fallback)
- `RESEND_API_KEY` - Your Resend API key
- `EMAIL_FROM` - Sender email address for transactional emails
- `NEXT_PUBLIC_APP_URL` - Application URL (default: http://localhost:3000)
- `INITIAL_ADMIN_EMAIL` - Email for initial super admin (default: xentroevent@gmail.com)
- `INITIAL_ADMIN_PASSWORD` - Password for initial super admin

4. Apply database migrations:
```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

5. Initialize the Super Admin:
```bash
npm run init-admin
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run init-admin` - Initialize Super Admin user

### Project Structure

```
src/
  app/              # Next.js App Router pages
    (auth)/         # Authentication routes (login, register, etc.)
    actions/        # Server actions
    dashboard/      # Dashboard pages
    profile/        # User profile pages
  components/       # Reusable UI components
    ui/            # shadcn/ui components
  lib/              # Utility functions and configurations
    auth/          # Authorization helpers
    supabase/      # Supabase client/server utilities
    validations/   # Zod validation schemas
  types/            # TypeScript type definitions

supabase/
  migrations/       # Database migration files

scripts/            # Utility scripts
  init-admin.ts    # Super Admin initialization

docs/               # Project documentation
__tests__/          # Test files
```

## Documentation

Detailed documentation is available in the `docs/` directory:
- `architecture.md` - System architecture and design decisions
- `database.md` - Database schema and relationships
- `security.md` - Security implementation and best practices
- `deployment.md` - Deployment instructions
- `development.md` - Development guidelines and conventions

## Features

### Phase 1 (Complete)
- User authentication and authorization
- Email verification
- Password reset and change
- User profile management
- Role-based access control (RBAC)
- Account status management (PENDING_VERIFICATION, ACTIVE, DISABLED, BLOCKED)
- Secure admin initialization

### Phase 2 (Complete)
- Professional dashboard with hero section
- Responsive sidebar navigation
- Role-aware menu items
- Top header with user info
- Notification system with read/unread functionality
- Dashboard cards for all modules (placeholders for unimplemented modules)
- Bangladesh time display
- Coming soon pages for future modules

### Phase 3 (Complete)
- Employee attendance system with geolocation verification
- Time In/Time Out with workplace geofence
- Server-side timestamp generation (Asia/Dhaka timezone)
- Attendance history with pagination
- Admin attendance dashboard with statistics
- Admin workplace settings configuration
- Haversine formula for distance calculation
- Location accuracy handling
- RLS policies for attendance security

### Phase 4 (Complete)
- Inventory management system with categories and items
- Stock tracking with transaction history
- Purchase recording with automatic stock updates
- Stock adjustments (in/out/manual correction)
- Low stock and out of stock tracking
- Inventory statistics and reporting
- Server-side stock integrity (no direct quantity modification)
- RLS policies for inventory security
- Admin-only category and item management

### Planned Features
- Project and task management
- Budget and expense tracking
- Reports and analytics

## Security

- Row Level Security (RLS) in Supabase
- Server-side authorization
- Secure cookie/session handling
- Environment variable management
- Never commit secrets or API keys

## Timezone

The application operates in Asia/Dhaka timezone. Attendance timestamps are stored in UTC but displayed in Asia/Dhaka timezone.

## License

Internal company project - All rights reserved.
