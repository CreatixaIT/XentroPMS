# Security

## Overview

Security is a top priority for Xentro PMS. This document outlines the security measures implemented throughout the application.

## Authentication

### Supabase Auth
- Uses Supabase Auth for user authentication
- Email/password authentication
- Session management via HTTP-only cookies
- Automatic token refresh
- Secure password hashing (handled by Supabase)

### Session Management
- Sessions stored in HTTP-only, secure cookies
- Cookie settings:
  - `httpOnly`: Prevents JavaScript access
  - `secure`: Only sent over HTTPS
  - `sameSite`: CSRF protection
- Session validation on every request via middleware
- Automatic session refresh when needed

### Password Security
- Passwords never stored in plain text
- Hashed by Supabase using bcrypt
- Minimum password requirements enforced:
  - At least 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Password reset flow via email
- Password strength indicator in UI

## Authorization

### Role-Based Access Control (RBAC)
Three user roles:
- **SUPER_ADMIN**: Full system access, can manage users and system settings
- **TEAM_LEADER**: Team/project/task functionality according to permissions
- **EMPLOYEE**: Normal employee functionality, personal access only

### Account Status
Four account statuses:
- **PENDING_VERIFICATION**: User has not completed email verification
- **ACTIVE**: Normal access, full functionality
- **DISABLED**: Cannot log in or use protected application functionality
- **BLOCKED**: Cannot access the application, security restriction

### Server-Side Authorization
- All authorization decisions made on server
- Never trust client-side role information
- Role verification on every sensitive operation
- Server Actions check user permissions

### Row Level Security (RLS)
- Database-level access control
- Policies defined for each table
- Users can only access data they're authorized to see
- Bypassing client-side checks still blocked by RLS

### Example Authorization Check
```typescript
// Server Action example
export async function updateTask(taskId: string, data: TaskUpdate) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // Verify user can update this task
  const task = await getTask(taskId)
  if (task.assigned_to !== user.id && !isAdmin(user.id)) {
    throw new Error('Forbidden')
  }
  
  // Proceed with update
}
```

## Data Protection

### Encryption
- **In Transit**: TLS/SSL for all connections
- **At Rest**: Supabase encrypts data at rest
- **Passwords**: Hashed with bcrypt

### Input Validation
- All inputs validated with Zod schemas
- Server-side validation is authoritative
- Never trust client-side validation
- SQL injection prevention via parameterized queries

### Output Encoding
- React automatically escapes JSX
- Prevent XSS attacks
- Sanitize user-generated content

## Secrets Management

### Environment Variables
- All secrets stored in environment variables
- `.env.local` for local development (gitignored)
- `.env.example` for documentation (committed)
- Different variables for dev/staging/production

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Key Usage
- **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**: Client-side Supabase client (browser, SSR with session)
- **SUPABASE_SECRET_KEY**: Server-side privileged operations (excluding auth.admin)
- **SUPABASE_SERVICE_ROLE_KEY**: Recommended for auth.admin operations (user creation, password management)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Legacy fallback for client-side (backward compatibility)

**Important**: Due to current SDK/platform compatibility issues (see https://github.com/supabase/supabase-js/issues/1568), the new secret key format (`sb_secret_`) does not work reliably with Supabase's `auth.admin` APIs. Admin operations like `auth.admin.createUser()` currently require the legacy service role key format. This is a known issue that may be resolved in future SDK versions.

### Secrets Never Committed
- Never commit `.env` files
- Never commit actual API keys
- Never commit service-role keys
- Use `.env.example` for documentation

### Service Role Key
- Only used in server-side code
- Never exposed to client
- Stored in server environment variables
- Not included in `NEXT_PUBLIC_*` variables

## API Security

### API Routes
- All API routes protected by authentication
- Rate limiting implemented where appropriate
- CORS configured properly
- Input validation on all endpoints

### Server Actions
- Authentication required for all actions
- Authorization checks before operations
- Input validation with Zod
- Error handling without exposing sensitive info

### Middleware
- Validates session on every request
- Redirects unauthenticated users
- Refreshes expired sessions
- Protects sensitive routes

## Frontend Security

### XSS Prevention
- React's automatic escaping
- No `dangerouslySetInnerHTML` unless necessary
- Content Security Policy (CSP) headers
- Sanitize user-generated content

### CSRF Protection
- SameSite cookie attribute
- CSRF tokens for state-changing operations
- Origin header validation
- Referrer header validation

### Content Security Policy
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self';
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

## Database Security

### Row Level Security (RLS)
- Enabled on all important tables
- Policies restrict data access
- Cannot be bypassed by client
- Server can bypass with service role when needed

### Database Connections
- Connection pooling via Supabase
- SSL required for connections
- Connection timeouts configured
- Query timeouts configured

### SQL Injection Prevention
- Parameterized queries via Supabase client
- Never concatenate user input into queries
- Input validation before database operations
- Type-safe queries with TypeScript

## File Upload Security

### Supabase Storage
- All uploads go through Supabase Storage
- File type validation
- File size limits
- Virus scanning (via Supabase)
- Access controlled via RLS

### Upload Validation
- Validate file type on server
- Validate file size
- Sanitize file names
- Generate unique filenames

## Email Security

### Resend Integration
- API key stored in environment variable
- Only transactional emails sent
- No sensitive data in email bodies
- Rate limiting applied

### Email Content
- No passwords sent via email
- Temporary links for sensitive actions
- Link expiration
- Unsubscribe option

## Logging and Monitoring

### Security Events
- Failed login attempts logged
- Unauthorized access attempts logged
- Permission denials logged
- Suspicious activity flagged

### Error Handling
- User-friendly error messages
- No sensitive data in error messages
- Stack traces only in development
- Error logging for debugging

## Third-Party Dependencies

### Dependency Management
- Regular dependency updates
- Security audit with `npm audit`
- Use `npm ci` for production builds
- Lock file committed

### Vulnerability Scanning
- Automated security scanning
- Dependabot for dependency updates
- Manual review of new dependencies
- Only necessary dependencies installed

## Development Security

### Local Development
- Use `.env.local` for secrets
- Never commit local secrets
- Use different keys for development
- Test security features locally

### Code Review
- Security review for all changes
- Focus on authentication/authorization
- Review database queries
- Check for hardcoded secrets

## Production Security

### Deployment
- Environment variables set via platform
- HTTPS enforced
- Security headers configured
- Regular security updates

### Monitoring
- Security event monitoring
- Anomaly detection
- Regular security audits
- Incident response plan

## Compliance

### Data Privacy
- User data protection
- Data retention policies
- Right to deletion
- Data export functionality

### Audit Trail
- Important actions logged
- User attribution for actions
- Timestamp for all events
- Immutable audit logs

## Security Best Practices

### Do's
- Always validate input on server
- Use parameterized queries
- Implement RLS on all tables
- Use HTTP-only cookies
- Enable security headers
- Regular security audits
- Keep dependencies updated
- Use strong password policies

### Don'ts
- Never trust client-side data
- Never expose service-role keys
- Never commit secrets
- Never use eval() or similar
- Never disable RLS in production
- Never store plaintext passwords
- Never ignore security warnings
- Never skip authentication checks

## Incident Response

### Security Incident Process
1. Identify and contain
2. Assess impact
3. Notify stakeholders
4. Remediate vulnerability
5. Document incident
6. Prevent recurrence

### Reporting
- Security issues reported immediately
- Clear communication channels
- Post-incident analysis
- Process improvements

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Web Security Guidelines](https://web.dev/security/)
