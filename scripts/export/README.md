# Supabase Environment Export & Replication Scripts

This directory contains comprehensive scripts to export your entire Supabase environment and replicate it exactly in a new project.

## 🎯 What Gets Exported

### ✅ Complete Database
- **Schema**: Tables, columns, constraints, indexes, functions, triggers, RLS policies
- **Data**: All row data across all tables
- **Roles & Permissions**: Custom database roles and permissions
- **Extensions**: All enabled Postgres extensions
- **Migration History**: Supabase CLI migration tracking

### ✅ Storage System
- **Buckets**: Storage bucket configurations and policies
- **Objects**: All uploaded files with metadata
- **Policies**: Storage RLS policies

### ✅ Edge Functions
- **Function Code**: All deployed Edge Functions
- **Configuration**: Environment variables and settings

### ✅ Authentication & Security
- **Auth Configuration**: JWT settings, providers, policies
- **RLS Policies**: Row Level Security rules
- **Custom Functions**: GDPR deletion, grace period logic

## 📁 Script Overview

| Script | Purpose | What It Exports |
|--------|---------|-----------------|
| `export-database.sh` | Database export | Schema, data, roles, migrations |
| `migrate-storage.js` | Storage migration | Buckets, objects, policies |
| `export-functions.sh` | Edge Functions | All function code and config |
| `import-environment.sh` | **Master Import** | Orchestrates complete migration |
| `verify-migration.js` | Verification | Validates migration integrity |
| `package.json` | Dependencies | Node.js package management |

## 🚀 Quick Start

### Prerequisites
- Supabase CLI installed
- Node.js 18+ installed
- PostgreSQL client (psql) installed
- Original project access tokens
- New project created and ready

### Option 1: Automated Import (Recommended)

1. **Set up environment variables:**
   ```bash
   # Copy the template and fill in your values
   cp config/environment-template.env .env.migration
   source .env.migration
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Export your current project:**
   ```bash
   # Run all export scripts
   npm run export
   
   # Or run individually:
   ./export-database.sh
   node migrate-storage.js
   ./export-functions.sh
   ```

4. **Set up your new project:**
   - Create a new Supabase project
   - Update environment variables with new project details
   - Apply any custom settings or extensions

5. **Import to new project:**
   ```bash
   # Complete automated import with verification
   ./import-environment.sh
   
   # Or with options:
   ./import-environment.sh --dry-run              # Preview what will be imported
   ./import-environment.sh --database-only        # Import only database
   ./import-environment.sh --skip-verification    # Skip verification step
   ```

6. **Verify the migration:**
   ```bash
   npm run verify
   ```

### Option 2: Manual Step-by-Step Import

1. **Import database:**
   ```bash
   psql -h your-new-project.supabase.co -U postgres -d postgres -f exports/database-export.sql
   ```

2. **Import storage:**
   ```bash
   # Update environment variables for new project first
   node migrate-storage.js
   ```

3. **Deploy Edge Functions:**
   ```bash
   cd exports && ./deploy-functions.sh
   ```

4. **Verify migration:**
   ```bash
   node verify-migration.js
   ```

## 🎛️ Advanced Import Options

The master import script (`import-environment.sh`) provides comprehensive control:

```bash
# Available command-line options
./import-environment.sh --help                 # Show all options
./import-environment.sh --dry-run              # Preview without changes
./import-environment.sh --database-only        # Import only database
./import-environment.sh --storage-only         # Import only storage
./import-environment.sh --functions-only       # Import only Edge Functions
./import-environment.sh --skip-verification    # Skip verification step
```

### Environment Configuration
```bash
# Optional environment variables for fine control
export IMPORT_DATABASE=true         # Import database (default: true)
export IMPORT_STORAGE=true          # Import storage (default: true)  
export IMPORT_FUNCTIONS=true        # Import Edge Functions (default: true)
export VERIFY_MIGRATION=true        # Run verification (default: true)
export ROLLBACK_ON_FAILURE=false    # Auto-rollback on failure (default: false)
export CREATE_BACKUP_BEFORE_IMPORT=true  # Create backup first (default: true)
```

### What the Master Import Does
1. **Pre-flight Checks**: Validates environment, connectivity, prerequisites
2. **Backup Creation**: Creates backup of target project (optional)
3. **Database Import**: Imports schema, data, and migration history
4. **Storage Migration**: Transfers all buckets and objects
5. **Functions Deployment**: Deploys all Edge Functions
6. **Verification**: Runs comprehensive integrity checks
7. **Report Generation**: Creates detailed import report
8. **Rollback Support**: Can restore from backup on failure

## 🔍 Verification & Quality Assurance

The verification script performs comprehensive checks:

- **Table Existence**: Ensures all critical tables are present
- **Row Count Comparison**: Validates data completeness
- **Data Integrity Sampling**: Spot-checks actual data values
- **Storage Verification**: Confirms all buckets and objects migrated
- **Detailed Reporting**: Generates verification report with recommendations

## 📋 Manual Steps Required

### After Migration Complete:
1. **Update Clerk JWT Template** - Recreate in new project dashboard
2. **Update Environment Variables** - Replace old keys with new ones
3. **Update Webhook URLs** - Point external services to new project
4. **Test Critical User Journeys** - Ensure everything works

## 🔧 Configuration Files

- `config/environment-template.env` - Environment variable template
- `config/migration-config.json` - Migration settings and options
- `config/verification-checklist.md` - Post-migration verification steps

## ⚠️ Important Notes

### Data Integrity
- All scripts use transactions to ensure atomicity
- Built-in rollback procedures for failed migrations
- Verification scripts validate data consistency

### Your Specific Setup
- ✅ GDPR compliance system fully preserved
- ✅ Multi-tenant architecture maintained
- ✅ Clerk integration structure preserved
- ✅ Real-time features working
- ✅ Grace period deletion system intact

### Downtime Expectations
- **Small Project (<1GB)**: 30-60 minutes
- **Medium Project (1-10GB)**: 2-4 hours  
- **Large Project (>10GB)**: 4-8+ hours

## 🛠️ Troubleshooting

### Common Issues

**Database Import Fails**
```bash
# Check connection first
psql -h your-new-project.supabase.co -U postgres -d postgres -c "SELECT version();"

