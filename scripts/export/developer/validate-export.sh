#!/bin/bash

# Supabase Export Validation Script
# Verifies export completeness and integrity after running export
# 
# Usage: ./validate-export.sh
#
# This script checks:
# - File existence and sizes
# - Schema completeness (tables, RLS policies, functions)
# - Function export integrity
# - Storage analysis results

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] 🔍 $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

header() {
    echo -e "${PURPLE}"
    echo "=================================="
    echo "🔍 $1"
    echo "=================================="
    echo -e "${NC}"
}

# Global validation results
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

# Check if exports directory exists
check_exports_directory() {
    header "CHECKING EXPORT DIRECTORY"
    
    if [[ ! -d "exports" ]]; then
        error "exports/ directory not found. Run export first."
        ((VALIDATION_ERRORS++))
        return 1
    fi
    
    success "exports/ directory exists"
    
    # Show directory contents
    log "Export directory contents:"
    find exports -type f -exec ls -lh {} \; | while read line; do
        log "  📄 $line"
    done
}

# Validate database export files
validate_database_export() {
    header "VALIDATING DATABASE EXPORT"
    
    local schema_file="exports/schema.sql"
    local data_file="exports/data.sql"
    local migration_file="exports/migration-history.sql"
    
    # Check schema file
    if [[ -f "$schema_file" ]]; then
        local schema_size=$(stat -c%s "$schema_file" 2>/dev/null || stat -f%z "$schema_file" 2>/dev/null || echo 0)
        if [[ $schema_size -gt 1000 ]]; then
            success "Schema file: $(du -h "$schema_file" | cut -f1) - Good size"
        else
            warning "Schema file is very small (${schema_size} bytes)"
            ((VALIDATION_WARNINGS++))
        fi
        
        # Check for key schema elements
        local key_elements=(
            "profiles"
            "tenants" 
            "organizations"
            "organization_memberships"
            "deletion_requests"
            "gdpr_audit_logs"
            "CREATE POLICY"
            "ENABLE ROW LEVEL SECURITY"
        )
        
        log "Checking for key schema elements:"
        for element in "${key_elements[@]}"; do
            if grep -q "$element" "$schema_file"; then
                success "  ✅ Found: $element"
            else
                warning "  ⚠️  Missing: $element"
                ((VALIDATION_WARNINGS++))
            fi
        done
        
    else
        error "Schema file missing: $schema_file"
        ((VALIDATION_ERRORS++))
    fi
    
    # Check data file
    if [[ -f "$data_file" ]]; then
        local data_size=$(stat -c%s "$data_file" 2>/dev/null || stat -f%z "$data_file" 2>/dev/null || echo 0)
        if [[ $data_size -gt 100 ]]; then
            success "Data file: $(du -h "$data_file" | cut -f1) - Contains data"
        else
            warning "Data file is very small (${data_size} bytes) - may be empty"
            ((VALIDATION_WARNINGS++))
        fi
    else
        error "Data file missing: $data_file"
        ((VALIDATION_ERRORS++))
    fi
    
    # Check migration history (optional)
    if [[ -f "$migration_file" ]]; then
        success "Migration history file exists"
    else
        log "Migration history file not found (this is normal if no migrations exist)"
    fi
}

