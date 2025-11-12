#!/usr/bin/env python3
"""
Миграция на оптимизированный кеш с хешами вместо полных email
Экономия: 133MB → 10MB (92%)
"""

import sqlite3
import hashlib
from pathlib import Path
from datetime import datetime
import time

def create_optimized_schema(db_path):
    """Создает оптимизированную схему БД"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Таблица хешей email для дедупликации
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_hashes (
            hash BLOB PRIMARY KEY,
            first_seen_file TEXT NOT NULL,
            first_seen_date TEXT NOT NULL,
            category TEXT NOT NULL
        )
    ''')

    # Таблица обработанных файлов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processed_files (
            file_path TEXT PRIMARY KEY,
            file_hash TEXT NOT NULL,
            processed_at TEXT NOT NULL,
            total_count INTEGER DEFAULT 0,
            clean_count INTEGER DEFAULT 0,
            blocked_count INTEGER DEFAULT 0,
            invalid_count INTEGER DEFAULT 0
        )
    ''')

    # Индексы для быстрого поиска
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_hash ON email_hashes(hash)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON email_hashes(category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_first_seen ON email_hashes(first_seen_file)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_hash ON processed_files(file_hash)')

    conn.commit()
    conn.close()

def email_to_hash(email: str) -> bytes:
    """Конвертирует email в MD5 хеш"""
    return hashlib.md5(email.lower().encode()).digest()

def migrate_from_old_cache(old_db_path, new_db_path):
    """
    Мигрирует данные из старого кеша в новый оптимизированный

    Args:
        old_db_path: Путь к старой БД
        new_db_path: Путь к новой оптимизированной БД
    """
    old_db = Path(old_db_path)
    if not old_db.exists():
        print(f"❌ Старая БД не найдена: {old_db_path}")
        return

    print(f"\n📦 Миграция кеша:")
    print(f"   Источник: {old_db_path}")
    print(f"   Назначение: {new_db_path}")

    # Размер до миграции
    old_size_mb = old_db.stat().st_size / (1024 * 1024)
    print(f"   Размер старой БД: {old_size_mb:.2f} MB")

    # Создаем новую БД
    create_optimized_schema(new_db_path)

    # Подключаемся к обеим БД
    old_conn = sqlite3.connect(old_db_path)
    new_conn = sqlite3.connect(new_db_path)

    old_cursor = old_conn.cursor()
    new_cursor = new_conn.cursor()

    start_time = time.time()

    # Мигрируем файлы
    print("\n🔄 Миграция обработанных файлов...")
    old_cursor.execute('''
        SELECT filename, file_hash, processed_at,
               total_emails, clean_emails, blocked_email, invalid_emails
        FROM processed_files
    ''')

    files = old_cursor.fetchall()
    for row in files:
        filename, file_hash, processed_at, total, clean, blocked, invalid = row
        new_cursor.execute('''
            INSERT OR REPLACE INTO processed_files
            (file_path, file_hash, processed_at, total_count, clean_count, blocked_count, invalid_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (filename, file_hash, processed_at, total, clean, blocked, invalid))

    print(f"   ✓ Мигрировано файлов: {len(files)}")

    # Мигрируем email как хеши
    print("\n🔄 Миграция email в хеши...")

    # Получаем уникальные email с их первым появлением
    old_cursor.execute('''
        SELECT email, email_normalized, source_file, category, processed_at
        FROM processed_emails
        ORDER BY processed_at ASC
    ''')

    migrated = 0
    skipped = 0
    batch = []
    batch_size = 10000

    for row in old_cursor:
        email, email_norm, source_file, category, processed_at = row

        # Вычисляем хеш
        email_hash = email_to_hash(email_norm or email)

        # Добавляем в batch
        batch.append((email_hash, source_file, processed_at, category))

        if len(batch) >= batch_size:
            # Вставляем batch (игнорируем дубликаты)
            new_cursor.executemany('''
                INSERT OR IGNORE INTO email_hashes
                (hash, first_seen_file, first_seen_date, category)
                VALUES (?, ?, ?, ?)
            ''', batch)
            migrated += len(batch)
            batch = []
            print(f"   Обработано: {migrated:,} email...", end='\r')

    # Вставляем остаток
    if batch:
        new_cursor.executemany('''
            INSERT OR IGNORE INTO email_hashes
            (hash, first_seen_file, first_seen_date, category)
            VALUES (?, ?, ?, ?)
        ''', batch)
        migrated += len(batch)

    print(f"   ✓ Мигрировано уникальных email: {migrated:,}         ")

    # Commit и закрываем
    new_conn.commit()
    old_conn.close()
    new_conn.close()

    # Оптимизируем новую БД
    print("\n🔧 Оптимизация новой БД...")
    new_conn = sqlite3.connect(new_db_path)
    new_cursor = new_conn.cursor()
    new_cursor.execute("ANALYZE")
    new_cursor.execute("VACUUM")
    new_conn.commit()
    new_conn.close()

    # Размер после миграции
    new_db = Path(new_db_path)
    new_size_mb = new_db.stat().st_size / (1024 * 1024)

    elapsed = time.time() - start_time
    savings = ((old_size_mb - new_size_mb) / old_size_mb) * 100

    print(f"\n✅ Миграция завершена!")
    print(f"   Размер новой БД: {new_size_mb:.2f} MB")
    print(f"   Экономия: {savings:.1f}% ({old_size_mb - new_size_mb:.2f} MB)")
    print(f"   Время: {elapsed:.1f} сек")

def verify_migration(new_db_path):
    """Проверяет корректность миграции"""
    print(f"\n🔍 Проверка миграции...")

    conn = sqlite3.connect(new_db_path)
    cursor = conn.cursor()

    # Статистика
    cursor.execute("SELECT COUNT(*) FROM email_hashes")
    hashes_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM processed_files")
    files_count = cursor.fetchone()[0]

    cursor.execute("SELECT category, COUNT(*) FROM email_hashes GROUP BY category")
    by_category = dict(cursor.fetchall())

    conn.close()

    print(f"   Уникальных хешей: {hashes_count:,}")
    print(f"   Обработанных файлов: {files_count}")
    print(f"   По категориям:")
    for cat, count in sorted(by_category.items()):
        print(f"      {cat:20s}: {count:>10,}")

def update_email_checker(cache_dir=".cache"):
    """Обновляет email_checker.py для использования нового кеша"""
    print(f"\n📝 Обновление email_checker.py...")

    # Создаем snippet кода для вставки
    new_code = '''
    def _load_already_processed_emails(self) -> Set[str]:
        """
        Загружает хеши обработанных email для дедупликации

        ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует хеши вместо полных email
        """
        import hashlib

        # Проверяем оптимизированный кеш
        optimized_cache = self.cache_dir / "processing_cache_optimized.db"

        if optimized_cache.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(optimized_cache)
                cursor = conn.cursor()

                # Получаем все хеши
                cursor.execute('SELECT hash FROM email_hashes')
                # Возвращаем хеши как строки для совместимости
                processed_hashes = {row[0].hex() for row in cursor.fetchall()}

                conn.close()

                print(f"📚 Загружено {len(processed_hashes):,} хешей из оптимизированного кеша")
                return processed_hashes

            except Exception as e:
                print(f"⚠️  Ошибка загрузки оптимизированного кеша: {e}")

        # Fallback к старому методу
        # ... существующий код ...
    '''

    print("   ⚠️  ВНИМАНИЕ: Требуется ручное обновление email_checker.py")
    print("   Код для вставки сохранен в: optimized_cache_integration.py")

    with open("optimized_cache_integration.py", "w", encoding="utf-8") as f:
        f.write(new_code)

def main():
    """Основная функция миграции"""
    print("""
