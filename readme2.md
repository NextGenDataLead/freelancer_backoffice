# B2B SaaS Template - Implementation Guide & Lessons Learned

## Overview

This is a comprehensive B2B SaaS template built with modern technologies and following industry best practices. The template implements a complete multi-tenant architecture with user authentication, profile management, and a robust dashboard interface.

## Technology Stack

### Core Framework
- **Next.js 14+** with App Router and TypeScript
- **React 18+** for component architecture
- **Tailwind CSS** for responsive styling

### Authentication & Database
- **Clerk** for user authentication and management
- **Supabase** for PostgreSQL database with real-time features
- **JWT tokens** for secure API authentication

### State Management & UI
- **Zustand** for global state management
- **shadcn/ui** components for consistent UI
- **Lucide React** icons

### Development & Testing
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality
- **Testing strategy**: 70% unit, 20% integration, 10% E2E tests

## Architecture Patterns

### Multi-Tenant Design
- **Shared database** with tenant isolation using Row Level Security (RLS)
- **Tenant-specific data** through `tenant_id` foreign keys
- **Role-based access control** (owner, admin, member, viewer)

### Authentication Flow
1. Users sign up/in through Clerk
2. JWT tokens are generated with custom claims
3. Tokens are transmitted to Supabase via `accessToken` callback
4. RLS policies enforce tenant-based access control

### API-First Development
- OpenAPI specifications drive development
- RESTful endpoints with proper HTTP status codes
- Comprehensive error handling with RFC7807 format

## Key Implementation Details

### Clerk + Supabase Integration

The most critical aspect of this template is the seamless integration between Clerk and Supabase:

```typescript
// Correct Supabase client configuration
const supabaseClient = useMemo(() => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      if (!session) return null
      return await session.getToken({ template: 'supabase' })
    }
  })
}, [session])
```

### JWT Template Configuration

**Critical**: The JWT template in Clerk must be configured exactly as follows:

```json
{
  "aud": "authenticated",
  "exp": {{date.now_plus(duration=60*60) | to_epoch}},
  "iat": {{date.now | to_epoch}},
  "iss": "{{env.CLERK_DOMAIN}}",
  "nbf": {{date.now | to_epoch}},
  "role": "authenticated",
  "app_metadata": {
    "tenant_id": "{{user.public_metadata.tenant_id}}",
    "role": "{{user.public_metadata.role}}"
  }
}
```

### Row Level Security (RLS) Policies

Essential RLS policies for multi-tenant architecture:

```sql
-- Allow users to read their own tenant's profiles
CREATE POLICY "tenant_isolation" ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Allow users to insert their own profiles
CREATE POLICY "profile_self_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id() AND
    clerk_user_id = get_current_user_profile()
  );

-- Allow tenant creation (required for new users)
CREATE POLICY "tenant_self_insert" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    id = get_current_tenant_id()
  );
```

### User Synchronization Pattern

Global user sync is implemented in the dashboard component:

```typescript
// src/components/dashboard/dashboard-content.tsx
export function DashboardContent() {
  // Initialize user synchronization with Supabase
  useUserSync() // Line 83 - Critical placement for global sync
  
  // ... rest of component
}
```

## Project Structure

```
src/
├── app/
│   ├── api/user/               # User metadata API endpoints
│   ├── dashboard/              # Dashboard pages
│   └── (auth)/                 # Authentication pages
├── components/
│   ├── dashboard/              # Dashboard components
│   ├── profile/                # User profile components
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── use-supabase-client.ts  # Supabase client with Clerk JWT
│   └── use-app-state.ts        # Application state hooks
├── lib/
│   ├── supabase.ts             # Supabase configuration
│   └── user-sync.ts            # User synchronization logic
└── store/
    ├── auth-store.ts           # Authentication state
    └── notifications-store.ts  # Notification system
```

## Critical Lessons Learned

### 1. JWT Token Transmission
**Problem**: Initially used custom headers approach which failed to transmit JWT tokens properly.

**Solution**: Use the `accessToken` callback in Supabase client configuration. This is the ONLY way that works reliably with Clerk + Supabase integration.