# Validate Edge Functions export
validate_functions_export() {
    header "VALIDATING EDGE FUNCTIONS EXPORT"
    
    local functions_dir="exports/functions"
    local deploy_script="exports/deploy-functions.sh"
    local summary_file="exports/functions-export-summary.txt"
    
    # Check deploy script
    if [[ -f "$deploy_script" ]]; then
        if [[ -x "$deploy_script" ]]; then
            success "Deploy script exists and is executable"
        else
            warning "Deploy script exists but is not executable"
            ((VALIDATION_WARNINGS++))
        fi
    else
        # Deploy script should exist even with 0 functions
        log "Deploy script not found - checking if functions export ran..."
        if [[ -f "$summary_file" ]]; then
            log "Functions export summary exists, so deploy script should have been created"
            warning "Deploy script missing: $deploy_script"
            ((VALIDATION_WARNINGS++))
        else
            warning "Deploy script missing: $deploy_script (functions export may not have run)"
            ((VALIDATION_WARNINGS++))
        fi
    fi
    
    # Check summary file
    if [[ -f "$summary_file" ]]; then
        success "Functions export summary exists"
        log "Summary contents:"
        head -10 "$summary_file" | while read line; do
            log "  📋 $line"
        done
    else
        log "Functions export summary missing - functions export may not have run"
        warning "Run ./export-functions.sh to create function export files"
        ((VALIDATION_WARNINGS++))
    fi
    
    # Check functions directory
    if [[ -d "$functions_dir" ]]; then
        local function_count=$(find "$functions_dir" -mindepth 1 -maxdepth 1 -type d | wc -l)
        if [[ $function_count -gt 0 ]]; then
            success "Found $function_count Edge Function(s):"
            find "$functions_dir" -mindepth 1 -maxdepth 1 -type d | while read func_dir; do
                local func_name=$(basename "$func_dir")
                log "  📦 $func_name"
                
                # Check function files
                if [[ -f "$func_dir/index.ts" ]]; then
                    success "    ✅ Source code: index.ts"
                else
                    warning "    ⚠️  Missing: index.ts"
                    ((VALIDATION_WARNINGS++))
                fi
                
                if [[ -f "$func_dir/deno.json" ]]; then
                    success "    ✅ Configuration: deno.json"
                else
                    log "    ℹ️  No deno.json (may use default config)"
                fi
                
                if [[ -f "$func_dir/env-vars.json" ]]; then
                    log "    📄 Environment variables: env-vars.json"
                else
                    log "    ℹ️  No environment variables"
                fi
            done
        else
            log "No Edge Functions found (this is normal for projects without functions)"
        fi
    else
        log "Functions directory not found (normal if no functions exist)"
    fi
}

