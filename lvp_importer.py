#!/usr/bin/env python3
"""
Система импорта LVP файлов в базу данных метаданных
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from metadata_database import MetadataDatabase, EmailMetadata, LVPSource
from email_metadata import EmailMetadataManager
import hashlib


class LVPImporter:
    """Класс для импорта LVP файлов в базу данных"""

    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.db = MetadataDatabase()
        self.metadata_manager = EmailMetadataManager(str(self.base_dir))
        self.import_stats = {
            "files_processed": 0,
            "emails_imported": 0,
            "emails_skipped": 0,
            "files_skipped": 0,
            "errors": []
        }

    def import_lvp_file(self, file_path: str) -> Dict:
        """
        Импортирует один LVP файл в базу данных

        Args:
            file_path: Путь к LVP файлу

        Returns:
            Словарь с результатами импорта
        """
        file_path = Path(file_path)

        if not file_path.exists():
            error = f"Файл {file_path} не найден"
            self.import_stats["errors"].append(error)
            return {"success": False, "error": error}

        # Проверяем, не импортирован ли файл уже
        if self.db.is_lvp_imported(str(file_path)):
            error = f"Файл {file_path.name} уже был импортирован"
            self.import_stats["files_skipped"] += 1
            return {"success": False, "error": error}

        print(f"\n📄 Импорт LVP файла: {file_path.name}")
        print(f"📊 Размер файла: {self._format_file_size(file_path.stat().st_size)}")

        try:
            # Загружаем email с метаданными из LVP файла
            emails_with_metadata = self.metadata_manager.load_emails_from_file(str(file_path))

            if not emails_with_metadata:
                error = f"Не удалось извлечь email из файла {file_path.name}"
                self.import_stats["errors"].append(error)
                return {"success": False, "error": error}

            # Статистика для этого файла
            file_stats = {
                "total_emails": len(emails_with_metadata),
                "imported_emails": 0,
                "skipped_emails": 0,
                "valid_emails": 0,
                "invalid_emails": 0
            }

            # Импортируем каждый email в базу данных
            for email_obj in emails_with_metadata:
                if not email_obj.email:
                    file_stats["skipped_emails"] += 1
                    continue

                # Конвертируем в EmailMetadata
                metadata = EmailMetadata(
                    email=email_obj.email.lower(),
                    domain=email_obj.domain,
                    source_url=email_obj.source_url,
                    page_title=email_obj.page_title,
                    company_name=email_obj.company_name,
                    phone=email_obj.phone,
                    country=email_obj.country,
                    city=email_obj.city,
                    address=email_obj.address,
                    category=email_obj.category,
                    keywords=email_obj.keywords,
                    meta_description=email_obj.meta_description,
                    meta_keywords=email_obj.meta_keywords,
                    validation_status=email_obj.validation_status,
                    validation_date=email_obj.validation_date,
                    validation_log=getattr(email_obj, 'validation_log', None),
                    source_file=file_path.name
                )

                # Вставляем в базу данных
                if self.db.insert_email_metadata(metadata):
                    file_stats["imported_emails"] += 1
                    if metadata.validation_status == "Valid":
                        file_stats["valid_emails"] += 1
                    else:
                        file_stats["invalid_emails"] += 1
                else:
                    file_stats["skipped_emails"] += 1

            # Регистрируем источник LVP файла
            lvp_source = LVPSource(
                filename=file_path.name,
                file_path=str(file_path),
                file_hash=self._calculate_file_hash(str(file_path)),
                import_date=datetime.now().isoformat(),
                total_emails=file_stats["total_emails"],
                valid_emails=file_stats["valid_emails"],
                invalid_emails=file_stats["invalid_emails"],
                file_size=file_path.stat().st_size
            )

            if not self.db.insert_lvp_source(lvp_source):
                print("⚠️  Предупреждение: не удалось зарегистрировать источник LVP")

            # Обновляем общую статистику
            self.import_stats["files_processed"] += 1
            self.import_stats["emails_imported"] += file_stats["imported_emails"]
            self.import_stats["emails_skipped"] += file_stats["skipped_emails"]

            print(f"✅ Импортировано {file_stats['imported_emails']} email из {file_path.name}")
            print(f"   📊 Валидных: {file_stats['valid_emails']}, Невалидных: {file_stats['invalid_emails']}")

            return {
                "success": True,
                "filename": file_path.name,
                "stats": file_stats
            }

        except Exception as e:
            error = f"Ошибка импорта {file_path.name}: {str(e)}"
            self.import_stats["errors"].append(error)
            print(f"❌ {error}")
            return {"success": False, "error": error}

    def import_multiple_lvp_files(self, file_paths: List[str]) -> Dict:
        """
        Импортирует множество LVP файлов

        Args:
            file_paths: Список путей к LVP файлам

        Returns:
            Общая статистика импорта
        """
        print(f"🚀 Начинаем импорт {len(file_paths)} LVP файлов...")

        results = []
        for file_path in file_paths:
            result = self.import_lvp_file(file_path)
            results.append(result)

        return {
            "total_files": len(file_paths),
            "results": results,
            "overall_stats": self.import_stats.copy()
        }

    def scan_downloads_folder(self, downloads_path: str = "/mnt/e/shtim/Downloads/", max_files: int = 20) -> List[str]:
        """
        Сканирует папку Downloads на предмет LVP файлов

        Args:
            downloads_path: Путь к папке Downloads
            max_files: Максимальное количество файлов для проверки (для производительности)

        Returns:
            Список путей к найденным LVP файлам
        """
        downloads_dir = Path(downloads_path)

        if not downloads_dir.exists():
            print(f"❌ Папка {downloads_path} не найдена")
            return []

        # Ищем все LVP файлы
        all_lvp_files = list(downloads_dir.glob("*.lvp"))

        # Ограничиваем количество файлов для производительности
        lvp_files_to_check = sorted(all_lvp_files, key=lambda x: x.stat().st_mtime, reverse=True)[:max_files]

        if len(all_lvp_files) > max_files:
            print(f"📦 Найдено {len(all_lvp_files)} LVP файлов, проверяем {max_files} самых новых")

        # Фильтруем уже импортированные файлы
        new_files = []
        for lvp_file in lvp_files_to_check:
            if not self.db.is_lvp_imported(str(lvp_file)):
                new_files.append(str(lvp_file))
            else:
                print(f"⏭️  Пропускаем уже импортированный файл: {lvp_file.name}")

        print(f"🔍 Проверено {len(lvp_files_to_check)} из {len(all_lvp_files)} LVP файлов, {len(new_files)} новых")

        return new_files

    def get_import_suggestions(self) -> Dict:
        """
        Возвращает предложения для импорта из папки Downloads

        Returns:
            Словарь с информацией о доступных файлах
        """
        downloads_files = self.scan_downloads_folder()
        imported_sources = self.db.get_lvp_sources()

        return {
            "available_files": [
                {
                    "filename": Path(file_path).name,
                    "file_path": file_path,
                    "file_size": self._format_file_size(Path(file_path).stat().st_size),
                    "modified_date": datetime.fromtimestamp(Path(file_path).stat().st_mtime).isoformat()
                }
                for file_path in downloads_files
            ],
            "imported_sources": [
                {
                    "filename": source.filename,
                    "import_date": source.import_date,
                    "total_emails": source.total_emails,
                    "valid_emails": source.valid_emails,
                    "file_size": self._format_file_size(source.file_size)
                }
                for source in imported_sources
            ]
        }

    def _calculate_file_hash(self, file_path: str) -> str:
        """Вычисляет SHA256 хеш файла"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _format_file_size(self, size: int) -> str:
        """Форматирует размер файла в человекочитаемый вид"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

    def close(self):
        """Закрывает соединение с базой данных"""
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def main():
    """Главная функция для CLI импорта"""
    import argparse

    parser = argparse.ArgumentParser(description="Импорт LVP файлов в базу данных")
    parser.add_argument("--scan", action="store_true", help="Сканировать папку Downloads")
    parser.add_argument("--import-all", action="store_true", help="Импортировать все найденные LVP файлы")
    parser.add_argument("files", nargs="*", help="Пути к конкретным LVP файлам для импорта")

    args = parser.parse_args()

    with LVPImporter() as importer:
        if args.scan:
            # Показываем доступные файлы
            suggestions = importer.get_import_suggestions()

            print("📁 ДОСТУПНЫЕ LVP ФАЙЛЫ:")
            for file_info in suggestions["available_files"]:
                print(f"  📄 {file_info['filename']} ({file_info['file_size']})")

            print(f"\n📚 УЖЕ ИМПОРТИРОВАННЫЕ ФАЙЛЫ:")
            for source_info in suggestions["imported_sources"]:
                print(f"  ✅ {source_info['filename']} - {source_info['total_emails']} email")

        elif args.import_all:
            # Импортируем все новые файлы
            new_files = importer.scan_downloads_folder()
            if new_files:
                result = importer.import_multiple_lvp_files(new_files)
                print(f"\n🎉 Импорт завершен!")
                print(f"📊 Обработано файлов: {result['overall_stats']['files_processed']}")
                print(f"📧 Импортировано email: {result['overall_stats']['emails_imported']:,}")
            else:
                print("ℹ️  Новых LVP файлов для импорта не найдено")

        elif args.files:
            # Импортируем указанные файлы
            result = importer.import_multiple_lvp_files(args.files)
            print(f"\n🎉 Импорт завершен!")
            print(f"📊 Обработано файлов: {result['overall_stats']['files_processed']}")
            print(f"📧 Импортировано email: {result['overall_stats']['emails_imported']:,}")

        else:
            print("❌ Укажите --scan, --import-all или конкретные файлы для импорта")


if __name__ == "__main__":
    main()