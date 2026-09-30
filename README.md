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
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `RESEND_API_KEY` - Your Resend API key
- `NEXT_PUBLIC_APP_URL` - Application URL (default: http://localhost:3000)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
  app/              # Next.js App Router pages
  components/       # Reusable UI components
  lib/              # Utility functions and configurations
    supabase/       # Supabase client/server utilities
  hooks/            # Custom React hooks
  types/            # TypeScript type definitions
  services/         # Business logic services
  config/           # Application configuration
  styles/           # Global styles

supabase/
  migrations/       # Database migration files
  seed/             # Database seed data

docs/               # Project documentation
tests/              # Test files
```

## Documentation

Detailed documentation is available in the `docs/` directory:
- `architecture.md` - System architecture and design decisions
- `database.md` - Database schema and relationships
- `security.md` - Security implementation and best practices
- `deployment.md` - Deployment instructions
- `development.md` - Development guidelines and conventions

## Features

- User authentication and authorization
- Role-based access control (RBAC)
- Team and project management
- Task tracking and assignment
- Attendance tracking (Asia/Dhaka timezone)
- Inventory management
- Notifications system
- Analytics and reporting
- Responsive design (mobile and desktop)

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
