# SaaS Template Import Guide

**🎯 For End Users - Import SaaS Template to Your Supabase Project**

This guide helps you import a complete SaaS template environment into your new Supabase project. The template includes a production-ready multi-tenant SaaS application with GDPR compliance, Clerk authentication integration, and advanced features.

**✅ Export Status: Validated & Ready** - The export has been validated at 66KB total with all components verified.

## 📦 What You're Importing

### ✅ Complete SaaS Infrastructure (From Latest Export)
- **Database Schema & Data**: ~35KB schema + ~30KB data with RLS policies
- **Multi-tenant Architecture**: User profiles, organizations, tenants with data isolation
- **GDPR Compliance System**: Deletion requests, grace periods, audit logging
- **Authentication Integration**: Clerk SSO structure and user management
- **Real-time Features**: Live dashboard updates and notifications  
- **Storage System**: 3 buckets (avatars, documents, gdpr-exports) with policies
- **Edge Functions**: 0 functions (normal for this template) + deployment scripts

### ✅ Production-Ready Features (~66KB Total Export)
- Complete Row Level Security (RLS) policies for multi-tenant data isolation
- Automated GDPR deletion with 30-day grace period system
- Multi-tenant organization management with proper foreign key constraints
- Real-time dashboard metrics and notification system
- Comprehensive audit logging for compliance requirements

## 🚀 Quick Start

### Prerequisites
- ✅ New Supabase project created at [supabase.com](https://supabase.com)
- ✅ Node.js 18+ installed
- ✅ PostgreSQL client (psql) installed
- ✅ Clerk account for authentication (optional, can be set up later)

### 1. Verify You Have the Export Files

```bash
# Navigate to import directory  
cd scripts/export/import

# Verify export files exist (should see ~66KB total)
ls -la ../developer/exports/
# Expected files:
# - schema.sql (~35KB)
# - data.sql (~30KB)  
# - deploy-functions.sh
# - functions-export-summary.txt
# - validation-report.txt
```

### 2. Set Up Your Environment

```bash
# Copy and configure environment
cp .env.import-template .env.import
nano .env.import  # Fill in your NEW project credentials

# Load environment variables
source .env.import
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Import

```bash
# Complete automated import (recommended)
npm run import

# Or preview what will be imported first
npm run dry-run
```

### 5. Verify Import Success

```bash
# Verify import completed successfully
npm run verify

# Check the export validation report (created during export)
cat ../developer/exports/validation-report.txt
```

## 🔧 Import Options

### Complete Import (Recommended)
```bash
npm run import
```

### Component-Specific Imports
```bash
npm run import-database-only    # Only import database schema and data
npm run import-storage-only     # Only import storage buckets and files
npm run import-functions-only   # Only import Edge Functions
```

### Safe Import with Preview
```bash
npm run dry-run                 # Preview what will be imported
npm run import                  # Run actual import after reviewing
```

## 📋 Required Manual Steps After Import

### 1. Update Application Environment Variables

In your application's environment file (`.env.local` or similar):

```bash
# Update these with your new project values:
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key

# Update Clerk configuration:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
```

### 2. Recreate Clerk JWT Template

**⚠️ Critical Step - Required for Authentication**

**IMPORTANT:** Use this exact JWT template - it matches your imported SaaS template's requirements.

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Configure > Sessions** 
3. Click **Edit** next to the default session token
4. Add this custom JWT template named **"supabase"**:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "email": "{{user.primary_email_address}}",
  "app_metadata": {
    "role": "{{user.public_metadata.role}}",
    "provider": "clerk",
    "tenant_id": "{{user.public_metadata.tenant_id}}"
  },
  "user_metadata": {
    "last_name": "{{user.last_name}}",
    "avatar_url": "{{user.image_url}}",
    "first_name": "{{user.first_name}}"
  }
}
```

### 3. Update Webhook URLs

Update webhook URLs in external services to point to your new project:
- Clerk webhook endpoints
- Payment provider webhooks  
- Any other external service integrations

### 4. Test Critical Functionality

- [ ] User registration and login
- [ ] Dashboard access and data display
- [ ] File upload/download functionality
- [ ] Real-time features (live updates)
- [ ] GDPR deletion system (if applicable)
- [ ] Multi-tenant data isolation

## 🛠️ Troubleshooting

### Import Fails with "Missing script: import"
```bash
# Make sure you're in the correct directory
cd scripts/export/import  # Not the main project directory
npm run import
```

### Database Import Issues
```bash
# Check connection to your project
psql -h your-new-project.supabase.co -U postgres -d postgres -c "SELECT version();"

# Check import logs
cat logs/database-import.log

# Try manual database import (using current export files)
psql -h your-new-project.supabase.co -U postgres -d postgres -f ../developer/exports/schema.sql
psql -h your-new-project.supabase.co -U postgres -d postgres -f ../developer/exports/data.sql
```

### Storage Migration Problems
```bash
# Reduce batch size for slower connections
export STORAGE_BATCH_SIZE="3"
export STORAGE_MAX_FILE_SIZE="10MB"
npm run import-storage-only
```

### Authentication Issues After Import
```bash
# Verify Clerk JWT template is created correctly
# Check that environment variables are updated
# Confirm webhook URLs point to new project
```

### Verification Failures
```bash
# Run detailed verification
npm run verify

# Check verification report
cat ../exports/migration-verification-report.txt

# Manual table count check
echo "SELECT count(*) FROM profiles;" | psql -h your-new-project.supabase.co -U postgres -d postgres
```

## 📊 What to Expect

### Import Time Estimates (Based on 66KB Export)
- **Current export size**: ~66KB (35KB schema + 30KB data + functions)
- **Expected import time**: 5-15 minutes for complete import
- **Database portion**: 2-5 minutes (RLS policies, tables, data)
- **Storage setup**: 1-3 minutes (3 buckets: avatars, documents, gdpr-exports)
- **Functions deployment**: <1 minute (0 functions, just setup)

### File Locations After Import
- **Import logs**: `logs/` directory
- **Source export files**: `../developer/exports/` directory
- **Import report**: `../developer/exports/import-report.txt`
- **Verification results**: `../developer/exports/validation-report.txt`

## 🎉 Success! What's Next?

Once import is complete and verified:

1. **Deploy your application** with updated environment variables
2. **Test user registration** and core functionality
3. **Set up monitoring** and error tracking
4. **Configure backups** for your new project
5. **Review security settings** and RLS policies
6. **Plan your go-live strategy**

## 📞 Support

### Common Resources
- **Export Validation Report**: Check `../developer/exports/validation-report.txt` for export verification
- **Import Report**: Check `../developer/exports/import-report.txt` for detailed results
- **Logs Directory**: All import logs saved in `logs/` for debugging
- **Source Files**: Original export files in `../developer/exports/` (66KB total)

### If You Need Help
1. Review troubleshooting section above
2. Check all log files for specific errors
3. Verify environment variables are correct
4. Ensure manual steps (Clerk JWT, webhooks) are completed
5. Test individual components (database, storage, functions) separately

---

🎯 **Goal**: Get your SaaS application running on your own Supabase infrastructure with all features preserved and working correctly.