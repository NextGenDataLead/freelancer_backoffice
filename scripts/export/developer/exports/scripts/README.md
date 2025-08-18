# Supabase Migration Scripts

This directory contains ordered migration scripts that reproduce the complete B2B SaaS database schema from the exported `schema.sql` and `data.sql` files.

## Execution Order

Run these scripts in the following order to set up a complete Supabase environment:

### Schema Setup (001-015)
1. **001_extensions_and_settings.sql** - PostgreSQL extensions and database settings
2. **002_basic_functions.sql** - Core security and utility functions  
3. **003_core_tables.sql** - Foundational tables (tenants, profiles, organizations)
4. **004_gdpr_compliance_tables.sql** - GDPR deletion and audit tables
5. **005_gdpr_functions.sql** - Grace period protection functions
6. **006_document_notification_tables.sql** - Document and notification system tables
7. **007_notification_functions.sql** - Notification management functions
8. **008_primary_keys_constraints.sql** - Primary keys and unique constraints
9. **009_foreign_key_relationships.sql** - Foreign key relationships
10. **010_performance_indexes.sql** - Performance optimization indexes
11. **011_triggers_updates.sql** - Automatic timestamp update triggers
12. **012_row_level_security.sql** - Enable RLS on all tables
13. **013_security_policies.sql** - Core RLS policies for multi-tenant security
14. **014_document_notification_policies.sql** - RLS policies for documents and notifications
15. **015_permissions_publications.sql** - Database permissions and real-time publications

### Data Setup (016)
16. **016_sample_data.sql** - Sample tenant and profile data for testing

## What You Get

This complete setup provides:

### Core Features
- ✅ Multi-tenant B2B SaaS architecture
- ✅ Clerk authentication integration
- ✅ Complete user profile management
- ✅ Organization and membership system

### GDPR Compliance
- ✅ 30-day grace period for account deletion
- ✅ Soft deletion with anonymization
- ✅ Complete audit logging
- ✅ Data export capabilities

### Real-time Notifications
- ✅ Priority-based notification system
- ✅ Event tracking (created, read, dismissed)
- ✅ Automatic cleanup of expired notifications
- ✅ Real-time subscriptions

### Security & Performance
- ✅ Row Level Security with tenant isolation
- ✅ Grace period protection (prevents data creation during deletion)
- ✅ Comprehensive performance indexes
- ✅ Automatic timestamp updates

### Document Management
- ✅ Vector embedding support for AI features
- ✅ Multi-tenant document isolation
- ✅ Organization-level document access

## Alternative: Single File Execution

If you prefer, you can run the original files directly:
1. `schema.sql` - Contains the complete database structure
2. `data.sql` - Contains the sample data

The migration scripts are provided for better understanding, version control, and incremental deployment scenarios.

## Dependencies

These scripts assume you have:
- Supabase project with required extensions available
- Proper authentication setup for RLS policies
- Real-time subscriptions enabled