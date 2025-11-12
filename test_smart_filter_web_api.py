#!/usr/bin/env python3
"""
Quick Test Script for Smart Filter Web API

Tests all new endpoints to ensure they're working correctly.
Run this AFTER starting the web server.

Usage:
  python3 test_smart_filter_web_api.py [port]

Default port: 8082
"""

import sys
import requests
import json
from pathlib import Path

def test_api_endpoint(name, method, url, data=None, expected_keys=None):
    """Test a single API endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}")

    try:
        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            print(f"❌ Unsupported method: {method}")
            return False

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"Response Preview:")
            print(json.dumps(result, indent=2)[:500] + "...")

            if expected_keys:
                for key in expected_keys:
                    if key in result:
                        print(f"✅ Key '{key}' found")
                    else:
                        print(f"❌ Key '{key}' missing")
                        return False

            print(f"✅ TEST PASSED: {name}")
            return True
        else:
            print(f"❌ TEST FAILED: Status {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: Is web server running on {url}?")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8082
    base_url = f"http://localhost:{port}"

    print(f"""
╔════════════════════════════════════════════════════════════╗
║        Smart Filter Web API Test Suite                     ║
║                                                            ║
║  Testing endpoint: {base_url:40} ║
╚════════════════════════════════════════════════════════════╝
    """)

    tests_passed = 0
    tests_total = 0

    # TEST 1: Available Smart Filters
    tests_total += 1
    if test_api_endpoint(
        name="GET /api/smart-filter/available",
        method="GET",
        url=f"{base_url}/api/smart-filter/available",
        expected_keys=['success', 'filters']
    ):
        tests_passed += 1

    # TEST 2: Auto-Suggest Config
    tests_total += 1
    test_filenames = [
        "España Agro.lvp",
        "Italy Hydraulics.txt",
        "Португалия HC Агро.lvp"
    ]

    for filename in test_filenames:
        if test_api_endpoint(
            name=f"GET /api/smart-filter/auto-suggest (filename: {filename})",
            method="GET",
            url=f"{base_url}/api/smart-filter/auto-suggest?filename={filename}",
            expected_keys=['success', 'suggestion']
        ):
            tests_passed += 1
        tests_total += 1

    # TEST 3: Get Specific Config
    tests_total += 1
    if test_api_endpoint(
        name="GET /api/smart-filter/config?name=italy_hydraulics",
        method="GET",
        url=f"{base_url}/api/smart-filter/config?name=italy_hydraulics",
        expected_keys=['success', 'config']
    ):
        tests_passed += 1

    # TEST 4: Workflow Endpoint (dry run - just check if endpoint exists)
    print(f"\n{'='*60}")
    print("Testing: POST /api/smart-filter/workflow (dry run)")
    print("='*60")
    print("ℹ️  Note: This test only checks if endpoint responds.")
    print("   Full workflow testing requires actual LVP files.")

    test_data = {
        "input_file": "input/test.lvp",
        "config_name": "italy_hydraulics",
        "score_threshold": 30.0,
        "skip_base_filtering": True
    }

    try:
        response = requests.post(
            f"{base_url}/api/smart-filter/workflow",
            json=test_data,
            timeout=5
        )
        if response.status_code in [200, 400, 404]:
            # 200 = success, 400 = validation error (expected), 404 = file not found (expected)
            print(f"✅ Endpoint exists and responds (Status: {response.status_code})")
            tests_passed += 1
        else:
            print(f"❌ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"❌ Endpoint error: {str(e)}")

    tests_total += 1

    # SUMMARY
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Tests Passed: {tests_passed}/{tests_total}")

    if tests_passed == tests_total:
        print("✅ ALL TESTS PASSED!")
        print("\nYour Smart Filter Web API is working correctly.")
        print(f"You can now access the web interface at: {base_url}")
        return 0
    else:
        print(f"❌ {tests_total - tests_passed} TESTS FAILED")
        print("\nTroubleshooting:")
        print("1. Ensure web server is running: python3 web_server.py")
        print(f"2. Check if server is accessible at: {base_url}")
        print("3. Review server logs for errors")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
