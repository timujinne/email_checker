#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix kohus.ee emails in wrapped JSON format
"""

import json

def remove_from_wrapped_json(filepath):
    """Remove kohus.ee emails from wrapped JSON file (with metadata wrapper)"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Handle wrapped format
    if isinstance(data, dict) and 'emails' in data:
        original_count = len(data['emails'])
        cleaned_emails = [item for item in data['emails'] if '@kohus.ee' not in item.get('email', '').lower()]
        data['emails'] = cleaned_emails
        data['metadata']['total_count'] = len(cleaned_emails)
    else:
        # Handle non-wrapped format
        original_count = len(data)
        cleaned_emails = [item for item in data if '@kohus.ee' not in item.get('email', '').lower()]
        data = cleaned_emails
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    removed = original_count - len(cleaned_emails)
    print(f"✅ Испания порошок_clean_metadata_20251024_100109.json: Removed {removed} emails")
    print(f"   Before: {original_count} → After: {len(cleaned_emails)}")
    return removed

if __name__ == "__main__":
    filepath = "output/Испания порошок_clean_metadata_20251024_100109.json"
    remove_from_wrapped_json(filepath)
