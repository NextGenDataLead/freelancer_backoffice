#!/usr/bin/env python3
"""
Test script to verify OCR processor can connect to LLM service
"""

import sys
import json
from pathlib import Path

# Add parent directory to path to import ocr_processor
sys.path.insert(0, str(Path(__file__).parent))

try:
    from ocr_processor import DutchReceiptParser

    print("=" * 60)
    print("Testing OCR Processor LLM Connection")
    print("=" * 60)
    print()

    # Initialize parser (this will test endpoint connectivity)
    parser = DutchReceiptParser()

    print("✓ OCR Processor initialized successfully")
    print()
    print("LLM Configuration:")
    print(f"  Model: {parser.llm_config['model']}")
    print(f"  Timeout: {parser.llm_config['timeout']}s")
    print(f"  Max Retries: {parser.llm_config['max_retries']}")
    print()
    print("Endpoints (in priority order):")
    for i, endpoint in enumerate(parser.llm_config['endpoints'], 1):
        print(f"  {i}. {endpoint}")
    print()

    # Try to make a simple test request
    print("Testing LLM connectivity...")
    print()

    import requests

    success = False
    working_endpoint = None

    for endpoint in parser.llm_config['endpoints']:
        try:
            print(f"Testing: {endpoint}")
            response = requests.get(f"{endpoint.replace('/v1', '')}/v1/models", timeout=3)
            if response.status_code == 200:
                models = response.json()
                print(f"  ✓ SUCCESS - Connected!")
                print(f"  Available models: {len(models.get('data', []))}")
                for model in models.get('data', []):
                    print(f"    - {model.get('id')}")
                success = True
                working_endpoint = endpoint
                break
            else:
                print(f"  ✗ HTTP {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"  ✗ Timeout")
        except requests.exceptions.ConnectionError:
            print(f"  ✗ Connection refused")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        print()

    print("=" * 60)
    if success:
        print("✓ LLM SERVICE IS ACCESSIBLE")
        print(f"✓ Working endpoint: {working_endpoint}")
        print()
        print("Your OCR processor will use AI-Enhanced extraction! 🤖")
    else:
        print("✗ NO LLM ENDPOINTS ARE ACCESSIBLE")
        print()
        print("Your OCR processor will use Rule-Based fallback extraction. 📄")
        print()
        print("To fix:")
        print("1. Make sure LM Studio is running on Windows")
        print("2. Enable 'Serve on Local Network' in LM Studio Server Settings")
        print("3. Verify the server is running at http://10.173.239.108:1235")
    print("=" * 60)

except Exception as e:
    print(f"✗ Error initializing OCR processor: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
