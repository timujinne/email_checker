#!/usr/bin/env python3
"""
Оптимизация баз данных: добавление индексов и очистка
"""

import sqlite3
from pathlib import Path
import time

def optimize_metadata_db(db_path="metadata.db"):
    """
    Оптимизация metadata.db: добавление индексов для ускорения запросов

    Args:
        db_path: Путь к базе данных

    Returns:
        dict: Статистика оптимизации
    """
    stats = {
        "indexes_created": [],
        "errors": [],
        "size_before_mb": 0,
        "size_after_mb": 0,
        "time_taken": 0
    }

    db_file = Path(db_path)
    if not db_file.exists():
        print(f"❌ База данных {db_path} не найдена")
        return stats

    stats["size_before_mb"] = db_file.stat().st_size / (1024 * 1024)
    print(f"\n📊 Оптимизация {db_path}")
    print(f"   Размер до: {stats['size_before_mb']:.2f} MB")

    start_time = time.time()

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Получаем список таблиц
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"   Найдено таблиц: {len(tables)}")

        # Список индексов для создания
        indexes_to_create = [
            # Для таблицы emails (если существует)
            ("idx_emails_email", "emails", "email"),
            ("idx_emails_normalized", "emails", "normalized_email"),
            ("idx_emails_domain", "emails", "domain"),
            ("idx_emails_source", "emails", "source_file"),
            ("idx_emails_company", "emails", "company_name"),

            # Для таблицы metadata (если существует)
            ("idx_metadata_email", "metadata", "email"),
            ("idx_metadata_company", "metadata", "company_name"),
            ("idx_metadata_phone", "metadata", "phone"),
            ("idx_metadata_country", "metadata", "country"),
            ("idx_metadata_validation", "metadata", "validation_status"),

            # Составные индексы для частых запросов
            ("idx_emails_source_status", "emails", "source_file, validation_status"),
            ("idx_metadata_email_company", "metadata", "email, company_name"),
        ]

        # Проверяем существующие индексы
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        existing_indexes = {row[0] for row in cursor.fetchall()}
        print(f"   Существующих индексов: {len(existing_indexes)}")

        # Создаем недостающие индексы
        created_count = 0
        for index_name, table_name, columns in indexes_to_create:
            if index_name not in existing_indexes:
                # Проверяем существует ли таблица
                cursor.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table_name,)
                )
                if cursor.fetchone():
                    try:
                        print(f"   Создаем индекс: {index_name}...")
                        cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({columns})")
                        stats["indexes_created"].append(index_name)
                        created_count += 1
                    except sqlite3.OperationalError as e:
                        # Индекс может не создаться если колонки не существует
                        stats["errors"].append(f"{index_name}: {str(e)}")

        print(f"   ✓ Создано новых индексов: {created_count}")

        # Анализируем таблицы для оптимизации query planner
        print("\n   Анализ таблиц для оптимизации...")
        cursor.execute("ANALYZE")

        # VACUUM для дефрагментации и уменьшения размера
        print("   Выполняем VACUUM (это может занять время)...")
        cursor.execute("VACUUM")

        conn.commit()
        conn.close()

        stats["size_after_mb"] = db_file.stat().st_size / (1024 * 1024)
        stats["time_taken"] = time.time() - start_time

        print(f"\n   ✅ Оптимизация завершена!")
        print(f"   Размер после: {stats['size_after_mb']:.2f} MB")
        print(f"   Экономия: {stats['size_before_mb'] - stats['size_after_mb']:.2f} MB")
        print(f"   Время: {stats['time_taken']:.1f} сек")

    except Exception as e:
        print(f"   ❌ Ошибка при оптимизации: {e}")
        stats["errors"].append(str(e))

    return stats

