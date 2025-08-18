#!/bin/bash

# Supabase Environment Import Orchestration Script
# 
# This is the master script that coordinates the complete import process
# for a Supabase environment exported using the export scripts.
#
# Usage: ./import-environment.sh [--dry-run] [--skip-verification]
#
# Required Environment Variables:
# - NEW_PROJECT_REF: Target project reference
# - NEW_PROJECT_URL: Target project URL
# - NEW_SERVICE_ROLE_KEY: Target project service role key
# - NEW_DB_PASSWORD: Target database password
# - SUPABASE_ACCESS_TOKEN: Personal access token
#
# Optional Environment Variables:
# - IMPORT_DATABASE: Import database (default: true)
# - IMPORT_STORAGE: Import storage (default: true)
# - IMPORT_FUNCTIONS: Import Edge Functions (default: true)
# - VERIFY_MIGRATION: Run verification after import (default: true)
# - ROLLBACK_ON_FAILURE: Rollback on any failure (default: false)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
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

info() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

step() {
    echo -e "${PURPLE}[$(date +'%Y-%m-%d %H:%M:%S')] 🚀 $1${NC}"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORT_DIR="${SCRIPT_DIR}/exports"
LOG_DIR="${SCRIPT_DIR}/logs"
BACKUP_DIR="${SCRIPT_DIR}/backups"
START_TIME=$(date +%s)

# Default options
DRY_RUN=false
SKIP_VERIFICATION=false
IMPORT_DATABASE="${IMPORT_DATABASE:-true}"
IMPORT_STORAGE="${IMPORT_STORAGE:-true}"
IMPORT_FUNCTIONS="${IMPORT_FUNCTIONS:-true}"
VERIFY_MIGRATION="${VERIFY_MIGRATION:-true}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-false}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-verification)
            SKIP_VERIFICATION=true
            VERIFY_MIGRATION=false
            shift
            ;;
        --database-only)
            IMPORT_DATABASE=true
            IMPORT_STORAGE=false
            IMPORT_FUNCTIONS=false
            shift
            ;;
        --storage-only)
            IMPORT_DATABASE=false
            IMPORT_STORAGE=true
            IMPORT_FUNCTIONS=false
            shift
            ;;
        --functions-only)
            IMPORT_DATABASE=false
            IMPORT_STORAGE=false
            IMPORT_FUNCTIONS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run              Show what would be imported without executing"
            echo "  --skip-verification    Skip migration verification after import"
            echo "  --database-only        Import only database components"
            echo "  --storage-only         Import only storage components"
            echo "  --functions-only       Import only Edge Functions"
            echo "  --help                 Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  NEW_PROJECT_REF        Target project reference (required)"
            echo "  NEW_PROJECT_URL        Target project URL (required)"
            echo "  NEW_SERVICE_ROLE_KEY   Target service role key (required)"
            echo "  NEW_DB_PASSWORD        Target database password (required)"
            echo "  SUPABASE_ACCESS_TOKEN  Personal access token (required)"
            echo ""
            echo "Optional Environment Variables:"
            echo "  IMPORT_DATABASE=true   Import database (true/false)"
            echo "  IMPORT_STORAGE=true    Import storage (true/false)"
            echo "  IMPORT_FUNCTIONS=true  Import Edge Functions (true/false)"
            echo "  VERIFY_MIGRATION=true  Run verification (true/false)"
            echo "  ROLLBACK_ON_FAILURE=false  Rollback on failure (true/false)"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check required environment variables
