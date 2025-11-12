#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remove kohus.ee emails from clean lists
"""

import json
import csv
import os

def remove_from_txt(filepath):
    """Remove kohus.ee emails from TXT file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    cleaned = [line for line in lines if '@kohus.ee' not in line.lower()]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(cleaned)

    removed = len(lines) - len(cleaned)
    print(f"✅ {os.path.basename(filepath)}: Removed {removed} emails")
    print(f"   Before: {len(lines)} → After: {len(cleaned)}")
    return removed

def remove_from_csv(filepath):
    """Remove kohus.ee emails from CSV file"""
    with open(filepath, 'r', encoding='utf-8', newline='') as f:
        reader = csv.reader(f, delimiter='\t')
        rows = list(reader)

    header = rows[0] if rows else []
    data_rows = rows[1:] if len(rows) > 1 else []

    # Find email column (first column)
    cleaned_rows = [row for row in data_rows if '@kohus.ee' not in row[0].lower()]

    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f, delimiter='\t')
        writer.writerow(header)
        writer.writerows(cleaned_rows)

    removed = len(data_rows) - len(cleaned_rows)
    print(f"✅ {os.path.basename(filepath)}: Removed {removed} emails")
    print(f"   Before: {len(data_rows)} → After: {len(cleaned_rows)}")
    return removed

def remove_from_json(filepath):
    """Remove kohus.ee emails from JSON file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    original_count = len(data)
    cleaned_data = [item for item in data if '@kohus.ee' not in item.get('email', '').lower()]

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)

    removed = original_count - len(cleaned_data)
    print(f"✅ {os.path.basename(filepath)}: Removed {removed} emails")
    print(f"   Before: {original_count} → After: {len(cleaned_data)}")
    return removed

def main():
    """Main function"""
    print("🧹 Removing kohus.ee emails from clean lists...\n")

    base_path = "output"
    total_removed = 0

    # Files to process
    files = [
        ("Spain_PM_Испания порошок_clean_20251024_100109.txt", "txt"),
        ("Spain_PM_Испания порошок_clean_20251024_100109.csv", "csv"),
        ("Spain_PM_Испания порошок_clean_20251024_100109.json", "json"),
        ("Испания порошок_clean_20251024_100109.txt", "txt"),
        ("Испания порошок_clean_metadata_20251024_100109.csv", "csv"),
        ("Испания порошок_clean_metadata_20251024_100109.json", "json"),
    ]

    for filename, file_type in files:
        filepath = os.path.join(base_path, filename)
        if not os.path.exists(filepath):
            print(f"⚠️  File not found: {filename}")
            continue

        try:
            if file_type == "txt":
                removed = remove_from_txt(filepath)
            elif file_type == "csv":
                removed = remove_from_csv(filepath)
            elif file_type == "json":
                removed = remove_from_json(filepath)

            total_removed += removed
        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

    print(f"\n✅ Total removed: {total_removed} emails with @kohus.ee")
    print("\n📋 Removed emails:")
    print("  • hmktallinn.menetlus@kohus.ee")
    print("  • info@kohus.ee")
    print("  • jogevamk.lastekaitse@kohus.ee")
    print("  • pmkrapla.menetlus@kohus.ee")

if __name__ == "__main__":
    main()