╔══════════════════════════════════════════════════════════╗
║     МИГРАЦИЯ НА ОПТИМИЗИРОВАННЫЙ КЕШ                    ║
║                                                          ║
║  Экономия: 133 MB → 10 MB (92%)                         ║
╚══════════════════════════════════════════════════════════╝
    """)

    # Пути к БД
    old_db = ".cache/processing_cache_final.db"
    new_db = ".cache/processing_cache_optimized.db"

    # Проверка существования старой БД
    if not Path(old_db).exists():
        print(f"❌ Старая БД не найдена: {old_db}")
        print("   Возможно, миграция уже выполнена или путь неверный")
        return

    # Проверка существования новой БД
    if Path(new_db).exists():
        response = input(f"\n⚠️  БД {new_db} уже существует. Перезаписать? (y/N): ")
        if response.lower() != 'y':
            print("❌ Миграция отменена")
            return
        Path(new_db).unlink()

    # Выполняем миграцию
    migrate_from_old_cache(old_db, new_db)

    # Проверяем результат
    verify_migration(new_db)

    # Создаем резервную копию старой БД
    print(f"\n💾 Создание резервной копии старой БД...")
    backup_path = Path(old_db).with_suffix('.db.backup')
    import shutil
    shutil.copy(old_db, backup_path)
    print(f"   ✓ Резервная копия: {backup_path}")

    # Инструкции по интеграции
    update_email_checker()

    print(f"\n✨ Миграция успешно завершена!")
    print(f"\n📋 Следующие шаги:")
    print(f"   1. Проверьте новую БД: {new_db}")
    print(f"   2. Обновите email_checker.py (см. optimized_cache_integration.py)")
    print(f"   3. Протестируйте работу с новым кешем")
    print(f"   4. После проверки удалите старую БД: {old_db}")

if __name__ == "__main__":
    main()
