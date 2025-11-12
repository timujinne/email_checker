#!/usr/bin/env python3
"""
Add favicon to all HTML files in web/ directory
"""

import os
import re
from pathlib import Path

FAVICON_HTML = '''    <!-- Favicon -->
    <link rel="icon" type="image/webp" href="assets/images/logo.webp">
    <link rel="apple-touch-icon" href="assets/images/logo.webp">

'''

def add_favicon_to_html(file_path):
    """Add favicon links to HTML file if not already present"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if favicon already exists
    if 'assets/images/logo.webp' in content:
        print(f"✓ {file_path.name} - уже содержит favicon")
        return False

    # Find the title tag and insert favicon after it
    pattern = r'(<title>.*?</title>\s*\n)'
    match = re.search(pattern, content)

    if match:
        # Insert favicon after title
        new_content = content[:match.end()] + '\n' + FAVICON_HTML + content[match.end():]

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"✓ {file_path.name} - favicon добавлен")
        return True
    else:
        print(f"✗ {file_path.name} - не найден тег <title>")
        return False

def main():
    web_dir = Path(__file__).parent / 'web'

    if not web_dir.exists():
        print("❌ Директория web/ не найдена!")
        return

    # Find all HTML files
    html_files = list(web_dir.glob('*.html'))

    print(f"📄 Найдено HTML файлов: {len(html_files)}\n")

    updated = 0
    skipped = 0

    for html_file in html_files:
        if add_favicon_to_html(html_file):
            updated += 1
        else:
            skipped += 1

    print(f"\n✅ Обработано: {updated} обновлено, {skipped} пропущено")

if __name__ == '__main__':
    main()