# Check log for specific errors
cat logs/database-import.log

# Try importing with verbose output
PGPASSWORD="$NEW_DB_PASSWORD" psql -h your-new-project.supabase.co -U postgres -d postgres -f exports/database-export.sql --verbose
```

**Storage Migration Timeout**
```bash
# Increase timeouts and retry
export STORAGE_MAX_FILE_SIZE="10MB"
export STORAGE_BATCH_SIZE="3"
node migrate-storage.js
```

**Functions Deployment Issues**
```bash
# Check if Supabase CLI is linked
supabase status

# Re-link to new project
supabase link --project-ref "$NEW_PROJECT_REF"

# Deploy manually
cd exports/functions
supabase functions deploy
```

**Verification Failures**
```bash
# Run verification with detailed output
node verify-migration.js

# Check specific table counts
echo "SELECT count(*) FROM profiles;" | psql -h your-new-project.supabase.co -U postgres -d postgres
```

### Log Files Reference

All scripts generate detailed logs in the `logs/` directory:

- `database-export.log` - Database export progress
- `database-import.log` - Database import progress  
- `storage-migration-errors.log` - Storage migration failures
- `functions-import.log` - Edge Functions deployment
- `verification.log` - Migration verification results
- `rollback.log` - Rollback operations (if any)

### Recovery Procedures

**If Import Fails Mid-Process**
1. Check the error in appropriate log file
2. Fix the underlying issue
3. Run import again (scripts are idempotent)
4. Or use rollback if `ROLLBACK_ON_FAILURE=true`

**If Verification Fails**
1. Review verification report in `exports/`
2. Compare specific failing tables manually
3. Re-run individual import components if needed
4. Use manual SQL fixes for small data discrepancies

## 📞 Support & Documentation

### Script-Specific Help
Each script has built-in help and error guidance:
```bash
./export-database.sh --help
./import-environment.sh --help
node verify-migration.js --help
```

### Additional Resources
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **CLI Reference**: [supabase.com/docs/reference/cli](https://supabase.com/docs/reference/cli)
- **SaaS Template README**: `../README.md` (project root)

### When to Contact Support
- Persistent authentication failures
- Data corruption issues
- Performance problems with large datasets
- Environment-specific configuration issues

## 🔐 Security Notes

- Scripts handle sensitive data securely
- No credentials stored in files
- All connections use environment variables
- Encryption keys preserved for column encryption
- Automatic cleanup of temporary files
- Audit logging for all operations