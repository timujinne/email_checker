#!/usr/bin/env python3
"""
Валидация статистики дашборда - сравнение данных из БД с файлами

Проверяет корректность миграции, сравнивая:
- Статистику из базы данных (processing_cache_optimized.db)
- Статистику из файлов (output/)

Использование:
    python3 validate_statistics.py
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, Tuple


def get_db_statistics() -> Dict:
    """Получает статистику из базы данных"""
    db_path = Path(".cache/processing_cache_optimized.db")

    if not db_path.exists():
        print("❌ База данных не найдена")
        return {}

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    stats = {}

    try:
        # Общая статистика
        cursor.execute('''
            SELECT
                total_lists,
                total_processed_emails,
                total_clean_emails,
                total_blocked_emails,
                total_invalid_emails
            FROM processing_statistics
            WHERE id = 1
        ''')

        row = cursor.fetchone()
        if row:
            stats["total_lists"] = row[0] or 0
            stats["processed_emails"] = row[1] or 0
            stats["clean_emails"] = row[2] or 0
            stats["blocked_emails"] = row[3] or 0
            stats["invalid_emails"] = row[4] or 0
        else:
            # Считаем из processed_files
            cursor.execute('''
                SELECT
                    COUNT(DISTINCT filename),
                    COALESCE(SUM(total_count), 0),
                    COALESCE(SUM(clean_count), 0),
                    COALESCE(SUM(blocked_count), 0),
                    COALESCE(SUM(invalid_count), 0)
                FROM processed_files
            ''')

            fallback = cursor.fetchone()
            stats["total_lists"] = fallback[0] or 0
            stats["processed_emails"] = fallback[1] or 0
            stats["clean_emails"] = fallback[2] or 0
            stats["blocked_emails"] = fallback[3] or 0
            stats["invalid_emails"] = fallback[4] or 0

        # Статистика по странам
        cursor.execute('''
            SELECT country, total_emails, clean_emails, blocked_emails, quality_score
            FROM country_statistics
            ORDER BY country
        ''')

        stats["countries"] = {}
        for row in cursor.fetchall():
            stats["countries"][row[0]] = {
                "total": row[1] or 0,
                "clean": row[2] or 0,
                "blocked": row[3] or 0,
                "quality": round(row[4] or 0.0, 2)
            }

    except Exception as e:
        print(f"⚠️  Ошибка получения статистики из БД: {e}")

    conn.close()
    return stats


def get_file_statistics() -> Dict:
    """Получает статистику из файлов (старый метод)"""
    stats = {
        "total_lists": 0,
        "processed_emails": 0,
        "clean_emails": 0,
        "blocked_emails": 0,
        "invalid_emails": 0,
        "countries": {}
    }

    # Читаем lists_config.json
    config_file = Path("lists_config.json")
    country_map = {}

    if config_file.exists():
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                lists = config.get("lists", [])
                stats["total_lists"] = len(lists)

                for lst in lists:
                    country = lst.get("country", "Unknown")
                    filename = lst.get("filename", "")
                    if filename:
                        country_map[filename] = country
        except Exception as e:
            print(f"⚠️  Ошибка чтения lists_config.json: {e}")

    # Считаем emails из output файлов
    output_dir = Path("output")

    if not output_dir.exists():
        print("⚠️  Директория output/ не найдена")
        return stats

    try:
        # Подсчет по странам
        country_counts = {}

        # Clean emails
        clean_files = list(output_dir.glob("*_clean_*.txt"))
        for f in clean_files:
            try:
                with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                    count = sum(1 for line in file if line.strip() and '@' in line)
                    stats["clean_emails"] += count

                    # Определяем страну
                    country = "Unknown"
                    for config_filename, config_country in country_map.items():
                        if f.name.startswith(config_filename.split('_clean_')[0].split('.')[0]):
                            country = config_country
                            break

                    if country not in country_counts:
                        country_counts[country] = {"clean": 0, "blocked": 0, "total": 0}

                    country_counts[country]["clean"] += count
                    country_counts[country]["total"] += count

            except Exception as e:
                print(f"⚠️  Ошибка чтения {f.name}: {e}")

        # Blocked emails
        blocked_files = list(output_dir.glob("*_blocked_*.txt"))
        for f in blocked_files:
            try:
                with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                    count = sum(1 for line in file if line.strip() and '@' in line)
                    stats["blocked_emails"] += count

                    # Определяем страну
                    country = "Unknown"
                    for config_filename, config_country in country_map.items():
                        if f.name.startswith(config_filename.split('_blocked_')[0].split('.')[0]):
                            country = config_country
                            break

                    if country not in country_counts:
                        country_counts[country] = {"clean": 0, "blocked": 0, "total": 0}

                    country_counts[country]["blocked"] += count
                    country_counts[country]["total"] += count

            except Exception as e:
                print(f"⚠️  Ошибка чтения {f.name}: {e}")

        # Invalid emails
        invalid_files = list(output_dir.glob("*_invalid_*.txt"))
        for f in invalid_files:
            try:
                with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                    count = sum(1 for line in file if line.strip())
                    stats["invalid_emails"] += count
            except Exception as e:
                print(f"⚠️  Ошибка чтения {f.name}: {e}")

        # Рассчитываем качество по странам
        for country, counts in country_counts.items():
            quality = (counts["clean"] / counts["total"] * 100.0) if counts["total"] > 0 else 0.0
            stats["countries"][country] = {
                "total": counts["total"],
                "clean": counts["clean"],
                "blocked": counts["blocked"],
                "quality": round(quality, 2)
            }

    except Exception as e:
        print(f"⚠️  Ошибка обработки output/: {e}")

    stats["processed_emails"] = stats["clean_emails"] + stats["blocked_emails"]

    return stats


def compare_statistics(db_stats: Dict, file_stats: Dict) -> Tuple[bool, Dict]:
    """
    Сравнивает статистику из БД и файлов

    Returns:
        (успешно, различия)
    """
    differences = {}

    # Сравниваем общие счетчики
    for key in ["total_lists", "processed_emails", "clean_emails", "blocked_emails", "invalid_emails"]:
        db_val = db_stats.get(key, 0)
        file_val = file_stats.get(key, 0)

        if db_val != file_val:
            diff_percent = abs(db_val - file_val) / max(file_val, 1) * 100.0
            differences[key] = {
                "db": db_val,
                "files": file_val,
                "diff": db_val - file_val,
                "diff_percent": round(diff_percent, 2)
            }

    # Сравниваем статистику по странам
    all_countries = set(db_stats.get("countries", {}).keys()) | set(file_stats.get("countries", {}).keys())

    country_diffs = {}
    for country in all_countries:
        db_country = db_stats.get("countries", {}).get(country, {})
        file_country = file_stats.get("countries", {}).get(country, {})

        db_total = db_country.get("total", 0)
        file_total = file_country.get("total", 0)

        if db_total != file_total:
            country_diffs[country] = {
                "db": db_total,
                "files": file_total,
                "diff": db_total - file_total
            }

    if country_diffs:
        differences["countries"] = country_diffs

    return len(differences) == 0, differences


def print_statistics_table(stats: Dict, source: str):
    """Печатает таблицу статистики"""
    print(f"\n📊 {source}:")
    print("─" * 60)
    print(f"  Списков:        {stats.get('total_lists', 0):>10,}")
    print(f"  Обработано:     {stats.get('processed_emails', 0):>10,}")
    print(f"  Чистых:         {stats.get('clean_emails', 0):>10,}")
    print(f"  Заблокировано:  {stats.get('blocked_emails', 0):>10,}")
    print(f"  Невалидных:     {stats.get('invalid_emails', 0):>10,}")

    countries = stats.get("countries", {})
    if countries:
        print(f"\n  Стран: {len(countries)}")
        # Топ-5 стран
        sorted_countries = sorted(countries.items(), key=lambda x: x[1].get("total", 0), reverse=True)
        for country, data in sorted_countries[:5]:
            print(f"    {country:15s}: {data.get('total', 0):>8,} emails ({data.get('quality', 0):>5.1f}% качество)")


def print_differences_table(differences: Dict):
    """Печатает таблицу различий"""
    print("\n⚠️  ОБНАРУЖЕНЫ РАЗЛИЧИЯ:")
    print("=" * 80)

    # Общие счетчики
    for key in ["total_lists", "processed_emails", "clean_emails", "blocked_emails", "invalid_emails"]:
        if key in differences:
            diff = differences[key]
            print(f"\n{key}:")
            print(f"  БД:            {diff['db']:>10,}")
            print(f"  Файлы:         {diff['files']:>10,}")
            print(f"  Разница:       {diff['diff']:>10,} ({diff['diff_percent']:>6.2f}%)")

    # Страны
    if "countries" in differences:
        print(f"\nСтраны с различиями: {len(differences['countries'])}")
        for country, diff in list(differences["countries"].items())[:10]:
            print(f"  {country:15s}: БД={diff['db']:>8,}, Файлы={diff['files']:>8,}, Разница={diff['diff']:>8,}")


def main():
    """Главная функция валидации"""
    print("=" * 80)
    print("🔍 ВАЛИДАЦИЯ СТАТИСТИКИ ДАШБОРДА")
    print("=" * 80)

    # 1. Получаем статистику из БД
    print("\n1️⃣  Получение статистики из базы данных...")
    db_stats = get_db_statistics()

    if not db_stats:
        print("❌ Не удалось получить статистику из БД")
        return False

    print_statistics_table(db_stats, "Статистика из БД")

    # 2. Получаем статистику из файлов
    print("\n2️⃣  Подсчет статистики из файлов...")
    file_stats = get_file_statistics()

    if not file_stats:
        print("❌ Не удалось получить статистику из файлов")
        return False

    print_statistics_table(file_stats, "Статистика из файлов")

    # 3. Сравниваем
    print("\n3️⃣  Сравнение результатов...")
    is_valid, differences = compare_statistics(db_stats, file_stats)

    if is_valid:
        print("\n" + "=" * 80)
        print("✅ ВАЛИДАЦИЯ УСПЕШНА! Статистика совпадает.")
        print("=" * 80)
        return True
    else:
        print_differences_table(differences)

        print("\n" + "=" * 80)
        print("⚠️  ВАЛИДАЦИЯ НЕ ПРОШЛА! Обнаружены различия.")
        print("=" * 80)

        print("\n💡 Возможные причины:")
        print("  1. Дубликаты файлов в output/ (несколько версий с разными датами)")
        print("  2. Неполная миграция (запустите migrate_statistics_db.py повторно)")
        print("  3. Обработка файлов после миграции (новые файлы не учтены)")
        print("  4. Различия в логике подсчета (проверьте код)")

        return False


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
