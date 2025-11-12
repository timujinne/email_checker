#!/usr/bin/env python3
"""
Test script to verify auto-blocking of Invalid status emails
"""

from email_checker import EmailChecker
from pathlib import Path

print("=" * 60)
print("Test: Auto-blocking Invalid status emails from LVP")
print("=" * 60)

# Create checker instance
checker = EmailChecker()

# Count current blocked emails
blocked_before = len(checker.blocked_emails) if checker.cache_loaded else 0
with open('blocklists/blocked_emails.txt', 'r') as f:
    blocked_file_before = sum(1 for line in f if line.strip())

print(f"\n📊 Before processing:")
print(f"   Blocked emails in memory: {blocked_before}")
print(f"   Blocked emails in file: {blocked_file_before}")

# Load and process LVP file
lvp_file = "input/Италия Агро Покартам IT.lvp"
print(f"\n📂 Loading: {lvp_file}")

emails_with_metadata = checker.load_emails_with_metadata(lvp_file)
print(f"   Loaded {len(emails_with_metadata)} emails with metadata")

# Count Invalid status emails
invalid_status_count = sum(
    1 for e in emails_with_metadata
    if e.validation_status and e.validation_status.lower() == 'invalid'
)
print(f"   Found {invalid_status_count} emails with 'Invalid' status")

# Process through blocklist check
print(f"\n🔍 Processing through blocklist check...")
results = checker.check_emails_with_metadata(emails_with_metadata)

print(f"\n📈 Results:")
print(f"   Clean: {len(results['clean'])}")
print(f"   Blocked (email): {len(results['blocked_email'])}")
print(f"   Blocked (domain): {len(results['blocked_domain'])}")
print(f"   Invalid: {len(results['invalid'])}")

# Check blocked emails after
with open('blocklists/blocked_emails.txt', 'r') as f:
    blocked_file_after = sum(1 for line in f if line.strip())

newly_blocked = blocked_file_after - blocked_file_before

print(f"\n📊 After processing:")
print(f"   Blocked emails in file: {blocked_file_after}")
print(f"   ✅ Newly blocked: {newly_blocked}")

# Verify specific email
test_email = "cpisano1807@gmail.com"
checker.load_blocklists()  # Reload to get updated list
is_blocked = test_email in checker.blocked_emails

print(f"\n🔬 Verification:")
print(f"   Test email: {test_email}")
print(f"   Is blocked: {'✅ YES' if is_blocked else '❌ NO'}")

print("\n" + "=" * 60)
print("Test completed!")
print("=" * 60)
