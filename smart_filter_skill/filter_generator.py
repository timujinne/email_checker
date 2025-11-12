#!/usr/bin/env python3
"""
Smart Filter Generator - Interactive tool for creating new email filters

Features:
- Interactive mode with guided questions
- Template-based creation
- Country adaptation
- Validation and testing
- Auto-registration in __init__.py
"""

import json
import os
import sys
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime


class FilterGenerator:
    """Interactive generator for creating smart filters"""

    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.skill_dir = Path(__file__).parent
        self.filters_dir = self.root_dir / "smart_filters"
        self.configs_dir = self.filters_dir / "configs"
        self.templates_dir = self.skill_dir / "industry_templates"
        self.language_dir = self.skill_dir / "language_library"
        self.geo_dir = self.skill_dir / "geographic_data"

        # Ensure directories exist
        self.configs_dir.mkdir(parents=True, exist_ok=True)

        # Load available resources
        self.available_templates = self._load_available_templates()
        self.available_countries = self._load_available_countries()
        self.available_languages = self._load_available_languages()

    def _load_available_templates(self) -> List[str]:
        """Load available industry templates"""
        if not self.templates_dir.exists():
            return []
        templates = []
        for file in self.templates_dir.glob("*_template.json"):
            templates.append(file.stem.replace("_template", ""))
        return sorted(templates)

    def _load_available_countries(self) -> Dict[str, Dict]:
        """Load available country data"""
        geo_file = self.geo_dir / "country_domains.json"
        if not geo_file.exists():
            # Default European countries
            return {
                "DE": {"name": "Germany", "languages": ["de", "en"]},
                "FR": {"name": "France", "languages": ["fr", "en"]},
                "IT": {"name": "Italy", "languages": ["it", "en"]},
                "ES": {"name": "Spain", "languages": ["es", "en"]},
                "PL": {"name": "Poland", "languages": ["pl", "en"]},
                "CH": {"name": "Switzerland", "languages": ["de", "fr", "it", "en"]},
                "AT": {"name": "Austria", "languages": ["de", "en"]},
                "NL": {"name": "Netherlands", "languages": ["nl", "en"]},
                "BE": {"name": "Belgium", "languages": ["nl", "fr", "en"]},
                "PT": {"name": "Portugal", "languages": ["pt", "en"]},
            }

        with open(geo_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("europe", {})

    def _load_available_languages(self) -> List[str]:
        """Load available language libraries"""
        if not self.language_dir.exists():
            return ["de", "fr", "it", "en", "es", "pl", "pt"]

        languages = []
        for file in self.language_dir.glob("*_industry_terms.json"):
            lang_code = file.stem.split("_")[0]
            languages.append(lang_code)
        return sorted(languages)

    def interactive_mode(self):
        """Interactive mode for creating a filter"""
        print("🎯 Smart Filter Generator - Interactive Mode\n")
        print("=" * 60)

        # Step 1: Country selection
        country_code, country_data = self._select_country()
        print(f"\n✅ {country_data['name']} selected")

        # Step 2: Language selection
        languages = self._select_languages(country_data['languages'])
        print(f"✅ Languages: {', '.join(languages)}")

        # Step 3: Industry selection
        industry, template = self._select_industry()
        print(f"✅ {industry.capitalize()} industry selected")

        # Step 4: Filter name
        filter_name = self._select_filter_name(country_code, industry)
        print(f"✅ Filter name: {filter_name}")

        # Step 5: Confirmation
        print(f"\n📋 Configuration Summary:")
        print(f"   Country: {country_data['name']} ({country_code})")
        print(f"   Industry: {industry}")
        print(f"   Languages: {', '.join(languages)}")
        print(f"   Filter name: {filter_name}")

        confirm = input("\n🔨 Generate files? [Y/n]: ").strip().lower()
        if confirm and confirm != 'y':
            print("❌ Cancelled")
            return

        # Step 6: Generate files
        print(f"\n🔧 Generating filter files...")
        self._generate_filter_files(
            filter_name=filter_name,
            country_code=country_code,
            industry=industry,
            languages=languages,
            template=template
        )

        print(f"\n✅ Filter created successfully!")
        print(f"\n📝 Next steps:")
        print(f"   1. Review config: smart_filters/configs/{filter_name}_config.json")
        print(f"   2. Test filter: python3 email_checker.py smart-filter <file> --config {filter_name}")

    def _select_country(self) -> Tuple[str, Dict]:
        """Interactive country selection"""
        print("\n1️⃣  Select target country:")

        countries_list = list(self.available_countries.items())
        for idx, (code, data) in enumerate(countries_list, 1):
            print(f"   [{idx}] {code} - {data['name']}")

        while True:
            choice = input(f"\nSelect (1-{len(countries_list)}) or enter country code: ").strip().upper()

            # Check if number
            if choice.isdigit():
                idx = int(choice) - 1
                if 0 <= idx < len(countries_list):
                    code, data = countries_list[idx]
                    return code, data
            # Check if country code
            elif choice in self.available_countries:
                return choice, self.available_countries[choice]

            print(f"❌ Invalid choice. Try again.")

    def _select_languages(self, default_languages: List[str]) -> List[str]:
        """Interactive language selection"""
        print(f"\n2️⃣  Languages:")
        print(f"   Default: {', '.join(default_languages)}")

        additional = input(f"   Additional languages (comma-separated) or press Enter: ").strip()

        if not additional:
            return default_languages

        # Parse additional languages
        additional_langs = [lang.strip().lower() for lang in additional.split(',')]
        all_langs = list(set(default_languages + additional_langs))

        return all_langs

    def _select_industry(self) -> Tuple[str, Optional[Dict]]:
        """Interactive industry selection"""
        print(f"\n3️⃣  Select industry:")

        # List available templates
        industries = ["hydraulics", "earthmoving", "automotive", "construction", "manufacturing", "custom"]

        for idx, industry in enumerate(industries, 1):
            template_marker = "✓" if industry in self.available_templates else " "
            print(f"   [{idx}] {template_marker} {industry.capitalize()}")

        while True:
            choice = input(f"\nSelect (1-{len(industries)}): ").strip()

            if choice.isdigit():
                idx = int(choice) - 1
                if 0 <= idx < len(industries):
                    industry = industries[idx]

                    # Load template if available
                    template = None
                    if industry in self.available_templates:
                        template_file = self.templates_dir / f"{industry}_template.json"
                        if template_file.exists():
                            with open(template_file, 'r', encoding='utf-8') as f:
                                template = json.load(f)
                            print(f"   ✅ Loaded template: {template_file.name}")

                    return industry, template

            print(f"❌ Invalid choice. Try again.")

    def _select_filter_name(self, country_code: str, industry: str) -> str:
        """Interactive filter name selection"""
        default_name = f"{country_code.lower()}_{industry}"

        print(f"\n4️⃣  Filter name:")
        name = input(f"   Name (default: {default_name}): ").strip()

        if not name:
            return default_name

        # Sanitize name
        name = re.sub(r'[^a-z0-9_]', '_', name.lower())
        return name

    def _generate_filter_files(self, filter_name: str, country_code: str,
                              industry: str, languages: List[str],
                              template: Optional[Dict]):
        """Generate config and Python filter files"""

        # 1. Generate config JSON
        config = self._build_config(
            filter_name=filter_name,
            country_code=country_code,
            industry=industry,
            languages=languages,
            template=template
        )

        config_file = self.configs_dir / f"{filter_name}_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)

        print(f"   ✅ Created: {config_file}")

        # 2. Generate Python filter class
        filter_code = self._build_filter_class(
            filter_name=filter_name,
            country_code=country_code,
            industry=industry
        )

        filter_file = self.filters_dir / f"{filter_name}_filter.py"
        with open(filter_file, 'w', encoding='utf-8') as f:
            f.write(filter_code)

        print(f"   ✅ Created: {filter_file}")

        # 3. Update __init__.py
        self._update_init_file(filter_name)
        print(f"   ✅ Updated: smart_filters/__init__.py")

    def _build_config(self, filter_name: str, country_code: str,
                     industry: str, languages: List[str],
                     template: Optional[Dict]) -> Dict:
        """Build filter configuration"""

        # Base structure
        config = {
            "filter_name": f"{country_code} {industry.capitalize()} Filter",
            "version": "1.0.0",
            "description": f"Smart filter for {country_code} {industry} market",
            "target_country": country_code,
            "target_industry": industry,
            "languages": languages,
            "geographic": self._build_geographic_config(country_code),
            "hard_exclusions": self._build_hard_exclusions(country_code, languages),
            "industry_keywords": self._build_industry_keywords(industry, languages, template),
            "domain_patterns": self._build_domain_patterns(industry, languages),
            "scoring": {
                "weights": {
                    "email_quality": 0.10,
                    "company_relevance": 0.45,
                    "geographic_priority": 0.30,
                    "engagement": 0.15
                },
                "thresholds": {
                    "high_priority": 100,
                    "medium_priority": 50,
                    "low_priority": 10
                },
                "bonus_multipliers": {
                    "oem_manufacturer": 1.3,
                    "target_geography": 2.0,
                    "domain_match": 1.5
                }
            },
            "output_settings": {
                "filename_prefix": f"{country_code}_{industry.capitalize()}",
                "categories": {
                    "high": "HIGH_PRIORITY",
                    "medium": "MEDIUM_PRIORITY",
                    "low": "LOW_PRIORITY",
                    "excluded": "EXCLUDED"
                },
                "include_metadata": True,
                "generate_html_report": True,
                "generate_exclusion_report": True
            }
        }

        return config

    def _build_geographic_config(self, country_code: str) -> Dict:
        """Build geographic configuration"""
        # Load from geographic_data if available
        geo_file = self.geo_dir / "geo_priorities.json"

        if geo_file.exists():
            with open(geo_file, 'r', encoding='utf-8') as f:
                geo_data = json.load(f)
                if country_code in geo_data:
                    return geo_data[country_code]

        # Default structure
        return {
            "priority_high": [country_code.lower(), f".{country_code.lower()}"],
            "priority_medium": ["europe", "eu"],
            "excluded_countries": [
                ".cn", ".com.cn", ".hk", ".tw",
                ".in", ".co.in",
                ".tr", ".com.tr",
                ".ru", ".by", ".ua"
            ],
            "excluded_cities": []
        }

    def _build_hard_exclusions(self, country_code: str, languages: List[str]) -> Dict:
        """Build hard exclusions configuration"""

        exclusions = {
            "personal_domains": [
                "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "icloud.com", "me.com", "mac.com"
            ],
            "hr_prefixes": {},
            "service_prefixes": [
                "noreply@", "no-reply@", "donotreply@",
                "webmaster@", "admin@", "postmaster@"
            ],
            "excluded_industries": {}
        }

        # Load language-specific data
        for lang in languages:
            lang_file = self.language_dir / f"{lang}_industry_terms.json"
            if lang_file.exists():
                with open(lang_file, 'r', encoding='utf-8') as f:
                    lang_data = json.load(f)

                    # Add exclusions
                    if "exclusions" in lang_data:
                        excl = lang_data["exclusions"]

                        # Personal domains
                        if "personal_domains" in excl:
                            exclusions["personal_domains"].extend(excl["personal_domains"])

                        # HR prefixes
                        if "hr_prefixes" in excl:
                            exclusions["hr_prefixes"][lang] = excl["hr_prefixes"]

                        # Excluded industries
                        if "excluded_industries" in excl:
                            for industry, keywords in excl["excluded_industries"].items():
                                if industry not in exclusions["excluded_industries"]:
                                    exclusions["excluded_industries"][industry] = {}
                                exclusions["excluded_industries"][industry][lang] = keywords

        # Deduplicate personal domains
        exclusions["personal_domains"] = list(set(exclusions["personal_domains"]))

        return exclusions

    def _build_industry_keywords(self, industry: str, languages: List[str],
                                 template: Optional[Dict]) -> Dict:
        """Build industry keywords configuration"""

        keywords = {}

        # Load from template
        if template and "common_keywords" in template:
            # Template provides structure
            pass

        # Load from language libraries
        for lang in languages:
            lang_file = self.language_dir / f"{lang}_industry_terms.json"
            if lang_file.exists():
                with open(lang_file, 'r', encoding='utf-8') as f:
                    lang_data = json.load(f)

                    if "industries" in lang_data and industry in lang_data["industries"]:
                        industry_data = lang_data["industries"][industry]

                        # Create language-specific section
                        section_name = f"{industry}_{lang}"
                        keywords[section_name] = industry_data

        # Add negative keywords
        keywords["negative_keywords"] = [
            "university", "school", "education",
            "recruitment", "staffing", "temp agency",
            "retail", "e-commerce", "shop"
        ]

        return keywords

    def _build_domain_patterns(self, industry: str, languages: List[str]) -> Dict:
        """Build domain patterns configuration"""

        # Industry-specific patterns
        patterns = {
            "hydraulics": ["hydraul", "pump", "cylinder", "valve"],
            "earthmoving": ["excavat", "bagger", "loader", "grader"],
            "automotive": ["auto", "car", "vehicle", "motor"],
            "construction": ["construct", "bau", "edil"],
            "manufacturing": ["manufact", "produkt", "fabrik"]
        }

        return {
            f"{industry}_patterns": patterns.get(industry, [])
        }

    def _build_filter_class(self, filter_name: str, country_code: str,
                           industry: str) -> str:
        """Generate Python filter class code"""

        class_name = ''.join(word.capitalize() for word in filter_name.split('_')) + 'Filter'

        code = f'''#!/usr/bin/env python3
"""
{filter_name} Filter - Auto-generated filter for {country_code} {industry} market

Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Optional


class {class_name}:
    """
    Smart filter for {country_code} {industry} market
    """

    def __init__(self, config: dict):
        """
        Initialize filter with configuration

        Args:
            config: Filter configuration dictionary
        """
        self.config = config

        # Load exclusions
        self._load_exclusions()

        # Load industry keywords
        self._load_keywords()

    def _load_exclusions(self):
        """Load hard exclusions from config"""
        exclusions = self.config.get('hard_exclusions', {{}})

        self.personal_domains = set(exclusions.get('personal_domains', []))
        self.hr_prefixes = set()

        for lang_prefixes in exclusions.get('hr_prefixes', {{}}).values():
            self.hr_prefixes.update(lang_prefixes)

        self.service_prefixes = set(exclusions.get('service_prefixes', []))
        self.excluded_country_domains = set(
            self.config.get('geographic', {{}}).get('excluded_countries', [])
        )

    def _load_keywords(self):
        """Load industry keywords from config"""
        self.industry_keywords = self.config.get('industry_keywords', {{}})
        self.negative_keywords = set(self.industry_keywords.get('negative_keywords', []))

    def should_exclude(self, email: str, company_name: str = '',
                      description: str = '', domain: str = '') -> Dict:
        """
        Check if email should be excluded

        Args:
            email: Email address
            company_name: Company name
            description: Company description
            domain: Web domain

        Returns:
            {{
                'should_exclude': bool,
                'reasons': List[str],
                'severity': 'critical' | 'warning'
            }}
        """
        exclusion_reasons = []

        try:
            # Personal domains
            if self._is_personal_domain(email):
                exclusion_reasons.append('personal_domain')

            # HR/service email
            if self._is_hr_or_service_email(email):
                exclusion_reasons.append('hr_service_prefix')

            # Geographic restrictions
            if self._is_geographically_excluded(email, description, domain):
                exclusion_reasons.append('geographic_restriction')

            # Excluded industries
            if self._is_excluded_industry(company_name, description):
                exclusion_reasons.append('excluded_industry')

        except Exception as error:
            print(f'⚠️ Error in exclusion filter: {{error}}')
            exclusion_reasons.append('filter_error')

        return {{
            'should_exclude': len(exclusion_reasons) > 0,
            'reasons': exclusion_reasons,
            'severity': 'critical' if len(exclusion_reasons) >= 2 else 'warning'
        }}

    def _is_personal_domain(self, email: str) -> bool:
        """Check if email uses personal domain"""
        if not email or '@' not in email:
            return False

        try:
            domain = email.split('@')[1].lower().strip()
            return domain in self.personal_domains
        except:
            return False

    def _is_hr_or_service_email(self, email: str) -> bool:
        """Check if email is HR or service email"""
        if not email:
            return False

        try:
            email_lower = email.lower().strip()

            for prefix in self.hr_prefixes:
                if email_lower.startswith(prefix):
                    return True

            for prefix in self.service_prefixes:
                if prefix in email_lower:
                    return True

            return False
        except:
            return False

    def _is_geographically_excluded(self, email: str, description: str = '',
                                   domain: str = '') -> bool:
        """Check geographic exclusions"""
        if not email:
            return False

        try:
            email_domain = email.split('@')[1].lower() if '@' in email else ''

            for country_domain in self.excluded_country_domains:
                if email_domain.endswith(country_domain.lower()):
                    return True

            return False
        except:
            return False

    def _is_excluded_industry(self, company_name: str = '',
                             description: str = '') -> bool:
        """Check if company is in excluded industry"""
        try:
            text = f"{{company_name}} {{description}}".lower()

            for keyword in self.negative_keywords:
                if keyword.lower() in text:
                    return True

            return False
        except:
            return False


def load_config(config_path: str) -> dict:
    """
    Load filter configuration

    Args:
        config_path: Path to config JSON file

    Returns:
        Configuration dictionary
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as error:
        print(f'❌ Failed to load config {{config_path}}: {{error}}')
        raise
'''

        return code

    def _update_init_file(self, filter_name: str):
        """Update __init__.py to register new filter"""
        init_file = self.filters_dir / "__init__.py"

        if not init_file.exists():
            # Create new __init__.py
            content = f'''"""Smart Filters - Available filters"""

AVAILABLE_FILTERS = [
    "italy_hydraulics",
    "swiss_machinery",
    "{filter_name}"
]
'''
        else:
            # Update existing
            with open(init_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Add to AVAILABLE_FILTERS list
            if filter_name not in content:
                # Find AVAILABLE_FILTERS list
                match = re.search(r'AVAILABLE_FILTERS\s*=\s*\[(.*?)\]', content, re.DOTALL)
                if match:
                    filters_block = match.group(1)
                    filters = [f.strip().strip('"').strip("'") for f in filters_block.split(',') if f.strip()]
                    filters.append(filter_name)
                    filters_str = ',\n    '.join(f'"{f}"' for f in filters)

                    new_block = f'AVAILABLE_FILTERS = [\n    {filters_str}\n]'
                    content = re.sub(r'AVAILABLE_FILTERS\s*=\s*\[.*?\]', new_block, content, flags=re.DOTALL)

        with open(init_file, 'w', encoding='utf-8') as f:
            f.write(content)

    def validate_filter(self, filter_name: str):
        """Validate filter configuration"""
        print(f"🔍 Validating filter: {filter_name}\n")

        config_file = self.configs_dir / f"{filter_name}_config.json"
        if not config_file.exists():
            print(f"❌ Config file not found: {config_file}")
            return False

        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # Check required fields
            required_fields = [
                "filter_name", "target_country", "target_industry",
                "languages", "geographic", "hard_exclusions",
                "industry_keywords", "scoring"
            ]

            missing = []
            for field in required_fields:
                if field not in config:
                    missing.append(field)

            if missing:
                print(f"❌ Missing required fields: {', '.join(missing)}")
                return False

            print("✅ All required fields present")
            print(f"✅ Config structure valid")
            print(f"\n📊 Filter summary:")
            print(f"   Country: {config['target_country']}")
            print(f"   Industry: {config['target_industry']}")
            print(f"   Languages: {', '.join(config['languages'])}")

            return True

        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            return False
        except Exception as e:
            print(f"❌ Validation error: {e}")
            return False


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Smart Filter Generator - Create new email filters"
    )

    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Interactive mode (recommended)'
    )

    parser.add_argument(
        '--country',
        type=str,
        help='Target country code (e.g., DE, FR, IT)'
    )

    parser.add_argument(
        '--industry',
        type=str,
        help='Target industry (e.g., hydraulics, automotive)'
    )

    parser.add_argument(
        '--languages',
        type=str,
        help='Languages (comma-separated, e.g., de,en)'
    )

    parser.add_argument(
        '--output',
        type=str,
        help='Filter name (default: <country>_<industry>)'
    )

    parser.add_argument(
        '--validate',
        type=str,
        help='Validate existing filter'
    )

    args = parser.parse_args()

    generator = FilterGenerator()

    if args.validate:
        generator.validate_filter(args.validate)
        return

    if args.interactive or (not args.country and not args.industry):
        generator.interactive_mode()
    else:
        # CLI mode
        if not args.country or not args.industry:
            print("❌ Error: --country and --industry are required in CLI mode")
            print("   Use --interactive for interactive mode")
            sys.exit(1)

        # TODO: Implement CLI mode
        print("❌ CLI mode not yet implemented. Use --interactive")
        sys.exit(1)


if __name__ == "__main__":
    main()
