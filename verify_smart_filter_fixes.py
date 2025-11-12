#!/usr/bin/env python3
"""
Comprehensive verification script for Smart Filter fixes
Validates all code changes are properly in place
"""

import os
import re
import json
from pathlib import Path


class SmartFilterVerifier:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.errors = []
        self.warnings = []
        self.checks_passed = 0
        self.checks_total = 0

    def check(self, condition, message, warning=False):
        """Record a check result"""
        self.checks_total += 1
        if condition:
            self.checks_passed += 1
            print(f"✅ {message}")
            return True
        else:
            if warning:
                self.warnings.append(message)
                print(f"⚠️  {message}")
            else:
                self.errors.append(message)
                print(f"❌ {message}")
            return False

    def verify_browser_exports(self):
        """Verify all components have browser exports"""
        print("\n" + "="*60)
        print("1. BROWSER EXPORTS")
        print("="*60)

        components = [
            'visual-filter-builder.js',
            'json-editor.js',
            'filter-wizard.js',
            'filter-tester.js',
            'template-library.js'
        ]

        class_names = {
            'visual-filter-builder.js': 'VisualFilterBuilder',
            'json-editor.js': 'JSONEditor',
            'filter-wizard.js': 'FilterWizard',
            'filter-tester.js': 'FilterTester',
            'template-library.js': 'TemplateLibrary'
        }

        for component in components:
            path = self.base_dir / 'web' / 'assets' / 'js' / 'components' / component
            if not path.exists():
                self.check(False, f"Component file not found: {component}")
                continue

            content = path.read_text(encoding='utf-8')
            class_name = class_names[component]

            # Check for window export
            pattern = rf'window\.{class_name}\s*=\s*{class_name}'
            has_export = re.search(pattern, content) is not None

            self.check(
                has_export,
                f"{component}: window.{class_name} export found"
            )

    def verify_container_ids_html(self):
        """Verify HTML has correct container IDs"""
        print("\n" + "="*60)
        print("2. HTML CONTAINER IDs")
        print("="*60)

        expected_ids = [
            'visual-filter-builder',
            'json-editor-container',
            'filter-wizard-container',
            'template-library-container',
            'filter-tester-container'
        ]

        html_path = self.base_dir / 'web' / 'index.html'
        if not html_path.exists():
            self.check(False, "web/index.html not found")
            return

        content = html_path.read_text(encoding='utf-8')

        for container_id in expected_ids:
            pattern = rf'id="{container_id}"'
            has_id = re.search(pattern, content) is not None

            self.check(
                has_id,
                f"HTML: Container #{container_id} found"
            )

    def verify_container_ids_js(self):
        """Verify smart-filter.js uses correct container IDs"""
        print("\n" + "="*60)
        print("3. JAVASCRIPT CONTAINER IDs")
        print("="*60)

        js_path = self.base_dir / 'web' / 'assets' / 'js' / 'components' / 'smart-filter.js'
        if not js_path.exists():
            self.check(False, "smart-filter.js not found")
            return

        content = js_path.read_text(encoding='utf-8')

        expected_mappings = {
            'VisualFilterBuilder': 'visual-filter-builder',
            'JSONEditor': 'json-editor-container',
            'FilterWizard': 'filter-wizard-container',
            'TemplateLibrary': 'template-library-container',
            'FilterTester': 'filter-tester-container'
        }

        for class_name, container_id in expected_mappings.items():
            # Look for: new ClassName('container-id'
            pattern = rf'new\s+{class_name}\s*\(\s*[\'"`]{container_id}[\'"`]'
            has_mapping = re.search(pattern, content) is not None

            self.check(
                has_mapping,
                f"smart-filter.js: new {class_name}('{container_id}')"
            )

    def verify_no_typescript_syntax(self):
        """Verify no TypeScript syntax remains"""
        print("\n" + "="*60)
        print("4. TYPESCRIPT SYNTAX CHECK")
        print("="*60)

        components_dir = self.base_dir / 'web' / 'assets' / 'js' / 'components'
        if not components_dir.exists():
            self.check(False, "Components directory not found")
            return

        js_files = list(components_dir.glob('*.js'))
        typescript_pattern = r'getElementById\([^)]+\)\s*!\s*\.'

        total_violations = 0
        for js_file in js_files:
            content = js_file.read_text(encoding='utf-8')
            matches = re.findall(typescript_pattern, content)

            if matches:
                total_violations += len(matches)
                self.check(
                    False,
                    f"{js_file.name}: Found {len(matches)} TypeScript non-null assertions (!.)"
                )

        self.check(
            total_violations == 0,
            f"No TypeScript syntax found in {len(js_files)} component files"
        )

    def verify_cache_busting(self):
        """Verify cache busting version is up to date"""
        print("\n" + "="*60)
        print("5. CACHE BUSTING")
        print("="*60)

        html_path = self.base_dir / 'web' / 'index.html'
        if not html_path.exists():
            self.check(False, "web/index.html not found")
            return

        content = html_path.read_text(encoding='utf-8')

        # Check smart-filter.js version
        match = re.search(r'smart-filter\.js\?v=(\d+)', content)
        if match:
            version = int(match.group(1))
            self.check(
                version >= 7,
                f"smart-filter.js version is v={version} (expected >= 7)"
            )
        else:
            self.check(False, "smart-filter.js version parameter not found")

    def verify_api_endpoint(self):
        """Verify API endpoint exists in web_server.py"""
        print("\n" + "="*60)
        print("6. API ENDPOINT")
        print("="*60)

        server_path = self.base_dir / 'web_server.py'
        if not server_path.exists():
            self.check(False, "web_server.py not found")
            return

        content = server_path.read_text(encoding='utf-8')

        # Check for endpoint definition
        has_endpoint = 'def handle_smart_filter_apply' in content
        self.check(
            has_endpoint,
            "API endpoint handle_smart_filter_apply() found in web_server.py"
        )

        # Check for route registration
        has_route = "'/api/smart-filter/apply'" in content
        self.check(
            has_route,
            "Route '/api/smart-filter/apply' registered in web_server.py"
        )

    def verify_dependencies(self):
        """Verify package.json has required dependencies"""
        print("\n" + "="*60)
        print("7. DEPENDENCIES")
        print("="*60)

        package_json_path = self.base_dir / 'package.json'
        if not package_json_path.exists():
            self.check(False, "package.json not found", warning=True)
            return

        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)

            dev_deps = package_data.get('devDependencies', {})

            # Check for testing dependencies
            required_deps = ['jest', 'cypress']
            for dep in required_deps:
                has_dep = dep in dev_deps
                self.check(
                    has_dep,
                    f"Development dependency '{dep}' found in package.json",
                    warning=True
                )
        except Exception as e:
            self.check(False, f"Error reading package.json: {e}", warning=True)

    def print_summary(self):
        """Print verification summary"""
        print("\n" + "="*60)
        print("VERIFICATION SUMMARY")
        print("="*60)

        print(f"\n✅ Checks passed: {self.checks_passed}/{self.checks_total}")

        if self.errors:
            print(f"\n❌ Critical errors: {len(self.errors)}")
            for error in self.errors:
                print(f"   - {error}")

        if self.warnings:
            print(f"\n⚠️  Warnings: {len(self.warnings)}")
            for warning in self.warnings:
                print(f"   - {warning}")

        if not self.errors:
            print("\n🎉 All critical checks passed! Smart Filter is ready for testing.")
            print("\n📝 Next steps:")
            print("   1. Refresh browser (Ctrl + Shift + R)")
            print("   2. Open http://localhost:8089/new#smart-filter")
            print("   3. Test all 5 tabs render correctly")
            print("   4. Run unit tests: npm test")
            print("   5. Run E2E tests: npm run test:e2e")
            return True
        else:
            print("\n⚠️  Critical errors found. Please fix them before testing.")
            return False


def main():
    """Run all verification checks"""
    print("🔍 Smart Filter Fix Verification")
    print("="*60)

    verifier = SmartFilterVerifier()

    # Run all checks
    verifier.verify_browser_exports()
    verifier.verify_container_ids_html()
    verifier.verify_container_ids_js()
    verifier.verify_no_typescript_syntax()
    verifier.verify_cache_busting()
    verifier.verify_api_endpoint()
    verifier.verify_dependencies()

    # Print summary
    success = verifier.print_summary()

    return 0 if success else 1


if __name__ == '__main__':
    exit(main())
