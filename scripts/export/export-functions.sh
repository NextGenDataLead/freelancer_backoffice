#!/bin/bash

# Supabase Edge Functions Export Script
# Downloads all Edge Functions from a Supabase project for migration
# 
# Usage: ./export-functions.sh
# 
# Required Environment Variables:
# - OLD_PROJECT_REF: Source project reference
# - SUPABASE_ACCESS_TOKEN: Personal access token for API access

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
    local required_vars=("OLD_PROJECT_REF")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
        missing_vars+=("SUPABASE_ACCESS_TOKEN")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        error "Please set these variables and try again."
        error ""
        error "To get your access token:"
        error "1. Go to https://supabase.com/dashboard/account/tokens"
        error "2. Create a new token"
        error "3. Export it: export SUPABASE_ACCESS_TOKEN=\"your-token-here\""
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    local base_dir="$(dirname "$0")"
    local export_dir="${base_dir}/exports"
    local functions_dir="${export_dir}/functions"
    local logs_dir="${base_dir}/logs"
    
    mkdir -p "$export_dir" "$functions_dir" "$logs_dir"
    
    export EXPORT_DIR="$export_dir"
    export FUNCTIONS_DIR="$functions_dir"
    export LOGS_DIR="$logs_dir"
    
    success "Created export directories: $functions_dir"
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

# Check API access
check_api_access() {
    log "Testing API access..."
    
    local response
    if response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        "https://api.supabase.com/v1/projects/$OLD_PROJECT_REF" \
        -o /dev/null); then
        
        if [[ "$response" == "200" ]]; then
            success "API access verified"
        elif [[ "$response" == "401" ]]; then
            error "Unauthorized: Invalid access token"
            exit 1
        elif [[ "$response" == "404" ]]; then
            error "Project not found: $OLD_PROJECT_REF"
            exit 1
        else
            error "API request failed with status: $response"
            exit 1
        fi
    else
        error "Failed to connect to Supabase API"
        exit 1
    fi
}

# List all Edge Functions
list_functions() {
    log "Fetching list of Edge Functions..."
    
    local functions_response
    local log_file="${LOGS_DIR}/functions-list.log"
    
    if functions_response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        "https://api.supabase.com/v1/projects/$OLD_PROJECT_REF/functions" \
        2>"$log_file"); then
        
        # Parse JSON response to get function names
        local function_names
        if function_names=$(echo "$functions_response" | jq -r '.[].name' 2>/dev/null); then
            if [[ -n "$function_names" && "$function_names" != "null" ]]; then
                local count
                count=$(echo "$function_names" | wc -l)
                success "Found $count Edge Functions:"
                echo "$function_names" | while read -r name; do
                    log "  - $name"
                done
                echo "$function_names"
            else
                success "No Edge Functions found in project"
                echo ""
            fi
        else
            warning "Failed to parse functions list. Raw response saved to: $log_file"
            echo "$functions_response" > "$log_file"
            echo ""
        fi
    else
        error "Failed to fetch functions list. Check log: $log_file"
        exit 1
    fi
}

# Download a single function
download_function() {
    local function_name="$1"
    local function_dir="${FUNCTIONS_DIR}/${function_name}"
    local log_file="${LOGS_DIR}/download-${function_name}.log"
    
    log "Downloading function: $function_name"
    
    mkdir -p "$function_dir"
    
    # Get function details and code
    local function_response
    if function_response=$(curl -s \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        "https://api.supabase.com/v1/projects/$OLD_PROJECT_REF/functions/$function_name" \
        2>"$log_file"); then
        
        # Save raw response for debugging
        echo "$function_response" > "${function_dir}/function-metadata.json"
        
        # Extract and save the function code
        if echo "$function_response" | jq -e '.body' >/dev/null 2>&1; then
            echo "$function_response" | jq -r '.body' > "${function_dir}/index.ts"
            success "Downloaded function code: $function_name"
        else
            warning "No function body found for: $function_name"
        fi
        
        # Extract and save environment variables if any
        if echo "$function_response" | jq -e '.env_vars' >/dev/null 2>&1; then
            local env_vars
            env_vars=$(echo "$function_response" | jq '.env_vars')
            if [[ "$env_vars" != "null" && "$env_vars" != "{}" ]]; then
                echo "$env_vars" > "${function_dir}/env-vars.json"
                log "Saved environment variables for: $function_name"
            fi
        fi
        
        # Create deno.json if it doesn't exist (common Edge Function config)
        if [[ ! -f "${function_dir}/deno.json" ]]; then
            cat > "${function_dir}/deno.json" << 'EOF'
{
  "imports": {
    "https://deno.land/std@0.177.0/": "https://deno.land/std@0.177.0/",
    "https://esm.sh/*": "https://esm.sh/*"
  }
}
EOF
        fi
        
    else
        error "Failed to download function: $function_name. Check log: $log_file"
        return 1
    fi
}

