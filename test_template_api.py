#!/usr/bin/env python3
"""
Test the template API response format
"""

import json
from pathlib import Path
from datetime import datetime

def convert_old_to_new_format(old_config, config_name):
    """Convert config - same as in web_server.py"""
    # Extract data from actual config format
    filter_name = old_config.get('display_name', old_config.get('config_name', config_name))
    version = old_config.get('version', '1.0')
    description = old_config.get('description', '')

    # Handle nested target_market structure
    target_market = old_config.get('target_market', {})
    target_country = target_market.get('country_name', 'Unknown')
    languages = target_market.get('language_codes', ['en'])

    target_industry = old_config.get('target_industry', 'Unknown')

    # Geographic data
    geographic = old_config.get('geographic', {})
    geographic_priorities = old_config.get('geographic_priorities', {})
    priority_high = geographic_priorities.get('high', geographic.get('priority_high', []))
    priority_medium = geographic_priorities.get('medium', geographic.get('priority_medium', []))

    # Handle exclusions
    exclusions = old_config.get('exclusions', {})
    excluded = exclusions.get('excluded_country_domains', geographic.get('excluded_countries', []))

    # Industry keywords
    industry_kw = old_config.get('industry_keywords', {})
    keywords = old_config.get('keywords', {})

    if keywords and not industry_kw:
        categories = list(keywords.keys())
        primary_category = categories[0] if categories else None

        if primary_category and primary_category != 'oem_indicators':
            industry_kw['primary_positive'] = keywords.get(primary_category, [])

        if 'applications' in keywords:
            industry_kw['secondary_positive'] = keywords.get('applications', [])
        elif len(categories) > 1:
            industry_kw['secondary_positive'] = keywords.get(categories[1], [])

        if 'oem_indicators' in keywords:
            industry_kw['oem_indicators'] = keywords.get('oem_indicators', [])

    # Negative keywords
    negative_kw = old_config.get('negative_keywords', [])
    if not negative_kw and 'excluded_industries' in exclusions:
        for category, terms in exclusions['excluded_industries'].items():
            negative_kw.extend(terms)

    # Get scoring config
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
                    for term in industry_kw.get('primary_positive', [])[:10]
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
            "target_regions": priority_high[:20],
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


def simulate_api_response():
    """Simulate the /api/templates response"""
    builtin_templates = {}
    configs_dir = Path('configs')

    print("🌐 Simulating /api/templates response\n")

    if configs_dir.exists():
        for config_file in configs_dir.glob('*.json'):
            config_name = config_file.stem

            if config_name == 'user_templates':
                continue

            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    old_config = json.load(f)

                new_config = convert_old_to_new_format(old_config, config_name)
                builtin_templates[config_name] = new_config

            except Exception as e:
                print(f"⚠️ Failed to load {config_file}: {e}")
                continue

    # Simulate API response
    api_response = {
        "builtin": builtin_templates,
        "user": {}
    }

    print(f"📊 API Response Summary:")
    print(f"  Built-in templates: {len(api_response['builtin'])}")
    print(f"  User templates: {len(api_response['user'])}")
    print()

    print("📋 Available Templates:")
    for name, template in api_response['builtin'].items():
        print(f"  • {name}")
        print(f"    Name: {template['metadata']['name']}")
        print(f"    Country: {template['target']['country']}")
        print(f"    Industry: {template['target']['industry']}")
        print()

    # Save to file for inspection
    output_file = Path('test_api_response.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(api_response, f, indent=2, ensure_ascii=False)

    print(f"✅ Full API response saved to: {output_file}")
    print(f"📏 Response size: {output_file.stat().st_size / 1024:.1f} KB")

    return api_response


def main():
    api_response = simulate_api_response()

    print("\n" + "=" * 60)
    print("✅ API simulation completed successfully!")
    print(f"✅ {len(api_response['builtin'])} templates ready to send to frontend")


if __name__ == '__main__':
    main()
