#!/bin/bash

# Direct export script - bypasses connection test since we've confirmed it works
# Run this when connection test times out but direct commands work

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Load environment variables
source .env.export

# Set up directories
EXPORT_DIR="./exports"
LOGS_DIR="./logs"
mkdir -p "$EXPORT_DIR" "$LOGS_DIR"

# Connection string (we've confirmed this works)
CONNECTION_STRING="postgresql://postgres.jkennqbxyotnslpsthqf:JatogNietdan@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Find Supabase CLI
SUPABASE_CLI="./node_modules/supabase/bin/supabase"

log "Starting direct database export (bypassing connection test)..."
log "Using connection: ${CONNECTION_STRING//JatogNietdan/***}"

# Export schema
log "Exporting database schema..."
if $SUPABASE_CLI db dump \
    --db-url "$CONNECTION_STRING" \
    --file "${EXPORT_DIR}/schema.sql" \
    > "${LOGS_DIR}/export-schema.log" 2>&1; then
    success "Schema exported successfully"
    ls -lh "${EXPORT_DIR}/schema.sql"
else
    error "Schema export failed. Check log: ${LOGS_DIR}/export-schema.log"
    tail "${LOGS_DIR}/export-schema.log"
    exit 1
fi

# Export data
log "Exporting database data..."
if $SUPABASE_CLI db dump \
    --db-url "$CONNECTION_STRING" \
    --file "${EXPORT_DIR}/data.sql" \
    --use-copy \
    --data-only \
    > "${LOGS_DIR}/export-data.log" 2>&1; then
    success "Data exported successfully"
    ls -lh "${EXPORT_DIR}/data.sql"
else
    error "Data export failed. Check log: ${LOGS_DIR}/export-data.log"
    tail "${LOGS_DIR}/export-data.log"
    exit 1
fi

# Export migration history
log "Exporting migration history..."
if $SUPABASE_CLI db dump \
    --db-url "$CONNECTION_STRING" \
    --file "${EXPORT_DIR}/migration-history.sql" \
    --schema supabase_migrations \
    > "${LOGS_DIR}/export-migrations.log" 2>&1; then
    success "Migration history exported successfully"
    ls -lh "${EXPORT_DIR}/migration-history.sql"
else
    warning "Migration history export failed (normal if no CLI migrations used)"
    echo "-- No migration history" > "${EXPORT_DIR}/migration-history.sql"
fi

# Generate summary
TOTAL_SIZE=$(du -sh "$EXPORT_DIR" | cut -f1)
success "Export completed successfully!"
success "Total export size: $TOTAL_SIZE"
success "Export location: $EXPORT_DIR"

log "Files created:"
ls -lh "$EXPORT_DIR"/*.sql

log "Next steps:"
log "1. Test the export with storage migration: node migrate-storage.js"  
log "2. Export Edge Functions: ./export-functions.sh"
log "3. Create import package for end users"