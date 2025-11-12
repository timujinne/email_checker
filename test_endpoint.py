#!/usr/bin/env python3
"""
Quick test script for /api/smart-filter/apply endpoint
"""
import requests
import json

def test_endpoint():
    """Test the /api/smart-filter/apply endpoint"""

    url = "http://localhost:8080/api/smart-filter/apply"

    # Test config
    test_config = {
        "config": {
            "metadata": {
                "name": "Test Filter",
                "version": "1.0.0",
                "description": "Test filter configuration"
            },
            "target": {
                "country": "IT",
                "industry": "hydraulics"
            },
            "scoring": {
                "weights": {
                    "email_quality": 0.10,
                    "company_relevance": 0.45,
                    "geographic_priority": 0.30,
                    "engagement": 0.15
                },
                "thresholds": {
                    "high_priority": 100,
                    "medium_priority": 50,
                    "low_priority": 10
                }
            },
            "company_keywords": {
                "positive": ["hydraulics", "pumps"],
                "negative": ["alibaba", "marketplace"]
            }
        },
        "timestamp": "2025-10-30T12:00:00Z"
    }

    print("Testing /api/smart-filter/apply endpoint...")
    print(f"URL: {url}")
    print("-" * 50)

    try:
        response = requests.post(url, json=test_config, timeout=10)

        print(f"Status Code: {response.status_code}")
        print(f"Response:")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))

        if response.status_code == 200:
            print("\n✅ SUCCESS! Endpoint is working correctly.")
        else:
            print(f"\n❌ FAILED: Status code {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to server.")
        print("   Make sure web_server.py is running:")
        print("   python web_server.py")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_endpoint()
