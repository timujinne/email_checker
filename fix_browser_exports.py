#!/usr/bin/env python3
"""
Fix browser exports for Smart Filter components
Adds window.ClassName exports for browser compatibility
"""
import os
import re

# Files to fix
COMPONENTS_DIR = "web/assets/js/components"
FILES_TO_FIX = [
    "json-editor.js",
    "filter-wizard.js",
    "filter-tester.js",
    "template-library.js"
]

# Map filename to class name
CLASS_NAMES = {
    "json-editor.js": "JSONEditor",
    "filter-wizard.js": "FilterWizard",
    "filter-tester.js": "FilterTester",
    "template-library.js": "TemplateLibrary"
}

def fix_file(filepath, class_name):
    """Add browser export to file if not present"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already has window export
    if f'window.{class_name}' in content:
        print(f"✓ {filepath} - already has window export")
        return False

    # Pattern to find: if (typeof module !== 'undefined' && module.exports) {
    pattern = r"// Export for use in other modules\s*\n\s*if \(typeof module !== 'undefined' && module\.exports\) \{\s*\n\s*module\.exports = \{ " + class_name + r" \};\s*\n\s*\}"

    replacement = f"""// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = {{ {class_name} }};
}}

// Export for browser (global scope)
if (typeof window !== 'undefined') {{
    window.{class_name} = {class_name};
}}"""

    new_content = re.sub(pattern, replacement, content)

    if new_content == content:
        print(f"✗ {filepath} - pattern not found, trying alternative")
        # Try simpler pattern
        pattern2 = r"if \(typeof module !== 'undefined' && module\.exports\) \{\s*\n\s*module\.exports = \{ " + class_name + r" \};\s*\n\s*\}"
        new_content = re.sub(pattern2, replacement, content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✓ {filepath} - fixed!")
        return True
    else:
        print(f"✗ {filepath} - could not fix (pattern mismatch)")
        return False

def main():
    print("Fixing browser exports for Smart Filter components...")
    print("=" * 60)

    fixed_count = 0

    for filename in FILES_TO_FIX:
        filepath = os.path.join(COMPONENTS_DIR, filename)
        class_name = CLASS_NAMES[filename]

        if not os.path.exists(filepath):
            print(f"✗ {filepath} - file not found")
            continue

        if fix_file(filepath, class_name):
            fixed_count += 1

    print("=" * 60)
    print(f"✅ Fixed {fixed_count} files")
    print("\n🔄 Please refresh the browser (Ctrl+Shift+R) to apply changes")

if __name__ == "__main__":
    main()
