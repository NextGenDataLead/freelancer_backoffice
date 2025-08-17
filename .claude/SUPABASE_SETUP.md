# Supabase + Clerk Integration Setup Guide

This comprehensive guide will help you set up both Supabase and Clerk for the B2B SaaS template with proper authentication, RLS policies, JWT configuration, webhooks, and all necessary integrations.

## Prerequisites

- **Node.js 18+** and npm installed
- **Git** for cloning the repository
- **Supabase account** 
- **Clerk account**  
- **ngrok** (for local development webhook testing)

## Step 0: Project Setup

### Clone and Install

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd saas_template
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

### Verify Dependencies

The project includes these key dependencies:
- **Frontend:** Next.js 14+, React 18+, TypeScript
- **Authentication:** @clerk/nextjs, @clerk/elements
- **Database:** @supabase/supabase-js
- **UI Components:** @radix-ui components, Tailwind CSS, lucide-react
- **Forms:** react-hook-form, @hookform/resolvers
- **Testing:** Vitest, Playwright, @testing-library
- **Webhooks:** svix for signature verification

### Verify Project Structure

Ensure these key directories and files exist:
```
saas_template/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   ├── components/             # React components
│   ├── lib/                    # Utilities and configurations
│   ├── hooks/                  # Custom React hooks
│   └── __tests__/              # Test files
├── supabase/
│   └── migrations/             # Database migration files
├── .env                        # Environment variables (create from .env.example)
├── components.json             # shadcn/ui configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── package.json                # Dependencies and scripts
```

### Component System Setup

The project uses **shadcn/ui** components with **Tailwind CSS**:
- **Configuration:** Pre-configured in `components.json`
- **Styling:** Tailwind CSS with custom theme
- **Icons:** Lucide React icons
- **No additional setup required** - components are already installed

## Step 1: Create Clerk Application

### 1.1 Initial Clerk Setup

