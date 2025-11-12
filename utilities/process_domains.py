#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to process and add domains to blocklist
"""

import re
import os

def extract_domain(line):
    """Extract valid domain from various formats"""
    line = line.strip()

    # Skip empty lines
    if not line:
        return None

    # Skip single word keywords (news, media, hotel, etc.)
    if ' ' not in line and '.' not in line and '@' not in line:
        return None

    # Remove @ prefix
    if line.startswith('@'):
        line = line[1:]

    # Handle full email addresses - extract domain part
    if '@' in line and not line.startswith('@'):
        # Full email like user@domain.com
        parts = line.split('@')
        if len(parts) == 2:
            line = parts[1]

    # Skip incomplete patterns like "bmw@" or just "@bmw"
    if not line or line.endswith('@'):
        return None

    # Skip TLD-only patterns that start with dot (.gov, .edu, etc.)
    if line.startswith('.') and line.count('.') == 1:
        return None

    # Skip single words without domain structure
    if '.' not in line:
        return None

    # Clean up
    line = line.strip()

    # Basic domain validation
    # Must contain at least one dot and valid characters
    if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)+$', line):
        return None

    return line.lower()

def process_domain_list(input_file, blocklist_file):
    """Process domain list and add to blocklist"""

    # Read input list
    print(f"📖 Reading input file: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Extract valid domains
    print(f"🔍 Extracting valid domains from {len(lines)} lines...")
    new_domains = set()

    for line in lines:
        domain = extract_domain(line)
        if domain:
            new_domains.add(domain)

    print(f"✅ Extracted {len(new_domains)} valid domains")

    # Read existing blocklist
    existing_domains = set()
    if os.path.exists(blocklist_file):
        print(f"📖 Reading existing blocklist: {blocklist_file}")
        with open(blocklist_file, 'r', encoding='utf-8') as f:
            for line in f:
                domain = line.strip()
                if domain:
                    existing_domains.add(domain)
        print(f"📊 Existing blocklist has {len(existing_domains)} domains")

    # Find new domains (not in existing blocklist)
    truly_new_domains = new_domains - existing_domains
    print(f"🆕 New domains to add: {len(truly_new_domains)}")
    print(f"🔄 Duplicates skipped: {len(new_domains - truly_new_domains)}")

    # Merge and sort
    all_domains = existing_domains | new_domains
    sorted_domains = sorted(all_domains)

    # Write back to blocklist
    print(f"💾 Writing {len(sorted_domains)} domains to {blocklist_file}")
    with open(blocklist_file, 'w', encoding='utf-8') as f:
        for domain in sorted_domains:
            f.write(f"{domain}\n")

    # Show statistics
    print("\n" + "="*60)
    print("📊 STATISTICS")
    print("="*60)
    print(f"Original blocklist size:    {len(existing_domains):,} domains")
    print(f"New domains extracted:      {len(new_domains):,} domains")
    print(f"Duplicates skipped:         {len(new_domains - truly_new_domains):,} domains")
    print(f"New domains added:          {len(truly_new_domains):,} domains")
    print(f"Final blocklist size:       {len(sorted_domains):,} domains")
    print(f"Growth:                     +{len(truly_new_domains):,} ({len(truly_new_domains)/len(existing_domains)*100:.1f}%)")
    print("="*60)

    # Show sample of new domains
    if truly_new_domains:
        print("\n🆕 Sample of newly added domains (first 20):")
        sample = sorted(truly_new_domains)[:20]
        for domain in sample:
            print(f"  + {domain}")
        if len(truly_new_domains) > 20:
            print(f"  ... and {len(truly_new_domains) - 20} more")

    return len(truly_new_domains), len(sorted_domains)

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "список.txt")
    blocklist_file = os.path.join(script_dir, "blocklists", "blocked_domains.txt")

    if not os.path.exists(input_file):
        print(f"❌ Error: Input file not found: {input_file}")
        exit(1)

    if not os.path.exists(os.path.dirname(blocklist_file)):
        os.makedirs(os.path.dirname(blocklist_file))

    process_domain_list(input_file, blocklist_file)
    print("\n✅ Done!")
