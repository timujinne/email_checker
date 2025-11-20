#!/usr/bin/env python3
"""
Извлечение доменных зон из email'ов БЕЗ метаданных

Задача:
1. Выбрать email'ы без насыщенной мета-информации
2. Фильтровать только постсоветские зоны (RU, BY, KZ и др.)
3. Исключить блок-лист и invalid статус
4. Извлечь только уникальные доменные зоны (без дубликатов)

Постсоветские страны:
- Россия (.ru, .рф, .su)
- Беларусь (.by, .бел)
- Казахстан (.kz, .қаз)
- Кыргызстан (.kg)
- Узбекистан (.uz)
- Таджикистан (.tj)
- Туркменистан (.tm)
- Армения (.am)
- Азербайджан (.az)
- Грузия (.ge)
- Молдова (.md)
"""

import sqlite3
from pathlib import Path
from typing import Set, Dict
import re

# Постсоветские доменные зоны
POST_SOVIET_ZONES = {
    '.ru', '.рф', '.su',      # Россия
    '.by', '.бел',            # Беларусь
    '.kz', '.қаз',            # Казахстан
    '.kg',                    # Кыргызстан
    '.uz',                    # Узбекистан
    '.tj',                    # Таджикистан
    '.tm',                    # Туркменистан
    '.am',                    # Армения
    '.az',                    # Азербайджан
    '.ge',                    # Грузия
    '.md'                     # Молдова
}

# Популярные email-провайдеры (исключаем)
COMMON_EMAIL_PROVIDERS = {
    # Международные
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'yahoo.de', 'yahoo.fr', 'yahoo.co.uk', 'yahoo.it',
    'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com',
    'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'fastmail.com', 'tutanota.com',
    'me.com', 'mac.com', 'msn.com',

    # Российские и СНГ провайдеры
    'mail.ru', 'yandex.ru', 'ya.ru', 'yandex.com', 'yandex.kz', 'yandex.by',
    'bk.ru', 'inbox.ru', 'list.ru', 'internet.ru', 'rambler.ru',
    'tut.by', 'mail.by', 'mail.kz', 'inbox.kz'
}


def load_blocklist() -> Set[str]:
    """Загружает блок-листы email'ов и доменов"""
    blocked = set()

    # Загружаем заблокированные email'ы
    email_blocklist = Path("blocklists/blocked_emails.txt")
    if email_blocklist.exists():
        with open(email_blocklist, 'r', encoding='utf-8') as f:
            for line in f:
                email = line.strip().lower()
                if email:
                    blocked.add(email)

    # Загружаем заблокированные домены
    domain_blocklist = Path("blocklists/blocked_domains.txt")
    if domain_blocklist.exists():
        with open(domain_blocklist, 'r', encoding='utf-8') as f:
            for line in f:
                domain = line.strip().lower()
                if domain:
                    blocked.add(domain)

    return blocked


def extract_domain_from_email(email: str) -> str:
    """Извлекает домен из email адреса"""
    try:
        parts = email.lower().strip().split('@')
        if len(parts) == 2:
            return parts[1]
    except:
        pass
    return ""


def is_valid_email(email: str) -> bool:
    """Проверка валидности email"""
    # Базовая проверка формата
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def is_post_soviet_domain(domain: str) -> bool:
    """Проверяет, относится ли домен к постсоветским зонам"""
    domain_lower = domain.lower()
    return any(domain_lower.endswith(zone) for zone in POST_SOVIET_ZONES)


def is_email_provider(domain: str) -> bool:
    """Проверяет, является ли домен популярным провайдером"""
    return domain.lower() in COMMON_EMAIL_PROVIDERS


