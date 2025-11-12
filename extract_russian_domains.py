#!/usr/bin/env python3
"""
Извлечение списка доменов из базы метаданных email с фильтрацией

Фильтры:
- Исключает популярные email-провайдеры (Gmail, Yandex, Mail.ru и т.д.)
- Оставляет только домены из русскоязычных стран:
  * Россия (.ru, .рф)
  * Беларусь (.by, .бел)
  * Казахстан (.kz, .қаз)
  * Кыргызстан (.kg)
  * Другие русскоязычные страны
- Исключает Украину (.ua, .укр)
"""

import sqlite3
from pathlib import Path
from typing import Set, List
import re

# Список популярных email-провайдеров для исключения
COMMON_EMAIL_PROVIDERS = {
    # Международные
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com',
    'gmx.com', 'gmx.net', 'web.de', 'fastmail.com', 'tutanota.com',
    'me.com', 'mac.com', 'msn.com',

    # Российские и СНГ
    'mail.ru', 'yandex.ru', 'ya.ru', 'yandex.com', 'yandex.kz', 'yandex.by',
    'bk.ru', 'inbox.ru', 'list.ru', 'internet.ru', 'rambler.ru',
    'yandex.ua',  # оставляем в списке исключений несмотря на .ua

    # Беларусь
    'tut.by', 'mail.by',

    # Казахстан
    'mail.kz', 'inbox.kz',

    # Украина (все украинские провайдеры)
    'ukr.net', 'i.ua', 'meta.ua', 'bigmir.net', 'email.ua'
}

# Русскоязычные доменные зоны (включать)
RUSSIAN_SPEAKING_ZONES = {
    # Россия
    '.ru', '.рф', '.su',

    # Беларусь
    '.by', '.бел',

    # Казахстан
    '.kz', '.қаз',

    # Кыргызстан
    '.kg'
}

# Украинские доменные зоны (исключать)
UKRAINIAN_ZONES = {
    '.ua', '.укр'
}


def extract_domains_from_database(db_path: str = "metadata.db") -> Set[str]:
    """
    Извлекает все уникальные домены из базы данных

    Args:
        db_path: Путь к базе данных метаданных

    Returns:
        Set с уникальными доменами
    """
    db_file = Path(db_path)

    if not db_file.exists():
        print(f"❌ База данных не найдена: {db_path}")
        return set()

    print(f"📂 Открываем базу данных: {db_path}")
    print(f"📊 Размер БД: {db_file.stat().st_size / (1024*1024):.2f} MB")

    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()

    # Получаем все уникальные домены
    print("\n🔍 Извлекаем уникальные домены...")
    cursor.execute("""
        SELECT DISTINCT domain
        FROM email_metadata
        WHERE domain IS NOT NULL AND domain != ''
        ORDER BY domain
    """)

    domains = set()
    for row in cursor.fetchall():
        domain = row[0].lower().strip()
        if domain:
            domains.add(domain)

    conn.close()

    print(f"✅ Найдено {len(domains)} уникальных доменов в базе")
    return domains


def filter_russian_speaking_domains(domains: Set[str]) -> Set[str]:
    """
    Фильтрует домены, оставляя только из русскоязычных стран

    Args:
        domains: Набор всех доменов

    Returns:
        Отфильтрованный набор доменов
    """
    filtered = set()

    for domain in domains:
        domain_lower = domain.lower()

        # Исключаем популярные email-провайдеры
        if domain_lower in COMMON_EMAIL_PROVIDERS:
            continue

        # Проверяем, что домен не из украинских зон
        is_ukrainian = any(domain_lower.endswith(zone) for zone in UKRAINIAN_ZONES)
        if is_ukrainian:
            continue

        # Проверяем, что домен из русскоязычных зон
        is_russian_speaking = any(domain_lower.endswith(zone) for zone in RUSSIAN_SPEAKING_ZONES)
        if is_russian_speaking:
            filtered.add(domain)

    return filtered


