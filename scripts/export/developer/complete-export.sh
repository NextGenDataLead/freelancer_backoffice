#!/bin/bash

# Complete Supabase Export - Single Command
# Runs all export components in sequence with proper error handling
# 
# Usage: ./complete-export.sh
#
# This script orchestrates the complete export process for Supabase environments

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
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] 🚀 $1${NC}"
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
    echo "🚀 $1"
    echo "=================================="
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if .env.export exists
    if [[ ! -f ".env.export" ]]; then
        error "Missing .env.export file"
        error "Please copy .env.export-template to .env.export and configure it"
        exit 1
    fi
    
    # Check if export scripts exist
    local scripts=("run-export-direct.sh" "export-functions.sh")
    for script in "${scripts[@]}"; do
        if [[ ! -f "$script" ]]; then
            error "Missing required script: $script"
            exit 1
        fi
        if [[ ! -x "$script" ]]; then
            warning "Making $script executable"
            chmod +x "$script"
        fi
    done
    
    success "Prerequisites check passed"
}

# Export database
export_database() {
    header "DATABASE EXPORT"
    log "Starting database export (schema + data)..."
    
    if ./run-export-direct.sh; then
        success "Database export completed successfully"
        
        # Show export results
        if [[ -f "exports/schema.sql" && -f "exports/data.sql" ]]; then
            local schema_size=$(du -h exports/schema.sql | cut -f1)
            local data_size=$(du -h exports/data.sql | cut -f1)
            log "Schema file: ${schema_size}"
            log "Data file: ${data_size}"
        fi
    else
        error "Database export failed"
        return 1
    fi
}

# Export Edge Functions
export_functions() {
    header "EDGE FUNCTIONS EXPORT"
    log "Starting Edge Functions export..."
    
    if ./export-functions.sh; then
        success "Edge Functions export completed successfully"
        
        # Check if any functions were found
        if [[ -d "exports/functions" ]]; then
            local func_count=$(find exports/functions -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
            if [[ $func_count -gt 0 ]]; then
                log "Found $func_count Edge Function(s)"
                find exports/functions -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | while read func; do
                    log "  📦 $func"
                done
            else
                log "No Edge Functions found (this is normal)"
            fi
        fi
    else
        error "Edge Functions export failed"
        return 1
    fi
}

# Analyze storage
analyze_storage() {
    header "STORAGE ANALYSIS"
    log "Analyzing storage buckets and objects..."
    
    # Check if Node.js and dependencies are available
    if ! command -v node &> /dev/null; then
        warning "Node.js not found - skipping storage analysis"
        return 0
    fi
    
    if [[ ! -f "node_modules/@supabase/supabase-js/package.json" ]]; then
        warning "Supabase JS client not found - skipping storage analysis"
        log "Run: npm install @supabase/supabase-js"
        return 0
    fi
    
    # Load environment variables
    source .env.export
    
    # Run storage analysis
    node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient('$OLD_PROJECT_URL', '$OLD_SERVICE_ROLE_KEY');

async function analyzeStorage() {
  try {
    console.log('🔍 Analyzing storage buckets...');
    const { data: buckets, error } = await client.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('📦 No storage buckets found');
      return;
    }
    
    console.log(\`✅ Found \${buckets.length} storage bucket(s):\`);
    
    for (const bucket of buckets) {
      console.log(\`  📁 \${bucket.name} - \${bucket.public ? 'Public' : 'Private'} (Created: \${bucket.created_at})\`);
      
      // Get object count for each bucket
      try {
        const { data: objects, error: objError } = await client.storage.from(bucket.name).list();
        if (!objError && objects) {
          console.log(\`     └── \${objects.length} objects\`);
        }
      } catch (e) {
        console.log('     └── Unable to count objects (permissions)');
      }
    }
    
    console.log('');
    console.log('📋 Storage Export Notes:');
    console.log('• For full storage migration, run: node migrate-storage.js');
    console.log('• Storage migration requires target project credentials');
    console.log('• Large files and objects will be transferred preserving metadata');
    
  } catch (err) {
    console.error('❌ Storage analysis failed:', err.message);
  } finally {
    process.exit(0);
  }
}

analyzeStorage();
" 2>/dev/null || {
        warning "Storage analysis failed - this is normal if no storage is used"
    }
}

# Generate export summary
generate_summary() {
    header "EXPORT SUMMARY"
    log "Generating export summary..."
    
    # Calculate total export size
    if [[ -d "exports" ]]; then
        local total_size=$(du -sh exports | cut -f1)
        local file_count=$(find exports -type f | wc -l)
        
        success "Export completed successfully!"
        log "📁 Export location: ./exports/"
        log "📊 Total size: $total_size"
        log "📄 Files created: $file_count"
        echo
        
        # List all created files
        log "📋 Export contents:"
        find exports -type f -exec ls -lh {} \; | awk '{print "   📄 " $9 " (" $5 ")"}' | sort
        echo
        
        # Next steps
        log "🎯 Next steps:"
        log "   1. Review exported files in ./exports/"
        log "   2. Test import process in target environment"
        log "   3. Package exports for distribution to end users"
        log "   4. Share ../import/ directory with end users"
        
    else
        error "No exports directory found - export may have failed"
        return 1
    fi
}

# Main execution
main() {
    header "COMPLETE SUPABASE EXPORT"
    log "Starting complete Supabase environment export..."
    
    local start_time=$(date +%s)
    local failed_components=()
    
    # Run export components
    check_prerequisites
    
    # Database export (required)
    if ! export_database; then
        failed_components+=("Database")
    fi
    
    # Functions export (optional - may have 0 functions)
    if ! export_functions; then
        failed_components+=("Edge Functions")
    fi
    
    # Storage analysis (optional)
    analyze_storage
    
    # Generate summary
    if [[ ${#failed_components[@]} -eq 0 ]]; then
        generate_summary
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        success "🎉 Complete export finished successfully in ${duration}s"
    else
        error "Export completed with failures in: ${failed_components[*]}"
        log "Check logs above for details"
        exit 1
    fi
}

# Handle script interruption
trap 'error "Export interrupted"; exit 1' INT TERM

# Execute main function
main "$@"