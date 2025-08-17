#!/bin/bash

# Supabase Database Export Script
# Exports complete database schema, data, roles, and migration history
# 
# Usage: ./export-database.sh
# 
# Required Environment Variables:
# - OLD_PROJECT_REF: Source project reference
# - OLD_DB_PASSWORD: Source database password
# - OLD_PROJECT_URL: Source project URL (optional, will be constructed)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check required environment variables
check_env_vars() {
    local required_vars=("OLD_PROJECT_REF" "OLD_DB_PASSWORD")
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
        error "Please set these variables and try again."
        exit 1
    fi
}

# Construct connection string
construct_connection_string() {
    # Use provided URL or construct from project ref
    if [[ -n "${OLD_PROJECT_URL:-}" ]]; then
        # Extract project ref from URL if not provided
        if [[ -z "${OLD_PROJECT_REF:-}" ]]; then
            OLD_PROJECT_REF=$(echo "$OLD_PROJECT_URL" | sed -n 's/.*\/\/\([^.]*\).*/\1/p')
        fi
        CONNECTION_STRING="postgresql://postgres.${OLD_PROJECT_REF}:${OLD_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    else
        CONNECTION_STRING="postgresql://postgres.${OLD_PROJECT_REF}:${OLD_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    fi
    
    log "Using connection string: ${CONNECTION_STRING//:${OLD_DB_PASSWORD}@/:***@}"
}

# Create necessary directories
create_directories() {
    local base_dir="$(dirname "$0")"
    local export_dir="${base_dir}/exports"
    local logs_dir="${base_dir}/logs"
    
    mkdir -p "$export_dir" "$logs_dir"
    
    export EXPORT_DIR="$export_dir"
    export LOGS_DIR="$logs_dir"
    
    success "Created export directories: $export_dir"
}

# Check Supabase CLI
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI not found. Please install it first:"
        error "  npm install -g supabase"
        error "  or visit: https://supabase.com/docs/guides/cli/getting-started"
        exit 1
    fi
    
    local cli_version
    cli_version=$(supabase --version 2>/dev/null | head -n1)
    success "Found Supabase CLI: $cli_version"
}

# Check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker not found. Please install Docker Desktop:"
        error "  https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    
    success "Docker is running"
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    
    if timeout 30 supabase db dump --db-url "$CONNECTION_STRING" --schema pg_catalog --schema information_schema --data-only --file /dev/null 2>/dev/null; then
        success "Database connection successful"
    else
        error "Failed to connect to database. Please check:"
        error "  - Project reference: $OLD_PROJECT_REF"
        error "  - Database password"
        error "  - Network connectivity"
        exit 1
    fi
}

# Export database roles
export_roles() {
    log "Exporting database roles and permissions..."
    
    local roles_file="${EXPORT_DIR}/roles.sql"
    local log_file="${LOGS_DIR}/export-roles.log"
    
    if supabase db dump \
        --db-url "$CONNECTION_STRING" \
        --file "$roles_file" \
        --role-only \
        > "$log_file" 2>&1; then
        success "Exported roles to: $roles_file"
    else
        warning "Failed to export roles (this is often expected). Check log: $log_file"
        # Create empty roles file to prevent import issues
        echo "-- No custom roles exported" > "$roles_file"
    fi
}

# Export database schema
export_schema() {
    log "Exporting database schema (structure only)..."
    
    local schema_file="${EXPORT_DIR}/schema.sql"
    local log_file="${LOGS_DIR}/export-schema.log"
    
    if supabase db dump \
        --db-url "$CONNECTION_STRING" \
        --file "$schema_file" \
        > "$log_file" 2>&1; then
        success "Exported schema to: $schema_file"
        
        # Get schema file size
        local file_size
        file_size=$(du -h "$schema_file" | cut -f1)
        log "Schema file size: $file_size"
    else
        error "Failed to export schema. Check log: $log_file"
        cat "$log_file"
        exit 1
    fi
}