def optimize_cache_db(db_path=".cache/processing_cache_final.db"):
    """
    Оптимизация кеша обработки для уменьшения размера

    Args:
        db_path: Путь к базе данных кеша

    Returns:
        dict: Статистика оптимизации
    """
    stats = {
        "optimization_done": False,
        "size_before_mb": 0,
        "size_after_mb": 0,
        "emails_count": 0,
        "files_count": 0
    }

    db_file = Path(db_path)
    if not db_file.exists():
        print(f"❌ База данных {db_path} не найдена")
        return stats

    stats["size_before_mb"] = db_file.stat().st_size / (1024 * 1024)
    print(f"\n📊 Анализ {db_path}")
    print(f"   Размер: {stats['size_before_mb']:.2f} MB")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Подсчитываем количество записей
        cursor.execute("SELECT COUNT(*) FROM processed_emails")
        stats["emails_count"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM processed_files")
        stats["files_count"] = cursor.fetchone()[0]

        print(f"   Email записей: {stats['emails_count']:,}")
        print(f"   Файлов: {stats['files_count']}")
        print(f"   Среднее email на файл: {stats['emails_count'] // stats['files_count'] if stats['files_count'] > 0 else 0:,}")

        # Проблема: храним полные email адреса вместо хешей
        # Это занимает много места
        print("\n   ⚠️  ПРОБЛЕМА ОБНАРУЖЕНА:")
        print("   База хранит полные email адреса ({:,} записей)".format(stats["emails_count"]))
        print("   Это занимает ~{:.0f} MB лишнего пространства".format(
            stats["emails_count"] * 30 / (1024 * 1024)  # ~30 байт на email в среднем
        ))

        print("\n   💡 РЕКОМЕНДАЦИЯ:")
        print("   Для дедупликации достаточно хранить только MD5 хеши email (16 байт)")
        print("   Это уменьшит размер БД со 133MB до ~5-10MB")

        # Добавляем индексы если их нет
        print("\n   Проверка индексов...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        existing_indexes = {row[0] for row in cursor.fetchall()}

        indexes_needed = [
            ("idx_email_normalized", "processed_emails", "email_normalized"),
            ("idx_source_file", "processed_emails", "source_file"),
            ("idx_category", "processed_emails", "category"),
            ("idx_file_hash", "processed_files", "file_hash")
        ]

        created = 0
        for index_name, table_name, column in indexes_needed:
            if index_name not in existing_indexes:
                print(f"   Создаем индекс {index_name}...")
                cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({column})")
                created += 1

        if created > 0:
            print(f"   ✓ Создано индексов: {created}")
            cursor.execute("ANALYZE")

        conn.commit()
        conn.close()

        stats["optimization_done"] = True

    except Exception as e:
        print(f"   ❌ Ошибка: {e}")

    return stats

def create_optimized_cache_schema():
    """
    Создание оптимизированной схемы кеша (для будущей миграции)
    """
    print("\n📝 ОПТИМИЗИРОВАННАЯ СХЕМА КЕША (рекомендация):")
    print("=" * 60)

    schema = """
-- Таблица для хешей email (для дедупликации)
CREATE TABLE email_hashes (
    hash BLOB PRIMARY KEY,           -- MD5 hash (16 байт)
    first_seen_file TEXT,            -- Где впервые встретился
    first_seen_date TEXT,            -- Когда впервые встретился
    category TEXT                    -- clean/blocked/invalid
);

-- Таблица для файлов
CREATE TABLE processed_files (
    file_path TEXT PRIMARY KEY,
    file_hash TEXT NOT NULL,
    processed_at TEXT,
    total_count INTEGER,
    clean_count INTEGER,
    blocked_count INTEGER,
    invalid_count INTEGER
);

-- Индексы
CREATE INDEX idx_hash ON email_hashes(hash);
CREATE INDEX idx_category ON email_hashes(category);
CREATE INDEX idx_file_hash ON processed_files(file_hash);

-- Примерный размер:
-- 500K email * 20 байт = ~10MB (вместо 133MB)
-- Экономия: 92%!
    """

    print(schema)
    print("\nДля миграции используйте: python migrate_to_optimized_cache.py")

def main():
    """Основная функция оптимизации"""
    print("""
╔══════════════════════════════════════════════════════════╗
║         ОПТИМИЗАЦИЯ БАЗ ДАННЫХ                          ║
╚══════════════════════════════════════════════════════════╝
    """)

    # 1. Оптимизация metadata.db
    print("\n1️⃣  ОПТИМИЗАЦИЯ METADATA.DB")
    print("=" * 60)
    metadata_stats = optimize_metadata_db()

    # 2. Анализ cache БД
    print("\n2️⃣  АНАЛИЗ КЕША ОБРАБОТКИ")
    print("=" * 60)
    cache_stats = optimize_cache_db()

    # 3. Рекомендации по оптимизации
    print("\n3️⃣  РЕКОМЕНДАЦИИ ПО ДАЛЬНЕЙШЕЙ ОПТИМИЗАЦИИ")
    print("=" * 60)
    create_optimized_cache_schema()

    # Итоги
    print("\n" + "=" * 60)
    print("📊 ИТОГИ ОПТИМИЗАЦИИ:")
    print("=" * 60)

    if metadata_stats["indexes_created"]:
        print(f"✅ Создано индексов в metadata.db: {len(metadata_stats['indexes_created'])}")
        for idx in metadata_stats["indexes_created"]:
            print(f"   - {idx}")

    if metadata_stats.get("size_before_mb", 0) > metadata_stats.get("size_after_mb", 0):
        saved = metadata_stats["size_before_mb"] - metadata_stats["size_after_mb"]
        print(f"✅ Освобождено в metadata.db: {saved:.2f} MB")

    if cache_stats["optimization_done"]:
        print(f"✅ Кеш проанализирован: {cache_stats['emails_count']:,} email в {cache_stats['files_count']} файлах")

    if metadata_stats["errors"] or cache_stats.get("errors", []):
        print("\n⚠️  Ошибки:")
        for error in metadata_stats["errors"] + cache_stats.get("errors", []):
            print(f"   - {error}")

    print("\n✨ Оптимизация завершена!")
    print("\n💡 Следующие шаги:")
    print("   1. Запустите миграцию на оптимизированную схему кеша")
    print("   2. Настройте регулярную очистку старых данных")
    print("   3. Используйте web_server_secure.py вместо web_server.py")

if __name__ == "__main__":
    main()