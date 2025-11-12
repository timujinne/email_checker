#!/usr/bin/env python3
"""
Создание специализированного фильтра для французского рынка порошковой металлургии
"""

import json
import sys
from pathlib import Path

# Добавляем родительскую директорию в путь для импортов
sys.path.append(str(Path(__file__).parent))

from filter_generator import FilterGenerator

def create_france_powder_metal_filter():
    """Создает фильтр для Франции порошок"""

    print("🇫🇷 Создание фильтра для французского рынка порошковой металлургии")
    print("=" * 60)

    # Инициализация генератора
    generator = FilterGenerator()

    # Параметры фильтра
    filter_name = "france_powder_metal"
    country_code = "FR"
    industry = "powder_metal"  # Кастомная индустрия
    languages = ["fr", "en"]

    print(f"🎯 Конфигурация:")
    print(f"   Страна: {country_code} (Франция)")
    print(f"   Индустрия: {industry} (Порошковая металлургия)")
    print(f"   Языки: {', '.join(languages)}")
    print(f"   Название фильтра: {filter_name}")

    # Данные для Франции
    country_data = {
        "name": "France",
        "languages": ["fr", "en"],
        "industries": ["powder_metal", "manufacturing", "automotive"]
    }

    # Создание шаблона для порошковой металлургии
    template = {
        "common_keywords": {
            "primary": [
                # Французские термины
                "métallurgie poudre", "poudre métallique", "compression",
                "frittage", "compaction", "poudres métalliques",
                "pièces frittées", "métaux poudre", "procédé poudre",

                # Английские термины
                "powder metallurgy", "powder metal", "compaction",
                "sintering", "compression", "metal powders",
                "sintered parts", "powder process"
            ],
            "secondary": [
                # Французские
                "pressage isostatique", "infiltration", "moulage par injection",
                "alliages poudre", "densification", "fabrication additive",

                # Английские
                "isostatic pressing", "infiltration", "metal injection molding",
                "powder alloys", "densification", "additive manufacturing"
            ],
            "processes": [
                # Французские
                "frittage", "compression", "moulage", "traitement thermique",

                # Английские
                "sintering", "compaction", "molding", "heat treatment"
            ],
            "applications": [
                # Французские
                "automobile", "aéronautique", "médical", "outillage",

                # Английские
                "automotive", "aerospace", "medical", "tooling"
            ]
        }
    }

    # Создание конфигурации
    config = generator._build_config(
        filter_name=filter_name,
        country_code=country_code,
        industry=industry,
        languages=languages,
        template=template
    )

    # Специфическая настройка для порошковой металлургии
    config.update({
        "filter_name": "France Powder Metallurgy Filter",
        "version": "1.0.0",
        "description": "Smart filter for French powder metallurgy market",
        "target_market": {
            "country_code": "FR",
            "country_name": "France",
            "language_codes": ["fr", "en"],
            "primary_language": "fr",
            "market_maturity": "established",
            "estimated_companies": 300
        },
        "quality_targets": {
            "high_priority_max_percent": 8,
            "high_priority_min_relevance": 95,
            "medium_priority_range": [5, 15],
            "processing_speed_target": 200
        },
        "geographic": {
            "priority_high": [
                "france", ".fr", "france",
                "paris", "lyon", "marseille", "toulouse", "nice",
                "saint-étienne", "grenoble", "nantes", "strasbourg",
                "région parisienne", "auvergne-rhône-alpes", "provence-alpes-côte d'azur"
            ],
            "priority_medium": [
                "belgium", ".be", "switzerland", ".ch", "luxembourg", ".lu",
                "europe", "eu"
            ],
            "excluded_countries": [
                ".cn", ".com.cn", ".ru", ".by", ".ua",
                ".in", ".co.in", ".tr", ".com.tr",
                ".br", ".com.br"
            ]
        },
        "industry_keywords": {
            "powder_metal_fr": [
                "métallurgie poudre", "poudre métallique", "compression poudre",
                "frittage industriel", "compaction isostatique", "pièces frittées",
                "poudres métalliques", "procédé poudre", "fabrication poudre",
                "pressage poudre", "sinterisation", "infiltration poudre",
                "alliages poudre", "métal poudre", "technologie poudre"
            ],
            "powder_metal_en": [
                "powder metallurgy", "metal powder", "powder compaction",
                "industrial sintering", "isostatic compaction", "sintered components",
                "metal powders", "powder processing", "powder fabrication",
                "powder pressing", "sintering", "powder infiltration",
                "powder alloys", "powder metal technology"
            ],
            "applications_fr": [
                "automobile", "automotive supplier", "équipementier",
                "aéronautique", "aerospace supplier", "médical",
                "outillage", "tooling", "biens d'équipement",
                "machine industrielle", "industrial equipment"
            ],
            "applications_en": [
                "automotive", "automotive supplier", "equipment",
                "aerospace", "aerospace supplier", "medical devices",
                "tooling", "capital goods", "industrial machinery",
                "manufacturing equipment"
            ],
            "processes_fr": [
                "frittage", "compression", "moulage", "traitement thermique",
                "pressage", "cuisson", "densification", "finition"
            ],
            "processes_en": [
                "sintering", "compaction", "molding", "heat treatment",
                "pressing", "sintering cycle", "densification", "finishing"
            ],
            "negative_keywords": [
                "retail", "commerce de détail", "vente en ligne",
                "education", "formation", "université",
                "services", "consulting", "conseil",
                "distribution", "import", "export",
                "retail", "e-commerce", "online shop"
            ]
        },
        "hard_exclusions": {
            "personal_domains": [
                "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "icloud.com", "me.com", "mac.com",
                "orange.fr", "sfr.fr", "free.fr", "bbox.fr",
                "numericable.fr", "laposte.net", "wanadoo.fr"
            ],
            "hr_prefixes": {
                "fr": ["rh@", "emploi@", "carrière@", "candidat@", "recrutement@"],
                "en": ["hr@", "jobs@", "careers@", "recruitment@"]
            },
            "service_prefixes": [
                "noreply@", "no-reply@", "donotreply@",
                "admin@", "webmaster@", "postmaster@"
            ],
            "excluded_industries": {
                "retail": ["commerce de détail", "boutique", "magasin", "vente"],
                "services": ["services", "consulting", "conseil", "formation"],
                "distribution": ["distribution", "import", "export"]
            },
            "french_company_suffixes": ["sa", "sarl", "eurl", "snc", "sca"]
        },
        "scoring": {
            "weights": {
                "email_quality": 0.10,
                "company_relevance": 0.45,
                "geographic_priority": 0.30,
                "engagement": 0.15
            },
            "thresholds": {
                "high_priority": 110,  # Консервативный подход для качества
                "medium_priority": 50,
                "low_priority": 10
            },
            "bonus_multipliers": {
                "powder_metal_expert": 1.5,
                "french_company": 1.3,
                "target_geography": 2.0,
                "technical_domain": 1.2
            }
        }
    })

    # Сохранение конфигурации
    configs_dir = generator.root_dir / "smart_filters" / "configs"
    config_file = configs_dir / f"{filter_name}_config.json"

    config_file.parent.mkdir(parents=True, exist_ok=True)

    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print(f"✅ Конфигурация сохранена: {config_file}")

    # Применение blocklist insights
    generator._apply_blocklist_insights(filter_name)

    # Валидация созданного фильтра
    print("\n🧪 Валидация созданного фильтра...")
    from filter_validator import FilterValidator

    validator = FilterValidator()
    validation_result = validator.validate_filter(filter_name)

    if validation_result["success"]:
        print(f"✅ Фильтр успешно валидирован!")
        print(f"   Quality Score: {validation_result['quality_score']}/100")
        if validation_result["warnings"]:
            print(f"⚠️  Предупреждения:")
            for warning in validation_result["warnings"]:
                print(f"   • {warning}")
    else:
        print(f"❌ Валидация не пройдена:")
        for error in validation_result["errors"]:
            print(f"   • {error}")

    print(f"\n📝 Следующие шаги:")
    print(f"1. Тестирование фильтра:")
    print(f"   python3 filter_validator.py --test {filter_name}")
    print(f"2. Применение к списку:")
    print(f"   cd ..")
    print(f"   python3 email_checker.py check-lvp input/Франция\ порошок.lvp --config {filter_name}")
    print(f"3. Смарт-фильтрация:")
    print(f"   python3 email_checker.py smart-filter output/Франция_порошок_lvp_clean.txt --config {filter_name}")

    return filter_name

if __name__ == "__main__":
    create_france_powder_metal_filter()