def has_metadata(row: tuple) -> bool:
    """
    Проверяет наличие насыщенной мета-информации

    Считаем, что метаданных нет, если пусты ключевые поля:
    - company_name
    - phone
    - address
    - page_title
    """
    # Распаковываем поля
    (email, domain, source_url, page_title, company_name,
     phone, country, city, address, category) = row

    # Проверяем наличие ключевых полей
    has_company = company_name and company_name.strip()
    has_phone = phone and phone.strip()
    has_address = address and address.strip()
    has_title = page_title and page_title.strip()

    # Считаем, что метаданные есть, если заполнено хотя бы одно поле
    return has_company or has_phone or has_address or has_title


def extract_domains_without_metadata(db_path: str = "metadata.db") -> Dict[str, int]:
    """
    Извлекает доменные зоны из email'ов без метаданных

    Returns:
        Словарь: {доменная_зона: количество_уникальных_доменов}
    """
    db_file = Path(db_path)
    if not db_file.exists():
        print(f"❌ База данных не найдена: {db_path}")
        return {}

    print(f"📂 Открываем базу метаданных: {db_path}")
    print(f"📊 Размер БД: {db_file.stat().st_size / (1024*1024):.2f} MB\n")

    # Загружаем блок-листы
    print("🚫 Загружаем блок-листы...")
    blocked = load_blocklist()
    print(f"   Загружено: {len(blocked):,} заблокированных email/доменов\n")

    conn = sqlite3.connect(str(db_file))
    cursor = conn.cursor()

    # Получаем общее количество записей
    cursor.execute("SELECT COUNT(*) FROM email_metadata")
    total_records = cursor.fetchone()[0]
    print(f"📧 Всего записей в БД: {total_records:,}\n")

    # Извлекаем email'ы с их метаданными
    print("🔍 Анализируем email'ы...")
    cursor.execute("""
        SELECT
            email, domain, source_url, page_title, company_name,
            phone, country, city, address, category
        FROM email_metadata
        WHERE email IS NOT NULL AND email != ''
    """)

    # Счетчики
    processed = 0
    without_metadata = 0
    with_metadata = 0
    invalid_emails = 0
    blocked_count = 0
    non_post_soviet = 0
    email_providers = 0

    # Собираем домены (все уникальные домены из постсоветских зон)
    unique_domains = set()

    for row in cursor.fetchall():
        processed += 1
        email = row[0].lower().strip()

        # Прогресс
        if processed % 10000 == 0:
            print(f"   Обработано: {processed:,} / {total_records:,} ({processed/total_records*100:.1f}%)")

        # 1. Проверяем наличие метаданных
        if has_metadata(row):
            with_metadata += 1
            continue  # Пропускаем email'ы С метаданными

        without_metadata += 1

        # 2. Проверяем валидность
        if not is_valid_email(email):
            invalid_emails += 1
            continue

        # 3. Извлекаем домен
        domain = extract_domain_from_email(email)
        if not domain:
            invalid_emails += 1
            continue

        # 4. Проверяем блок-лист
        if email in blocked or domain in blocked:
            blocked_count += 1
            continue

        # 5. Проверяем на провайдера
        if is_email_provider(domain):
            email_providers += 1
            continue

        # 6. Проверяем на постсоветскую зону
        if not is_post_soviet_domain(domain):
            non_post_soviet += 1
            continue

        # ✅ Email прошел все фильтры - добавляем домен
        unique_domains.add(domain)

    conn.close()

    # Группируем домены по зонам
    domains_by_zone = {}
    for domain in unique_domains:
        for zone in POST_SOVIET_ZONES:
            if domain.endswith(zone):
                zone_name = zone.lstrip('.')
                if zone_name not in domains_by_zone:
                    domains_by_zone[zone_name] = set()
                domains_by_zone[zone_name].add(domain)
                break

    # Статистика
    print(f"\n{'='*80}")
    print("📊 СТАТИСТИКА ОБРАБОТКИ:")
    print(f"{'='*80}")
    print(f"Всего записей обработано:        {processed:,}")
    print(f"")
    print(f"✅ БЕЗ метаданных:                {without_metadata:,} ({without_metadata/processed*100:.1f}%)")
    print(f"❌ С метаданными (пропущено):     {with_metadata:,} ({with_metadata/processed*100:.1f}%)")
    print(f"")
    print(f"🚫 Заблокировано (blocklist):     {blocked_count:,}")
    print(f"🚫 Invalid формат:                {invalid_emails:,}")
    print(f"🚫 Email-провайдеры:              {email_providers:,}")
    print(f"🚫 Не постсоветские зоны:         {non_post_soviet:,}")
    print(f"")
    print(f"✅ ИТОГО уникальных доменов:      {len(unique_domains):,}")
    print(f"{'='*80}\n")

    # Статистика по зонам
    print("📈 РАСПРЕДЕЛЕНИЕ ПО ДОМЕННЫМ ЗОНАМ:")
    print(f"{'='*80}")

    zone_counts = {zone: len(domains) for zone, domains in domains_by_zone.items()}
    total_domains = sum(zone_counts.values())

    for zone, count in sorted(zone_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (count / total_domains * 100) if total_domains else 0
        print(f"{zone:10s}: {count:8,d} доменов ({pct:5.1f}%)")

    print(f"{'='*80}\n")

    return domains_by_zone


def save_results(domains_by_zone: Dict[str, Set[str]]):
    """Сохраняет результаты в файлы"""
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    # 1. Общий файл со всеми доменными зонами
    all_zones = set()
    for zone in domains_by_zone.keys():
        all_zones.add(f".{zone}")

    zones_file = output_dir / "POST_SOVIET_ZONES_NO_METADATA.txt"
    with open(zones_file, 'w', encoding='utf-8') as f:
        for zone in sorted(all_zones):
            f.write(f"{zone}\n")

    print(f"💾 Сохранено доменных зон: {zones_file}")
    print(f"   Всего зон: {len(all_zones)}")

    # 2. Общий файл со всеми доменами
    all_domains = set()
    for domains in domains_by_zone.values():
        all_domains.update(domains)

    domains_file = output_dir / "POST_SOVIET_DOMAINS_NO_METADATA.txt"
    with open(domains_file, 'w', encoding='utf-8') as f:
        for domain in sorted(all_domains):
            f.write(f"{domain}\n")

    print(f"\n💾 Сохранено доменов: {domains_file}")
    print(f"   Всего доменов: {len(all_domains):,}")

    # 3. Файлы по зонам
    zones_dir = output_dir / "POST_SOVIET_BY_ZONE_NO_METADATA"
    zones_dir.mkdir(exist_ok=True)

    print(f"\n📁 Сохранено по зонам в: {zones_dir}/")
    for zone, domains in sorted(domains_by_zone.items(), key=lambda x: len(x[1]), reverse=True):
        zone_file = zones_dir / f"domains_{zone}.txt"
        with open(zone_file, 'w', encoding='utf-8') as f:
            for domain in sorted(domains):
                f.write(f"{domain}\n")
        print(f"   • {zone_file.name}: {len(domains):,} доменов")

    print(f"\n{'='*80}")
    print("✅ ВСЕ ФАЙЛЫ СОХРАНЕНЫ!")
    print(f"{'='*80}")


def main():
    """Основная функция"""
    print("=" * 80)
    print("🌍 ИЗВЛЕЧЕНИЕ ДОМЕННЫХ ЗОН ИЗ EMAIL'ОВ БЕЗ МЕТАДАННЫХ")
    print("🇷🇺 Постсоветские страны (RU, BY, KZ, AM, AZ, GE, KG, MD, TJ, TM, UZ)")
    print("=" * 80)
    print()

    # Извлекаем домены
    domains_by_zone = extract_domains_without_metadata()

    if not domains_by_zone:
        print("❌ Домены не найдены")
        return

    # Сохраняем результаты
    save_results(domains_by_zone)


if __name__ == "__main__":
    main()
