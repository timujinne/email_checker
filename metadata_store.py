#!/usr/bin/env python3
"""
Metadata Store - хранилище метаданных для обогащения email между форматами

Ключевая функция: сохранять метаданные из LVP файлов и использовать их
при обработке TXT файлов, чтобы не терять ценную информацию
"""

import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime
from email_metadata import EmailWithMetadata


class MetadataStore:
    """
    SQLite-based хранилище метаданных

    Хранит метаданные из LVP файлов и предоставляет их для
    обогащения TXT файлов при повторной обработке
    """

    def __init__(self, db_path: str = ".cache/metadata_store.db"):
        """
        Args:
            db_path: Путь к файлу базы данных
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        self._init_database()

    def _init_database(self):
        """Инициализирует структуру базы данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Таблица метаданных email
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_metadata (
                email TEXT PRIMARY KEY,
                email_normalized TEXT NOT NULL,

                -- Информация об источнике
                source_url TEXT,
                domain TEXT,
                page_title TEXT,
                meta_description TEXT,
                meta_keywords TEXT,

                -- Контактная информация
                company_name TEXT,
                phone TEXT,
                country TEXT,
                city TEXT,
                address TEXT,

                -- Категоризация
                category TEXT,
                keywords TEXT,

                -- Валидация (из LVP)
                validation_status TEXT,
                validation_log TEXT,
                validation_date TEXT,

                -- Служебные поля
                source_file TEXT,
                first_seen TEXT,
                last_updated TEXT,

                -- Полные данные в JSON для расширяемости
                metadata_json TEXT
            )
        ''')

        # Индексы для быстрого поиска
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_email_normalized
            ON email_metadata(email_normalized)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_domain
            ON email_metadata(domain)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_country
            ON email_metadata(country)
        ''')

        # Таблица статистики
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS store_stats (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        ''')

        conn.commit()
        conn.close()

    def save_metadata(self, email_obj: EmailWithMetadata, source_file: str = None):
        """
        Сохраняет метаданные для email

        Args:
            email_obj: Объект EmailWithMetadata
            source_file: Имя исходного файла
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = datetime.now().isoformat()
        email_normalized = email_obj.email.lower()

        # Проверяем существует ли запись
        cursor.execute(
            'SELECT first_seen FROM email_metadata WHERE email_normalized = ?',
            (email_normalized,)
        )
        existing = cursor.fetchone()
        first_seen = existing[0] if existing else now

        # Сохраняем или обновляем
        cursor.execute('''
            INSERT OR REPLACE INTO email_metadata (
                email, email_normalized, source_url, domain, page_title,
                meta_description, meta_keywords, company_name, phone,
                country, city, address, category, keywords,
                validation_status, validation_log, validation_date,
                source_file, first_seen, last_updated, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            email_obj.email,
            email_normalized,
            email_obj.source_url,
            email_obj.domain,
            email_obj.page_title,
            email_obj.meta_description,
            email_obj.meta_keywords,
            email_obj.company_name,
            email_obj.phone,
            email_obj.country,
            email_obj.city,
            email_obj.address,
            email_obj.category,
            email_obj.keywords,
            email_obj.validation_status,
            email_obj.validation_log,
            email_obj.validation_date,
            source_file,
            first_seen,
            now,
            json.dumps(email_obj.to_dict())
        ))

        conn.commit()
        conn.close()

    def get_metadata(self, email: str) -> Optional[EmailWithMetadata]:
        """
        Получает метаданные для email

        Args:
            email: Email адрес

        Returns:
            EmailWithMetadata или None если не найдено
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        email_normalized = email.lower()

        cursor.execute('''
            SELECT metadata_json FROM email_metadata
            WHERE email_normalized = ?
        ''', (email_normalized,))

        result = cursor.fetchone()
        conn.close()

        if result:
            metadata_dict = json.loads(result[0])
            return EmailWithMetadata(**metadata_dict)

        return None

    def batch_get_metadata(self, emails: List[str]) -> Dict[str, EmailWithMetadata]:
        """
        Получает метаданные для списка email (оптимизированный batch запрос)

        Args:
            emails: Список email адресов

        Returns:
            Словарь {email: EmailWithMetadata}
        """
        if not emails:
            return {}

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Нормализуем все email
        emails_normalized = [email.lower() for email in emails]

        # Batch запрос с IN clause
        placeholders = ','.join('?' * len(emails_normalized))
        cursor.execute(f'''
            SELECT email, metadata_json FROM email_metadata
            WHERE email_normalized IN ({placeholders})
        ''', emails_normalized)

        results = {}
        for row in cursor.fetchall():
            email, metadata_json = row
            metadata_dict = json.loads(metadata_json)
            results[email] = EmailWithMetadata(**metadata_dict)

        conn.close()
        return results

    def get_statistics(self) -> Dict:
        """Возвращает статистику хранилища"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        stats = {}

        # Общее количество email
        cursor.execute('SELECT COUNT(*) FROM email_metadata')
        stats['total_emails'] = cursor.fetchone()[0]

        # Количество с метаданными разных типов
        cursor.execute('''
            SELECT COUNT(*) FROM email_metadata
            WHERE company_name IS NOT NULL AND company_name != ''
        ''')
        stats['with_company_name'] = cursor.fetchone()[0]

        cursor.execute('''
            SELECT COUNT(*) FROM email_metadata
            WHERE phone IS NOT NULL AND phone != ''
        ''')
        stats['with_phone'] = cursor.fetchone()[0]

        cursor.execute('''
            SELECT COUNT(*) FROM email_metadata
            WHERE validation_status IS NOT NULL
        ''')
        stats['with_validation'] = cursor.fetchone()[0]

        # Распределение по странам
        cursor.execute('''
            SELECT country, COUNT(*) as cnt
            FROM email_metadata
            WHERE country IS NOT NULL AND country != ''
            GROUP BY country
            ORDER BY cnt DESC
            LIMIT 10
        ''')
        stats['top_countries'] = dict(cursor.fetchall())

        # Размер базы
        stats['database_size_mb'] = self.db_path.stat().st_size / (1024 * 1024)

        conn.close()
        return stats

    def search_by_company(self, company_name: str) -> List[EmailWithMetadata]:
        """Поиск email по названию компании"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT metadata_json FROM email_metadata
            WHERE company_name LIKE ?
            LIMIT 100
        ''', (f'%{company_name}%',))

        results = []
        for row in cursor.fetchall():
            metadata_dict = json.loads(row[0])
            results.append(EmailWithMetadata(**metadata_dict))

        conn.close()
        return results

    def search_by_country(self, country: str) -> List[EmailWithMetadata]:
        """Поиск email по стране"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT metadata_json FROM email_metadata
            WHERE country = ?
            LIMIT 1000
        ''', (country,))

        results = []
        for row in cursor.fetchall():
            metadata_dict = json.loads(row[0])
            results.append(EmailWithMetadata(**metadata_dict))

        conn.close()
        return results

    def clear_all(self):
        """Очищает все данные (для тестирования)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM email_metadata')
        conn.commit()
        conn.close()

    def vacuum(self):
        """Оптимизирует базу данных (сжимает размер файла)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('VACUUM')
        conn.commit()
        conn.close()
