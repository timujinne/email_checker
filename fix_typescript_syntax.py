#!/usr/bin/env python3
"""
Fix TypeScript syntax (!.) in JavaScript files
Removes non-null assertions which don't work in browsers
"""
import os
import re

FILES_TO_FIX = [
    "web/assets/js/components/visual-filter-builder.js",
    "web/assets/js/components/json-editor.js"
]

def fix_file(filepath):
    """Remove TypeScript non-null assertions (!.)"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace !. with just .
    # Pattern: )!. or '!. or "!.
    content = re.sub(r'(\)|\'|")!\\.', r'\1.', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        # Count replacements
        count = original.count('!.') - content.count('!.')
        print(f"✓ {filepath} - fixed {count} TypeScript syntax errors")
        return True
    else:
        print(f"✓ {filepath} - no TypeScript syntax found")
        return False

def main():
    print("Fixing TypeScript syntax in JavaScript files...")
    print("=" * 60)

    fixed_count = 0

    for filepath in FILES_TO_FIX:
        if not os.path.exists(filepath):
            print(f"✗ {filepath} - file not found")
            continue

        if fix_file(filepath):
            fixed_count += 1

    print("=" * 60)
    print(f"✅ Fixed {fixed_count} files")
    print("\n🔄 Please refresh the browser (Ctrl+Shift+R) to apply changes")

if __name__ == "__main__":
    main()
