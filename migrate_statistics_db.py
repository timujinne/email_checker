#!/usr/bin/env python3
"""
Миграция базы данных processing_cache_optimized.db для хранения статистики дашборда.

Добавляет:
1. Таблицу processing_statistics - общая статистика (single-row)
2. Таблицу country_statistics - статистика по странам
3. Таблицу processing_history - история обработки
4. Колонки country, category в processed_files

Использование:
    python3 migrate_statistics_db.py
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
import sys


def create_backup(db_path):
    """Создать резервную копию базы данных"""
    backup_path = db_path.with_suffix('.db.backup')

    if backup_path.exists():
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = db_path.parent / f"{db_path.stem}_{timestamp}.db.backup"

    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Создана резервная копия: {backup_path}")
        return True
    except Exception as e:
        print(f"⚠️  Ошибка создания резервной копии: {e}")
        return False


def check_database_exists(db_path):
    """Проверить существование базы данных"""
    if not db_path.exists():
        print(f"❌ База данных не найдена: {db_path}")
        print("   Запустите обработку файлов для создания базы:")
        print("   python3 email_checker.py incremental --exclude-duplicates")
        return False
    return True


def create_new_tables(cursor):
    """Создать новые таблицы для статистики"""
    print("\n📊 Создание новых таблиц...")

    # Таблица 1: Общая статистика (single-row)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processing_statistics (
            id INTEGER PRIMARY KEY CHECK (id = 1),

            -- Общая статистика
            total_lists INTEGER DEFAULT 0,
            total_processed_emails INTEGER DEFAULT 0,
            total_clean_emails INTEGER DEFAULT 0,
            total_blocked_emails INTEGER DEFAULT 0,
            total_invalid_emails INTEGER DEFAULT 0,

            -- Последнее обновление
            last_updated TEXT NOT NULL,
            calculated_at TEXT NOT NULL,

            -- JSON поля для сложных данных
            countries_json TEXT,
            categories_json TEXT,

            -- Метаданные
            version INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_stats_last_updated
        ON processing_statistics(last_updated)
    ''')

    print("  ✓ Таблица processing_statistics создана")

    # Таблица 2: Статистика по странам
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS country_statistics (
            country TEXT PRIMARY KEY,

            -- Счетчики
            total_lists INTEGER DEFAULT 0,
            clean_emails INTEGER DEFAULT 0,
            blocked_emails INTEGER DEFAULT 0,
            total_emails INTEGER DEFAULT 0,

            -- Метрики качества
            quality_score REAL DEFAULT 0.0,

            -- Временные метки
            last_updated TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_country_quality
        ON country_statistics(quality_score DESC)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_country_total
        ON country_statistics(total_emails DESC)
    ''')

    print("  ✓ Таблица country_statistics создана")

    # Таблица 3: История обработки
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processing_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            -- Информация о файле
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,

            -- Детали обработки
            processed_at TEXT NOT NULL,
            processing_time REAL DEFAULT 0.0,
            success INTEGER DEFAULT 1,

            -- Статистика
            total_emails INTEGER DEFAULT 0,
            clean_emails INTEGER DEFAULT 0,
            blocked_emails INTEGER DEFAULT 0,
            invalid_emails INTEGER DEFAULT 0,

            -- Метаданные
            country TEXT,
            category TEXT,

            -- Для recent activity feed
            output_size INTEGER DEFAULT 0,

            -- Временная метка
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_history_processed_at
        ON processing_history(processed_at DESC)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_history_success
        ON processing_history(success)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_history_country
        ON processing_history(country)
    ''')

    print("  ✓ Таблица processing_history создана")


def add_missing_columns(cursor):
    """Добавить недостающие колонки в processed_files"""
    print("\n🔧 Обновление таблицы processed_files...")

    # Получить список существующих колонок
    cursor.execute("PRAGMA table_info(processed_files)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    columns_to_add = {
        'country': 'TEXT',
        'category': 'TEXT',
        'file_type': 'TEXT',
        'success': 'INTEGER DEFAULT 1',
        'processing_time': 'REAL DEFAULT 0.0',
        'error': 'TEXT',
        'duplicates_removed': 'INTEGER DEFAULT 0',
        'prefix_duplicates_removed': 'INTEGER DEFAULT 0',
        'has_metadata': 'INTEGER DEFAULT 0'
    }

    added_count = 0
    for column_name, column_type in columns_to_add.items():
        if column_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE processed_files ADD COLUMN {column_name} {column_type}")
                print(f"  ✓ Добавлена колонка: {column_name}")
                added_count += 1
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"  ⚠️  Ошибка добавления колонки {column_name}: {e}")

    if added_count == 0:
        print("  ✓ Все колонки уже существуют")
    else:
        print(f"  ✓ Добавлено колонок: {added_count}")


def load_lists_config():
    """Загрузить конфигурацию списков"""
    config_path = Path("lists_config.json")

    if not config_path.exists():
        print("  ⚠️  Файл lists_config.json не найден")
        return {}

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

            # Проверить формат: может быть {"lists": [...]} или просто [...]
            if isinstance(data, dict) and 'lists' in data:
                lists = data['lists']
            elif isinstance(data, list):
                lists = data
            else:
                print(f"  ⚠️  Неизвестный формат lists_config.json")
                return {}

            return {item['filename']: item for item in lists}
    except Exception as e:
        print(f"  ⚠️  Ошибка чтения lists_config.json: {e}")
        import traceback
        print(traceback.format_exc())
        return {}


def backfill_country_category(cursor, lists_config):
    """Заполнить страны и категории из lists_config.json"""
    print("\n🌍 Заполнение стран и категорий...")

    if not lists_config:
        print("  ⚠️  Конфигурация списков пуста, пропуск")
        return

    cursor.execute("SELECT file_path FROM processed_files")
    files = cursor.fetchall()

    updated_count = 0
    for (file_path,) in files:
        filename = Path(file_path).name

        # Проверить точное совпадение
        if filename in lists_config:
            config = lists_config[filename]
            country = config.get('country', 'Unknown')
            category = config.get('category', 'Other')
        else:
            # Попробовать найти по префиксу (без даты)
            base_name = filename.split('_clean_')[0].split('_blocked_')[0]

            country = 'Unknown'
            category = 'Other'

            for config_filename, config in lists_config.items():
                if config_filename.startswith(base_name):
                    country = config.get('country', 'Unknown')
                    category = config.get('category', 'Other')
                    break

        # Определить тип файла
        file_type = 'lvp' if file_path.lower().endswith('.lvp') else 'txt'

        cursor.execute('''
            UPDATE processed_files
            SET country = ?, category = ?, file_type = ?
            WHERE file_path = ?
        ''', (country, category, file_type, file_path))

        updated_count += 1

    print(f"  ✓ Обновлено записей: {updated_count}")


def calculate_initial_statistics(cursor, conn):
    """Рассчитать начальную статистику из существующих данных"""
    print("\n📈 Расчет начальной статистики...")

    # 1. Общая статистика
    cursor.execute('''
        SELECT
            COUNT(DISTINCT file_path) as total_lists,
            COALESCE(SUM(total_count), 0) as total_emails,
            COALESCE(SUM(clean_count), 0) as clean,
            COALESCE(SUM(blocked_count), 0) as blocked,
            COALESCE(SUM(invalid_count), 0) as invalid
        FROM processed_files
        WHERE file_hash IS NOT NULL
    ''')

    row = cursor.fetchone()
    total_lists, total_emails, clean, blocked, invalid = row

    # Получить уникальные страны и категории
    cursor.execute('SELECT DISTINCT country FROM processed_files WHERE country IS NOT NULL')
    countries = [r[0] for r in cursor.fetchall()]

    cursor.execute('''
        SELECT category, COUNT(*) as count
        FROM processed_files
        WHERE category IS NOT NULL
        GROUP BY category
    ''')
    categories = {row[0]: row[1] for row in cursor.fetchall()}

    now = datetime.now().isoformat()

    cursor.execute('''
        INSERT OR REPLACE INTO processing_statistics
        (id, total_lists, total_processed_emails, total_clean_emails,
         total_blocked_emails, total_invalid_emails,
         countries_json, categories_json,
         last_updated, calculated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        total_lists,
        total_emails,
        clean,
        blocked,
        invalid,
        json.dumps(countries, ensure_ascii=False),
        json.dumps(categories, ensure_ascii=False),
        now,
        now
    ))

    print(f"  ✓ Общая статистика:")
    print(f"    - Списков: {total_lists}")
    print(f"    - Обработано: {total_emails:,}")
    print(f"    - Чистых: {clean:,}")
    print(f"    - Заблокированных: {blocked:,}")
    print(f"    - Невалидных: {invalid:,}")

    # 2. Статистика по странам
    cursor.execute('''
        SELECT
            country,
            COUNT(*) as lists,
            COALESCE(SUM(clean_count), 0) as clean,
            COALESCE(SUM(blocked_count), 0) as blocked,
            COALESCE(SUM(total_count), 0) as total
        FROM processed_files
        WHERE country IS NOT NULL AND country != 'Unknown'
        GROUP BY country
    ''')

    country_count = 0
    for row in cursor.fetchall():
        country, lists, clean_cnt, blocked_cnt, total_cnt = row
        quality = (clean_cnt / total_cnt * 100) if total_cnt > 0 else 0.0

        cursor.execute('''
            INSERT OR REPLACE INTO country_statistics
            (country, total_lists, clean_emails, blocked_emails,
             total_emails, quality_score, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (country, lists, clean_cnt, blocked_cnt, total_cnt, quality, now))

        country_count += 1

    print(f"  ✓ Статистика по странам: {country_count} стран")

    # 3. История обработки
    cursor.execute('''
        SELECT file_path, processed_at,
               COALESCE(total_count, 0), COALESCE(clean_count, 0),
               COALESCE(blocked_count, 0), COALESCE(invalid_count, 0),
               country, category, file_type
        FROM processed_files
        WHERE processed_at IS NOT NULL
        ORDER BY processed_at DESC
    ''')

    history_count = 0
    for row in cursor.fetchall():
        file_path, processed_at, total, clean_cnt, blocked_cnt, invalid_cnt, country, category, file_type = row
        filename = Path(file_path).name

        # Проверить, не добавлена ли уже запись
        cursor.execute('''
            SELECT COUNT(*) FROM processing_history
            WHERE file_path = ? AND processed_at = ?
        ''', (file_path, processed_at))

        if cursor.fetchone()[0] == 0:
            # Вычисляем размер output файла
            output_size = 0
            try:
                output_dir = Path("output")
                stem = Path(file_path).stem
                clean_files = list(output_dir.glob(f"{stem}_clean_*.txt"))
                if clean_files:
                    latest_file = max(clean_files, key=lambda f: f.stat().st_mtime)
                    output_size = latest_file.stat().st_size
                else:
                    # Примерная оценка: ~50 байт на email
                    output_size = clean_cnt * 50
            except:
                output_size = clean_cnt * 50

            cursor.execute('''
                INSERT INTO processing_history
                (filename, file_path, file_type, processed_at,
                 total_emails, clean_emails, blocked_emails, invalid_emails,
                 country, category, success, output_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            ''', (
                filename,
                file_path,
                file_type or 'txt',
                processed_at,
                total,
                clean_cnt,
                blocked_cnt,
                invalid_cnt,
                country,
                category,
                output_size
            ))
            history_count += 1

    print(f"  ✓ История обработки: {history_count} записей")

    conn.commit()


def verify_migration(cursor):
    """Проверить успешность миграции"""
    print("\n✅ Проверка миграции...")

    # Проверить таблицы
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
        print(f"  ❌ Отсутствуют таблицы: {missing_tables}")
        return False

    print(f"  ✓ Все таблицы созданы: {len(tables)}")

    # Проверить данные
    cursor.execute("SELECT COUNT(*) FROM processing_statistics")
    stats_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM country_statistics")
    country_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM processing_history")
    history_count = cursor.fetchone()[0]

    print(f"  ✓ Данные в processing_statistics: {stats_count} строк")
    print(f"  ✓ Данные в country_statistics: {country_count} стран")
    print(f"  ✓ Данные в processing_history: {history_count} записей")

    if stats_count == 0:
        print("  ⚠️  processing_statistics пуста (нормально, если нет обработанных файлов)")

    return True


def main():
    """Главная функция миграции"""
    print("=" * 70)
    print("🔄 МИГРАЦИЯ БД: Статистика дашборда")
    print("=" * 70)

    # Путь к базе данных
    db_path = Path(".cache/processing_cache_optimized.db")

    # Проверить существование
    if not check_database_exists(db_path):
        return False

    # Создать резервную копию
    if not create_backup(db_path):
        response = input("⚠️  Продолжить без резервной копии? (y/N): ")
        if response.lower() != 'y':
            print("❌ Миграция отменена")
            return False

    try:
        # Подключиться к базе
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Шаг 1: Создать новые таблицы
        create_new_tables(cursor)
        conn.commit()

        # Шаг 2: Добавить колонки в processed_files
        add_missing_columns(cursor)
        conn.commit()

        # Шаг 3: Загрузить конфигурацию
        lists_config = load_lists_config()

        # Шаг 4: Заполнить страны и категории
        backfill_country_category(cursor, lists_config)
        conn.commit()

        # Шаг 5: Рассчитать начальную статистику
        calculate_initial_statistics(cursor, conn)

        # Шаг 6: Проверить миграцию
        if not verify_migration(cursor):
            print("\n❌ Миграция завершилась с ошибками")
            conn.close()
            return False

        conn.close()

        print("\n" + "=" * 70)
        print("✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!")
        print("=" * 70)
        print("\nСледующие шаги:")
        print("1. Проверьте статистику: python3 validate_statistics.py")
        print("2. Перезапустите веб-сервер: python3 web_server.py")
        print("3. Откройте дашборд: http://localhost:8080/new#dashboard")
        print("\nВ случае проблем можно откатиться к резервной копии.")

        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА МИГРАЦИИ: {e}")
        import traceback
        print(traceback.format_exc())

        if 'conn' in locals():
            conn.rollback()
            conn.close()

        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
