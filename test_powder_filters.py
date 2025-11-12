#!/usr/bin/env python3
"""
Тестовый скрипт для проверки исправлений в Powder Metal фильтрах

Проверяет что известные проблемные домены теперь правильно исключаются
"""

import sys
from pathlib import Path

# Добавляем путь к smart_filters
sys.path.insert(0, str(Path(__file__).parent))

from smart_filters.czech_powder_metal_filter import CzechPMHardExclusionFilter
from smart_filters.poland_powder_metal_filter import PolandPMHardExclusionFilter
import json


def test_czech_filter():
    """Тестирует Czech фильтр на известных проблемных доменах"""
    print("=" * 80)
    print("ТЕСТ CZECH POWDER METAL FILTER")
    print("=" * 80)

    # Загружаем конфиг
    config_path = Path(__file__).parent / "smart_filters" / "configs" / "czech_powder_metal.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    filter_obj = CzechPMHardExclusionFilter(config)

    # Проблемные домены из расследования
    test_cases = [
        # Universities
        ("info@upol.cz", "Univerzita Palackého v Olomouci", "University", "upol.cz", "educational_domain"),

        # Medical institutions
        ("info@ikem.cz", "Institut klinické medicíny", "Medical research", "ikem.cz", "medical_domain"),
        ("pacient@privamed.cz", "Privamed clinic", "Private clinic", "privamed.cz", "medical_domain OR medical_prefix"),
        ("info@nmskb.cz", "Nemocnice Mladá Boleslav", "Hospital", "nmskb.cz", "medical_domain"),
        ("sekretariat@bulovka.cz", "Nemocnice Bulovka", "Hospital", "bulovka.cz", "medical_domain"),

        # Government
        ("info@sosasou.cz", "Správa silnic Ašsko", "Road Administration", "sosasou.cz", "government_domain"),

        # Good domains (should NOT be excluded)
        ("info@pmtech.cz", "PM Technology s.r.o.", "Powder metallurgy manufacturer", "pmtech.cz", "NOT_EXCLUDED"),
        ("sales@metalurgie.cz", "Metalurgie Praha", "Metallurgy company", "metalurgie.cz", "NOT_EXCLUDED"),
    ]

    passed = 0
    failed = 0

    for email, company, description, domain, expected in test_cases:
        result = filter_obj.should_exclude(email, company, description, domain)
        should_exclude = result['should_exclude']
        reasons = result['reasons']

        # Проверяем ожидание
        if expected == "NOT_EXCLUDED":
            success = not should_exclude
        else:
            success = should_exclude and any(exp in ' '.join(reasons) for exp in expected.split(" OR "))

        status = "✅ PASS" if success else "❌ FAIL"

        if success:
            passed += 1
        else:
            failed += 1

        print(f"\n{status}")
        print(f"  Email: {email}")
        print(f"  Domain: {domain}")
        print(f"  Expected: {expected}")
        print(f"  Excluded: {should_exclude}")
        print(f"  Reasons: {reasons}")

    print(f"\n{'=' * 80}")
    print(f"Czech Filter Results: {passed} PASSED, {failed} FAILED")
    print(f"{'=' * 80}\n")

    return passed, failed


def test_poland_filter():
    """Тестирует Poland фильтр на известных проблемных доменах"""
    print("=" * 80)
    print("ТЕСТ POLAND POWDER METAL FILTER")
    print("=" * 80)

    # Загружаем конфиг
    config_path = Path(__file__).parent / "smart_filters" / "configs" / "poland_powder_metal.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    filter_obj = PolandPMHardExclusionFilter(config)

    # Проблемные домены из расследования
    test_cases = [
        # Medical institutions
        ("sekretariat@szpital-raciborz.org", "Szpital Powiatowy w Raciborzu", "Hospital", "szpital-raciborz.org", "medical_domain"),
        ("zaklad.rtg@imid.med.pl", "Medical equipment", "Medical diagnostics", "imid.med.pl", "medical_domain"),
        ("diagnomed@diag.pl", "Diagnostyka Sp. z o.o.", "Diagnostics", "diag.pl", "medical_domain"),
        ("rejestracja01@usdk.pl", "Medical Center", "Healthcare", "usdk.pl", "healthcare"),  # by keywords
        ("place@onkologia.bielsko.pl", "Onkology Center", "Cancer treatment", "onkologia.bielsko.pl", "medical_domain OR healthcare"),
        ("verdent@verdent.pl", "Verdent", "Dentistry", "verdent.pl", "healthcare"),  # by keywords

        # Government
        ("sekretariat@gmina.polkowice.pl", "Gmina Polkowice", "Municipality", "gmina.polkowice.pl", "government_domain"),
        ("biblioteka.skape@gminachelmza.pl", "Municipal Library", "Government library", "gminachelmza.pl", "government_domain"),

        # Finance (lombard)
        ("kontakt@loombard.pl", "Lombard", "Pawn shop", "loombard.pl", "finance"),  # by keywords

        # Good domains (should NOT be excluded)
        ("info@pmpoland.pl", "PM Poland Sp. z o.o.", "Powder metallurgy manufacturer", "pmpoland.pl", "NOT_EXCLUDED"),
        ("sales@metalurgia.pl", "Metalurgia Polska", "Metallurgy company", "metalurgia.pl", "NOT_EXCLUDED"),
    ]

    passed = 0
    failed = 0

    for email, company, description, domain, expected in test_cases:
        result = filter_obj.should_exclude(email, company, description, domain)
        should_exclude = result['should_exclude']
        reasons = result['reasons']

        # Проверяем ожидание
        if expected == "NOT_EXCLUDED":
            success = not should_exclude
        else:
            success = should_exclude and any(exp in ' '.join(reasons) for exp in expected.split(" OR "))

        status = "✅ PASS" if success else "❌ FAIL"

        if success:
            passed += 1
        else:
            failed += 1

        print(f"\n{status}")
        print(f"  Email: {email}")
        print(f"  Domain: {domain}")
        print(f"  Expected: {expected}")
        print(f"  Excluded: {should_exclude}")
        print(f"  Reasons: {reasons}")

    print(f"\n{'=' * 80}")
    print(f"Poland Filter Results: {passed} PASSED, {failed} FAILED")
    print(f"{'=' * 80}\n")

    return passed, failed


def main():
    """Запускает все тесты"""
    print("\n" + "=" * 80)
    print("ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ POWDER METAL ФИЛЬТРОВ")
    print("=" * 80 + "\n")

    czech_passed, czech_failed = test_czech_filter()
    poland_passed, poland_failed = test_poland_filter()

    total_passed = czech_passed + poland_passed
    total_failed = czech_failed + poland_failed

    print("\n" + "=" * 80)
    print("ИТОГОВЫЕ РЕЗУЛЬТАТЫ")
    print("=" * 80)
    print(f"Total Tests: {total_passed + total_failed}")
    print(f"✅ PASSED: {total_passed}")
    print(f"❌ FAILED: {total_failed}")
    print("=" * 80 + "\n")

    if total_failed == 0:
        print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        return 0
    else:
        print(f"⚠️  {total_failed} ТЕСТОВ НЕ ПРОШЛИ")
        return 1


if __name__ == "__main__":
    sys.exit(main())
