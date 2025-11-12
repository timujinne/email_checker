#!/usr/bin/env python3
"""
Извлечение доменов из ДВУХ источников:
1. processing_cache_final.db (491K email) - извлекаем домены из email адресов
2. metadata.db (метаданные) - берём домены из колонки domain

Объединяем результаты для максимального покрытия
"""

import sqlite3
from pathlib import Path
from typing import Set, Dict

# Список популярных email-провайдеров для исключения
COMMON_EMAIL_PROVIDERS = {
    # Международные
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'yahoo.de', 'yahoo.fr', 'yahoo.co.uk', 'yahoo.it',
    'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com',
    'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'fastmail.com', 'tutanota.com',
    'me.com', 'mac.com', 'msn.com', 't-online.de', 'freenet.de',
    'orange.fr', 'free.fr', 'laposte.net', 'wanadoo.fr', 'sfr.fr',
    'libero.it', 'virgilio.it', 'alice.it', 'tim.it', 'tiscali.it',
    'interia.pl', 'o2.pl', 'wp.pl', 'onet.pl', 'gazeta.pl',
    'seznam.cz', 'centrum.cz', 'email.cz', 'post.cz',
    'bluewin.ch', 'sunrise.ch', 'hispeed.ch',
    'qq.com', '163.com', '126.com', 'sina.com',

    # Российские и СНГ
    'mail.ru', 'yandex.ru', 'ya.ru', 'yandex.com', 'yandex.kz', 'yandex.by',
    'bk.ru', 'inbox.ru', 'list.ru', 'internet.ru', 'rambler.ru',
    'yandex.ua',

    # Беларусь
    'tut.by', 'mail.by',

    # Казахстан
    'mail.kz', 'inbox.kz',

    # Украина
    'ukr.net', 'i.ua', 'meta.ua', 'bigmir.net', 'email.ua'
}

# Русскоязычные доменные зоны
RUSSIAN_SPEAKING_ZONES = {
    '.ru', '.рф', '.su',
    '.by', '.бел',
    '.kz', '.қаз',
    '.kg'
}

# Украинские доменные зоны (исключать)
UKRAINIAN_ZONES = {
    '.ua', '.укр'
}


def extract_domain_from_email(email: str) -> str:
    """Извлекает домен из email адреса"""
    try:
        parts = email.lower().strip().split('@')
        if len(parts) == 2:
            return parts[1]
    except:
        pass
    return ""


def extract_domains_from_cache(db_path: str = ".cache/processing_cache_final.db") -> Set[str]:
    """Извлекает домены из email адресов в кеше"""
    db_file = Path(db_path)
    if not db_file.exists():
        print(f"⚠️  База кеша не найдена: {db_path}")
        return set()

    print(f"\n📂 ИСТОЧНИК 1: База кеша ({db_path})")
    print(f"   Размер: {db_file.stat().st_size / (1024*1024):.2f} MB")

    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM processed_emails")
    total_emails = cursor.fetchone()[0]
    print(f"   Email адресов: {total_emails:,}")

    print(f"   Извлекаем домены из email...")
    cursor.execute("SELECT DISTINCT email FROM processed_emails")

    domains = set()
    for row in cursor.fetchall():
        domain = extract_domain_from_email(row[0])
        if domain:
            domains.add(domain)

    conn.close()
    print(f"   ✅ Найдено {len(domains):,} уникальных доменов")
    return domains


def extract_domains_from_metadata(db_path: str = "metadata.db") -> Set[str]:
    """Извлекает домены из колонки domain в metadata.db"""
    db_file = Path(db_path)
    if not db_file.exists():
        print(f"⚠️  База метаданных не найдена: {db_path}")
        return set()

    print(f"\n📂 ИСТОЧНИК 2: База метаданных ({db_path})")
    print(f"   Размер: {db_file.stat().st_size / (1024*1024):.2f} MB")

    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM email_metadata")
    total_rows = cursor.fetchone()[0]
    print(f"   Записей с метаданными: {total_rows:,}")

    # Извлекаем домены из колонки domain
    print(f"   Извлекаем из колонки 'domain'...")
    cursor.execute("""
        SELECT DISTINCT domain
        FROM email_metadata
        WHERE domain IS NOT NULL AND domain != ''
    """)

    domains_from_column = set()
    for row in cursor.fetchall():
        domain = row[0].lower().strip()
        if domain:
            domains_from_column.add(domain)

    print(f"   ✅ Из колонки 'domain': {len(domains_from_column):,} доменов")

    # Также извлекаем домены из email адресов (на случай если domain пустой)
    print(f"   Извлекаем из колонки 'email'...")
    cursor.execute("""
        SELECT DISTINCT email
        FROM email_metadata
        WHERE email IS NOT NULL AND email != ''
    """)

    domains_from_email = set()
    for row in cursor.fetchall():
        domain = extract_domain_from_email(row[0])
        if domain:
            domains_from_email.add(domain)

    print(f"   ✅ Из колонки 'email': {len(domains_from_email):,} доменов")

    conn.close()

    # Объединяем домены из обеих колонок
    all_domains = domains_from_column | domains_from_email
    print(f"   📊 Всего уникальных: {len(all_domains):,} доменов")

    return all_domains


