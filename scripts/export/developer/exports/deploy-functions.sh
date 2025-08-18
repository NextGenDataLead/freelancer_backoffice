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

log "No Edge Functions to deploy"
success "Deployment completed (0 functions)"
