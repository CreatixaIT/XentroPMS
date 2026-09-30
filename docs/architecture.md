# Architecture

## System Overview

Xentro PMS is a full-stack web application built with Next.js 16+ using the App Router architecture. The application follows a server-first approach with client-side interactivity where appropriate.

## Technology Stack

### Frontend
- **Next.js 16+**: React framework with App Router for file-based routing
- **React 19**: UI library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable UI component library built on Radix UI
- **Lucide React**: Icon library

### Backend
- **Next.js API Routes**: Server-side API endpoints
- **Server Actions**: Server-side mutations and data fetching
- **Middleware**: Request interception for auth and cookies

### Database & Services
- **Supabase PostgreSQL**: Managed PostgreSQL database
- **Supabase Auth**: Authentication and user management
- **Supabase Storage**: File storage for uploads
- **Resend**: Transactional email service

### Development Tools
- **Zod**: Schema validation
- **React Hook Form**: Form management
- **Recharts**: Data visualization
- **ESLint**: Code linting
- **TypeScript**: Static type checking

## Architecture Patterns

### App Router Architecture
- File-based routing in `src/app/`
- Server Components by default for performance
- Client Components marked with `"use client"` directive
- Streaming and Suspense for loading states

### Client-Server Separation
- **Server Components**: Data fetching, authentication, heavy computations
- **Client Components**: Interactive UI, form handling, state management
- **Server Actions**: Mutations that run on the server
- **API Routes**: RESTful endpoints when needed

### Data Layer
- **Supabase Client**: Browser-side queries (with RLS)
- **Supabase Server**: Server-side queries (with elevated privileges)
- **Type Safety**: TypeScript types generated from Supabase schema

### Authentication Flow
1. User signs in via Supabase Auth
2. Session stored in secure HTTP-only cookies
3. Middleware validates session on each request
4. Server components access user session via server client
5. Client components access session via hooks

### Authorization
- **Role-Based Access Control (RBAC)**: User roles stored in database
  - SUPER_ADMIN: Full system access
  - TEAM_LEADER: Team/project/task functionality
  - EMPLOYEE: Normal employee functionality
- **Account Status**: PENDING_VERIFICATION, ACTIVE, DISABLED, BLOCKED
- **Row Level Security (RLS)**: Database-level access control
- **Server-side validation**: All sensitive operations validated on server
- **Authorization helpers**: Reusable server-side functions (`src/lib/auth/authorization.ts`)
  - `requireAuthenticatedUser()`: Ensure user is logged in
  - `requireRole()`: Ensure user has specific role
  - `requireActiveAccount()`: Ensure account is active
  - `requireSuperAdmin()`: Ensure user is SUPER_ADMIN
  - `canUpdateProfile()`: Check if user can update a profile
- **Never trust client**: All authorization decisions made server-side

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-related routes (login, register, etc.)
│   ├── (protected)/       # Protected application routes
│   │   ├── dashboard/     # Dashboard pages
│   │   ├── profile/       # User profile pages
│   │   ├── notifications/ # Notifications page
│   │   ├── attendance/    # Attendance module
│   │   ├── inventory/     # Inventory module (placeholder)
│   │   ├── projects/      # Projects module (placeholder)
│   │   ├── tasks/         # Tasks module (placeholder)
│   │   ├── reports/       # Reports module (placeholder)
│   │   ├── budget/        # Budget module (placeholder)
│   │   └── admin/         # Admin module
│   │       ├── attendance/    # Admin attendance dashboard
│   │       └── settings/      # Admin settings
│   │           └── attendance/ # Attendance settings
│   ├── actions/           # Server actions (auth.ts)
│   ├── api/               # API routes
│   │   ├── notifications/ # Notification API endpoints
│   │   └── attendance/    # Attendance API endpoints
│   ├── layout.tsx         # Root layout
│   ├── middleware.ts      # Request middleware
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   │   ├── dashboard-hero.tsx
│   │   └── dashboard-cards.tsx
│   ├── layout/            # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── notification-dropdown.tsx
│   │   └── coming-soon.tsx
│   └── ui/               # shadcn/ui components
├── lib/                   # Utilities and configurations
│   ├── auth/             # Authorization helpers
│   ├── attendance/       # Attendance service layer
│   │   ├── types.ts
│   │   └── service.ts
│   ├── dashboard/         # Dashboard service layer
│   │   ├── types.ts
│   │   ├── summary.ts
│   │   └── notifications.ts
│   ├── supabase/         # Supabase clients
│   ├── utils.ts          # Utility functions
│   └── validations/      # Zod schemas
│       ├── auth.ts
│       └── attendance.ts
├── types/                 # TypeScript type definitions (database.ts)

supabase/
└── migrations/            # Database migration files

scripts/                   # Utility scripts
└── init-admin.ts         # Super Admin initialization

