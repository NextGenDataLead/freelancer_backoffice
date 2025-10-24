#!/bin/bash

# Test LLM Endpoints Script
# This script tests all possible LLM endpoints to help debug connectivity

echo "======================================"
echo "Testing LLM Endpoints for Port 1235"
echo "======================================"
echo ""

ENDPOINTS=(
    "http://127.0.0.1:1235/v1/models"
    "http://localhost:1235/v1/models"
    "http://172.24.0.1:1235/v1/models"
    "http://host.docker.internal:1235/v1/models"
)

# Get Windows host IP from resolv.conf
WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
if [ -n "$WINDOWS_IP" ]; then
    ENDPOINTS+=("http://$WINDOWS_IP:1235/v1/models")
    echo "Detected Windows Host IP: $WINDOWS_IP"
    echo ""
fi

# Get hostname for mDNS
HOSTNAME=$(hostname)
if [ -n "$HOSTNAME" ]; then
    ENDPOINTS+=("http://$HOSTNAME.local:1235/v1/models")
    echo "Detected Hostname: $HOSTNAME"
    echo ""
fi

echo "Testing ${#ENDPOINTS[@]} endpoints..."
echo ""

SUCCESS_COUNT=0

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"

    # Test with 2 second timeout
    response=$(curl -s -m 2 "$endpoint" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✓ SUCCESS - Endpoint is reachable!"
        echo "  Response: ${response:0:100}..."
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        if echo "$response" | grep -q "Connection refused"; then
            echo "✗ FAILED - Connection refused (service not listening on this address)"
        elif echo "$response" | grep -q "timed out"; then
            echo "✗ FAILED - Timeout (firewall or network issue)"
        elif echo "$response" | grep -q "Could not resolve"; then
            echo "✗ FAILED - DNS resolution failed"
        else
            echo "✗ FAILED - $response"
        fi
    fi
    echo ""
done

echo "======================================"
echo "Summary: $SUCCESS_COUNT / ${#ENDPOINTS[@]} endpoints successful"
echo "======================================"
echo ""

if [ $SUCCESS_COUNT -eq 0 ]; then
    echo "⚠️  No endpoints are reachable!"
    echo ""
    echo "Possible solutions:"
    echo "1. Run this in PowerShell as Administrator on Windows:"
    echo "   netsh interface portproxy add v4tov4 listenport=1235 listenaddress=0.0.0.0 connectport=1235 connectaddress=127.0.0.1"
    echo ""
    echo "2. In LM Studio, enable 'Network Access' or 'CORS' in Server Settings"
    echo ""
    echo "3. Run npm run dev on Windows instead of WSL2"
    echo ""
else
    echo "✓ LLM service is accessible!"
    echo ""
    echo "If OCR is still using fallback, check:"
    echo "1. Model name in ocr_processor.py matches: 'microsoft_-_phi-3.5-mini-instruct'"
    echo "2. LLM timeout (currently 3 seconds) might need to be increased"
    echo "3. Check browser console and server logs for detailed error messages"
fi