# Export database data
export_data() {
    log "Exporting database data (this may take a while)..."
    
    local data_file="${EXPORT_DIR}/data.sql"
    local log_file="${LOGS_DIR}/export-data.log"
    
    # Start time for progress tracking
    local start_time=$(date +%s)
    
    if supabase db dump \
        --db-url "$CONNECTION_STRING" \
        --file "$data_file" \
        --use-copy \
        --data-only \
        > "$log_file" 2>&1; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local file_size
        file_size=$(du -h "$data_file" | cut -f1)
        
        success "Exported data to: $data_file"
        log "Data file size: $file_size"
        log "Export duration: ${duration}s"
    else
        error "Failed to export data. Check log: $log_file"
        tail -n 20 "$log_file"
        exit 1
    fi
}

# Export migration history
export_migration_history() {
    log "Exporting Supabase migration history..."
    
    local history_schema_file="${EXPORT_DIR}/migration-history-schema.sql"
    local history_data_file="${EXPORT_DIR}/migration-history-data.sql"
    local log_file="${LOGS_DIR}/export-migration-history.log"
    
    # Export migration schema
    if supabase db dump \
        --db-url "$CONNECTION_STRING" \
        --file "$history_schema_file" \
        --schema supabase_migrations \
        > "$log_file" 2>&1; then
        success "Exported migration schema to: $history_schema_file"
    else
        warning "No migration history schema found (this is normal for projects not using CLI migrations)"
        echo "-- No migration history schema" > "$history_schema_file"
    fi
    
    # Export migration data
    if supabase db dump \
        --db-url "$CONNECTION_STRING" \
        --file "$history_data_file" \
        --use-copy \
        --data-only \
        --schema supabase_migrations \
        >> "$log_file" 2>&1; then
        success "Exported migration data to: $history_data_file"
    else
        warning "No migration history data found"
        echo "-- No migration history data" > "$history_data_file"
    fi
}

# Export auth and storage schemas (if customized)
export_auth_storage_schemas() {
    log "Checking for auth and storage schema customizations..."
    
    local auth_file="${EXPORT_DIR}/auth-schema-custom.sql"
    local storage_file="${EXPORT_DIR}/storage-schema-custom.sql"
    local log_file="${LOGS_DIR}/export-auth-storage.log"
    
    # This requires Supabase CLI to be linked to the project
    if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
        log "Attempting to diff auth and storage schemas..."
        
        # This would require the project to be linked, which we'll skip for now
        warning "Auth/storage schema diff requires project linking. Skipping for now."
        warning "If you have custom auth/storage modifications, export them manually using:"
        warning "  supabase link --project-ref $OLD_PROJECT_REF"
        warning "  supabase db diff --linked --schema auth,storage > auth-storage-changes.sql"
    fi
    
    # Create placeholder files
    echo "-- Auth schema customizations (export manually if needed)" > "$auth_file"
    echo "-- Storage schema customizations (export manually if needed)" > "$storage_file"
}

# Generate export summary
generate_summary() {
    log "Generating export summary..."
    
    local summary_file="${EXPORT_DIR}/export-summary.txt"
    local total_size
    total_size=$(du -sh "$EXPORT_DIR" | cut -f1)
    
    cat > "$summary_file" << EOF
Supabase Database Export Summary
===============================

Export Date: $(date)
Source Project: $OLD_PROJECT_REF
Export Location: $EXPORT_DIR
Total Export Size: $total_size

Exported Files:
--------------
$(find "$EXPORT_DIR" -name "*.sql" -exec basename {} \; | sort)

File Sizes:
----------
$(find "$EXPORT_DIR" -name "*.sql" -exec du -h {} \; | sort -k2)

Next Steps:
----------
1. Review the exported files
2. Set up your target Supabase project
3. Run the import script: ./import-database.sh
4. Verify the migration: node verify-migration.js

Important Notes:
---------------
- Roles export may be empty (this is normal)
- Custom auth/storage schemas need manual review
- Migration history preserves CLI migration tracking
- All sensitive data is included - handle securely

EOF

    success "Export completed successfully!"
    success "Summary saved to: $summary_file"
    success "Total export size: $total_size"
}

# Main execution
main() {
    log "Starting Supabase database export..."
    log "======================================="
    
    check_env_vars
    construct_connection_string
    create_directories
    check_supabase_cli
    check_docker
    test_connection
    
    export_roles
    export_schema
    export_data
    export_migration_history
    export_auth_storage_schemas
    
    generate_summary
    
    success "Database export completed successfully!"
    warning "Remember to export Storage and Edge Functions separately using:"
    warning "  ./migrate-storage.js"
    warning "  ./export-functions.sh"
}

# Execute main function
main "$@"