# Validate storage analysis
validate_storage_analysis() {
    header "VALIDATING STORAGE ANALYSIS"
    
    # Load environment to check storage
    if [[ -f ".env.export" ]]; then
        set -a
        source .env.export
        set +a
    else
        warning "No .env.export file found - cannot validate storage connectivity"
        ((VALIDATION_WARNINGS++))
        return
    fi
    
    # Check if Node.js and Supabase client are available
    if ! command -v node &> /dev/null; then
        warning "Node.js not found - storage analysis may not have run"
        ((VALIDATION_WARNINGS++))
        return
    fi
    
    if [[ ! -f "node_modules/@supabase/supabase-js/package.json" ]]; then
        warning "Supabase JS client not found - storage analysis may not have run"
        ((VALIDATION_WARNINGS++))
        return
    fi
    
    log "Testing storage connectivity..."
    
    # Test storage API access
    node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient('$OLD_PROJECT_URL', '$OLD_SERVICE_ROLE_KEY');

async function testStorage() {
  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    
    if (error) {
      console.log('❌ Storage API error:', error.message);
      process.exit(1);
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('ℹ️  No storage buckets found');
    } else {
      console.log(\`✅ Storage API working - found \${buckets.length} bucket(s)\`);
      buckets.forEach(bucket => {
        console.log(\`  📁 \${bucket.name} - \${bucket.public ? 'Public' : 'Private'}\`);
      });
    }
    
  } catch (err) {
    console.log('❌ Storage validation failed:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testStorage();
" 2>/dev/null && success "Storage API connectivity verified" || {
        warning "Storage API test failed - credentials may be invalid"
        ((VALIDATION_WARNINGS++))
    }
}

# Check export file integrity
validate_file_integrity() {
    header "VALIDATING FILE INTEGRITY"
    
    local total_size=0
    local file_count=0
    
    if [[ -d "exports" ]]; then
        while IFS= read -r -d '' file; do
            if [[ -f "$file" ]]; then
                ((file_count++))
                local size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
                ((total_size += size))
                
                if [[ $size -eq 0 ]]; then
                    warning "Empty file detected: $file"
                    ((VALIDATION_WARNINGS++))
                fi
            fi
        done < <(find exports -type f -print0)
        
        success "Processed $file_count files, total size: $(numfmt --to=iec $total_size)"
        
        # Expected minimum size (should be at least 50KB for a real export)
        if [[ $total_size -lt 50000 ]]; then
            warning "Total export size is very small ($(numfmt --to=iec $total_size)) - export may be incomplete"
            ((VALIDATION_WARNINGS++))
        fi
        
    else
        error "exports/ directory not found"
        ((VALIDATION_ERRORS++))
    fi
}

# Generate validation report
generate_validation_report() {
    header "VALIDATION SUMMARY"
    
    local report_file="exports/validation-report.txt"
    
    # Create validation report
    cat > "$report_file" << EOF
Supabase Export Validation Report
=================================

Validation Date: $(date)
Validator: validate-export.sh
Export Directory: $(pwd)/exports/

VALIDATION RESULTS:
- Errors: $VALIDATION_ERRORS
- Warnings: $VALIDATION_WARNINGS
- Status: $([ $VALIDATION_ERRORS -eq 0 ] && echo "PASSED" || echo "FAILED")

EXPORT CONTENTS:
$(find exports -type f -exec ls -lh {} \; | sort)

SCHEMA VALIDATION:
- Database schema: $([ -f "exports/schema.sql" ] && echo "✅ Present ($(du -h exports/schema.sql | cut -f1))" || echo "❌ Missing")
- Database data: $([ -f "exports/data.sql" ] && echo "✅ Present ($(du -h exports/data.sql | cut -f1))" || echo "❌ Missing")
- Migration history: $([ -f "exports/migration-history.sql" ] && echo "✅ Present" || echo "ℹ️  Not found (normal)")

FUNCTIONS VALIDATION:
- Deploy script: $([ -f "exports/deploy-functions.sh" ] && echo "✅ Present" || echo "❌ Missing")
- Export summary: $([ -f "exports/functions-export-summary.txt" ] && echo "✅ Present" || echo "⚠️  Missing")
- Functions directory: $([ -d "exports/functions" ] && echo "✅ Present" || echo "ℹ️  Not found")

RECOMMENDATIONS:
$([ $VALIDATION_ERRORS -gt 0 ] && echo "- Fix validation errors before using this export")
$([ $VALIDATION_WARNINGS -gt 0 ] && echo "- Review validation warnings")
$([ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ] && echo "- Export appears complete and ready for distribution")

For detailed validation output, see the console logs.

EOF

    if [[ $VALIDATION_ERRORS -eq 0 ]]; then
        success "🎉 Export validation PASSED!"
        success "📄 Validation report saved: $report_file"
        
        if [[ $VALIDATION_WARNINGS -gt 0 ]]; then
            warning "⚠️  $VALIDATION_WARNINGS warning(s) found - review above"
        else
            success "✨ No warnings - export is clean!"
        fi
        
        log "🚀 Export is ready for distribution!"
        
    else
        error "💥 Export validation FAILED with $VALIDATION_ERRORS error(s)!"
        error "📄 Validation report saved: $report_file"
        log "🔧 Fix the errors above before using this export"
        exit 1
    fi
    
    if [[ $VALIDATION_WARNINGS -gt 0 ]]; then
        log "📋 Summary: $VALIDATION_WARNINGS warnings, $VALIDATION_ERRORS errors"
    fi
}

# Main execution
main() {
    header "SUPABASE EXPORT VALIDATION"
    log "Validating export integrity and completeness..."
    
    local start_time=$(date +%s)
    
    # Run validation checks
    check_exports_directory || exit 1
    validate_database_export
    validate_functions_export
    validate_storage_analysis
    validate_file_integrity
    generate_validation_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "🏁 Validation completed in ${duration}s"
}

# Handle script interruption
trap 'error "Validation interrupted"; exit 1' INT TERM

# Execute main function
main "$@"