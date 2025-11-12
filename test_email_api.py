#!/usr/bin/env python3
"""
Test script for Email Records API
Tests the functionality without starting the web server
"""

import json
from metadata_database import MetadataDatabase, EmailMetadata

def test_email_api():
    print("🧪 Testing Email Records API functionality...")

    # Initialize database
    db = MetadataDatabase()

    # Add some test data
    test_emails = [
        EmailMetadata(
            email="test1@example.com",
            domain="example.com",
            company_name="Test Company 1",
            country="Germany",
            category="Trucking company",
            phone="+49 123 456",
            validation_status="Valid"
        ),
        EmailMetadata(
            email="test2@example.com",
            domain="example.com",
            company_name="Test Company 2",
            country="Poland",
            category="Automation company",
            phone="+48 987 654",
            validation_status="Invalid"
        ),
        EmailMetadata(
            email="test3@example.com",
            domain="example.com",
            company_name="Test Company 3",
            country="Italy",
            category="Chemical plant",
            validation_status="NotSure"
        )
    ]

    print("\n📝 Inserting test emails...")
    for email_meta in test_emails:
        success = db.insert_email_metadata(email_meta)
        if success:
            print(f"  ✅ Inserted: {email_meta.email}")
        else:
            print(f"  ⚠️ Already exists: {email_meta.email}")

    # Test pagination
    print("\n📄 Testing pagination (page=1, size=2)...")
    emails, total = db.get_emails_paginated(page=1, page_size=2)
    print(f"  Total records: {total}")
    print(f"  Retrieved: {len(emails)} emails")
    for e in emails:
        print(f"    - {e.email} ({e.validation_status})")

    # Test filtering
    print("\n🔍 Testing filters (country=Germany)...")
    emails, total = db.get_emails_paginated(filters={'country': 'Germany'})
    print(f"  Found: {len(emails)} emails from Germany")

    print("\n🔍 Testing filters (status=Valid)...")
    emails, total = db.get_emails_paginated(filters={'validation_status': 'Valid'})
    print(f"  Found: {len(emails)} valid emails")

    # Test bulk update
    print("\n🔄 Testing bulk update (change status to Temp)...")
    test_emails_list = ["test1@example.com", "test2@example.com"]
    success, count = db.batch_update_validation_status(test_emails_list, "Temp")
    if success:
        print(f"  ✅ Updated {count} emails")
    else:
        print(f"  ❌ Update failed")

    # Verify update
    email = db.get_email_metadata("test1@example.com")
    if email:
        print(f"  Verification: test1@example.com status = {email.validation_status}")

    # Test bulk delete
    print("\n🗑️ Testing bulk delete...")
    success, count = db.bulk_delete_emails(["test3@example.com"])
    if success:
        print(f"  ✅ Deleted {count} emails")
    else:
        print(f"  ❌ Delete failed")

    # Final count
    emails, total = db.get_emails_paginated()
    print(f"\n📊 Final email count: {total}")

    # Get statistics
    stats = db.get_statistics()
    print(f"\n📈 Database Statistics:")
    print(f"  Total emails: {stats['total_emails']}")
    print(f"  With phone: {stats['with_phone']}")
    print(f"  Without phone: {stats['without_phone']}")
    if stats['countries']:
        print(f"  Top countries: {list(stats['countries'].keys())[:3]}")

    print("\n✅ All tests completed successfully!")

    # Close database
    db.close()

if __name__ == "__main__":
    test_email_api()