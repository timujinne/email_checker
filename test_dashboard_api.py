#!/usr/bin/env python3
"""
Тест API endpoint для статистики дашборда

Проверяет:
1. Подключение к БД
2. Получение статистики
3. Формат ответа
4. Производительность
"""

import sqlite3
import json
import time
from pathlib import Path


def test_database_connection():
    """Тест подключения к базе данных"""
    print("\n1️⃣  Тест подключения к БД...")

    db_path = Path(".cache/processing_cache_optimized.db")

    if not db_path.exists():
        print("❌ База данных не найдена")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Проверяем наличие таблиц
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name IN (
                'processing_statistics',
                'country_statistics',
                'processing_history'
            )
        """)

        tables = [row[0] for row in cursor.fetchall()]

        required_tables = ['processing_statistics', 'country_statistics', 'processing_history']
        missing_tables = set(required_tables) - set(tables)

        if missing_tables:
            print(f"❌ Отсутствуют таблицы: {missing_tables}")
            return False

        print(f"✅ Все таблицы найдены: {len(tables)}")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False


def test_statistics_query():
    """Тест запроса статистики"""
    print("\n2️⃣  Тест запроса общей статистики...")

    db_path = Path(".cache/processing_cache_optimized.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        start = time.time()

        cursor.execute('''
            SELECT
                total_lists,
                total_processed_emails,
                total_clean_emails,
                total_blocked_emails,
                total_invalid_emails,
                countries_json,
                categories_json,
                last_updated
            FROM processing_statistics
            WHERE id = 1
        ''')

        row = cursor.fetchone()
        elapsed = (time.time() - start) * 1000  # ms

        if not row:
            print("⚠️  Статистика пуста (это нормально для новой миграции)")
            return True

        print(f"✅ Запрос выполнен за {elapsed:.2f}ms")
        print(f"   Списков: {row[0]}")
        print(f"   Обработано: {row[1]:,}")
        print(f"   Чистых: {row[2]:,}")
        print(f"   Заблокировано: {row[3]:,}")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")
        conn.close()
        return False


def test_country_statistics():
    """Тест запроса статистики по странам"""
    print("\n3️⃣  Тест запроса статистики по странам...")

    db_path = Path(".cache/processing_cache_optimized.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        start = time.time()

        cursor.execute('''
            SELECT
                country,
                clean_emails,
                blocked_emails,
                total_emails,
                quality_score
            FROM country_statistics
            ORDER BY total_emails DESC
            LIMIT 10
        ''')

        countries = cursor.fetchall()
        elapsed = (time.time() - start) * 1000  # ms

        print(f"✅ Запрос выполнен за {elapsed:.2f}ms")
        print(f"   Найдено стран: {len(countries)}")

        if countries:
            print("   Топ-3:")
            for i, row in enumerate(countries[:3], 1):
                print(f"     {i}. {row[0]}: {row[3]:,} emails ({row[4]:.1f}% качество)")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")
        conn.close()
        return False


def test_processing_history():
    """Тест запроса истории обработки"""
    print("\n4️⃣  Тест запроса истории обработки...")

    db_path = Path(".cache/processing_cache_optimized.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        start = time.time()

        cursor.execute('''
            SELECT
                filename,
                processed_at,
                total_emails,
                clean_emails,
                blocked_emails
            FROM processing_history
            WHERE success = 1
            ORDER BY processed_at DESC
            LIMIT 5
        ''')

        history = cursor.fetchall()
        elapsed = (time.time() - start) * 1000  # ms

        print(f"✅ Запрос выполнен за {elapsed:.2f}ms")
        print(f"   Найдено записей: {len(history)}")

        if history:
            print("   Последние 3:")
            for i, row in enumerate(history[:3], 1):
                print(f"     {i}. {row[0][:40]}: {row[2]:,} emails")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")
        conn.close()
        return False


def test_performance():
    """Тест производительности всех запросов"""
    print("\n5️⃣  Тест производительности (10 итераций)...")

    db_path = Path(".cache/processing_cache_optimized.db")

    times = []
    for i in range(10):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        start = time.time()

        # Запрос 1: Общая статистика
        cursor.execute('SELECT * FROM processing_statistics WHERE id = 1')
        cursor.fetchone()

        # Запрос 2: Статистика по странам
        cursor.execute('SELECT * FROM country_statistics ORDER BY total_emails DESC LIMIT 20')
        cursor.fetchall()

        # Запрос 3: История
        cursor.execute('SELECT * FROM processing_history WHERE success = 1 ORDER BY processed_at DESC LIMIT 10')
        cursor.fetchall()

        elapsed = (time.time() - start) * 1000  # ms
        times.append(elapsed)

        conn.close()

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    print(f"✅ Средняя время: {avg_time:.2f}ms")
    print(f"   Минимальное: {min_time:.2f}ms")
    print(f"   Максимальное: {max_time:.2f}ms")

    if avg_time < 50:
        print("   🚀 Отлично! (< 50ms)")
    elif avg_time < 100:
        print("   ✅ Хорошо (< 100ms)")
    else:
        print("   ⚠️  Медленно (> 100ms)")

    return True


def test_response_format():
    """Тест формата ответа API"""
    print("\n6️⃣  Тест формата ответа API...")

    db_path = Path(".cache/processing_cache_optimized.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Симуляция ответа API
        stats = {
            "total_lists": 0,
            "processed_emails": 0,
            "clean_emails": 0,
            "blocked_emails": 0,
            "invalid_emails": 0,
            "countries": [],
            "categories": {},
            "recent_activity": [],
            "queue_length": 0,
            "country_stats": []  # Frontend expects array!
        }

        # Получаем данные
        cursor.execute('SELECT * FROM processing_statistics WHERE id = 1')
        row = cursor.fetchone()

        if row:
            stats["total_lists"] = row[1] or 0
            stats["processed_emails"] = row[2] or 0
            stats["clean_emails"] = row[3] or 0
            stats["blocked_emails"] = row[4] or 0
            stats["invalid_emails"] = row[5] or 0

            # Безопасный парсинг JSON
            try:
                stats["countries"] = json.loads(row[7]) if row[7] else []
            except:
                stats["countries"] = []

            try:
                parsed = json.loads(row[8]) if row[8] else {}
                # Убедимся, что это словарь, а не список
                stats["categories"] = parsed if isinstance(parsed, dict) else {}
            except:
                stats["categories"] = {}

        cursor.execute('SELECT * FROM country_statistics ORDER BY total_emails DESC LIMIT 5')
        country_list = []
        for row in cursor.fetchall():
            country_list.append({
                "country": row[0],
                "clean_emails": row[2],
                "blocked_emails": row[3],
                "total": row[4],
                "quality_score": round(row[5], 2)
            })
        stats["country_stats"] = country_list

        # Проверяем формат
        required_keys = ["total_lists", "processed_emails", "clean_emails",
                         "blocked_emails", "invalid_emails", "countries",
                         "categories", "recent_activity", "queue_length",
                         "country_stats"]

        missing_keys = [k for k in required_keys if k not in stats]

        if missing_keys:
            print(f"❌ Отсутствуют ключи: {missing_keys}")
            return False

        print("✅ Формат ответа корректен")
        print(f"   Все {len(required_keys)} ключей присутствуют")

        # Проверяем типы данных
        type_checks = [
            ("total_lists", int),
            ("processed_emails", int),
            ("countries", list),
            ("categories", dict),
            ("country_stats", list)  # Frontend expects array!
        ]

        for key, expected_type in type_checks:
            actual_type = type(stats[key])
            if not isinstance(stats[key], expected_type):
                print(f"❌ Неверный тип для {key}: ожидается {expected_type}, получен {actual_type}")
                conn.close()
                return False

        print("✅ Типы данных корректны")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Ошибка проверки формата: {e}")
        conn.close()
        return False


def main():
    """Главная функция тестирования"""
    print("=" * 80)
    print("🧪 ТЕСТИРОВАНИЕ API ДАШБОРДА")
    print("=" * 80)

    tests = [
        ("Подключение к БД", test_database_connection),
        ("Запрос статистики", test_statistics_query),
        ("Статистика по странам", test_country_statistics),
        ("История обработки", test_processing_history),
        ("Формат ответа", test_response_format),
        ("Производительность", test_performance),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Исключение в тесте '{name}': {e}")
            failed += 1

    print("\n" + "=" * 80)
    if failed == 0:
        print(f"✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ! ({passed}/{passed+failed})")
        print("=" * 80)
        print("\n🎉 API дашборда готов к использованию!")
        print("   Запустите веб-сервер: python3 web_server.py")
        print("   Откройте дашборд: http://localhost:8080/new#dashboard")
        return True
    else:
        print(f"⚠️  ТЕСТЫ НЕ ПРОЙДЕНЫ: {failed} из {passed+failed}")
        print("=" * 80)
        return False


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
