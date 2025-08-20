# Supabase Migration Scripts

This directory contains ordered migration scripts that reproduce the complete B2B SaaS database schema from the exported `schema.sql` and `data.sql` files.

## Execution Order

Run these scripts in the following order to set up a complete Supabase environment:

### Schema Setup (001-017)
1. **001_extensions_and_settings.sql** - PostgreSQL extensions and database settings
2. **002_basic_functions.sql** - Core security and utility functions  
3. **003_core_tables.sql** - Foundational tables (tenants, profiles, organizations)
4. **004_gdpr_compliance_tables.sql** - GDPR deletion and audit tables
5. **005_gdpr_functions.sql** - Grace period protection functions
6. **006_document_notification_tables.sql** - Document and notification system tables
7. **007_zzp_financial_schema.sql** - Dutch ZZP financial tables and enums
8. **008_zzp_financial_constraints_policies.sql** - Financial foreign keys and RLS policies
9. **009_notification_functions.sql** - Notification management functions
10. **010_primary_keys_constraints.sql** - Primary keys and unique constraints
11. **011_foreign_key_relationships.sql** - Foreign key relationships
12. **012_performance_indexes.sql** - Performance optimization indexes
13. **013_triggers_updates.sql** - Automatic timestamp update triggers
14. **014_row_level_security.sql** - Enable RLS on all tables
15. **015_security_policies.sql** - Core RLS policies for multi-tenant security
16. **016_document_notification_policies.sql** - RLS policies for documents and notifications
17. **017_permissions_publications.sql** - Database permissions and real-time publications

### Data Setup (018)
18. **018_sample_data.sql** - Sample tenant and profile data for testing

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

### Dutch ZZP Financial Suite
- ✅ Multi-tenant client/supplier management with EU VAT support
- ✅ Invoice creation with standard and reverse-charge VAT (BTW verlegd)
- ✅ Expense tracking with OCR data support and VAT handling
- ✅ Time and kilometer tracking with billing integration
- ✅ Financial reporting with P&L and VAT return calculations
- ✅ Dutch VAT rates (21% standard, 9% reduced, exempt, reverse charge)
- ✅ KOR (Kleineondernemersregeling) small business scheme support
- ✅ Complete audit trail for all financial transactions

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