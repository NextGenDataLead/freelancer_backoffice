# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a B2B SaaS template project based on comprehensive research for building modern, scalable SaaS applications. The project follows API-first development and Test-Driven Development (TDD) methodologies.

## Architecture & Stack

### Recommended Technology Stack
- **Frontend**: React 18+ with Next.js 14+, TypeScript
- **Backend**: Supabase for database and real-time features
- **Authentication**: Clerk for user management and SSO
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library + Playwright
- **Styling**: Tailwind CSS
- **Monitoring**: Sentry for error tracking

### Development Methodology
- **API-First Development**: Design APIs before implementation using OpenAPI specifications
- **Test-Driven Development**: Red-Green-Refactor cycle with comprehensive test coverage
- **Testing Strategy**: 70% unit tests, 20% integration tests, 10% E2E tests

## Commands

### Development Setup
```bash
# Initialize Next.js project
npx create-next-app@latest saas-template --typescript --tailwind --eslint --app

# Install core dependencies
npm install @supabase/supabase-js @clerk/nextjs zustand @tanstack/react-query

# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @playwright/test
```

### Testing Commands
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run coverage:check
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format
```

## Key Features to Implement

### Phase 1: Foundation (Weeks 1-4)
1. **Core Architecture Setup**
   - Next.js with TypeScript
   - Supabase database configuration
   - Clerk authentication integration
   - Basic testing setup

2. **Multi-Tenant Database Design**
   - Tenant isolation with RLS policies
   - Organization and membership tables
   - Security-first approach

### Phase 2: Core Features (Weeks 5-8)
1. **Authentication Flow**
   - Sign up/sign in pages
   - Password reset functionality with secure tokens
   - Rate limiting for security

2. **Dashboard Layout**
   - Responsive sidebar navigation
   - User management interface
   - Real-time features with Supabase

### Phase 3: Advanced Features (Weeks 9-12)
1. **GDPR Compliance**
   - Cookie consent management
   - Data export functionality
   - Account deletion with 30-day grace period
   - Audit logging system

2. **Security Features**
   - Row Level Security (RLS) policies
   - Password hashing with bcrypt
   - Security headers middleware

## Code Conventions

### File Structure
```
src/
├── components/
│   ├── atoms/          # Basic UI elements
│   ├── molecules/      # Simple compound components
│   ├── organisms/      # Complex UI sections
│   └── templates/      # Page-level layouts
├── features/           # Business logic modules
│   ├── auth/
│   ├── dashboard/
│   └── settings/
└── shared/            # Cross-cutting concerns
    ├── hooks/
    ├── utils/
    └── types/
```

### API Standards
- **Naming**: Resources use plural-kebab-case (/organizations)
- **Versioning**: URL path versioning (/v1, /v2)
- **Pagination**: Cursor-based with limit parameter
- **Error Format**: RFC7807 Problem Details format

### Database Patterns
- **Multi-tenancy**: Shared database with tenant_id isolation
- **Security**: Row Level Security (RLS) on all tables
- **Performance**: Proper indexing on tenant_id and foreign keys

## Security Requirements

### Authentication Security
- bcrypt password hashing with cost factor 12
- Secure token generation for password resets
- Rate limiting on sensitive endpoints
- Session management with short-lived JWT tokens

### Data Protection
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- GDPR compliance with data export and deletion
- Audit logging for all data processing activities
- Privacy by design architecture

## Development Workflow

### Feature Development Process
1. **Design API specification** using OpenAPI
2. **Write failing tests** (Red phase)
3. **Implement minimal code** to pass tests (Green phase)
4. **Refactor** for code quality (Refactor phase)
5. **Integration testing** with real services
6. **E2E testing** for user workflows

### Quality Gates
- All tests must pass before merge
- Code coverage > 80%
- No security vulnerabilities
- Performance budgets met (LCP < 2.5s, INP < 200ms)

## Monitoring & Observability

### Performance Tracking
- Core Web Vitals monitoring
- API response time tracking
- Error rate monitoring with Sentry
- Custom business metrics

### Compliance Monitoring
- GDPR audit logs
- Security headers validation
- Data retention policy enforcement

## Environment Configuration

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

## Special Considerations

### GDPR Compliance
- Implement cookie consent banner
- Provide data export functionality
- Support account deletion with grace period
- Maintain comprehensive audit logs

### Multi-Tenant Architecture
- Tenant isolation using RLS policies
- Organization-based access control
- Scalable database design patterns

### API-First Development
- OpenAPI specifications drive development
- Mock servers for parallel development
- Contract testing between services
- Automated SDK generation

This template follows modern best practices for B2B SaaS development with emphasis on security, compliance, and scalability.