# Download all functions
download_all_functions() {
    local function_names
    function_names=$(list_functions)
    
    if [[ -z "$function_names" ]]; then
        success "No functions to download"
        return 0
    fi
    
    local total_functions
    total_functions=$(echo "$function_names" | wc -l)
    log "Downloading $total_functions functions..."
    
    local count=0
    local failed=0
    
    while IFS= read -r function_name; do
        if [[ -n "$function_name" ]]; then
            ((count++))
            log "[$count/$total_functions] Processing: $function_name"
            
            if download_function "$function_name"; then
                success "Downloaded: $function_name"
            else
                ((failed++))
                warning "Failed to download: $function_name"
            fi
        fi
    done <<< "$function_names"
    
    if [[ $failed -eq 0 ]]; then
        success "All $count functions downloaded successfully"
    else
        warning "$failed out of $count functions failed to download"
    fi
}

# Create deployment script for target project
create_deploy_script() {
    log "Creating deployment script for target project..."
    
    local deploy_script="${EXPORT_DIR}/deploy-functions.sh"
    
    cat > "$deploy_script" << 'EOF'
#!/bin/bash

# Supabase Edge Functions Deployment Script
# Deploys all exported functions to a new Supabase project
#
# Required Environment Variables:
# - NEW_PROJECT_REF: Target project reference
# - SUPABASE_ACCESS_TOKEN: Personal access token

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"; }

# Check environment variables
if [[ -z "${NEW_PROJECT_REF:-}" || -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    error "Required environment variables:"
    error "  - NEW_PROJECT_REF: Target project reference"
    error "  - SUPABASE_ACCESS_TOKEN: Personal access token"
    exit 1
fi

# Link to new project
log "Linking to target project: $NEW_PROJECT_REF"
if supabase link --project-ref "$NEW_PROJECT_REF"; then
    success "Linked to project successfully"
else
    error "Failed to link to project"
    exit 1
fi

# Deploy each function
functions_dir="$(dirname "$0")/functions"
if [[ -d "$functions_dir" ]]; then
    for function_dir in "$functions_dir"/*; do
        if [[ -d "$function_dir" ]]; then
            function_name=$(basename "$function_dir")
            log "Deploying function: $function_name"
            
            # Copy function to temporary supabase/functions directory
            temp_functions_dir="supabase/functions"
            mkdir -p "$temp_functions_dir"
            cp -r "$function_dir" "$temp_functions_dir/"
            
            # Deploy the function
            if supabase functions deploy "$function_name"; then
                success "Deployed: $function_name"
            else
                error "Failed to deploy: $function_name"
            fi
        fi
    done
    
    success "Function deployment completed!"
    log "Remember to set environment variables for your functions if needed"
else
    warning "No functions directory found"
fi
EOF
    
    chmod +x "$deploy_script"
    success "Created deployment script: $deploy_script"
}

# Generate export summary
generate_summary() {
    log "Generating export summary..."
    
    local summary_file="${EXPORT_DIR}/functions-export-summary.txt"
    local total_size
    total_size=$(du -sh "$FUNCTIONS_DIR" 2>/dev/null | cut -f1 || echo "0B")
    
    local function_count=0
    if [[ -d "$FUNCTIONS_DIR" ]]; then
        function_count=$(find "$FUNCTIONS_DIR" -maxdepth 1 -type d | wc -l)
        # Subtract 1 for the functions directory itself
        ((function_count > 0)) && ((function_count--))
    fi
    
    cat > "$summary_file" << EOF
Supabase Edge Functions Export Summary
=====================================

Export Date: $(date)
Source Project: $OLD_PROJECT_REF
Export Location: $FUNCTIONS_DIR
Total Export Size: $total_size
Functions Exported: $function_count

Exported Functions:
------------------
$(find "$FUNCTIONS_DIR" -maxdepth 1 -type d -exec basename {} \; | grep -v "^functions$" | sort || echo "None")

Files per Function:
------------------
$(find "$FUNCTIONS_DIR" -name "*.ts" -o -name "*.js" -o -name "*.json" | head -20)

Deployment Instructions:
-----------------------
1. Set up your target project environment:
   export NEW_PROJECT_REF="your-new-project-ref"
   export SUPABASE_ACCESS_TOKEN="your-access-token"

2. Run the deployment script:
   ./deploy-functions.sh

3. Verify functions in your new project dashboard

Important Notes:
---------------
- Environment variables are exported but need to be set manually
- Function secrets are NOT exported for security
- Test all functions after deployment
- Update any hardcoded URLs or project references

EOF

    success "Export completed successfully!"
    success "Summary saved to: $summary_file"
    success "Functions exported: $function_count"
    success "Total export size: $total_size"
}

# Main execution
main() {
    log "Starting Supabase Edge Functions export..."
    log "=========================================="
    
    check_env_vars
    create_directories
    check_supabase_cli
    check_api_access
    
    download_all_functions
    create_deploy_script
    generate_summary
    
    success "Edge Functions export completed successfully!"
    warning "Remember to:"
    warning "  1. Set environment variables for functions in the new project"
    warning "  2. Update any hardcoded project references in function code"
    warning "  3. Test all functions after deployment"
}

# Execute main function
main "$@"