### 2. RLS Policy Completeness
**Problem**: Users couldn't create tenants due to missing INSERT policy.

**Solution**: Ensure all CRUD operations have corresponding RLS policies. Don't assume default policies exist.

### 3. JWT Template Structure
**Problem**: Various JWT claim structures failed to work with Supabase RLS functions.

**Solution**: Use `app_metadata` wrapper with snake_case field names to match Supabase expectations.

### 4. User Sync Placement
**Problem**: Initially placed user sync only on profile page, causing delayed synchronization.

**Solution**: Place `useUserSync()` in the main dashboard component to ensure immediate sync on any dashboard access.

### 5. Metadata Updates
**Problem**: Client-side metadata updates don't work reliably with Clerk.

**Solution**: Create server-side API endpoints for metadata updates using Clerk's backend API.

## Setup Instructions

### 1. Environment Variables

```bash
# Next.js
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the database migration scripts (see `supabase/migrations/`)
3. Configure RLS policies
4. Set up JWT authentication with Clerk as third-party provider

### 3. Clerk Setup

1. Create a new Clerk application
2. Configure JWT template named "supabase" (exact name required)
3. Set up webhook endpoints for user management
4. Configure public metadata fields: `tenant_id`, `role`

### 4. Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test:unit
npm run test:integration  
npm run test:e2e
```

## Security Considerations

### Authentication Security
- bcrypt password hashing (handled by Clerk)
- JWT tokens with short expiration (1 hour)
- Rate limiting on sensitive endpoints
- Secure session management

### Data Protection
- Row Level Security (RLS) on all tables
- Tenant isolation at database level
- Encrypted data transmission (TLS 1.3)
- GDPR compliance features

### API Security
- Input validation with Zod schemas
- CORS configuration
- Security headers middleware
- Error handling without information leakage

## Performance Optimizations

### Database
- Proper indexing on `tenant_id` and foreign keys
- Connection pooling with Supabase
- Query optimization with RLS policies

### Frontend
- Code splitting with Next.js
- Image optimization
- Lazy loading for components
- Efficient state management with Zustand

## Monitoring & Observability

### Error Tracking
- Sentry integration for error monitoring
- Custom error boundaries
- Structured logging

### Performance Monitoring
- Core Web Vitals tracking
- API response time monitoring
- Database query performance

## Common Issues & Solutions

### Issue: "JWT token not found in Supabase"
**Solution**: Verify JWT template configuration and use `accessToken` callback in Supabase client.

### Issue: "Permission denied for table profiles"
**Solution**: Check RLS policies and ensure JWT contains proper `app_metadata` structure.

### Issue: "User not syncing to Supabase"
**Solution**: Verify `useUserSync()` hook placement and check browser network tab for API calls.

### Issue: "Tenant creation fails"
**Solution**: Ensure `tenant_self_insert` RLS policy exists and JWT contains valid `tenant_id`.

## Testing Strategy

### Unit Tests (70%)
- Component rendering and props
- Hook functionality
- Utility functions
- State management logic

### Integration Tests (20%)
- API endpoint testing
- Database operations
- Authentication flows
- Third-party service integration

### E2E Tests (10%)
- Critical user journeys
- Complete authentication flows
- Multi-tenant functionality
- Cross-browser compatibility

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Configure environment variables
3. Set up preview deployments
4. Configure domain and SSL

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies active
- [ ] JWT templates configured
- [ ] Error monitoring setup
- [ ] Performance monitoring active
- [ ] Security headers configured
- [ ] GDPR compliance verified

## Future Enhancements

### Planned Features
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] API rate limiting
- [ ] Webhook management
- [ ] Mobile responsive improvements

### Scalability Improvements
- [ ] Database sharding strategy
- [ ] CDN integration
- [ ] Advanced caching layers
- [ ] Microservices architecture
- [ ] Container deployment

## Contributing

1. Follow the established code conventions
2. Write tests for new features
3. Update documentation
4. Follow the PR template
5. Ensure CI/CD passes

## License

[Your License Here]

---

**Note**: This template represents battle-tested patterns for B2B SaaS applications. The Clerk + Supabase integration patterns documented here are the result of extensive troubleshooting and should be followed precisely for reliable operation.