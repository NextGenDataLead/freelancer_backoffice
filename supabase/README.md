# Supabase Database Setup

This directory contains all the database migrations and seed data for the multi-tenant SaaS application.

## Migration Files

Run these SQL files in order in your Supabase SQL Editor:

1. **001_create_core_schema.sql** - Creates the core multi-tenant tables (tenants, profiles, organizations, organization_memberships)
2. **002_create_rls_functions_and_policies.sql** - Creates RLS helper functions and tenant isolation policies
3. **003_create_gdpr_tables.sql** - Creates GDPR compliance tables (password_reset_tokens, deletion_requests, gdpr_audit_logs)
4. **004_create_triggers_and_functions.sql** - Creates utility functions and updated_at triggers
5. **005_setup_vector_and_storage.sql** - Enables vector extension and creates documents table
6. **006_storage_policies.sql** - Creates RLS policies for storage buckets
7. **007_enable_realtime.sql** - Enables real-time subscriptions on key tables

## Seed Data

After running all migrations, run **seed.sql** to populate development and test data.

## Manual Steps Required

### 1. Storage Buckets
If the storage buckets weren't created automatically, go to **Storage** in your Supabase dashboard and create:
- `avatars` (public)
- `documents` (private)
- `exports` (private)

### 2. Authentication Settings
Go to **Authentication > Settings** and configure:
- Enable email confirmations
- Set site URL to your application URL
- Configure OAuth providers as needed

### 3. API Settings
Go to **Settings > API** and note your:
- Project URL
- anon/public key
- service_role key

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Tenant isolation is enforced at the database level
- Storage policies prevent cross-tenant data access
- GDPR compliance features are built-in

## Testing the Setup

After running all migrations, you can test with:

```sql
-- Test tenant isolation
SELECT * FROM tenants; -- Should only show tenants the user has access to

-- Test RLS functions
SELECT get_current_tenant_id(); -- Should return current tenant ID
SELECT get_current_user_profile(); -- Should return current user profile ID
```

## Database Schema Overview

```
tenants
├── profiles (users within tenants)
├── organizations (teams within tenants)
└── documents (AI-ready with vector embeddings)

organization_memberships (many-to-many: users ↔ organizations)

GDPR Compliance:
├── password_reset_tokens
├── deletion_requests
└── gdpr_audit_logs

Storage Buckets:
├── avatars (public)
├── documents (private, tenant-isolated)
└── exports (private, user-isolated)
```