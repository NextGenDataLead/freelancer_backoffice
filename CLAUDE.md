# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready B2B SaaS template built with modern web technologies and enterprise-grade features. The project implements a complete data architecture with Clerk authentication, Supabase database, and GDPR-compliant user management with soft deletion capabilities.

## Architecture & Stack

### Technology Stack
- **Frontend**: Next.js 14+ App Router, React 18+, TypeScript
- **Database**: Supabase with Row Level Security (RLS) policies  
- **Authentication**: Clerk with SSO support
- **State Management**: Zustand stores (auth, notifications, app state)
- **Real-time**: Supabase real-time subscriptions
- **Testing**: Vitest + React Testing Library + Playwright
- **Styling**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form + Zod validation

### Data Architecture (Production-Ready)
- **Clerk**: Authentication and SSO only
- **Supabase**: Single source of truth for all business data
- **Multi-tenant**: Shared database with tenant_id isolation via RLS
- **GDPR Compliance**: Soft deletion with anonymization, preserves analytics data
- **Grace Period**: 30-day account deletion protection system

## Commands

### Development
```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format
npm run format:check
```

### Testing
```bash
# Run all unit tests
npm run test:unit

# Run integration tests  
npm run test:integration

# Run E2E tests (or use Playwright MCP tools)
npm run test:e2e

# Interactive test UI
npm run test:ui

# Watch mode for development
npm run test:watch  

# Test coverage report
npm run test:coverage

# Full CI test suite
npm run test:ci
```

### Database Operations
```bash
# Apply Supabase migrations manually
# Run .sql files from supabase/migrations/ in Supabase dashboard

# Check migration status and logs
# Use Supabase MCP tools: mcp__supabase__list_migrations
```

## Key Architecture Components

### Authentication Flow
- **Clerk Integration**: Handles SSO, MFA, user authentication
- **User Sync**: Automatic sync from Clerk to Supabase profiles table
- **Route Guards**: Component-based authentication protection
- **Inactivity Warning**: Auto-logout after inactivity period

### Data Models (Supabase Schema)
```sql
-- Core tables with RLS policies
profiles: User profiles (single source of truth)
tenants: Multi-tenant organization data  
organizations: Organization management
organization_memberships: User-organization relationships
deletion_requests: GDPR deletion workflow with grace period
gdpr_audit_logs: Compliance audit trail
notifications: Real-time notification system
```

### GDPR Compliance System
- **Soft Deletion**: Anonymizes PII while preserving analytics data
- **Grace Period**: 30-day cancellation window for deletion requests  
- **Data Export**: Comprehensive user data export (v2.0 architecture)
- **Audit Logging**: Complete GDPR activity tracking
- **Cookie Consent**: EU compliance with analytics integration

### Real-time Features  
- **Dashboard Metrics**: Live KPI updates via Supabase subscriptions
- **Notifications**: Database-backed real-time notifications
- **User Presence**: Activity status and session management

## File Structure & Patterns

### App Directory (Next.js 14+ App Router)
```
src/app/
├── api/                    # API routes
│   ├── user/              # User management endpoints
│   ├── admin/             # Admin operations  
│   └── cron/              # Background job processing
├── dashboard/             # Protected dashboard pages
└── (auth)/                # Authentication pages
```

### Component Architecture (Atomic Design)
```
src/components/
├── ui/                    # shadcn/ui base components
├── atoms/                 # Basic reusable elements  
├── molecules/             # Simple compound components
├── organisms/             # Complex UI sections
└── templates/             # Page-level layouts
```

### Business Logic Organization
```
src/
├── lib/                   # Core utilities and configurations
│   ├── deletion/          # GDPR deletion system
│   └── gdpr/             # Privacy and compliance tools
├── hooks/                 # Custom React hooks  
├── store/                 # Zustand state management
└── features/              # Feature-specific modules
```

### Database Migrations
```
supabase/migrations/
├── 001_create_core_schema.sql          # Base multi-tenant structure
├── 002_create_rls_functions_and_policies.sql  # Security policies
├── 003_create_gdpr_tables.sql          # GDPR compliance tables
├── 004_create_documents_table.sql      # Document management
├── 005_create_notifications_system.sql # Real-time notifications
├── 011_grace_period_prevention.sql     # Deletion protection
└── 012_extend_profiles_for_data_architecture.sql  # Enhanced profiles + onboarding tracking
```

## Critical Implementation Details

### User Data Synchronization
- **Clerk → Supabase**: Automatic sync via `useUserSync()` hook
- **Conflict Resolution**: Supabase data takes precedence over Clerk  
- **Profile Updates**: All changes saved to Supabase as single source of truth
- **Real-time Sync**: Cross-component state updates via events

### Grace Period Protection System
- **Trigger**: User requests account deletion → creates pending deletion_request
- **Protection**: Blocks profile changes, settings updates, data creation  
- **Duration**: 30-day configurable grace period
- **Cancellation**: User can cancel deletion and restore full access
- **Automation**: Cron job processes expired deletion requests

### API Patterns
- **Authentication**: Clerk auth() for user identification
- **Authorization**: Supabase RLS policies for data access
- **Error Handling**: Consistent error responses with audit logging
- **Rate Limiting**: Built-in protection for sensitive endpoints

### Testing Strategy (70/20/10 Coverage)
- **Unit Tests**: Components, utilities, hooks (70%)
- **Integration Tests**: API routes, database operations (20%)  
- **E2E Tests**: User workflows via Playwright MCP tools (10%)

## Environment Configuration

### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard

# Optional: Cron job security
CRON_SECRET=your_secure_cron_secret

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## Development Workflows

### Feature Development Process  
1. **Plan**: Use TodoWrite tool to track complex tasks
2. **API Design**: Create API routes following existing patterns
3. **Database**: Add migrations to supabase/migrations/ if needed
4. **Components**: Build using atomic design principles
5. **Testing**: Write tests following 70/20/10 strategy
6. **Integration**: Ensure proper RLS policies and auth guards

### Database Changes
1. Create numbered migration file in `supabase/migrations/`
2. Include RLS policies and indexes in same migration
3. Test migration on development environment first
4. Apply via Supabase dashboard or CLI

### GDPR and Privacy Considerations
- All new user data must support soft deletion/anonymization  
- Implement grace period protection for sensitive operations
- Add audit logging for data processing activities
- Ensure RLS policies prevent cross-tenant data access

## Key Integrations

### MCP Tools Available
- **Supabase MCP**: Database operations, migrations, logs
- **Playwright MCP**: E2E testing with browser automation
- **Context7 MCP**: Up-to-date documentation lookup
- **shadcn-ui MCP**: Component code and examples

### Real-time Features
- **Dashboard**: Live metrics via `useRealtimeDashboard()` 
- **Notifications**: Database notifications via `useRealtimeNotifications()`
- **User Presence**: Activity tracking and session management

### Background Jobs  
- **Deletion Processing**: `GET /api/cron/process-deletions` 
- **Automated Cleanup**: Processes expired grace period deletions
- **Audit Logging**: Comprehensive GDPR compliance tracking

This template provides enterprise-grade B2B SaaS functionality with complete GDPR compliance, multi-tenant architecture, and production-ready security features.