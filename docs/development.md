# Development

## Overview

This document provides guidelines and best practices for developing Xentro PMS.

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Git installed
- Supabase account (for local development)
- Code editor (VS Code recommended)

### Initial Setup

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

4. Configure `.env.local` with your local Supabase credentials

5. Start development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Branch Strategy
- `main`: Production branch
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Emergency fixes

### Commit Conventions
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```bash
git commit -m "feat: add user profile page"
git commit -m "fix: resolve attendance check-in issue"
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Push to remote
4. Create pull request
5. Request review
6. Address feedback
7. Merge after approval

## Code Style

### TypeScript
- Use strict mode
- Type all functions and variables
- Avoid `any` type
- Use interfaces for object shapes
- Use type aliases for unions

### React
- Use functional components
- Use hooks for state and side effects
- Prefer Server Components by default
- Mark Client Components with `"use client"`
- Use TypeScript for props

### Example Component
```typescript
// Server Component (default)
export default function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return <div>{user.name}</div>
}

// Client Component
"use client"

export function UserForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [value, setValue] = useState('')
  return <form onSubmit={onSubmit}>...</form>
}
```

## File Organization

### Component Structure
```
components/
├── ui/              # shadcn/ui components
├── auth/            # Authentication components
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── dashboard/       # Dashboard components
│   ├── Header.tsx
│   └── Sidebar.tsx
└── shared/          # Shared components
    ├── Button.tsx
    └── Modal.tsx
```

### Page Structure
```
app/
├── (auth)/          # Auth routes group
│   ├── login/
│   └── register/
├── (dashboard)/     # Dashboard routes group
│   ├── projects/
│   └── tasks/
└── api/             # API routes
    └── users/
```

## Server Actions

### Creating Server Actions
```typescript
// app/actions/users.ts
"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUser(userId: string, data: UserData) {
  const supabase = await createClient()
  
  // Validation
  if (!data.name) {
    return { error: 'Name is required' }
  }
  
  // Authorization check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }
  
  // Update
  const { error } = await supabase
    .from('profiles')
    .update({ name: data.name })
    .eq('id', userId)
  
  if (error) {
    return { error: 'Failed to update user' }
  }
  
  // Revalidate
  revalidatePath('/dashboard/users')
  
  return { success: true }
}
```

### Using Server Actions
```typescript
// Client Component
"use client"

import { updateUser } from '@/app/actions/users'

export function UserForm({ userId }: { userId: string }) {
  async function handleSubmit(formData: FormData) {
    const result = await updateUser(userId, {
      name: formData.get('name') as string
    })
    
    if (result.error) {
      // Handle error
    }
  }
  
  return <form action={handleSubmit}>...</form>
}
```

## Database Queries

### Server Components
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function TasksPage() {
  const supabase = await createClient()
  
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
  
  return <div>{/* Render tasks */}</div>
}
```

### Client Components
```typescript
"use client"

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function TaskList() {
  const [tasks, setTasks] = useState([])
  const supabase = createClient()
  
  useEffect(() => {
    async function loadTasks() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
      setTasks(data || [])
    }
    loadTasks()
  }, [])
  
  return <div>{/* Render tasks */}</div>
}
```

## Validation

### Zod Schemas
```typescript
// lib/validations/task.ts
import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
})

export type TaskInput = z.infer<typeof taskSchema>
```

### Using Validation
```typescript
import { taskSchema } from '@/lib/validations/task'

export async function createTask(data: unknown) {
  const result = taskSchema.safeParse(data)
  
  if (!result.success) {
    return { error: result.error.flatten() }
  }
  
  // Proceed with validated data
}
```

## Error Handling

### Server Components
```typescript
export default async function UserPage({ params }: { params: { id: string } }) {
  try {
    const user = await getUser(params.id)
    if (!user) {
      notFound()
    }
    return <UserProfile user={user} />
  } catch (error) {
    console.error('Failed to load user:', error)
    return <ErrorState />
  }
}
```

### Server Actions
```typescript
export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Failed to delete user:', error)
    return { error: 'Failed to delete user' }
  }
}
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests
```typescript
// __tests__/utils.test.ts
import { formatDate } from '@/lib/utils'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01')
    expect(formatDate(date)).toBe('January 1, 2024')
  })
})
```

## Debugging

### Server-Side Debugging
```typescript
console.log('Debug info:', data)
console.error('Error:', error)
```

### Client-Side Debugging
- Use browser DevTools
- React DevTools extension
- Network tab for API calls
- Console for errors

### Database Debugging
- Use Supabase dashboard
- Check RLS policies
- Review query logs
- Test queries in SQL editor

## Performance

### Optimization Tips
- Use Server Components by default
- Implement pagination for large lists
- Optimize images with Next.js Image
- Use dynamic imports for heavy components
- Implement caching where appropriate

### Example Dynamic Import
```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,
})
```

## Accessibility

### Best Practices
- Use semantic HTML
- Provide alt text for images
- Ensure keyboard navigation
- Use ARIA labels where needed
- Test with screen readers

### Example
```typescript
<button
  aria-label="Close dialog"
  onClick={onClose}
>
  <X />
</button>
```

## Git Workflow

### Feature Branch Workflow
```bash
# Create feature branch
git checkout -b feature/add-user-dashboard

# Make changes
git add .
git commit -m "feat: add user dashboard"

# Push to remote
git push origin feature/add-user-dashboard

# Create pull request
# (via GitHub UI or gh CLI)
gh pr create --title "Add user dashboard" --body "Description"
```

### Before Committing
```bash
# Run linting
npm run lint

# Run type check
npx tsc --noEmit

# Run tests
npm test

# Format code
npm run format
```

## Common Tasks

### Adding a New Page
1. Create directory in `app/`
2. Add `page.tsx` file
3. Export default component
4. Add route metadata if needed

### Adding a New Component
1. Create component file in `components/`
2. Export component
3. Add TypeScript types
4. Write tests if needed

### Adding a New API Route
1. Create directory in `app/api/`
2. Add `route.ts` file
3. Export GET, POST, etc. handlers
4. Add authentication/authorization

### Database Migration
```bash
# Create migration
supabase migration new add_new_table

# Apply migration
supabase db push

# Reset database (development only)
supabase db reset
```

## Troubleshooting

### Common Issues

#### Build Errors
- Check TypeScript errors
- Verify imports
- Check environment variables
- Review build logs

#### Runtime Errors
- Check browser console
- Review server logs
- Verify database connection
- Check RLS policies

#### Performance Issues
- Check bundle size
- Review database queries
- Optimize images
- Implement caching

## Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Tools
- [VS Code](https://code.visualstudio.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [React DevTools](https://react.dev/learn/react-developer-tools)

## Contributing

### Code Review Guidelines
- Review for security issues
- Check for proper error handling
- Verify TypeScript types
- Ensure accessibility
- Check performance implications

### Onboarding
- Read all documentation
- Set up local environment
- Review existing code
- Start with small tasks
- Ask questions when unsure