1. **Sign up/Sign in** to [Clerk Dashboard](https://dashboard.clerk.com/)
2. **Create a new application:**
   - Choose your preferred sign-in methods (Email, Google, GitHub, etc.)
   - Select "Next.js" as your framework
   - Note your instance URL (e.g., `safe-starling-82.clerk.accounts.dev`)

3. **Configure authentication settings:**
   - **Email verification:** Required (recommended)
   - **Password requirements:** Set according to your security needs
   - **Multi-factor authentication:** Optional but recommended for production

4. **Note down your Clerk credentials:**
   - Publishable Key: `pk_test_...`
   - Secret Key: `sk_test_...` (keep secret!)
   - Frontend API: `https://your-instance.clerk.accounts.dev`

### 1.2 Configure Redirect URLs

In **Clerk Dashboard** → **Paths**:

1. **Sign-in page:** `/sign-in`
2. **Sign-up page:** `/sign-up`  
3. **After sign-up URL:** `/onboarding`
4. **After sign-in URL:** `/dashboard`
5. **User profile page:** `/dashboard/profile`

**IMPORTANT:** The template uses force redirects configured via environment variables in `layout.tsx`:
- `signUpForceRedirectUrl` always redirects to `/onboarding`
- `signInForceRedirectUrl` always redirects to `/dashboard`

## Step 2: Create Supabase Project

1. **Create a new project** in [Supabase Dashboard](https://supabase.com/dashboard)
2. **Note down your credentials:**
   - Project URL: `https://your-project-ref.supabase.co`
   - Anon/Public Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

## Step 3: Database Schema Setup

### Run the Migration Files

Execute all SQL files from `supabase/migrations/` in order:

```bash
# Apply migrations in order (run each .sql file in Supabase SQL Editor)
001_create_core_schema.sql                  # Core tables: tenants, profiles, organizations
002_create_rls_functions_and_policies.sql   # RLS functions and security policies  
003_create_gdpr_tables.sql                  # GDPR compliance: deletion_requests, audit_logs
004_create_documents_table.sql              # Documents with vector embeddings
005_create_notifications_system.sql         # Real-time notification system
011_grace_period_prevention.sql             # GDPR grace period enforcement
012_extend_profiles_for_data_architecture.sql # Additional utilities and triggers
```

**Key tables created:**
- `tenants` - Multi-tenant organization data with subscription management
- `profiles` - User profiles (single source of truth for user data)
- `organizations` - Organization management within tenants
- `organization_memberships` - User-organization relationships with roles
- `deletion_requests` - GDPR deletion workflow with grace period
- `gdpr_audit_logs` - Compliance audit trail for data protection
- `documents` - AI/ML document storage with vector embeddings
- `notifications` - Real-time notification system with events tracking
- `notification_events` - Notification interaction tracking
- `password_reset_tokens` - Secure password reset functionality

**Key RLS functions created:**
- `get_current_tenant_id()` - Returns current user's tenant ID from JWT
- `get_current_user_profile()` - Returns current user's profile ID
- `has_pending_deletion()` - Checks if user has pending deletion request
- `can_create_data()` - Grace period enforcement for data creation
- `log_gdpr_action()` - GDPR audit logging utility
- `get_user_data_for_export()` - Complete user data export for GDPR
- `anonymize_user_data()` - GDPR-compliant data anonymization

## Step 4: Critical RLS Policy Fix

**IMPORTANT:** Add this additional RLS policy to allow user profile creation during onboarding:

```sql
-- Allow users to create their own profile during initial sync
CREATE POLICY "allow_user_profile_creation" ON profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = clerk_user_id OR get_current_tenant_id() IS NOT NULL);
```

This policy is **essential** for the onboarding flow to work properly.

## Step 5: Configure Clerk-Supabase Integration

### 5.1 Set up JWT Template in Clerk

This enables Supabase to authenticate users via Clerk JWT tokens.

1. **Go to Clerk Dashboard** → **JWT Templates**
2. **Create a new template** named `supabase`
3. **Configure the template with these exact settings:**

```json
{
  "aud": "authenticated",
  "exp": "{{user.session_expiry}}",
  "iat": "{{user.session_issued_at}}",
  "iss": "https://your-clerk-frontend-api.clerk.accounts.dev",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "phone": "{{user.primary_phone_number}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "full_name": "{{user.full_name}}",
    "avatar_url": "{{user.image_url}}"
  },
  "role": "authenticated"
}
```

4. **Save the template**
5. **Test the template** using the "Test" button to ensure JWT generation works

### 5.2 Configure Supabase Auth Settings

1. **Go to Supabase Dashboard** → **Authentication** → **Settings**
2. **Configure JWT Secret:**
   - **JWT expiry limit:** `3600` (1 hour, adjust as needed)
   - **Enable email confirmations:** `true`
   - **Enable phone confirmations:** `false` (unless using phone auth)

3. **Add Clerk as Custom OAuth Provider:**
   - **Provider:** Custom
   - **Provider URL:** `https://your-clerk-instance.clerk.accounts.dev`
   - **Issuer:** `https://your-clerk-instance.clerk.accounts.dev` 
   - **Audience:** `authenticated`

### 5.3 Configure Clerk Webhooks

Webhooks sync user data from Clerk to Supabase automatically.

#### For Development (with ngrok):

1. **Install and setup ngrok:**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start your development server
   npm run dev
   
   # In another terminal, expose localhost:3000
   ngrok http 3000
   ```

2. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

#### Configure Webhook in Clerk:

1. **Go to Clerk Dashboard** → **Webhooks**
2. **Add a new webhook endpoint:**
   - **Development URL:** `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - **Production URL:** `https://your-domain.com/api/webhooks/clerk`

3. **Select these events (CRITICAL - exactly as implemented):**
   - ✅ `user.created` - Creates Supabase profile with tenant_id generation
   - ✅ `user.updated` - Updates profile when user changes details  
   - ✅ `user.deleted` - Soft deletes with anonymization (sets is_active: false)
   - ✅ `organization.created` - Creates organization records with tenant linking
   - ✅ `organizationMembership.created` - Handles org membership with proper IDs

**Webhook Implementation Details:**
- **user.created**: Creates profile with role 'member', generates tenant_id if missing
- **user.updated**: Updates email, names, avatar_url, handles missing email gracefully
- **user.deleted**: Soft deletion sets `is_active: false`, anonymizes email to `deleted-{id}@anonymous.local`
- **organization.created**: Links to user's tenant_id, creates with name and slug
- **organizationMembership.created**: Creates membership with default role 'member'

4. **Copy the webhook signing secret** for your environment variables

⚠️ **Important:** For development, you need to restart ngrok and update the webhook URL each time you restart your development session.

### 5.4 Configure Clerk Session Settings

1. **Go to Clerk Dashboard** → **Sessions**
2. **Configure session duration:**
   - **Session lifetime:** `7 days` (adjust as needed)
   - **Inactive session lifetime:** `1 day`
   - **Multi-session handling:** `Multiple sessions` (recommended)

3. **Configure CORS settings** for your domain:
   - **Allowed origins:** Add your development and production URLs
   - **Development:** `http://localhost:3000`  
   - **Production:** `https://your-domain.com`

### 5.5 Configure Middleware Protection

The template includes custom middleware in `src/middleware.ts` that handles:

1. **Public routes** (no authentication required):
   - `/sign-in(.*)` - All sign-in pages
   - `/sign-up(.*)` - All sign-up pages
   - `/api/webhooks(.*)` - Webhook endpoints
   - `/api/user/sync` - User sync API
   - `/api/user/update-metadata` - Metadata updates

2. **Onboarding flow protection**:
   - Users without `onboardingComplete: true` metadata are redirected to `/onboarding`
   - Onboarding page itself is accessible to authenticated users

3. **Route configuration**:
   ```typescript
   export const config = {
     matcher: [
       '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
       '/(api|trpc)(.*)',
     ],
   }
   ```

### 5.6 Configure User Metadata Flow

The template uses Clerk's `publicMetadata` for onboarding flow:

1. **Initial State**: New users have no `onboardingComplete` metadata
2. **Redirect Logic**: Middleware redirects to `/onboarding`
3. **Completion**: Server action sets `onboardingComplete: true`
4. **Protection**: Onboarding layout prevents completed users from re-accessing

## Step 5: Environment Variables

Add these variables to your `.env` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Webhook Secret (from Clerk Dashboard → Webhooks)
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk Force Redirect URLs (used in layout.tsx ClerkProvider)
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard

# Optional: Cron job security
CRON_SECRET=your_secure_cron_secret
```

## Step 6: Configure RLS Policies

### Key RLS Functions

The setup includes these important RLS functions:

- `get_current_tenant_id()` - Returns current user's tenant ID
- `get_current_user_role()` - Returns current user's role
- `check_user_membership(uuid)` - Checks organization membership

### Important RLS Policies

1. **Tenant Isolation:** `profiles_tenant_isolation`
   ```sql
   FOR ALL TO authenticated 
   USING (tenant_id = get_current_tenant_id())
   ```

2. **User Profile Creation:** `allow_user_profile_creation`
   ```sql
   FOR INSERT TO authenticated
   WITH CHECK (auth.uid()::text = clerk_user_id OR get_current_tenant_id() IS NOT NULL)
   ```

3. **Organization Access:** Various policies for multi-tenant access control

## Step 7: Start Development Server

### 1. Start the Frontend

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Verify the server is running:**
   - Navigate to `http://localhost:3000`
   - You should see the landing page
   - Authentication pages should be accessible at `/sign-in` and `/sign-up`

### 2. Common Development Commands

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm run test           # All tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e       # E2E tests

# Build for production
npm run build
npm start
```

## Step 8: Test the Setup

### 1. Test User Registration Flow

1. **Sign up a new user** in your application
2. **Check Supabase logs** for webhook activity:
   ```bash
   # Check API logs
   supabase logs --type api
   ```
3. **Verify user creation** in profiles table:
   ```sql
   SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5;
   ```

### 2. Test Onboarding Flow

1. **New user** should be redirected to `/onboarding`
2. **Check console logs** for sync activity:
   - "Setting tenant_id for new user"
   - "User sync successful"
3. **Complete onboarding** → should redirect to `/dashboard`

### 3. Test GDPR Deletion Flow

1. **Request account deletion** from privacy settings
2. **Check deletion_requests table:**
   ```sql
   SELECT * FROM deletion_requests WHERE status = 'pending';
   ```
3. **Run cron job:** `GET /api/cron/process-deletions`
4. **Verify soft deletion** (anonymized data preserved)

## Step 8: Critical Implementation Files

### Required File Structure

Ensure these files exist with the correct implementation:

1. **`src/middleware.ts`** - Route protection and onboarding flow
2. **`src/app/layout.tsx`** - ClerkProvider with force redirects
3. **`src/app/onboarding/page.tsx`** - Onboarding completion page
4. **`src/app/onboarding/actions.ts`** - Server action for metadata updates
5. **`src/app/onboarding/layout.tsx`** - Prevents re-access after completion
6. **`src/app/api/webhooks/clerk/route.ts`** - Webhook handler for user sync
7. **`src/app/api/user/sync/route.ts`** - Manual user sync endpoint
8. **`src/app/api/user/update-metadata/route.ts`** - Metadata update endpoint

### Implementation Notes

- **Middleware**: Must be in `src/middleware.ts` (Next.js 13+ App Router requirement)
- **Public Routes**: Include webhook and sync endpoints to prevent auth loops
- **Onboarding**: Uses server actions instead of client-side API calls
- **User Sync**: Compensates for webhook timing issues during development
- **Tenant Creation**: Automatic tenant_id generation for new users

## Step 9: Production Considerations

### Security Checklist

- ✅ **RLS enabled** on all tables
- ✅ **Service role key** kept secret (server-side only)
- ✅ **Webhook endpoints** properly secured with rate limiting
- ✅ **JWT template** configured correctly with exact claims structure
- ✅ **API routes** protected by middleware with proper public route exclusions
- ✅ **Force redirects** implemented to prevent bypass of onboarding flow

### Performance Optimization

- ✅ **Database indexes** on foreign keys
- ✅ **Connection pooling** for production
- ✅ **Query optimization** for large datasets

### Monitoring Setup

- ✅ **Supabase logs** monitoring
- ✅ **Error tracking** (Sentry integration)
- ✅ **Performance monitoring** for API routes

## Troubleshooting Common Issues

### Issue: "supabaseKey is required" Error

**Solution:** Check environment variables are properly loaded
```bash
# Verify in browser console
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Issue: RLS Permission Denied (42501)

**Solution:** Ensure RLS policies allow the operation
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue: Webhook Not Creating Users

**Solution:** Check webhook configuration
1. **Verify endpoint URL** in Clerk Dashboard
2. **Check webhook secret** matches environment variable
3. **Ensure middleware** allows webhook routes
4. **Check server logs** for webhook processing

### Issue: JWT Authentication Failing

**Solution:** Verify JWT template configuration
1. **Check template name** is `supabase`
2. **Verify claims structure** matches expected format
3. **Test JWT generation** in Clerk Dashboard

### Issue: User Sync Failing

**Solution:** Check API route accessibility
1. **Verify middleware** allows `/api/user/sync`
2. **Check console logs** for specific errors
3. **Test endpoint directly** with authentication

### Issue: Development Server Won't Start

**Solution:** Check for missing dependencies or conflicts
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Issue: Missing Components Error

**Solution:** Check if components were accidentally removed
- Refer to `REMOVED_COMPONENTS.md` for restoration guidance
- Ensure all required UI components are installed
- Verify imports in layout and page files

## Database Backup and Recovery

### Regular Backups

```bash
# Create backup
supabase db dump --file backup.sql

# Restore from backup  
supabase db reset --file backup.sql
```

### Migration Management

```bash
# Create new migration
supabase migration new migration_name

# Apply pending migrations
supabase db push
```

## Security Best Practices

1. **Never expose service role key** to client-side
2. **Use RLS policies** for all data access
3. **Validate JWT tokens** on server-side
4. **Rotate secrets** regularly
5. **Monitor access logs** for suspicious activity
6. **Use HTTPS** for all webhook endpoints
7. **Implement rate limiting** for API routes

## Support and Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT Template Guide](https://clerk.com/docs/integrations/databases/supabase)

---

**Created:** December 2024  
**Last Updated:** December 2024  
**Version:** 1.0.0