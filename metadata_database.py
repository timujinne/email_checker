#!/usr/bin/env python3
"""
Централизованная база данных метаданных для email checker
"""

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import hashlib


@dataclass
class EmailMetadata:
    """Класс для метаданных email"""
    email: str
    domain: Optional[str] = None
    source_url: Optional[str] = None
    page_title: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    validation_status: Optional[str] = None
    validation_date: Optional[str] = None
    validation_log: Optional[str] = None
    source_file: Optional[str] = None
    list_country: Optional[str] = None
    country_mismatch: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class LVPSource:
    """Информация об импортированном LVP файле"""
    filename: str
    file_path: str
    file_hash: str
    import_date: str
    total_emails: int
    valid_emails: int
    invalid_emails: int
    file_size: int
    id: Optional[int] = None  # Поле БД, опциональное для создания новых записей


class MetadataDatabase:
    """Класс для работы с базой данных метаданных"""

    def __init__(self, db_path: str = "metadata.db"):
        self.db_path = Path(db_path)
        self.conn = None
        self._initialize_database()

    def _initialize_database(self):
        """Инициализация базы данных и создание таблиц"""
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
        self._create_tables()
        self._migrate_database()
        self._create_indexes()

    def _migrate_database(self):
        """Применяет миграции к существующей базе данных"""
        cursor = self.conn.cursor()

        # Проверяем существование новых полей и добавляем если нужно
        cursor.execute("PRAGMA table_info(email_metadata)")
        columns = {row[1] for row in cursor.fetchall()}

        # Добавляем list_country если нет
        if 'list_country' not in columns:
            print("🔄 Миграция: добавление поля list_country...")
            cursor.execute('ALTER TABLE email_metadata ADD COLUMN list_country TEXT')
            self.conn.commit()

        # Добавляем country_mismatch если нет
        if 'country_mismatch' not in columns:
            print("🔄 Миграция: добавление поля country_mismatch...")
            cursor.execute('ALTER TABLE email_metadata ADD COLUMN country_mismatch INTEGER DEFAULT 0')
            self.conn.commit()

    def _create_tables(self):
        """Создание таблиц в базе данных"""
        cursor = self.conn.cursor()

        # Таблица метаданных email
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                domain TEXT,
                source_url TEXT,
                page_title TEXT,
                company_name TEXT,
                phone TEXT,
                country TEXT,
                city TEXT,
                address TEXT,
                category TEXT,
                keywords TEXT,
                meta_description TEXT,
                meta_keywords TEXT,
                validation_status TEXT,
                validation_date TEXT,
                validation_log TEXT,
                source_file TEXT,
                list_country TEXT,
                country_mismatch INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Таблица импортированных LVP файлов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lvp_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT UNIQUE NOT NULL,
                file_path TEXT,
                file_hash TEXT UNIQUE,
                import_date TEXT DEFAULT CURRENT_TIMESTAMP,
                total_emails INTEGER DEFAULT 0,
                valid_emails INTEGER DEFAULT 0,
                invalid_emails INTEGER DEFAULT 0,
                file_size INTEGER DEFAULT 0
            )
        ''')

        self.conn.commit()

    def _create_indexes(self):
        """Создание индексов для быстрого поиска"""
        cursor = self.conn.cursor()

        # Индексы для таблицы email_metadata
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_email ON email_metadata(email)",
            "CREATE INDEX IF NOT EXISTS idx_domain ON email_metadata(domain)",
            "CREATE INDEX IF NOT EXISTS idx_country ON email_metadata(country)",
            "CREATE INDEX IF NOT EXISTS idx_category ON email_metadata(category)",
            "CREATE INDEX IF NOT EXISTS idx_validation_status ON email_metadata(validation_status)",
            "CREATE INDEX IF NOT EXISTS idx_source_file ON email_metadata(source_file)",
            "CREATE INDEX IF NOT EXISTS idx_company_name ON email_metadata(company_name)",
            "CREATE INDEX IF NOT EXISTS idx_city ON email_metadata(city)",

            # NEW indexes for email list management
            "CREATE INDEX IF NOT EXISTS idx_combined_filters ON email_metadata(country, category, validation_status)",
            "CREATE INDEX IF NOT EXISTS idx_created_at ON email_metadata(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_updated_at ON email_metadata(updated_at)",
            "CREATE INDEX IF NOT EXISTS idx_phone_presence ON email_metadata(phone) WHERE phone IS NOT NULL AND phone != ''"
        ]

        for index in indexes:
            cursor.execute(index)

        self.conn.commit()

    def insert_email_metadata(self, metadata: EmailMetadata) -> bool:
        """
        Вставляет или обновляет метаданные email

        Args:
            metadata: Объект EmailMetadata

        Returns:
            True если успешно, False если ошибка
        """
        try:
            cursor = self.conn.cursor()

            # Подготавливаем данные
            now = datetime.now().isoformat()
            data = asdict(metadata)
            data['updated_at'] = now

            # Если created_at не установлен, устанавливаем текущее время
            if not data.get('created_at'):
                data['created_at'] = now

            # SQL для INSERT OR REPLACE
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data.keys()])
            values = list(data.values())

            query = f'''
                INSERT OR REPLACE INTO email_metadata ({columns})
                VALUES ({placeholders})
            '''

            cursor.execute(query, values)
            self.conn.commit()
            return True

        except Exception as e:
            print(f"❌ Ошибка вставки метаданных для {metadata.email}: {e}")
            return False

    def get_email_metadata(self, email: str) -> Optional[EmailMetadata]:
        """Получает метаданные для конкретного email"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM email_metadata WHERE email = ?
        ''', (email.lower(),))

        row = cursor.fetchone()
        if row:
            row_dict = dict(row)
            # Удаляем поле id, так как оно не нужно в EmailMetadata
            if 'id' in row_dict:
                del row_dict['id']
            return EmailMetadata(**row_dict)
        return None

    def search_metadata(self,
                       email_pattern: Optional[str] = None,
                       country: Optional[str] = None,
                       category: Optional[str] = None,
                       validation_status: Optional[str] = None,
                       validation_statuses: Optional[List[str]] = None,
                       has_phone: Optional[bool] = None,
                       source_file: Optional[str] = None,
                       country_mismatch: Optional[int] = None,
                       limit: int = 1000,
                       offset: int = 0) -> List[EmailMetadata]:
        """
        Поиск метаданных по различным критериям

        Args:
            email_pattern: Шаблон email (поддерживает LIKE)
            country: Страна
            category: Категория
            validation_status: Статус валидации (одиночный, deprecated - use validation_statuses)
            validation_statuses: Список статусов валидации (поддержка множественного выбора)
            has_phone: Наличие телефона
            source_file: Исходный файл (LVP/JSON/CSV)
            country_mismatch: Фильтр по несоответствию стран (0 или 1)
            limit: Максимальное количество результатов
            offset: Смещение для пагинации

        Returns:
            Список EmailMetadata
        """
        cursor = self.conn.cursor()

        where_conditions = []
        params = []

        if email_pattern:
            where_conditions.append("email LIKE ?")
            params.append(f"%{email_pattern}%")

        if country:
            where_conditions.append("country = ?")
            params.append(country)

        if category:
            where_conditions.append("category = ?")
            params.append(category)

        # Поддержка множественного выбора статусов (новый параметр)
        if validation_statuses:
            placeholders = ','.join(['?' for _ in validation_statuses])
            where_conditions.append(f"validation_status IN ({placeholders})")
            params.extend(validation_statuses)
        # Обратная совместимость с одиночным параметром
        elif validation_status:
            where_conditions.append("validation_status = ?")
            params.append(validation_status)

        if has_phone is not None:
            if has_phone:
                where_conditions.append("phone IS NOT NULL AND phone != ''")
            else:
                where_conditions.append("(phone IS NULL OR phone = '')")

        if source_file:
            where_conditions.append("source_file = ?")
            params.append(source_file)

        if country_mismatch is not None:
            where_conditions.append("country_mismatch = ?")
            params.append(country_mismatch)

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        query = f'''
            SELECT * FROM email_metadata
            {where_clause}
            ORDER BY email
            LIMIT ? OFFSET ?
        '''

        params.extend([limit, offset])
        cursor.execute(query, params)

        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            # Удаляем поле id, так как оно не нужно в EmailMetadata
            if 'id' in row_dict:
                del row_dict['id']
            results.append(EmailMetadata(**row_dict))

        return results

    def get_country_mismatches(self, source_file: Optional[str] = None, limit: int = 1000) -> List[EmailMetadata]:
        """
        Получает emails с несоответствием страны между email и списком

        Args:
            source_file: Фильтр по исходному файлу (необязательно)
            limit: Максимальное количество результатов

        Returns:
            Список EmailMetadata с несоответствиями
        """
        cursor = self.conn.cursor()

        where_conditions = ["country_mismatch = 1"]

        if source_file:
            where_conditions.append("source_file = ?")
            params = [source_file, limit]
        else:
            params = [limit]

        where_clause = " AND ".join(where_conditions)

        query = f'''
            SELECT * FROM email_metadata
            WHERE {where_clause}
            ORDER BY source_file, email
            LIMIT ?
        '''

        cursor.execute(query, params)

        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            if 'id' in row_dict:
                del row_dict['id']
            results.append(EmailMetadata(**row_dict))

        return results

    def update_country_mismatch(self, email: str, list_country: str, email_country: str):
        """
        Обновляет информацию о несоответствии стран для email

        Args:
            email: Email адрес
            list_country: Страна из списка (lvp файла)
            email_country: Страна из метаданных email
        """
        cursor = self.conn.cursor()
        now = datetime.now().isoformat()

        # Определяем есть ли несоответствие
        mismatch = 0
        if list_country and email_country and list_country != email_country:
            # Оба значения есть и различаются
            mismatch = 1

        cursor.execute('''
            UPDATE email_metadata
            SET list_country = ?,
                country_mismatch = ?,
                updated_at = ?
            WHERE email = ?
        ''', (list_country, mismatch, now, email))

        self.conn.commit()

    def get_country_mismatch_counts_by_file(self) -> Dict[str, int]:
        """
        Получает количество несоответствий стран для каждого source_file

        Returns:
            Dict с ключами filename и значениями - количество несоответствий
        """
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT source_file, COUNT(*) as mismatch_count
            FROM email_metadata
            WHERE country_mismatch = 1 AND source_file IS NOT NULL
            GROUP BY source_file
        ''')

        result = {}
        for row in cursor.fetchall():
            result[row['source_file']] = row['mismatch_count']

        return result

    def get_statistics(self) -> Dict:
        """Получает статистику по базе данных"""
        cursor = self.conn.cursor()

        # Общая статистика
        cursor.execute("SELECT COUNT(*) as total FROM email_metadata")
        total = cursor.fetchone()['total']

        # Статистика по странам
        cursor.execute('''
            SELECT country, COUNT(*) as count
            FROM email_metadata
            WHERE country IS NOT NULL AND country != ''
            GROUP BY country
            ORDER BY count DESC
            LIMIT 10
        ''')
        countries = {row['country']: row['count'] for row in cursor.fetchall()}

        # Статистика по категориям
        cursor.execute('''
            SELECT category, COUNT(*) as count
            FROM email_metadata
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category
            ORDER BY count DESC
            LIMIT 10
        ''')
        categories = {row['category']: row['count'] for row in cursor.fetchall()}

        # Статистика по валидации
        cursor.execute('''
            SELECT validation_status, COUNT(*) as count
            FROM email_metadata
            GROUP BY validation_status
        ''')
        validation_statuses = {row['validation_status']: row['count'] for row in cursor.fetchall()}

        # Статистика по наличию телефонов
        cursor.execute('''
            SELECT
                COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
                COUNT(CASE WHEN phone IS NULL OR phone = '' THEN 1 END) as without_phone
            FROM email_metadata
        ''')
        phone_stats = cursor.fetchone()

        # Статистика по несоответствиям стран
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM email_metadata
            WHERE country_mismatch = 1
        ''')
        country_mismatches = cursor.fetchone()['count']

        return {
            "total_emails": total,
            "countries": countries,
            "categories": categories,
            "validation_statuses": validation_statuses,
            "with_phone": phone_stats['with_phone'],
            "without_phone": phone_stats['without_phone'],
            "country_mismatches": country_mismatches
        }

    def batch_update_validation_status(self, emails: List[str], new_status: str) -> Tuple[bool, int]:
        """
        Массовое обновление статуса валидации для списка emails

        Args:
            emails: Список email адресов для обновления
            new_status: Новый статус валидации (Valid, NotSure, Temp, Invalid)

        Returns:
            Tuple[bool, int]: (успешность операции, количество обновленных записей)
        """
        if not emails:
            return False, 0

        if new_status not in ['Valid', 'NotSure', 'Temp', 'Invalid']:
            print(f"❌ Недопустимый статус: {new_status}")
            return False, 0

        try:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()

            # Подготовка списка email для SQL IN clause
            placeholders = ','.join(['?' for _ in emails])

            query = f'''
                UPDATE email_metadata
                SET validation_status = ?,
                    validation_date = ?,
                    updated_at = ?
                WHERE email IN ({placeholders})
            '''

            params = [new_status, now, now] + emails
            cursor.execute(query, params)
            self.conn.commit()

            updated_count = cursor.rowcount
            print(f"✅ Обновлено {updated_count} записей со статусом {new_status}")
            return True, updated_count

        except Exception as e:
            print(f"❌ Ошибка массового обновления: {e}")
            return False, 0

    def batch_update_field(self, emails: List[str], field_name: str, new_value: str) -> Tuple[bool, int]:
        """
        Массовое обновление любого поля для списка emails

        Args:
            emails: Список email адресов для обновления
            field_name: Имя поля для обновления (country, category, и т.д.)
            new_value: Новое значение поля

        Returns:
            Tuple[bool, int]: (успешность операции, количество обновленных записей)
        """
        if not emails:
            return False, 0

        # Белый список разрешенных полей для обновления
        allowed_fields = ['country', 'category', 'city', 'phone', 'company_name', 'validation_status', 'address', 'list_country']
        if field_name not in allowed_fields:
            print(f"❌ Недопустимое поле для обновления: {field_name}")
            return False, 0

        try:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()

            # Подготовка списка email для SQL IN clause
            placeholders = ','.join(['?' for _ in emails])

            query = f'''
                UPDATE email_metadata
                SET {field_name} = ?,
                    updated_at = ?
                WHERE email IN ({placeholders})
            '''

            params = [new_value, now] + emails
            cursor.execute(query, params)
            self.conn.commit()

            updated_count = cursor.rowcount
            print(f"✅ Обновлено {updated_count} записей: {field_name} = {new_value}")
            return True, updated_count

        except Exception as e:
            print(f"❌ Ошибка массового обновления поля {field_name}: {e}")
            return False, 0

    def get_emails_paginated(self,
                            page: int = 1,
                            page_size: int = 100,
                            sort_by: str = 'email',
                            sort_order: str = 'asc',
                            filters: Dict = None) -> Tuple[List[EmailMetadata], int]:
        """
        Get paginated emails with filters

        Args:
            page: Page number (1-based)
            page_size: Number of results per page
            sort_by: Column to sort by
            sort_order: Sort order ('asc' or 'desc')
            filters: Dictionary with filter criteria

        Returns:
            Tuple[List[EmailMetadata], int]: (email list, total count)
        """
        cursor = self.conn.cursor()

        # Build WHERE clause from filters
        where_conditions = []
        params = []

        if filters:
            if filters.get('source'):
                where_conditions.append("source_file = ?")
                params.append(filters['source'])

            if filters.get('country'):
                where_conditions.append("country = ?")
                params.append(filters['country'])

            if filters.get('category'):
                where_conditions.append("category = ?")
                params.append(filters['category'])

            if filters.get('validation_status'):
                statuses = filters['validation_status']
                if isinstance(statuses, list):
                    placeholders = ','.join(['?' for _ in statuses])
                    where_conditions.append(f"validation_status IN ({placeholders})")
                    params.extend(statuses)
                else:
                    where_conditions.append("validation_status = ?")
                    params.append(statuses)

            if filters.get('has_phone') is not None:
                if filters['has_phone']:
                    where_conditions.append("phone IS NOT NULL AND phone != ''")
                else:
                    where_conditions.append("(phone IS NULL OR phone = '')")

            if filters.get('search'):
                search_term = f"%{filters['search']}%"
                where_conditions.append("(email LIKE ? OR company_name LIKE ? OR domain LIKE ?)")
                params.extend([search_term, search_term, search_term])

            if filters.get('country_mismatch') is not None:
                where_conditions.append("country_mismatch = ?")
                params.append(filters['country_mismatch'])

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # Get total count
        count_query = f"SELECT COUNT(*) as count FROM email_metadata {where_clause}"
        cursor.execute(count_query, params[:])  # Use a copy of params
        total_count = cursor.fetchone()['count']

        # Validate sort_by to prevent SQL injection
        allowed_sort_columns = ['email', 'domain', 'company_name', 'country', 'category',
                               'validation_status', 'created_at', 'updated_at', 'phone', 'city']
        if sort_by not in allowed_sort_columns:
            sort_by = 'email'

        sort_order = 'DESC' if sort_order.lower() == 'desc' else 'ASC'

        # Get paginated results
        offset = (page - 1) * page_size
        data_query = f'''
            SELECT * FROM email_metadata
            {where_clause}
            ORDER BY {sort_by} {sort_order}
            LIMIT ? OFFSET ?
        '''

        cursor.execute(data_query, params + [page_size, offset])

        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            if 'id' in row_dict:
                del row_dict['id']
            results.append(EmailMetadata(**row_dict))

        return results, total_count

    def bulk_delete_emails(self, emails: List[str]) -> Tuple[bool, int]:
        """
        Delete multiple emails from the database

        Args:
            emails: List of email addresses to delete

        Returns:
            Tuple[bool, int]: (success, deleted_count)
        """
        if not emails:
            return False, 0

        try:
            cursor = self.conn.cursor()
            placeholders = ','.join(['?' for _ in emails])

            query = f'DELETE FROM email_metadata WHERE email IN ({placeholders})'
            cursor.execute(query, emails)
            self.conn.commit()

            deleted_count = cursor.rowcount
            print(f"✅ Удалено {deleted_count} email из базы данных")
            return True, deleted_count

        except Exception as e:
            print(f"❌ Ошибка при удалении emails: {e}")
            return False, 0

    def insert_lvp_source(self, source: LVPSource) -> bool:
        """Регистрирует импортированный LVP файл"""
        try:
            cursor = self.conn.cursor()
            data = asdict(source)

            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data.keys()])
            values = list(data.values())

            query = f'''
                INSERT OR REPLACE INTO lvp_sources ({columns})
                VALUES ({placeholders})
            '''

            cursor.execute(query, values)
            self.conn.commit()
            return True

        except Exception as e:
            print(f"❌ Ошибка регистрации LVP источника {source.filename}: {e}")
            return False

    def get_lvp_sources(self) -> List[LVPSource]:
        """Получает список всех импортированных LVP файлов"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM lvp_sources ORDER BY import_date DESC")

        sources = []
        for row in cursor.fetchall():
            sources.append(LVPSource(**dict(row)))

        return sources

    def is_lvp_imported(self, file_path: str) -> bool:
        """Проверяет, был ли LVP файл уже импортирован"""
        file_hash = self._calculate_file_hash(file_path)
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM lvp_sources WHERE file_hash = ?", (file_hash,))
        return cursor.fetchone()['count'] > 0

    def _calculate_file_hash(self, file_path: str) -> str:
        """Вычисляет SHA256 хеш файла"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def close(self):
        """Закрывает соединение с базой данных"""
        if self.conn:
            self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


if __name__ == "__main__":
    # Тестирование базы данных
    with MetadataDatabase() as db:
        print("🔧 Создание базы данных метаданных...")

        # Тестовая вставка
        test_metadata = EmailMetadata(
            email="test@example.com",
            domain="example.com",
            country="Poland",
            category="Technology",
            validation_status="Valid"
        )

        success = db.insert_email_metadata(test_metadata)
        print(f"✅ Тестовая запись: {'успешно' if success else 'ошибка'}")

        # Получение статистики
        stats = db.get_statistics()
        print(f"📊 Статистика: {stats['total_emails']} email в базе")

        print("✅ База данных метаданных готова!")