docs/                      # Project documentation
__tests__/                 # Test files
```

## Design Principles

### 1. Server-First
- Default to Server Components for better performance
- Use Client Components only when interactivity is needed
- Minimize client-side JavaScript bundle size

### 2. Type Safety
- Strict TypeScript configuration
- Type definitions for all data structures
- Zod schemas for runtime validation
- Type-safe database queries

### 3. Security
- All sensitive operations on server
- Row Level Security in database
- Secure cookie handling
- Environment variables for secrets
- Never expose service-role keys to client

### 4. Performance
- Server-side rendering by default
- Streaming for slow data fetches
- Image optimization
- Code splitting
- Efficient database queries with indexes

### 5. Maintainability
- Clear separation of concerns
- Reusable components
- Consistent code style
- Comprehensive documentation
- Testing coverage

## Data Flow

### Authentication Flow
1. User registers via `/register` with profile information
2. Supabase Auth creates user account
3. Database trigger creates associated profile in `profiles` table
4. User receives email verification link
5. User verifies email via `/verify-email`
6. Profile status changes from `PENDING_VERIFICATION` to `ACTIVE`
7. User can log in via `/login`
8. Session stored in HTTP-only cookies
9. Middleware validates session on each request
10. Protected routes require authentication via authorization helpers

### Dashboard Architecture
- **Protected Layout**: All authenticated routes use `(protected)` route group with sidebar and header
- **Sidebar Navigation**: Role-aware navigation that shows appropriate menu items
- **Dashboard Service Layer**: `src/lib/dashboard/` provides clean separation for dashboard data fetching
  - `getDashboardSummary()`: Aggregates data from all modules
  - `getUserNotifications()`: Fetches user notifications
  - `getUnreadNotificationCount()`: Returns unread count
- **Server-Side Data Fetching**: Dashboard page fetches data server-side for performance
- **Placeholder Data**: When modules are not implemented, returns 0 or empty states
- **Polling**: Notification count polls every 30 seconds (client-side)

### Notification Architecture
- **Database Table**: `notifications` table with RLS policies
- **Notification Types**: TASK_ASSIGNED, TASK_UPDATED, TASK_COMPLETED, PROJECT_ASSIGNED, PROJECT_UPDATED, PROJECT_COMPLETED, INVENTORY_ALERT, SYSTEM, ADMIN
- **Security**: Users can only read/update their own notifications (enforced by RLS)
- **API Endpoints**: RESTful API for notification operations
  - `GET /api/notifications` - Fetch user notifications
  - `GET /api/notifications/unread-count` - Get unread count
  - `POST /api/notifications/mark-read` - Mark single notification as read
  - `POST /api/notifications/mark-all-read` - Mark all notifications as read
- **Real-Time**: Structured to support Supabase Realtime in future phases
- **UI Components**: Notification bell with dropdown, notifications page with filtering

### Attendance Architecture
- **Database Tables**: `attendance_records` and `attendance_settings` tables with RLS policies
- **Geolocation Verification**: Browser Geolocation API captures user location, server validates against workplace geofence
- **Server-Side Timestamps**: All attendance timestamps generated by PostgreSQL server (NOW()), not client
- **Business Timezone**: `Asia/Dhaka` used for all attendance date calculations and display
- **Geofence Calculation**: Haversine formula in PostgreSQL calculates distance between user and workplace
- **Attendance Rules**:
  - One record per user per calendar date (UNIQUE constraint)
  - Time In requires location verification
  - Time Out requires Time In first
  - Duplicate Time In/Time Out rejected
- **API Endpoints**:
  - `POST /api/attendance/time-in` - Record Time In with geolocation
  - `POST /api/attendance/time-out` - Record Time Out with geolocation
  - `GET /api/attendance/today` - Get today's attendance status
  - `GET /api/attendance/history` - Get attendance history
  - `GET /api/attendance/all` - Get all attendance (admin only)
  - `GET /api/attendance/stats` - Get attendance statistics (admin only)
  - `GET/POST /api/attendance/settings` - Manage workplace settings (admin only)
- **Security**: Users can only read their own attendance, only SUPER_ADMIN can manage settings and view all records
- **Accuracy Handling**: Browser provides accuracy in meters, poor accuracy prompts user to retry

### Reading Data
1. Server Component fetches data via Supabase server client
2. Data passed to child components as props
3. Client components receive data and render UI
4. Optimistic updates where appropriate

### Writing Data
1. User triggers action (form submission, button click)
2. Server Action or API route receives request
3. Server validates input with Zod
4. Server checks authorization
5. Server writes to Supabase
6. Response sent to client
7. UI updates (revalidation if needed)

## State Management

### Server State
- Managed by React Server Components
- Data fetched fresh on each request
- No client-side state needed for read-only data

### Client State
- React hooks (useState, useReducer) for UI state
- Server Actions for mutations
- Revalidation after mutations

### Form State
- React Hook Form for form management
- Zod for validation
- Server Actions for submission

## Error Handling

### Server Errors
- Try-catch in Server Actions
- User-friendly error messages
- Error logging for debugging
- Graceful degradation

### Client Errors
- Error boundaries for component errors
- Toast notifications for user feedback
- Validation errors displayed inline

## Performance Optimization

### Database
- Indexes on frequently queried columns
- Efficient queries with proper selects
- Connection pooling via Supabase

### Frontend
- Code splitting by route
- Image optimization with Next.js Image
- Lazy loading for heavy components
- Streaming for slow data

### Caching
- Supabase query caching where appropriate
- HTTP caching headers for static assets
- React cache for memoization

## Security Considerations

### Authentication
- Secure HTTP-only cookies
- Session management via Supabase
- Automatic token refresh
- Protected routes via middleware

### Authorization
- RBAC implementation
- RLS policies in database
- Server-side checks for all operations
- Role validation before data access

### Data Protection
- Encryption in transit (HTTPS)
- Encryption at rest (Supabase)
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)

### Secrets Management
- Environment variables for sensitive data
- Never commit .env files
- Different keys for dev/prod
- Service role key never exposed to client

## Future Considerations

### Scalability
- Horizontal scaling via Vercel
- Database optimization as data grows
- CDN for static assets
- Load balancing if needed

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Usage analytics
- Uptime monitoring

### Testing
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical flows
- Component testing for UI
