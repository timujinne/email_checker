#!/usr/bin/env python3
"""
Миграция существующих JSON метаданных в централизованную базу данных
"""

import json
import os
from pathlib import Path
from datetime import datetime
from metadata_database import MetadataDatabase, EmailMetadata, LVPSource
import hashlib


class MetadataMigrator:
    """Класс для миграции метаданных из JSON файлов в базу данных"""

    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.output_dir = self.base_dir / "output"
        self.db = MetadataDatabase()

    def migrate_all_json_files(self):
        """Мигрирует все JSON файлы с метаданными в базу данных"""
        print("🔄 Начинаем миграцию метаданных в базу данных...")

        if not self.output_dir.exists():
            print("❌ Папка output не найдена")
            return

        # Находим все JSON файлы с метаданными
        metadata_files = list(self.output_dir.glob("*metadata*.json"))

        if not metadata_files:
            print("❌ Не найдено JSON файлов с метаданными")
            return

        total_emails = 0
        processed_files = 0
        skipped_emails = 0

        for json_file in metadata_files:
            try:
                print(f"\n📄 Обрабатываем {json_file.name}...")

                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                emails = data.get("emails", [])
                file_emails = 0
                file_skipped = 0

                for email_data in emails:
                    email_address = email_data.get("email", "").strip().lower()

                    if not email_address:
                        file_skipped += 1
                        continue

                    # Создаем объект EmailMetadata
                    metadata = EmailMetadata(
                        email=email_address,
                        domain=email_data.get("domain"),
                        source_url=email_data.get("source_url"),
                        page_title=email_data.get("page_title"),
                        company_name=email_data.get("company_name"),
                        phone=email_data.get("phone"),
                        country=email_data.get("country"),
                        city=email_data.get("city"),
                        address=email_data.get("address"),
                        category=email_data.get("category"),
                        keywords=email_data.get("keywords"),
                        meta_description=email_data.get("meta_description"),
                        meta_keywords=email_data.get("meta_keywords"),
                        validation_status=email_data.get("validation_status"),
                        validation_date=email_data.get("validation_date"),
                        validation_log=email_data.get("validation_log"),
                        source_file=json_file.name
                    )

                    # Вставляем в базу данных
                    if self.db.insert_email_metadata(metadata):
                        file_emails += 1
                    else:
                        file_skipped += 1

                total_emails += file_emails
                skipped_emails += file_skipped
                processed_files += 1

                print(f"✅ Импортировано {file_emails} email из {json_file.name}")
                if file_skipped > 0:
                    print(f"⚠️  Пропущено {file_skipped} записей")

            except Exception as e:
                print(f"❌ Ошибка обработки {json_file.name}: {e}")

        print(f"\n{'='*60}")
        print(f"📊 ИТОГИ МИГРАЦИИ:")
        print(f"📁 Обработано файлов: {processed_files}")
        print(f"📧 Импортировано email: {total_emails:,}")
        print(f"⚠️  Пропущено записей: {skipped_emails:,}")
        print(f"{'='*60}")

        # Показываем статистику базы данных
        self._show_database_statistics()

    def _show_database_statistics(self):
        """Показывает статистику по базе данных после миграции"""
        print("\n📈 СТАТИСТИКА БАЗЫ ДАННЫХ:")

        stats = self.db.get_statistics()

        print(f"📧 Всего email: {stats['total_emails']:,}")
        print(f"📞 С телефонами: {stats['with_phone']:,}")
        print(f"🚫 Без телефонов: {stats['without_phone']:,}")

        print(f"\n🌍 Топ страны:")
        for country, count in list(stats['countries'].items())[:10]:
            print(f"  {country}: {count:,}")

        print(f"\n🏢 Топ категории:")
        for category, count in list(stats['categories'].items())[:10]:
            print(f"  {category}: {count:,}")

        print(f"\n✅ Статусы валидации:")
        for status, count in stats['validation_statuses'].items():
            status_name = status or "Unknown"
            print(f"  {status_name}: {count:,}")

    def deduplicate_database(self):
        """Удаляет дубликаты из базы данных, оставляя самые полные записи"""
        print("\n🧹 Удаление дубликатов...")

        # SQL запрос для удаления дубликатов, оставляя запись с максимальным количеством заполненных полей
        cursor = self.db.conn.cursor()

        # Создаем временную таблицу с подсчетом заполненных полей
        cursor.execute('''
            CREATE TEMPORARY TABLE temp_email_scores AS
            SELECT
                id,
                email,
                (CASE WHEN domain IS NOT NULL AND domain != '' THEN 1 ELSE 0 END +
                 CASE WHEN source_url IS NOT NULL AND source_url != '' THEN 1 ELSE 0 END +
                 CASE WHEN page_title IS NOT NULL AND page_title != '' THEN 1 ELSE 0 END +
                 CASE WHEN company_name IS NOT NULL AND company_name != '' THEN 1 ELSE 0 END +
                 CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END +
                 CASE WHEN country IS NOT NULL AND country != '' THEN 1 ELSE 0 END +
                 CASE WHEN city IS NOT NULL AND city != '' THEN 1 ELSE 0 END +
                 CASE WHEN address IS NOT NULL AND address != '' THEN 1 ELSE 0 END +
                 CASE WHEN category IS NOT NULL AND category != '' THEN 1 ELSE 0 END +
                 CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 ELSE 0 END +
                 CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 1 ELSE 0 END +
                 CASE WHEN meta_keywords IS NOT NULL AND meta_keywords != '' THEN 1 ELSE 0 END +
                 CASE WHEN validation_status IS NOT NULL AND validation_status != '' THEN 1 ELSE 0 END +
                 CASE WHEN validation_date IS NOT NULL AND validation_date != '' THEN 1 ELSE 0 END
                ) as completeness_score,
                ROW_NUMBER() OVER (PARTITION BY email ORDER BY
                    (CASE WHEN domain IS NOT NULL AND domain != '' THEN 1 ELSE 0 END +
                     CASE WHEN source_url IS NOT NULL AND source_url != '' THEN 1 ELSE 0 END +
                     CASE WHEN page_title IS NOT NULL AND page_title != '' THEN 1 ELSE 0 END +
                     CASE WHEN company_name IS NOT NULL AND company_name != '' THEN 1 ELSE 0 END +
                     CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END +
                     CASE WHEN country IS NOT NULL AND country != '' THEN 1 ELSE 0 END +
                     CASE WHEN city IS NOT NULL AND city != '' THEN 1 ELSE 0 END +
                     CASE WHEN address IS NOT NULL AND address != '' THEN 1 ELSE 0 END +
                     CASE WHEN category IS NOT NULL AND category != '' THEN 1 ELSE 0 END +
                     CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 ELSE 0 END +
                     CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 1 ELSE 0 END +
                     CASE WHEN meta_keywords IS NOT NULL AND meta_keywords != '' THEN 1 ELSE 0 END +
                     CASE WHEN validation_status IS NOT NULL AND validation_status != '' THEN 1 ELSE 0 END +
                     CASE WHEN validation_date IS NOT NULL AND validation_date != '' THEN 1 ELSE 0 END
                    ) DESC, updated_at DESC
                ) as row_num
            FROM email_metadata
        ''')

        # Получаем количество дубликатов
        cursor.execute('''
            SELECT COUNT(*) FROM temp_email_scores WHERE row_num > 1
        ''')
        duplicates_count = cursor.fetchone()[0]

        if duplicates_count > 0:
            # Удаляем дубликаты (оставляем только записи с row_num = 1)
            cursor.execute('''
                DELETE FROM email_metadata
                WHERE id IN (
                    SELECT id FROM temp_email_scores WHERE row_num > 1
                )
            ''')

            self.db.conn.commit()
            print(f"🗑️  Удалено {duplicates_count} дубликатов")
        else:
            print("✅ Дубликаты не найдены")

        # Удаляем временную таблицу
        cursor.execute('DROP TABLE temp_email_scores')

    def optimize_database(self):
        """Оптимизирует базу данных"""
        print("\n⚡ Оптимизация базы данных...")

        cursor = self.db.conn.cursor()

        # Перестраиваем индексы
        cursor.execute('REINDEX')

        # Сжимаем базу данных
        cursor.execute('VACUUM')

        self.db.conn.commit()
        print("✅ База данных оптимизирована")

    def close(self):
        """Закрывает соединение с базой данных"""
        self.db.close()


def main():
    """Главная функция миграции"""
    print("🚀 МИГРАЦИЯ МЕТАДАННЫХ В БАЗУ ДАННЫХ")
    print("="*50)

    migrator = MetadataMigrator()

    try:
        # Выполняем миграцию
        migrator.migrate_all_json_files()

        # Удаляем дубликаты
        migrator.deduplicate_database()

        # Оптимизируем базу данных
        migrator.optimize_database()

        print("\n🎉 Миграция завершена успешно!")

    except Exception as e:
        print(f"\n❌ Ошибка миграции: {e}")

    finally:
        migrator.close()


if __name__ == "__main__":
    main()