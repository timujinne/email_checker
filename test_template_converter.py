#!/usr/bin/env python3
"""
Test template converter with actual config files
"""

import json
from pathlib import Path
from datetime import datetime

def convert_old_to_new_format(old_config, config_name):
    """
    Convert old Python backend format to new frontend format
    """
    # Extract data from actual config format
    # Handle both 'display_name' and 'config_name'
    filter_name = old_config.get('display_name', old_config.get('config_name', config_name))
    version = old_config.get('version', '1.0')
    description = old_config.get('description', '')

    # Handle nested target_market structure
    target_market = old_config.get('target_market', {})
    target_country = target_market.get('country_name', 'Unknown')
    languages = target_market.get('language_codes', ['en'])

    target_industry = old_config.get('target_industry', 'Unknown')

    # Geographic data - handle both old and new formats
    geographic = old_config.get('geographic', {})
    geographic_priorities = old_config.get('geographic_priorities', {})

    # Use geographic_priorities if available (new format)
    priority_high = geographic_priorities.get('high', geographic.get('priority_high', []))
    priority_medium = geographic_priorities.get('medium', geographic.get('priority_medium', []))

    # Handle exclusions - new format uses nested structure
    exclusions = old_config.get('exclusions', {})
    excluded = exclusions.get('excluded_country_domains', geographic.get('excluded_countries', []))

    # Industry keywords - handle both old and new formats
    industry_kw = old_config.get('industry_keywords', {})
    keywords = old_config.get('keywords', {})

    # Map new keywords format to old format
    if keywords and not industry_kw:
        # Get first category as primary keywords (e.g., 'hydraulic_cylinders')
        categories = list(keywords.keys())
        primary_category = categories[0] if categories else None

        if primary_category and primary_category != 'oem_indicators':
            industry_kw['primary_positive'] = keywords.get(primary_category, [])

        # Get 'applications' or second category as secondary
        if 'applications' in keywords:
            industry_kw['secondary_positive'] = keywords.get('applications', [])
        elif len(categories) > 1:
            industry_kw['secondary_positive'] = keywords.get(categories[1], [])

        # Get OEM indicators
        if 'oem_indicators' in keywords:
            industry_kw['oem_indicators'] = keywords.get('oem_indicators', [])

    # Negative keywords - extract from exclusions.excluded_industries
    negative_kw = old_config.get('negative_keywords', [])
    if not negative_kw and 'excluded_industries' in exclusions:
        # Flatten all excluded industry keywords
        for category, terms in exclusions['excluded_industries'].items():
            negative_kw.extend(terms)

    # Get scoring config - use from config if available, otherwise defaults
    scoring_config = old_config.get('scoring', {})
    weights = scoring_config.get('weights', {
        "email_quality": 0.10,
        "company_relevance": 0.45,
        "geographic_priority": 0.30,
        "engagement": 0.15
    })
    thresholds = scoring_config.get('thresholds', {
        "high_priority": 100,
        "medium_priority": 50,
        "low_priority": 10
    })

    # Convert to new format
    new_config = {
        "metadata": {
            "id": config_name,
            "name": filter_name,
            "description": description,
            "version": version,
            "author": "system",
            "created": datetime.now().isoformat(),
            "updated": datetime.now().isoformat()
        },
        "target": {
            "country": target_country,
            "industry": target_industry,
            "languages": languages
        },
        "scoring": {
            "weights": weights,
            "thresholds": thresholds
        },
        "company_keywords": {
            "primary_keywords": {
                "positive": [
                    {"term": term, "weight": 1.0}
                    for term in industry_kw.get('primary_positive', [])[:10]  # Limit to 10
                ],
                "negative": [
                    {"term": term, "weight": 0.5}
                    for term in (industry_kw.get('primary_negative', []) + negative_kw)[:10]
                ]
            },
            "secondary_keywords": {
                "positive": industry_kw.get('secondary_positive', [])[:10],
                "negative": industry_kw.get('secondary_negative', [])[:10]
            }
        },
        "geographic_rules": {
            "target_regions": priority_high[:20],  # Limit to 20
            "exclude_regions": excluded[:20],
            "multipliers": {
                target_country: 2.0,
                "EU": 1.2,
                "Others": 0.3
            }
        },
        "email_quality": {
            "corporate_domains": True,
            "free_email_penalty": -0.3,
            "structure_quality": True,
            "suspicious_patterns": []
        },
        "domain_rules": {
            "oemEquipment": {
                "keywords": industry_kw.get('oem_indicators', [])[:10],
                "multiplier": 1.3
            }
        }
    }

    return new_config


def main():
    """Test the converter with actual config files"""
    configs_dir = Path('configs')

    print("🧪 Testing Template Converter\n")
    print(f"📂 Loading configs from: {configs_dir.absolute()}\n")

    if not configs_dir.exists():
        print(f"❌ Directory not found: {configs_dir}")
        return

    templates_loaded = 0
    templates_failed = 0

    for config_file in configs_dir.glob('*.json'):
        config_name = config_file.stem

        # Skip user_templates.json
        if config_name == 'user_templates':
            continue

        try:
            print(f"📄 Processing: {config_file.name}")

            with open(config_file, 'r', encoding='utf-8') as f:
                old_config = json.load(f)

            # Convert
            new_config = convert_old_to_new_format(old_config, config_name)

            # Validate key fields
            assert 'metadata' in new_config, "Missing metadata"
            assert 'target' in new_config, "Missing target"
            assert 'scoring' in new_config, "Missing scoring"

            print(f"  ✅ Name: {new_config['metadata']['name']}")
            print(f"  ✅ Country: {new_config['target']['country']}")
            print(f"  ✅ Industry: {new_config['target']['industry']}")
            print(f"  ✅ Languages: {', '.join(new_config['target']['languages'])}")
            print(f"  ✅ Primary Keywords: {len(new_config['company_keywords']['primary_keywords']['positive'])} positive")
            print(f"  ✅ Secondary Keywords: {len(new_config['company_keywords']['secondary_keywords']['positive'])} positive")
            print()

            templates_loaded += 1

        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
            print()
            templates_failed += 1

    print("=" * 60)
    print(f"✅ Successfully converted: {templates_loaded}")
    print(f"❌ Failed: {templates_failed}")
    print(f"📊 Total: {templates_loaded + templates_failed}")

    if templates_loaded > 0:
        print("\n✅ Template converter is working correctly!")
    else:
        print("\n❌ Template converter has errors!")


if __name__ == '__main__':
    main()
