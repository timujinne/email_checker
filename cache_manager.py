#!/usr/bin/env python3
"""
Cache Manager - эффективная система кеширования результатов

Оптимизирует хранение и доступ к результатам обработки
с использованием SQLite вместо JSON для больших объемов
"""

import sqlite3
import hashlib
import json
from pathlib import Path
from typing import Optional, Dict, Set, List
from datetime import datetime


class CacheManager:
    """
    Управляет кешированием результатов обработки файлов

    Преимущества над JSON:
    - Индексированный доступ к email (O(1))
    - Компактное хранение (меньше дублирования)
    - Быстрые запросы по MD5 хешу файла
    - Поддержка больших объемов данных
    """

    def __init__(self, cache_dir: str = ".cache", db_name: str = "processing_cache_optimized.db"):
        """
        Args:
            cache_dir: Директория для хранения кеша
            db_name: Имя файла базы данных
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = self.cache_dir / db_name
        self._init_database()
        self.lists_config = self._load_lists_config()

    def _init_database(self):
        """Инициализирует структуру базы данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Таблица обработанных файлов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processed_files (
                filename TEXT PRIMARY KEY,
                file_hash TEXT NOT NULL,
                file_path TEXT,
                file_type TEXT,
                processed_at TEXT,
                processing_time REAL,
                success INTEGER,
                error TEXT,

                -- Статистика
                total_emails INTEGER,
                clean_emails INTEGER,
                blocked_email INTEGER,
                blocked_domain INTEGER,
                invalid_emails INTEGER,
                duplicates_removed INTEGER,
                prefix_duplicates_removed INTEGER,
                has_metadata INTEGER
            )
        ''')

        # Таблица обработанных email (для быстрой дедупликации)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processed_emails (
                email TEXT,
                email_normalized TEXT,
                source_file TEXT,
                category TEXT,  -- clean, blocked_email, blocked_domain, invalid
                processed_at TEXT,

                PRIMARY KEY (email_normalized, source_file)
            )
        ''')

        # Индексы
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_file_hash
            ON processed_files(file_hash)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_email_normalized
            ON processed_emails(email_normalized)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_source_file
            ON processed_emails(source_file)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_category
            ON processed_emails(category)
        ''')

        conn.commit()
        conn.close()

    def get_file_hash(self, file_path: Path) -> str:
        """
        Вычисляет MD5 хеш файла

        Args:
            file_path: Путь к файлу

        Returns:
            MD5 хеш в hex формате
        """
        md5 = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                md5.update(chunk)
        return md5.hexdigest()

    def is_file_processed(self, file_path: Path) -> bool:
        """
        Проверяет обработан ли файл (по хешу)

        Args:
            file_path: Путь к файлу

        Returns:
            True если файл уже обработан и не изменился
        """
        if not file_path.exists():
            return False

        current_hash = self.get_file_hash(file_path)
        filename = file_path.name

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT file_hash, success FROM processed_files
            WHERE filename = ?
        ''', (filename,))

        result = cursor.fetchone()
        conn.close()

        if result:
            stored_hash, success = result
            # Файл считается обработанным если хеш совпадает и обработка была успешной
            return stored_hash == current_hash and success == 1

        return False

    def save_processing_result(self, result):
        """
        Сохраняет результат обработки файла

        Args:
            result: ProcessResult объект
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Вычисляем хеш файла
        file_hash = self.get_file_hash(result.file_path)

        # Сохраняем информацию о файле
        cursor.execute('''
            INSERT OR REPLACE INTO processed_files (
                filename, file_hash, file_path, file_type,
                processed_at, processing_time, success, error,
                total_emails, clean_emails, blocked_email,
                blocked_domain, invalid_emails, duplicates_removed,
                prefix_duplicates_removed, has_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            result.file_path.name,
            file_hash,
            str(result.file_path),
            result.file_type,
            result.timestamp,
            result.processing_time,
            1 if result.success else 0,
            result.error,
            result.total_emails,
            len(result.clean_emails),
            len(result.blocked_email),
            len(result.blocked_domain),
            len(result.invalid_emails),
            result.duplicates_removed,
            result.prefix_duplicates_removed,
            1 if result.has_metadata else 0
        ))

        # Удаляем старые записи email для этого файла
        cursor.execute('''
            DELETE FROM processed_emails WHERE source_file = ?
        ''', (result.file_path.name,))

        # Сохраняем email по категориям
        now = datetime.now().isoformat()

        for email in result.clean_emails:
            cursor.execute('''
                INSERT OR REPLACE INTO processed_emails
                (email, email_normalized, source_file, category, processed_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (email, email.lower(), result.file_path.name, 'clean', now))

        for email in result.blocked_email:
            cursor.execute('''
                INSERT OR REPLACE INTO processed_emails
                (email, email_normalized, source_file, category, processed_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (email, email.lower(), result.file_path.name, 'blocked_email', now))

        for email in result.blocked_domain:
            cursor.execute('''
                INSERT OR REPLACE INTO processed_emails
                (email, email_normalized, source_file, category, processed_at)
            ''', (email, email.lower(), result.file_path.name, 'blocked_domain', now))

        # Обновляем статистику для дашборда
        try:
            country = self._get_country_from_config(result.file_path.name)

            # Обновляем общую статистику
            self._update_processing_statistics(result, conn)

            # Обновляем статистику по странам
            if country and country != 'Unknown':
                self._update_country_statistics(country, result, conn)

            # Добавляем в историю обработки
            self._insert_processing_history(result, country, conn)

        except Exception as e:
            print(f"⚠️  Ошибка обновления статистики дашборда: {e}")
            # Не прерываем сохранение основных данных

        conn.commit()
        conn.close()

    def get_all_processed_emails(self) -> Set[str]:
        """
        Возвращает множество всех обработанных email (для дедупликации)

        Returns:
            Set[str] с нормализованными email адресами
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT DISTINCT email_normalized FROM processed_emails')

        emails = {row[0] for row in cursor.fetchall()}

        conn.close()
        return emails

    def get_processed_emails_by_file(self, filename: str) -> Dict[str, List[str]]:
        """
        Возвращает email из конкретного файла по категориям

        Args:
            filename: Имя файла

        Returns:
            Dict с категориями и списками email
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT email, category FROM processed_emails
            WHERE source_file = ?
        ''', (filename,))

        results = {
            'clean': [],
            'blocked_email': [],
            'blocked_domain': [],
            'invalid': []
        }

        for email, category in cursor.fetchall():
            if category in results:
                results[category].append(email)

        conn.close()
        return results

    def get_file_statistics(self, filename: str) -> Optional[Dict]:
        """
        Возвращает статистику обработки файла

        Args:
            filename: Имя файла

        Returns:
            Dict со статистикой или None
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM processed_files WHERE filename = ?
        ''', (filename,))

        result = cursor.fetchone()
        conn.close()

        if not result:
            return None

        # Преобразуем в словарь
        columns = [
            'filename', 'file_hash', 'file_path', 'file_type',
            'processed_at', 'processing_time', 'success', 'error',
            'total_emails', 'clean_emails', 'blocked_email',
            'blocked_domain', 'invalid_emails', 'duplicates_removed',
            'prefix_duplicates_removed', 'has_metadata'
        ]

        return dict(zip(columns, result))

    def get_all_statistics(self) -> Dict:
        """Возвращает общую статистику кеша"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        stats = {}

        # Количество обработанных файлов
        cursor.execute('SELECT COUNT(*) FROM processed_files')
        stats['total_files'] = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM processed_files WHERE success = 1')
        stats['successful_files'] = cursor.fetchone()[0]

        # Количество уникальных email
        cursor.execute('SELECT COUNT(DISTINCT email_normalized) FROM processed_emails')
        stats['total_unique_emails'] = cursor.fetchone()[0]

        # Распределение по категориям
        cursor.execute('''
            SELECT category, COUNT(*) as cnt
            FROM processed_emails
            GROUP BY category
        ''')
        stats['emails_by_category'] = dict(cursor.fetchall())

        # Размер базы
        stats['database_size_mb'] = self.db_path.stat().st_size / (1024 * 1024)

        conn.close()
        return stats

    def clear_file_cache(self, filename: str):
        """Удаляет кеш для конкретного файла"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('DELETE FROM processed_files WHERE filename = ?', (filename,))
        cursor.execute('DELETE FROM processed_emails WHERE source_file = ?', (filename,))

        conn.commit()
        conn.close()

    def clear_all(self):
        """Очищает весь кеш"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('DELETE FROM processed_files')
        cursor.execute('DELETE FROM processed_emails')

        conn.commit()
        conn.close()

    def vacuum(self):
        """Оптимизирует базу данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('VACUUM')
        conn.commit()
        conn.close()

    def _load_lists_config(self) -> Dict:
        """Загружает конфигурацию списков из lists_config.json"""
        config_path = Path("lists_config.json")

        if not config_path.exists():
            return {}

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

                # Поддержка обоих форматов: {"lists": [...]} или [...]
                if isinstance(data, dict) and 'lists' in data:
                    lists = data['lists']
                elif isinstance(data, list):
                    lists = data
                else:
                    return {}

                return {item['filename']: item for item in lists}
        except Exception as e:
            print(f"⚠️  Ошибка загрузки lists_config.json: {e}")
            return {}

    def _get_country_from_config(self, filename: str) -> str:
        """
        Получает страну для файла из конфигурации

        Args:
            filename: Имя файла

        Returns:
            Название страны или 'Unknown'
        """
        if not self.lists_config:
            return 'Unknown'

        # Прямое совпадение
        if filename in self.lists_config:
            return self.lists_config[filename].get('country', 'Unknown')

        # Поиск по префиксу (без даты)
        base_name = filename.split('_clean_')[0].split('_blocked_')[0]

        for config_filename, config in self.lists_config.items():
            if config_filename.startswith(base_name):
                return config.get('country', 'Unknown')

        return 'Unknown'

    def _update_processing_statistics(self, result, conn):
        """
        Обновляет общую статистику обработки

        Args:
            result: ProcessResult объект
            conn: SQLite connection
        """
        cursor = conn.cursor()

        try:
            # Получаем текущую статистику
            cursor.execute('SELECT * FROM processing_statistics WHERE id = 1')
            row = cursor.fetchone()

            now = datetime.now().isoformat()

            if row:
                # Обновляем существующую статистику
                cursor.execute('''
                    UPDATE processing_statistics SET
                        total_processed_emails = total_processed_emails + ?,
                        total_clean_emails = total_clean_emails + ?,
                        total_blocked_emails = total_blocked_emails + ?,
                        total_invalid_emails = total_invalid_emails + ?,
                        last_updated = ?
                    WHERE id = 1
                ''', (
                    result.total_emails,
                    len(result.clean_emails),
                    len(result.blocked_email) + len(result.blocked_domain),
                    len(result.invalid_emails),
                    now
                ))
            else:
                # Создаем первую запись
                cursor.execute('''
                    INSERT INTO processing_statistics
                    (id, total_lists, total_processed_emails, total_clean_emails,
                     total_blocked_emails, total_invalid_emails,
                     last_updated, calculated_at)
                    VALUES (1, 1, ?, ?, ?, ?, ?, ?)
                ''', (
                    result.total_emails,
                    len(result.clean_emails),
                    len(result.blocked_email) + len(result.blocked_domain),
                    len(result.invalid_emails),
                    now,
                    now
                ))

        except Exception as e:
            print(f"⚠️  Ошибка обновления processing_statistics: {e}")

    def _update_country_statistics(self, country: str, result, conn):
        """
        Обновляет статистику по странам

        Args:
            country: Название страны
            result: ProcessResult объект
            conn: SQLite connection
        """
        cursor = conn.cursor()

        try:
            clean_count = len(result.clean_emails)
            blocked_count = len(result.blocked_email) + len(result.blocked_domain)
            total_count = result.total_emails
            now = datetime.now().isoformat()

            # Проверяем существование записи для страны
            cursor.execute('SELECT * FROM country_statistics WHERE country = ?', (country,))
            row = cursor.fetchone()

            if row:
                # Обновляем существующую запись
                cursor.execute('''
                    UPDATE country_statistics SET
                        clean_emails = clean_emails + ?,
                        blocked_emails = blocked_emails + ?,
                        total_emails = total_emails + ?,
                        quality_score = CASE
                            WHEN (total_emails + ?) > 0
                            THEN ((clean_emails + ?) * 100.0 / (total_emails + ?))
                            ELSE 0
                        END,
                        last_updated = ?
                    WHERE country = ?
                ''', (
                    clean_count,
                    blocked_count,
                    total_count,
                    total_count,  # для CASE
                    clean_count,  # для CASE
                    total_count,  # для CASE
                    now,
                    country
                ))
            else:
                # Создаем новую запись
                quality_score = (clean_count / total_count * 100.0) if total_count > 0 else 0.0

                cursor.execute('''
                    INSERT INTO country_statistics
                    (country, total_lists, clean_emails, blocked_emails,
                     total_emails, quality_score, last_updated)
                    VALUES (?, 1, ?, ?, ?, ?, ?)
                ''', (country, clean_count, blocked_count, total_count, quality_score, now))

        except Exception as e:
            print(f"⚠️  Ошибка обновления country_statistics для {country}: {e}")

    def _insert_processing_history(self, result, country: str, conn):
        """
        Добавляет запись в историю обработки

        Args:
            result: ProcessResult объект
            country: Название страны
            conn: SQLite connection
        """
        cursor = conn.cursor()

        try:
            category = self.lists_config.get(result.file_path.name, {}).get('category', 'Other')

            # Вычисляем размер output файла (если он был создан)
            output_size = 0
            if result.file_path.exists():
                try:
                    # Ищем соответствующий _clean_ файл в output/
                    from pathlib import Path
                    output_dir = Path("output")
                    stem = result.file_path.stem

                    # Паттерн: stem_clean_*.txt
                    clean_files = list(output_dir.glob(f"{stem}_clean_*.txt"))
                    if clean_files:
                        # Берем самый новый файл
                        latest_file = max(clean_files, key=lambda f: f.stat().st_mtime)
                        output_size = latest_file.stat().st_size
                except Exception as e:
                    # Если не нашли файл, используем примерную оценку
                    # ~50 байт на email (среднее)
                    output_size = len(result.clean_emails) * 50

            cursor.execute('''
                INSERT INTO processing_history
                (filename, file_path, file_type, processed_at, processing_time,
                 success, total_emails, clean_emails, blocked_emails, invalid_emails,
                 country, category, output_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                result.file_path.name,
                str(result.file_path),
                result.file_type,
                result.timestamp,
                result.processing_time,
                1 if result.success else 0,
                result.total_emails,
                len(result.clean_emails),
                len(result.blocked_email) + len(result.blocked_domain),
                len(result.invalid_emails),
                country,
                category,
                output_size
            ))

        except Exception as e:
            print(f"⚠️  Ошибка добавления в processing_history: {e}")

    def export_legacy_format(self, output_file: Path):
        """
        Экспортирует кеш в старый JSON формат для совместимости

        Args:
            output_file: Путь к файлу для экспорта
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM processed_files')

        legacy_cache = {}

        for row in cursor.fetchall():
            filename = row[0]
            file_hash = row[1]

            # Получаем email для этого файла
            emails_data = self.get_processed_emails_by_file(filename)
            stats = self.get_file_statistics(filename)

            legacy_cache[filename] = {
                'hash': file_hash,
                'result_data': {
                    'filename': filename,
                    'stats': {
                        'total_checked': stats['total_emails'],
                        'clean': stats['clean_emails'],
                        'blocked_email': stats['blocked_email'],
                        'blocked_domain': stats['blocked_domain'],
                        'invalid': stats['invalid_emails'],
                    },
                    'results': emails_data,
                    'duplicates_removed': stats['duplicates_removed'],
                    'prefix_duplicates_removed': stats['prefix_duplicates_removed'],
                    'timestamp': stats['processed_at']
                },
                'processed_at': stats['processed_at']
            }

        conn.close()

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(legacy_cache, f, ensure_ascii=False, indent=2)