check_environment() {
    step "Checking environment configuration..."
    
    local required_vars=(
        "NEW_PROJECT_REF"
        "NEW_PROJECT_URL" 
        "NEW_SERVICE_ROLE_KEY"
        "NEW_DB_PASSWORD"
        "SUPABASE_ACCESS_TOKEN"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        error ""
        error "Please set these variables and try again."
        error "See config/environment-template.env for a complete template."
        exit 1
    fi
    
    success "All required environment variables are set"
}

# Check prerequisites
check_prerequisites() {
    step "Checking prerequisites..."
    
    # Check for required tools
    local tools=("supabase" "psql" "node" "curl" "jq")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            error "  - $tool"
        done
        exit 1
    fi
    
    # Check for export files
    if [[ ! -d "$EXPORT_DIR" ]]; then
        error "Export directory not found: $EXPORT_DIR"
        error "Please run the export scripts first or ensure you're in the correct directory."
        exit 1
    fi
    
    # Check for Node.js dependencies
    if [[ ! -f "$SCRIPT_DIR/package.json" ]] || [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        warning "Node.js dependencies not installed. Installing..."
        cd "$SCRIPT_DIR"
        if [[ -f "package.json" ]]; then
            npm install
        else
            npm init -y
            npm install @supabase/supabase-js
        fi
        cd - > /dev/null
    fi
    
    success "All prerequisites satisfied"
}

# Create necessary directories
create_directories() {
    step "Creating necessary directories..."
    
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    
    # Create timestamped backup directory for this import
    local timestamp=$(date +%Y%m%d_%H%M%S)
    export CURRENT_BACKUP_DIR="${BACKUP_DIR}/import_${timestamp}"
    mkdir -p "$CURRENT_BACKUP_DIR"
    
    success "Directories created"
}

# Test target project connectivity
test_target_connectivity() {
    step "Testing target project connectivity..."
    
    # Test Supabase API access
    local response
    if response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        "https://api.supabase.com/v1/projects/$NEW_PROJECT_REF" \
        -o /dev/null); then
        
        if [[ "$response" == "200" ]]; then
            success "Target project API access verified"
        else
            error "Failed to access target project API (HTTP $response)"
            exit 1
        fi
    else
        error "Failed to connect to Supabase API"
        exit 1
    fi
    
    # Test database connectivity
    if PGPASSWORD="$NEW_DB_PASSWORD" psql \
        -h "${NEW_PROJECT_URL#https://}" \
        -U postgres \
        -d postgres \
        -c "SELECT version();" &> /dev/null; then
        success "Target database connectivity verified"
    else
        error "Failed to connect to target database"
        exit 1
    fi
}

# Create backup of target project (if requested)
create_target_backup() {
    if [[ "${CREATE_BACKUP_BEFORE_IMPORT:-true}" == "true" ]]; then
        step "Creating backup of target project..."
        
        local backup_file="${CURRENT_BACKUP_DIR}/target-backup.sql"
        
        if PGPASSWORD="$NEW_DB_PASSWORD" pg_dump \
            -h "${NEW_PROJECT_URL#https://}" \
            -U postgres \
            -d postgres \
            --no-owner \
            --no-privileges \
            --verbose \
            > "$backup_file" 2>"${LOG_DIR}/backup.log"; then
            success "Target project backup created: $backup_file"
        else
            warning "Failed to create target backup (continuing anyway)"
        fi
    fi
}

# Import database
import_database() {
    if [[ "$IMPORT_DATABASE" != "true" ]]; then
        info "Skipping database import (disabled)"
        return 0
    fi
    
    step "Importing database..."
    
    local db_export_file="${EXPORT_DIR}/database-export.sql"
    
    if [[ ! -f "$db_export_file" ]]; then
        error "Database export file not found: $db_export_file"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would import database from $db_export_file"
        return 0
    fi
    
    # Import using psql
    local import_log="${LOG_DIR}/database-import.log"
    
    if PGPASSWORD="$NEW_DB_PASSWORD" psql \
        -h "${NEW_PROJECT_URL#https://}" \
        -U postgres \
        -d postgres \
        -f "$db_export_file" \
        --set ON_ERROR_STOP=1 \
        --verbose \
        > "$import_log" 2>&1; then
        success "Database import completed successfully"
        return 0
    else
        error "Database import failed. Check log: $import_log"
        return 1
    fi
}

# Import storage
import_storage() {
    if [[ "$IMPORT_STORAGE" != "true" ]]; then
        info "Skipping storage import (disabled)"
        return 0
    fi
    
    step "Importing storage objects..."
    
    if [[ ! -f "${SCRIPT_DIR}/migrate-storage.js" ]]; then
        error "Storage migration script not found"
        return 1
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would import storage using migrate-storage.js"
        return 0
    fi
    
    # Set old project env vars to empty (we're importing from exports)
    export OLD_PROJECT_URL="$NEW_PROJECT_URL"
    export OLD_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY"
    
    cd "$SCRIPT_DIR"
    if node migrate-storage.js > "${LOG_DIR}/storage-import.log" 2>&1; then
        success "Storage import completed successfully"
        cd - > /dev/null
        return 0
    else
        error "Storage import failed. Check log: ${LOG_DIR}/storage-import.log"
        cd - > /dev/null
        return 1
    fi
}

# Import Edge Functions
import_functions() {
    if [[ "$IMPORT_FUNCTIONS" != "true" ]]; then
        info "Skipping Edge Functions import (disabled)"
        return 0
    fi
    
    step "Importing Edge Functions..."
    
    local deploy_script="${EXPORT_DIR}/deploy-functions.sh"
    
    if [[ ! -f "$deploy_script" ]]; then
        warning "Edge Functions deployment script not found, skipping"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would deploy Edge Functions using $deploy_script"
        return 0
    fi
    
    # Make deploy script executable and run it
    chmod +x "$deploy_script"
    
    if cd "$EXPORT_DIR" && ./deploy-functions.sh > "${LOG_DIR}/functions-import.log" 2>&1; then
        success "Edge Functions import completed successfully"
        cd - > /dev/null
        return 0
    else
        error "Edge Functions import failed. Check log: ${LOG_DIR}/functions-import.log"
        cd - > /dev/null
        return 1
    fi
}

# Run verification
run_verification() {
    if [[ "$VERIFY_MIGRATION" != "true" ]] || [[ "$SKIP_VERIFICATION" == "true" ]]; then
        info "Skipping migration verification"
        return 0
    fi
    
    step "Running migration verification..."
    
    if [[ ! -f "${SCRIPT_DIR}/verify-migration.js" ]]; then
        warning "Verification script not found, skipping"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would run migration verification"
        return 0
    fi
    
    # Set verification environment variables
    export OLD_PROJECT_URL="$NEW_PROJECT_URL"  # Compare with itself (post-import)
    export OLD_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY"
    
    cd "$SCRIPT_DIR"
    if node verify-migration.js > "${LOG_DIR}/verification.log" 2>&1; then
        success "Migration verification passed"
        cd - > /dev/null
        return 0
    else
        warning "Migration verification found issues. Check log: ${LOG_DIR}/verification.log"
        cd - > /dev/null
        return 1
    fi
}

# Generate import report
generate_import_report() {
    step "Generating import report..."
    
    local report_file="${EXPORT_DIR}/import-report.txt"
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local duration_formatted=$(printf '%02d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))
    
    cat > "$report_file" << EOF
Supabase Environment Import Report
=================================

Import Date: $(date)
Target Project: $NEW_PROJECT_REF
Target URL: $NEW_PROJECT_URL
Duration: $duration_formatted

Import Configuration:
--------------------
Database Import: $IMPORT_DATABASE
Storage Import: $IMPORT_STORAGE
Functions Import: $IMPORT_FUNCTIONS
Verification: $VERIFY_MIGRATION

Import Status:
-------------
Database: $([ "$IMPORT_DATABASE" == "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
Storage: $([ "$IMPORT_STORAGE" == "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
Edge Functions: $([ "$IMPORT_FUNCTIONS" == "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")
Verification: $([ "$VERIFY_MIGRATION" == "true" ] && echo "✅ Completed" || echo "⏭️ Skipped")

Next Steps:
----------
1. Update your application environment variables:
   - NEXT_PUBLIC_SUPABASE_URL=$NEW_PROJECT_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=[get from project settings]
   - SUPABASE_SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY

2. Recreate Clerk JWT template in new project:
   - Go to Clerk Dashboard > Configure > Sessions
   - Create new JWT template named "supabase"
   - Copy configuration from documentation

3. Update external service configurations:
   - Webhook URLs in Clerk
   - API endpoint URLs in external services
   - Domain allowlists and CORS settings

4. Test critical functionality:
   - User authentication and registration
   - Database operations and RLS policies
   - File uploads and downloads
   - Edge Functions execution
   - Real-time subscriptions

5. Production deployment:
   - Update DNS records if needed
   - Update environment variables in deployment platform
   - Run full end-to-end tests
   - Monitor application logs for issues

Important Security Notes:
------------------------
- Rotate all API keys and access tokens
- Review and update RLS policies
- Verify GDPR compliance settings
- Test data isolation in multi-tenant setup
- Confirm backup and disaster recovery procedures

Files and Logs:
---------------
- Import logs: ${LOG_DIR}/
- Export data: ${EXPORT_DIR}/
- Backup (if created): ${CURRENT_BACKUP_DIR}/
- This report: $report_file

EOF

    success "Import report generated: $report_file"
}

# Handle errors and rollback if requested
handle_error() {
    local exit_code=$1
    local failed_step="$2"
    
    error "Import failed during: $failed_step"
    
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]] && [[ -f "${CURRENT_BACKUP_DIR}/target-backup.sql" ]]; then
        warning "Attempting rollback to original state..."
        
        if PGPASSWORD="$NEW_DB_PASSWORD" psql \
            -h "${NEW_PROJECT_URL#https://}" \
            -U postgres \
            -d postgres \
            -f "${CURRENT_BACKUP_DIR}/target-backup.sql" \
            > "${LOG_DIR}/rollback.log" 2>&1; then
            success "Rollback completed successfully"
        else
            error "Rollback failed. Check log: ${LOG_DIR}/rollback.log"
        fi
    fi
    
    generate_import_report
    exit $exit_code
}

# Main execution
main() {
    echo ""
    echo "🚀 Supabase Environment Import Orchestration"
    echo "============================================"
    echo ""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        warning "DRY RUN MODE - No actual changes will be made"
        echo ""
    fi
    
    # Pre-flight checks
    check_environment
    check_prerequisites
    create_directories
    test_target_connectivity
    create_target_backup
    
    echo ""
    step "Starting import process..."
    echo ""
    
    # Import components
    if ! import_database; then
        handle_error 1 "database import"
    fi
    
    if ! import_storage; then
        handle_error 1 "storage import"
    fi
    
    if ! import_functions; then
        handle_error 1 "Edge Functions import"
    fi
    
    # Post-import verification
    if ! run_verification; then
        warning "Verification failed, but import may still be successful"
    fi
    
    # Generate final report
    generate_import_report
    
    echo ""
    success "🎉 Environment import completed successfully!"
    echo ""
    info "Next steps:"
    info "1. Update your application environment variables"
    info "2. Recreate Clerk JWT template in the new project"
    info "3. Test all critical functionality"
    info "4. Update external service configurations"
    echo ""
    info "See the import report for detailed instructions: ${EXPORT_DIR}/import-report.txt"
    echo ""
}

# Trap errors
trap 'handle_error $? "unexpected error"' ERR

# Execute main function
main "$@"