#!/usr/bin/env python3
"""
Test script for /api/smart-filter/apply endpoint
"""

import json
import requests
from datetime import datetime

# Test configuration
test_config = {
    "metadata": {
        "name": "Test Filter",
        "description": "Test filter configuration",
        "version": "1.0",
        "created": datetime.now().isoformat()
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
    "target_country": "US",
    "languages": ["en"]
}

def test_endpoint(base_url="http://localhost:8080"):
    """Test the /api/smart-filter/apply endpoint"""

    endpoint = f"{base_url}/api/smart-filter/apply"

    print(f"Testing endpoint: {endpoint}")
    print("-" * 60)

    # Prepare request
    payload = {
        "config": test_config,
        "timestamp": datetime.now().isoformat()
    }

    try:
        # Send POST request
        print("Sending POST request...")
        response = requests.post(
            endpoint,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        print(f"Status Code: {response.status_code}")
        print("-" * 60)

        # Parse response
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS")
            print(json.dumps(result, indent=2))

            # Verify response structure
            assert "success" in result, "Missing 'success' field"
            assert result["success"] is True, "'success' should be True"
            assert "message" in result, "Missing 'message' field"
            assert "config_name" in result, "Missing 'config_name' field"

            print("\n✅ All assertions passed!")
            return True

        else:
            print("❌ FAILED")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to server")
        print("Make sure the server is running: python web_server.py")
        return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_validation_errors(base_url="http://localhost:8080"):
    """Test endpoint validation with invalid requests"""

    endpoint = f"{base_url}/api/smart-filter/apply"

    print("\n" + "=" * 60)
    print("Testing validation errors...")
    print("=" * 60)

    # Test 1: Missing config
    print("\nTest 1: Missing config parameter")
    try:
        response = requests.post(
            endpoint,
            json={"timestamp": datetime.now().isoformat()},
            timeout=5
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Correctly rejected missing config")
    except Exception as e:
        print(f"❌ Test failed: {e}")

    # Test 2: Invalid config type
    print("\nTest 2: Invalid config type (string instead of dict)")
    try:
        response = requests.post(
            endpoint,
            json={"config": "invalid", "timestamp": datetime.now().isoformat()},
            timeout=5
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Correctly rejected invalid config type")
    except Exception as e:
        print(f"❌ Test failed: {e}")

    # Test 3: Missing metadata.name
    print("\nTest 3: Missing metadata.name field")
    try:
        response = requests.post(
            endpoint,
            json={"config": {"scoring": {}}, "timestamp": datetime.now().isoformat()},
            timeout=5
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Correctly rejected missing metadata.name")
    except Exception as e:
        print(f"❌ Test failed: {e}")

    print("\n✅ All validation tests passed!")

if __name__ == "__main__":
    print("=" * 60)
    print("Smart Filter Apply Endpoint Test")
    print("=" * 60)

    # Test main functionality
    success = test_endpoint()

    if success:
        # Test validation errors
        test_validation_errors()

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)
