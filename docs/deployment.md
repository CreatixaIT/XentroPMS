# Deployment

## Overview

This document covers the deployment process for Xentro PMS, including environment setup, CI/CD, and production considerations.

## Deployment Platforms

### Recommended: Vercel
Xentro PMS is built with Next.js and is optimized for Vercel deployment.

### Alternative Platforms
- Netlify
- Railway
- AWS (Amplify or custom)
- DigitalOcean App Platform

## Prerequisites

### Before Deployment
1. Supabase project created and configured
2. Database migrations applied
3. Environment variables configured
4. Resend account set up
5. Custom domain (optional)
6. SSL certificate (automatic on Vercel)

## Environment Variables

### Production Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_production_supabase_publishable_key
SUPABASE_SECRET_KEY=your_production_supabase_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
RESEND_API_KEY=your_production_resend_api_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Staging Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_staging_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_staging_supabase_publishable_key
SUPABASE_SECRET_KEY=your_staging_supabase_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_supabase_service_role_key
RESEND_API_KEY=your_staging_resend_api_key
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
```

## Deployment Steps

### 1. Prepare Supabase

#### Create Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Choose region (closest to users)
4. Wait for project to be ready

#### Apply Migrations
```bash
# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Seed initial data (if needed)
supabase db seed
```

#### Configure RLS
- Enable Row Level Security
- Apply RLS policies
- Test policies with different roles

#### Get Credentials
- Copy project URL
- Copy anon key
- Store in environment variables

### 2. Prepare Resend

#### Create Account
1. Go to [Resend](https://resend.com)
2. Create account
3. Verify domain
4. Get API key

#### Configure Email
- Set up email templates
- Configure sender domain
- Test email sending

### 3. Deploy to Vercel

#### Install Vercel CLI
```bash
npm i -g vercel
```

#### Login
```bash
vercel login
```

#### Deploy
```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set project name
# - Configure environment variables
# - Deploy
```

#### Configure Environment Variables
In Vercel Dashboard:
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add all required variables
4. Select appropriate environments (Production, Preview, Development)

#### Deploy Production
```bash
vercel --prod
```

### 4. Verify Deployment

#### Health Checks
- Check application loads
- Test authentication flow
- Verify database connection
- Test email sending
- Check all major features

#### Monitoring
- Set up error tracking (Sentry)
- Configure analytics
- Set up uptime monitoring
- Configure alerts

## CI/CD Pipeline

### GitHub Actions (Recommended)

#### Workflow File
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

#### Required Secrets
- `VERCEL_TOKEN`: Vercel API token
- `ORG_ID`: Vercel organization ID
- `PROJECT_ID`: Vercel project ID

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] TypeScript no errors
- [ ] Linting clean
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] RLS policies tested
- [ ] Backup database
- [ ] Notify team of deployment

## Post-Deployment

### Monitoring

#### Vercel Analytics
- Page views
- Web Vitals
- Geographic distribution
- Device breakdown

#### Error Tracking
- Sentry integration
- Error alerts
- Performance monitoring
- User feedback

#### Database Monitoring
- Supabase dashboard
- Query performance
- Database size
- Connection pool usage

### Maintenance

#### Regular Tasks
- Dependency updates
- Security patches
- Database backups
- Log review
- Performance optimization

#### Updates
```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Apply security patches
npm audit fix
```

## Rollback Procedure

### If Deployment Fails

#### Vercel Rollback
1. Go to Vercel Dashboard
2. Navigate to Deployments
3. Find previous successful deployment
4. Click "Promote to Production"

#### Database Rollback
```bash
# If migration caused issues
supabase db reset

# Or revert specific migration
supabase migration revert
```

### Emergency Rollback
```bash
# Revert to previous Git commit
git revert HEAD
git push

# Redeploy
vercel --prod
```

## Scaling Considerations

### Database Scaling
- Monitor database size
- Optimize queries
- Add indexes as needed
- Consider read replicas for high traffic

### Application Scaling
- Vercel handles horizontal scaling automatically
- Monitor edge function usage
- Optimize bundle size
- Implement caching strategies

### Cost Optimization
- Monitor Vercel usage
- Optimize image usage
- Implement caching
- Remove unused dependencies

## Security in Production

### HTTPS
- Automatic on Vercel
- Enforce HTTPS redirects
- Use security headers

### Security Headers
```typescript
// next.config.ts
const headers = async () => {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ]
}
```

### Environment Variables
- Never commit secrets
- Rotate keys regularly
- Use different keys per environment
- Monitor for leaked keys

## Backup Strategy

### Database Backups
- Supabase automatic daily backups
- Point-in-time recovery (7 days)
- Export backups regularly
- Store in secure location

### Application Backups
- Git repository (code)
- Vercel deployments (history)
- Environment variables (documented)

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version
- Verify dependencies
- Review build logs
- Check environment variables

#### Runtime Errors
- Check server logs
- Verify database connection
- Check RLS policies
- Review environment variables

#### Performance Issues
- Check bundle size
- Optimize images
- Review database queries
- Implement caching

## Documentation

### Keep Documentation Updated
- Update deployment notes
- Document any customizations
- Record any incidents
- Update runbooks

## Support

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Resend Documentation](https://resend.com/docs)

### Internal Support
- Contact DevOps team
- Create incident ticket
- Document resolution
- Update runbooks
