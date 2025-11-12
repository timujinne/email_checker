#!/usr/bin/env python3
"""
Тест всех API endpoints сервера
"""

import requests
import json

# Используем порт, на котором запущен сервер
BASE_URL = "http://localhost:8089"  # Измените на ваш порт

def test_endpoint(method, path, data=None, description=""):
    """Тест одного endpoint"""
    url = f"{BASE_URL}{path}"
    print(f"\n{'='*60}")
    print(f"🧪 {description}")
    print(f"{'='*60}")
    print(f"Method: {method}")
    print(f"URL: {url}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ Success!")
                print(f"Response preview: {json.dumps(result, indent=2)[:500]}...")
                return True
            except:
                print(f"✅ Success (non-JSON response)")
                print(f"Response: {response.text[:200]}...")
                return True
        else:
            print(f"❌ Failed!")
            print(f"Response: {response.text[:500]}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error - Is server running on {BASE_URL}?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("="*60)
    print("🔍 Email Checker API Endpoint Tests")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Testing blocklist API endpoints...")

    results = {}

    # Test 1: Blocklist stats
    results['stats'] = test_endpoint(
        "GET",
        "/api/blocklist/stats",
        description="Test 1: Get blocklist statistics"
    )

    # Test 2: Get all blocklist items
    results['list'] = test_endpoint(
        "GET",
        "/api/blocklist",
        description="Test 2: Get all blocklist items"
    )

    # Test 3: Search
    results['search'] = test_endpoint(
        "GET",
        "/api/blocklist/search?q=test",
        description="Test 3: Search blocklist"
    )

    # Test 4: Add email
    results['add'] = test_endpoint(
        "POST",
        "/api/blocklist/add",
        data={"type": "email", "value": "test@example.com"},
        description="Test 4: Add email to blocklist"
    )

    # Test 5: Export
    results['export'] = test_endpoint(
        "GET",
        "/api/blocklist/export?format=json",
        description="Test 5: Export blocklist"
    )

    # Summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20s} {status}")

    print("-"*60)
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Blocklist API is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check server logs for errors.")
        print("\nPossible issues:")
        print("1. Server not running or wrong port")
        print("2. blocklist_api.py not imported correctly")
        print("3. Endpoints not registered in web_server.py")
        print("\nTo debug:")
        print("1. Check server console for errors")
        print("2. Try: python test_blocklist_api.py")
        print("3. Check if blocklist_api import works in web_server.py")

if __name__ == "__main__":
    main()
