#!/usr/bin/env python3
"""
Example usage of /api/lists/bulk-update endpoint
Demonstrates different use cases and error handling
"""

import json
import urllib.request
import urllib.error


BASE_URL = "http://localhost:8080"


def bulk_update_lists(filenames, updates):
    """
    Send bulk update request to the API

    Args:
        filenames: List of filenames to update
        updates: Dictionary of fields to update

    Returns:
        Response data as dictionary
    """
    url = f"{BASE_URL}/api/lists/bulk-update"

    data = {
        "filenames": filenames,
        "updates": updates
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            return response_data

    except urllib.error.HTTPError as e:
        error_data = json.loads(e.read().decode('utf-8'))
        print(f"❌ HTTP Error {e.code}: {error_data.get('error', 'Unknown error')}")
        return None

    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return None


def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*70}")
    print(f"{title}")
    print(f"{'='*70}")

    if response is None:
        print("Request failed!")
        return

    print(f"Success: {response['success']}")
    print(f"Updated: {response['updated']}")
    print(f"Failed: {response['failed']}")

    if response['errors']:
        print(f"\nErrors:")
        for error in response['errors']:
            print(f"  - {error}")

    print(f"\nResults:")
    for result in response['results']:
        status = "✅" if result['success'] else "❌"
        filename = result['filename']
        print(f"  {status} {filename}")
        if not result['success']:
            print(f"     Error: {result.get('error', 'Unknown')}")


# Example 1: Update country and priority
print("\n" + "="*70)
print("EXAMPLE 1: Update country and priority for 2 lists")
print("="*70)

filenames = [
    "Норвегия Производители землеройной техники (полностью проверен).lvp",
    "Норвегия лесозаготовка (полностью проверен).lvp"
]
updates = {
    "country": "Norway",
    "priority": 100,
    "category": "Manufacturing"
}

response = bulk_update_lists(filenames, updates)
print_response("Update country and priority", response)


# Example 2: Reset processed flags
print("\n" + "="*70)
print("EXAMPLE 2: Reset processed flags for 3 lists")
print("="*70)

filenames = [
    "Норвегия Производители землеройной техники (полностью проверен).lvp",
    "Норвегия лесозаготовка (полностью проверен).lvp",
    "РФ Строительная техника(полностью проверен).lvp"
]
updates = {
    "processed": False
}

response = bulk_update_lists(filenames, updates)
print_response("Reset processed flags", response)


# Example 3: Update descriptions
print("\n" + "="*70)
print("EXAMPLE 3: Update descriptions")
print("="*70)

filenames = [
    "Норвегия Производители землеройной техники (полностью проверен).lvp",
    "Норвегия лесозаготовка (полностью проверен).lvp"
]
updates = {
    "description": "Updated via bulk API - ready for reprocessing"
}

response = bulk_update_lists(filenames, updates)
print_response("Update descriptions", response)


# Example 4: Error case - invalid priority
print("\n" + "="*70)
print("EXAMPLE 4: Error case - invalid priority (should fail)")
print("="*70)

filenames = ["test.txt"]
updates = {
    "priority": 1000  # Invalid: must be 50-999
}

response = bulk_update_lists(filenames, updates)
print_response("Invalid priority", response)


# Example 5: Partial success - non-existent file
print("\n" + "="*70)
print("EXAMPLE 5: Partial success - one file doesn't exist")
print("="*70)

filenames = [
    "Норвегия Производители землеройной техники (полностью проверен).lvp",
    "non_existent_file_12345.txt"  # This file doesn't exist
]
updates = {
    "country": "Norway"
}

response = bulk_update_lists(filenames, updates)
print_response("Partial success", response)


# Example 6: Update display names
print("\n" + "="*70)
print("EXAMPLE 6: Update display names")
print("="*70)

filenames = [
    "Норвегия Производители землеройной техники (полностью проверен).lvp"
]
updates = {
    "display_name": "Norway - Construction Equipment Manufacturers"
}

response = bulk_update_lists(filenames, updates)
print_response("Update display names", response)


print("\n" + "="*70)
print("Examples completed!")
print("="*70)
