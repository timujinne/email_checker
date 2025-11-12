#!/usr/bin/env python3
"""
Test script for the /api/lists/bulk-update endpoint
"""

import json
import urllib.request
import urllib.error

def test_bulk_update():
    """Test the bulk update endpoint"""

    # Test data
    test_cases = [
        {
            "name": "Valid update - 2 files",
            "data": {
                "filenames": [
                    "Норвегия Производители землеройной техники (полностью проверен).lvp",
                    "Норвегия лесозаготовка (полностью проверен).lvp"
                ],
                "updates": {
                    "country": "Norway",
                    "priority": 100
                }
            },
            "expected_status": 200
        },
        {
            "name": "Empty filenames array",
            "data": {
                "filenames": [],
                "updates": {"country": "Germany"}
            },
            "expected_status": 400
        },
        {
            "name": "Empty updates object",
            "data": {
                "filenames": ["test.txt"],
                "updates": {}
            },
            "expected_status": 400
        },
        {
            "name": "Invalid priority (too low)",
            "data": {
                "filenames": ["test.txt"],
                "updates": {"priority": 10}
            },
            "expected_status": 400
        },
        {
            "name": "Invalid priority (too high)",
            "data": {
                "filenames": ["test.txt"],
                "updates": {"priority": 1000}
            },
            "expected_status": 400
        },
        {
            "name": "Non-existent file",
            "data": {
                "filenames": ["non_existent_file_12345.txt"],
                "updates": {"country": "USA"}
            },
            "expected_status": 200  # Should return 200 but with failed=1
        },
        {
            "name": "Invalid field name",
            "data": {
                "filenames": ["test.txt"],
                "updates": {"invalid_field": "value"}
            },
            "expected_status": 400
        },
        {
            "name": "Invalid filename with path traversal",
            "data": {
                "filenames": ["../../../etc/passwd"],
                "updates": {"country": "USA"}
            },
            "expected_status": 400
        }
    ]

    url = "http://localhost:8080/api/lists/bulk-update"

    print("=" * 80)
    print("Testing /api/lists/bulk-update endpoint")
    print("=" * 80)
    print()

    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"  Request: {json.dumps(test_case['data'], ensure_ascii=False)[:100]}...")

        try:
            # Create request
            req = urllib.request.Request(
                url,
                data=json.dumps(test_case['data']).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )

            # Send request
            with urllib.request.urlopen(req) as response:
                status_code = response.getcode()
                response_data = json.loads(response.read().decode('utf-8'))

                # Check status code
                if status_code == test_case['expected_status']:
                    print(f"  ✅ Status: {status_code} (expected)")
                else:
                    print(f"  ❌ Status: {status_code} (expected {test_case['expected_status']})")

                # Print response summary
                if 'success' in response_data:
                    print(f"  Response: success={response_data['success']}, "
                          f"updated={response_data.get('updated', 0)}, "
                          f"failed={response_data.get('failed', 0)}")
                else:
                    print(f"  Response: {json.dumps(response_data, ensure_ascii=False)[:100]}...")

        except urllib.error.HTTPError as e:
            status_code = e.code
            try:
                error_data = json.loads(e.read().decode('utf-8'))
                error_msg = error_data.get('error', 'Unknown error')
            except:
                error_msg = str(e)

            if status_code == test_case['expected_status']:
                print(f"  ✅ Status: {status_code} (expected)")
                print(f"  Error: {error_msg}")
            else:
                print(f"  ❌ Status: {status_code} (expected {test_case['expected_status']})")
                print(f"  Error: {error_msg}")

        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")

        print()

    print("=" * 80)
    print("Testing complete!")
    print("=" * 80)

if __name__ == "__main__":
    print("NOTE: Make sure the web server is running on port 8080")
    print("      Run: python3 web_server.py")
    print()
    input("Press Enter to start tests...")
    print()

    test_bulk_update()
