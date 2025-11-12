#!/usr/bin/env python3
"""
Простой тест endpoints без внешних зависимостей
"""

import urllib.request
import json

BASE_URL = "http://localhost:8089"

def test_get(path, description):
    """Тест GET endpoint"""
    url = f"{BASE_URL}{path}"
    print(f"\n{'='*60}")
    print(f"🧪 {description}")
    print(f"URL: {url}")

    try:
        response = urllib.request.urlopen(url, timeout=5)
        data = response.read().decode('utf-8')

        print(f"✅ Status: {response.status}")

        try:
            json_data = json.loads(data)
            print(f"Response: {json.dumps(json_data, indent=2)[:300]}...")
            return True
        except:
            print(f"Response: {data[:200]}...")
            return True

    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}")
        print(f"Response: {e.read().decode('utf-8')[:200]}")
        return False
    except urllib.error.URLError as e:
        print(f"❌ Connection Error: {e.reason}")
        print(f"Is server running on {BASE_URL}?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

print("🔍 Testing Email Checker API Endpoints")
print(f"Base URL: {BASE_URL}\n")

results = []

# Test 1
results.append(test_get("/api/blocklist/stats", "Test 1: Blocklist Stats"))

# Test 2
results.append(test_get("/api/blocklist", "Test 2: Get All Items"))

# Test 3
results.append(test_get("/api/blocklist/search?q=test", "Test 3: Search"))

# Test 4
results.append(test_get("/api/blocklist/export?format=json", "Test 4: Export"))

# Summary
print("\n" + "="*60)
print(f"📊 SUMMARY: {sum(results)}/{len(results)} tests passed")
print("="*60)

if all(results):
    print("🎉 All tests passed!")
else:
    print("⚠️  Some tests failed. Check server console for errors.")
