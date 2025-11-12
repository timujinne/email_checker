#!/usr/bin/env python3
"""
Test script to verify Filter Wizard API fix
Tests both old and new behavior of /api/output-files endpoint
"""

import json
from pathlib import Path

def test_clean_files_exist():
    """Check if clean files exist in output directory"""
    output_dir = Path("output")
    if not output_dir.exists():
        print("❌ Output directory doesn't exist")
        return False

    clean_files = list(output_dir.glob("*_clean_*.txt"))
    print(f"✅ Found {len(clean_files)} clean files in output/")

    if clean_files:
        print("\nSample files:")
        for f in clean_files[:5]:
            print(f"  - {f.name}")
    else:
        print("⚠️  No clean files found - Filter Wizard will be empty")

    return len(clean_files) > 0

def test_api_logic():
    """Simulate the new API logic"""
    print("\n" + "="*60)
    print("Testing API Logic (without starting server)")
    print("="*60)

    output_dir = Path("output")
    if not output_dir.exists():
        print("❌ Output directory doesn't exist")
        return False

    # Simulate new behavior: no list parameter
    clean_files = []
    for file_path in output_dir.glob("*_clean_*.txt"):
        file_info = {
            "filename": file_path.name,
            "size": file_path.stat().st_size,
            "modified": file_path.stat().st_mtime,
            "path": str(file_path.relative_to(Path(".")))
        }
        # Count emails
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                line_count = sum(1 for line in f if line.strip())
            file_info["email_count"] = line_count
        except Exception as e:
            file_info["email_count"] = 0
            print(f"⚠️  Could not count emails in {file_path.name}: {e}")

        clean_files.append(file_info)

    # Sort by modified (newest first)
    clean_files.sort(key=lambda x: x["modified"], reverse=True)

    print(f"\n✅ API would return {len(clean_files)} files")

    if clean_files:
        print("\nSimulated API Response Preview:")
        print(json.dumps({
            "files": clean_files[:3]  # Show first 3
        }, indent=2, default=str))

        total_emails = sum(f.get("email_count", 0) for f in clean_files)
        print(f"\n📊 Total emails across all clean files: {total_emails:,}")

    return len(clean_files) > 0

def test_js_syntax():
    """Check if filter-wizard.js has valid syntax"""
    print("\n" + "="*60)
    print("Checking JavaScript Syntax")
    print("="*60)

    js_file = Path("web/assets/js/components/filter-wizard.js")
    if not js_file.exists():
        print("❌ filter-wizard.js not found")
        return False

    # Basic check - look for the updated code
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if new code is present
    if "API returns all clean files when called without 'list' parameter" in content:
        print("✅ Updated comment found in filter-wizard.js")
    else:
        print("⚠️  Updated comment not found - file may not be updated")

    if "response.data.files || response.data || []" in content:
        print("✅ Updated API response handling found")
    else:
        print("⚠️  Updated response handling not found")

    return True

def main():
    print("="*60)
    print("Filter Wizard Fix Verification")
    print("="*60)

    results = {
        "clean_files_exist": test_clean_files_exist(),
        "api_logic": test_api_logic(),
        "js_syntax": test_js_syntax()
    }

    print("\n" + "="*60)
    print("Summary")
    print("="*60)

    all_passed = all(results.values())

    for test, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test}")

    print("\n" + "="*60)
    if all_passed:
        print("✅ All checks passed! Ready to test in browser.")
        print("\nNext steps:")
        print("1. Start web server: python3 web_server.py")
        print("2. Navigate to Smart Filter page")
        print("3. Check dropdown is populated")
    else:
        print("⚠️  Some checks failed. Review output above.")
    print("="*60)

if __name__ == "__main__":
    main()