def get_domain_statistics(domains: Set[str]) -> dict:
    """
    Собирает статистику по доменным зонам

    Args:
        domains: Набор доменов

    Returns:
        Словарь со статистикой по зонам
    """
    stats = {}

    for domain in domains:
        domain_lower = domain.lower()

        # Определяем зону
        zone = None
        for russian_zone in RUSSIAN_SPEAKING_ZONES:
            if domain_lower.endswith(russian_zone):
                zone = russian_zone
                break

        if zone:
            stats[zone] = stats.get(zone, 0) + 1

    return stats


def save_domains_to_file(domains: Set[str], output_path: str = "output/russian_domains.txt"):
    """
    Сохраняет домены в файл

    Args:
        domains: Набор доменов
        output_path: Путь к выходному файлу
    """
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Сортируем домены
    sorted_domains = sorted(domains)

    with open(output_file, 'w', encoding='utf-8') as f:
        for domain in sorted_domains:
            f.write(f"{domain}\n")

    print(f"\n💾 Домены сохранены в: {output_path}")
    print(f"📊 Всего доменов: {len(domains)}")


def save_domains_by_zone(domains: Set[str], output_dir: str = "output/domains_by_zone"):
    """
    Сохраняет домены в отдельные файлы по доменным зонам

    Args:
        domains: Набор доменов
        output_dir: Директория для выходных файлов
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Группируем домены по зонам
    zones = {}
    for domain in domains:
        domain_lower = domain.lower()

        zone = None
        for russian_zone in RUSSIAN_SPEAKING_ZONES:
            if domain_lower.endswith(russian_zone):
                zone = russian_zone.lstrip('.')
                break

        if zone:
            if zone not in zones:
                zones[zone] = []
            zones[zone].append(domain)

    # Сохраняем каждую зону в отдельный файл
    print(f"\n📁 Сохраняем домены по зонам в: {output_dir}/")
    for zone, zone_domains in zones.items():
        zone_file = output_path / f"domains_{zone}.txt"
        sorted_domains = sorted(zone_domains)

        with open(zone_file, 'w', encoding='utf-8') as f:
            for domain in sorted_domains:
                f.write(f"{domain}\n")

        print(f"   • {zone_file.name}: {len(zone_domains)} доменов")


def main():
    """Основная функция"""
    print("=" * 70)
    print("🌍 ИЗВЛЕЧЕНИЕ ДОМЕНОВ ИЗ РУССКОЯЗЫЧНЫХ СТРАН")
    print("=" * 70)

    # 1. Извлекаем все домены из базы
    all_domains = extract_domains_from_database()

    if not all_domains:
        print("❌ Домены не найдены в базе данных")
        return

    # 2. Фильтруем домены
    print(f"\n🔧 Применяем фильтры...")
    print(f"   • Исключаем {len(COMMON_EMAIL_PROVIDERS)} популярных провайдеров")
    print(f"   • Оставляем домены из зон: {', '.join(sorted(RUSSIAN_SPEAKING_ZONES))}")
    print(f"   • Исключаем украинские зоны: {', '.join(sorted(UKRAINIAN_ZONES))}")

    filtered_domains = filter_russian_speaking_domains(all_domains)

    # 3. Статистика
    print(f"\n📊 РЕЗУЛЬТАТЫ:")
    print(f"   • Всего доменов в базе: {len(all_domains)}")
    print(f"   • После фильтрации: {len(filtered_domains)}")
    print(f"   • Исключено: {len(all_domains) - len(filtered_domains)}")

    # Статистика по зонам
    zone_stats = get_domain_statistics(filtered_domains)
    print(f"\n📈 Статистика по доменным зонам:")
    for zone, count in sorted(zone_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {zone:8s}: {count:6,d} доменов")

    # 4. Сохраняем результаты
    if filtered_domains:
        # Общий файл
        save_domains_to_file(filtered_domains, "output/russian_domains.txt")

        # По зонам
        save_domains_by_zone(filtered_domains, "output/domains_by_zone")

    print("\n" + "=" * 70)
    print("✅ ГОТОВО!")
    print("=" * 70)


if __name__ == "__main__":
    main()
