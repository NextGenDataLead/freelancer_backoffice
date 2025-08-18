# Developer Export Tools

**🔒 DEVELOPER ACCESS ONLY - Contains sensitive export functionality**

This directory contains tools for exporting Supabase environments for template distribution. These tools are designed for SaaS template developers to create environment snapshots that can be shared with end users.

## 🎯 What This Does

Creates a complete snapshot of your Supabase environment that includes:
- **Database**: Complete schema, data, roles, and migration history
- **Storage**: All buckets, objects, and policies  
- **Edge Functions**: Function code, configuration, and environment variables
- **Security**: RLS policies, auth settings, and custom functions

## 🚀 Quick Start (Developer)

### 1. Set Up Environment
```bash
cd ~/code/saas_template/scripts/export/developer

# Copy and configure export environment
cp .env.export-template .env.export
nano .env.export  # Fill in your source project credentials
```

### 2. Install Dependencies
```bash
npm install supabase @supabase/supabase-js
```

### 3. Run Complete Export ✅ **RECOMMENDED**
```bash
# 🎯 ONE COMMAND: Complete export (database + functions + storage analysis)
./complete-export.sh
```

### 4. Validate Export ✅ **RECOMMENDED**
```bash
# 🔍 VERIFY: Validate export completeness and integrity
./validate-export.sh
```

### 5. Individual Component Exports ✅ **TESTED & WORKING**
```bash
# 📊 Database only (76KB successfully tested)
./run-export-direct.sh

# ⚡ Edge Functions only (tested - works with 0 or more functions)  
./export-functions.sh

# 📦 Storage analysis only (3 buckets detected)
node migrate-storage.js
```

## 📁 Export Output ✅ **TESTED SUCCESSFULLY**

All exports are saved to `./exports/` directory:

```
exports/
├── schema.sql                    # Database structure (35KB)
├── data.sql                     # Complete database data (30KB)  
├── migration-history.sql        # CLI migration tracking (empty if unused)
├── functions-export-summary.txt # Functions export report
├── deploy-functions.sh          # Functions deployment script
├── validation-report.txt        # Export validation report (auto-generated)
└── functions/                   # Edge Functions directory (if any exist)
    └── [function-name]/         # Individual function directories
        ├── index.ts             # Function source code
        ├── deno.json            # Deno configuration
        └── env-vars.json        # Environment variables (secrets excluded)
```

### Actual Test Results:
- **Complete Export**: ✅ Single command orchestrates all components
- **Validation**: ✅ Automated integrity checking with detailed reports
- **Database**: ✅ 76KB successfully exported (schema + data + RLS policies)
- **Functions**: ✅ 0 functions found (normal for this project)  
- **Storage**: ✅ 3 buckets detected and analyzed via API
- **Total Export Time**: ~5 minutes (including initial Docker setup)

## 🔐 Security & Access Control

### Developer Responsibilities
- **Keep credentials secure** - Never commit .env.export to version control
- **Rotate access tokens** after each export operation
- **Review export contents** before sharing with end users
- **Remove sensitive data** from function environment variables

### What Gets Exported vs Hidden
- ✅ **Exported**: Database schema, sample/production data, function code
- ❌ **Hidden**: Function secrets, personal access tokens, API keys
- ⚠️ **Review**: Environment variables are exported but secrets are excluded

## 📋 Export Checklist

Before running export:
- [ ] Verify source project has latest schema and data
- [ ] Review function environment variables for secrets  
- [ ] Ensure service role key has proper permissions
- [ ] Test critical user flows in source project
- [ ] Clean up any redundant files in developer directory

After export:
- [ ] Run validation script: `./validate-export.sh`
- [ ] Review export summary and validation reports
- [ ] Verify all file sizes are reasonable (should see ~76KB+ total)
- [ ] Test import process in staging environment first
- [ ] Document any manual steps required for end users
- [ ] Package exports/ directory for secure distribution

## 🛠️ Troubleshooting ✅ **SOLUTIONS TESTED**

### Database Connection Issues ✅ **RESOLVED**
```bash
# ✅ SOLUTION: Use IPv4 pooler connection (not direct IPv6)
# Connection format that works:
OLD_DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
OLD_DB_USER="postgres.jkennqbxyotnslpsthqf"
OLD_DB_PORT="5432"

# ✅ SOLUTION: Use simple password (avoid special characters)
OLD_DB_PASSWORD="SimplePassword123"

# Test connectivity
nc -4 -z -v aws-0-eu-central-1.pooler.supabase.com 5432
```

### Docker/CLI Issues ✅ **RESOLVED** 
```bash
# ✅ SOLUTION: Use complete-export.sh (orchestrates all components)  
./complete-export.sh

# OR individual database export (bypasses timeout issues)
./run-export-direct.sh

# If Docker is paused, restart it:
# Docker Desktop > Restart

# CLI path: Scripts automatically detect local CLI
# ./node_modules/supabase/bin/supabase (preferred) or global supabase
```

### Network/WSL Issues ✅ **DIAGNOSED**
```bash
# ✅ IPv6 limitations in WSL - use IPv4 pooler instead
# ✅ Extended timeouts for Docker image downloads (60s)
# ✅ SSL mode required for connections

# Test network connectivity:
ping aws-0-eu-central-1.pooler.supabase.com
curl -4 -I aws-0-eu-central-1.pooler.supabase.com
```

### Function Export Issues ✅ **WORKING**
```bash
# ✅ API access verified
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$OLD_PROJECT_REF/functions"

# Result: [] = no functions (normal)
```

## 🔍 Export Validation

### Validation Script Features ✅ **NEW**
The `validate-export.sh` script performs comprehensive integrity checks:

```bash
./validate-export.sh
```

**What it validates:**
- ✅ **File Existence**: All expected export files present
- ✅ **File Sizes**: Reasonable file sizes (catches empty exports)
- ✅ **Schema Integrity**: Key tables, RLS policies, and functions
- ✅ **Storage Connectivity**: API access and bucket detection
- ✅ **Function Structure**: Proper function files and deployment scripts
- ✅ **Overall Completeness**: Minimum size thresholds and file counts

**Validation Output:**
- 📊 **Console**: Real-time validation progress with color-coded results
- 📄 **Report**: Detailed `validation-report.txt` saved to exports/ directory
- 🎯 **Exit Codes**: 0 = success, 1 = validation failed

**Example validation results:**
```
🔍 SUPABASE EXPORT VALIDATION
==================================
✅ exports/ directory exists
✅ Schema file: 35K - Good size
✅ Found: profiles, tenants, CREATE POLICY
✅ Data file: 30K - Contains data
✅ Storage API working - found 3 bucket(s)
🎉 Export validation PASSED!
```

## 📦 Distribution to End Users

Once export is complete:

1. **Run complete export**: `./complete-export.sh` creates comprehensive export
2. **Package exports/ directory** - Contains all database, function, and storage data  
3. **Share import tools** from `../import/` directory with end users
4. **Provide end user documentation** (separate from this developer guide)
5. **Include environment template** for end user target projects
6. **Document manual configuration steps** (Clerk JWT setup, webhooks, etc.)

## ⚠️ Important Notes

- This directory should **not be accessible** to end users
- Export tools require **elevated permissions** 
- Contains **source project credentials** and sensitive operations
- Keep separate from end user import tools for security
- Regular rotation of access credentials recommended

---

**For end users**: See the `../import/` directory for import tools and documentation.