def filter_russian_speaking_domains(domains: Set[str]) -> Set[str]:
    """Фильтрует домены, оставляя только из русскоязычных стран"""
    filtered = set()

    for domain in domains:
        domain_lower = domain.lower()

        # Исключаем провайдеры
        if domain_lower in COMMON_EMAIL_PROVIDERS:
            continue

        # Исключаем украинские
        if any(domain_lower.endswith(zone) for zone in UKRAINIAN_ZONES):
            continue

        # Оставляем русскоязычные
        if any(domain_lower.endswith(zone) for zone in RUSSIAN_SPEAKING_ZONES):
            filtered.add(domain)

    return filtered


def get_domain_statistics(domains: Set[str]) -> Dict[str, int]:
    """Статистика по доменным зонам"""
    stats = {}
    for domain in domains:
        domain_lower = domain.lower()
        for zone in RUSSIAN_SPEAKING_ZONES:
            if domain_lower.endswith(zone):
                stats[zone] = stats.get(zone, 0) + 1
                break
    return stats


def save_domains(domains: Set[str], base_filename: str):
    """Сохраняет домены в файлы"""
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    # Общий файл
    output_file = output_dir / f"{base_filename}.txt"
    sorted_domains = sorted(domains)

    with open(output_file, 'w', encoding='utf-8') as f:
        for domain in sorted_domains:
            f.write(f"{domain}\n")

    print(f"\n💾 Сохранено в: {output_file}")
    print(f"   Всего доменов: {len(domains):,}")

    # По зонам
    zones_dir = output_dir / f"{base_filename}_by_zone"
    zones_dir.mkdir(exist_ok=True)

    zones = {}
    for domain in domains:
        for zone in RUSSIAN_SPEAKING_ZONES:
            if domain.lower().endswith(zone):
                zone_name = zone.lstrip('.')
                if zone_name not in zones:
                    zones[zone_name] = []
                zones[zone_name].append(domain)
                break

    print(f"\n📁 Сохранено по зонам в: {zones_dir}/")
    for zone, zone_domains in sorted(zones.items(), key=lambda x: len(x[1]), reverse=True):
        zone_file = zones_dir / f"domains_{zone}.txt"
        with open(zone_file, 'w', encoding='utf-8') as f:
            for domain in sorted(zone_domains):
                f.write(f"{domain}\n")
        print(f"   • {zone_file.name}: {len(zone_domains):,} доменов")


def main():
    print("=" * 80)
    print("🌍 ИЗВЛЕЧЕНИЕ ДОМЕНОВ ИЗ ВСЕХ ИСТОЧНИКОВ")
    print("=" * 80)

    # 1. Извлекаем из кеша (email адреса)
    cache_domains = extract_domains_from_cache()

    # 2. Извлекаем из metadata (колонка domain + email)
    metadata_domains = extract_domains_from_metadata()

    # 3. Объединяем
    print(f"\n🔗 ОБЪЕДИНЕНИЕ РЕЗУЛЬТАТОВ:")
    all_domains = cache_domains | metadata_domains
    print(f"   • Из кеша: {len(cache_domains):,} доменов")
    print(f"   • Из metadata: {len(metadata_domains):,} доменов")
    print(f"   • Общих: {len(cache_domains & metadata_domains):,} доменов")
    print(f"   • Всего уникальных: {len(all_domains):,} доменов")

    # 4. Фильтруем
    print(f"\n🔧 ПРИМЕНЕНИЕ ФИЛЬТРОВ:")
    print(f"   • Исключаем {len(COMMON_EMAIL_PROVIDERS)} популярных провайдеров")
    print(f"   • Зоны: {', '.join(sorted(RUSSIAN_SPEAKING_ZONES))}")
    print(f"   • Исключаем: {', '.join(sorted(UKRAINIAN_ZONES))}")

    filtered_domains = filter_russian_speaking_domains(all_domains)

    # 5. Статистика
    print(f"\n📊 РЕЗУЛЬТАТЫ:")
    print(f"   • Всего доменов: {len(all_domains):,}")
    print(f"   • После фильтрации: {len(filtered_domains):,}")
    print(f"   • Исключено: {len(all_domains) - len(filtered_domains):,}")

    zone_stats = get_domain_statistics(filtered_domains)
    print(f"\n📈 По доменным зонам:")
    for zone, count in sorted(zone_stats.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(filtered_domains) * 100) if filtered_domains else 0
        print(f"   • {zone:8s}: {count:8,d} доменов ({pct:5.1f}%)")

    # 6. Сохраняем
    save_domains(filtered_domains, "russian_domains_combined")

    print("\n" + "=" * 80)
    print("✅ ГОТОВО!")
    print("=" * 80)


if __name__ == "__main__":
    main()
