#!/usr/bin/env python3
"""
Система обогащения email списков метаданными из базы данных
"""

import os
import csv
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from metadata_database import MetadataDatabase, EmailMetadata


class EmailEnricher:
    """Класс для обогащения email списков метаданными"""

    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.output_dir = self.base_dir / "output"
        self.db = MetadataDatabase()

        # Статистика обогащения
        self.enrichment_stats = {
            "total_emails": 0,
            "enriched_emails": 0,
            "not_found_emails": 0,
            "processed_files": 0
        }

    def get_available_lists(self) -> List[Dict]:
        """Получает список доступных файлов для обогащения"""
        if not self.output_dir.exists():
            return []

        available_files = []

        # Ищем все clean файлы без metadata/enriched суффиксов
        for file_path in self.output_dir.glob("*_clean_*.txt"):
            # Пропускаем уже обогащенные файлы
            if any(x in file_path.name for x in ['metadata', 'enriched']):
                continue

            # Проверяем, есть ли уже обогащенная версия
            base_name = file_path.name.replace('.txt', '')
            enriched_csv = self.output_dir / f"{base_name}_enriched.csv"
            enriched_json = self.output_dir / f"{base_name}_enriched.json"

            file_info = {
                "filename": file_path.name,
                "path": str(file_path),
                "size": file_path.stat().st_size,
                "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                "already_enriched": enriched_csv.exists() or enriched_json.exists(),
                "email_count": self._count_emails_in_file(file_path)
            }

            available_files.append(file_info)

        # Сортируем по дате модификации (новые сначала)
        available_files.sort(key=lambda x: x['modified'], reverse=True)

        return available_files

    def _count_emails_in_file(self, file_path: Path) -> int:
        """Подсчитывает количество email в файле"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return sum(1 for line in f if line.strip() and '@' in line)
        except (FileNotFoundError, PermissionError, UnicodeDecodeError) as e:
            print(f"⚠️  Ошибка чтения файла {file_path}: {e}")
            return 0

    def enrich_email_list(self, input_file: str, force_overwrite: bool = False) -> Dict:
        """
        Обогащает email список метаданными из базы данных

        Args:
            input_file: Путь к файлу со списком email
            force_overwrite: Перезаписать существующие файлы

        Returns:
            Словарь с результатами обогащения
        """
        input_path = Path(input_file)
        if not input_path.exists():
            return {"success": False, "error": f"Файл {input_file} не найден"}

        print(f"\n📧 Обогащение списка: {input_path.name}")

        # Подготавливаем пути для выходных файлов
        base_name = input_path.name.replace('.txt', '')
        output_csv = self.output_dir / f"{base_name}_enriched.csv"
        output_json = self.output_dir / f"{base_name}_enriched.json"

        # Проверяем существующие файлы
        if not force_overwrite and (output_csv.exists() or output_json.exists()):
            return {
                "success": False,
                "error": f"Обогащенные файлы уже существуют. Используйте force_overwrite=True для перезаписи"
            }

        try:
            # Загружаем email из файла
            emails = self._load_emails_from_file(input_path)
            if not emails:
                return {"success": False, "error": "Не удалось загрузить email из файла"}

            print(f"📊 Загружено {len(emails)} email для обогащения")

            # Обогащаем каждый email
            enriched_data = []
            found_count = 0

            for i, email in enumerate(emails):
                if i % 1000 == 0 and i > 0:
                    print(f"  🔄 Обработано {i}/{len(emails)} email...")

                # Ищем метаданные в базе
                metadata = self.db.get_email_metadata(email.lower())

                if metadata:
                    # Email найден в базе метаданных
                    enriched_record = {
                        "email": email,
                        "domain": metadata.domain,
                        "source_url": metadata.source_url,
                        "page_title": metadata.page_title,
                        "company_name": metadata.company_name,
                        "phone": metadata.phone,
                        "country": metadata.country,
                        "city": metadata.city,
                        "address": metadata.address,
                        "category": metadata.category,
                        "keywords": metadata.keywords,
                        "meta_description": metadata.meta_description,
                        "meta_keywords": metadata.meta_keywords,
                        "validation_status": metadata.validation_status,
                        "validation_date": metadata.validation_date,
                        "source_file": metadata.source_file,
                        "has_metadata": True
                    }
                    found_count += 1
                else:
                    # Email не найден в базе
                    enriched_record = {
                        "email": email,
                        "domain": self._extract_domain(email),
                        "source_url": None,
                        "page_title": None,
                        "company_name": None,
                        "phone": None,
                        "country": None,
                        "city": None,
                        "address": None,
                        "category": None,
                        "keywords": None,
                        "meta_description": None,
                        "meta_keywords": None,
                        "validation_status": None,
                        "validation_date": None,
                        "source_file": None,
                        "has_metadata": False
                    }

                enriched_data.append(enriched_record)

            # Сохраняем результаты
            self._save_enriched_data(enriched_data, output_csv, output_json)

            # Обновляем статистику
            self.enrichment_stats["total_emails"] += len(emails)
            self.enrichment_stats["enriched_emails"] += found_count
            self.enrichment_stats["not_found_emails"] += (len(emails) - found_count)
            self.enrichment_stats["processed_files"] += 1

            enrichment_ratio = (found_count / len(emails)) * 100 if emails else 0

            print(f"✅ Обогащение завершено!")
            print(f"📊 Найдено метаданных: {found_count}/{len(emails)} ({enrichment_ratio:.1f}%)")
            print(f"💾 Сохранено в: {output_csv.name} и {output_json.name}")

            return {
                "success": True,
                "input_file": input_path.name,
                "output_csv": output_csv.name,
                "output_json": output_json.name,
                "total_emails": len(emails),
                "enriched_count": found_count,
                "enrichment_ratio": enrichment_ratio,
                "stats": {
                    "found": found_count,
                    "not_found": len(emails) - found_count,
                    "total": len(emails)
                }
            }

        except Exception as e:
            error_msg = f"Ошибка обогащения {input_path.name}: {str(e)}"
            print(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}

    def _load_emails_from_file(self, file_path: Path) -> List[str]:
        """Загружает список email из файла"""
        emails = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    email = line.strip()
                    if email and '@' in email:
                        emails.append(email)
        except Exception as e:
            print(f"❌ Ошибка чтения файла {file_path}: {e}")

        return emails

    def _extract_domain(self, email: str) -> str:
        """Извлекает домен из email"""
        try:
            return email.split('@')[1] if '@' in email else None
        except (IndexError, AttributeError) as e:
            print(f"⚠️  Ошибка извлечения домена из '{email}': {e}")
            return None

    def _save_enriched_data(self, data: List[Dict], csv_path: Path, json_path: Path):
        """Сохраняет обогащенные данные в CSV и JSON"""

        # Сохраняем CSV
        if data:
            fieldnames = data[0].keys()
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(data)

        # Сохраняем JSON
        with open(json_path, 'w', encoding='utf-8') as jsonfile:
            json.dump({
                "enriched_emails": data,
                "metadata": {
                    "enrichment_date": datetime.now().isoformat(),
                    "total_count": len(data),
                    "enriched_count": sum(1 for item in data if item["has_metadata"]),
                    "source_database": "email_metadata_database"
                }
            }, jsonfile, ensure_ascii=False, indent=2)

    def enrich_multiple_lists(self, file_patterns: List[str] = None, force_overwrite: bool = False) -> Dict:
        """
        Обогащает несколько списков

        Args:
            file_patterns: Список паттернов файлов или None для всех доступных
            force_overwrite: Перезаписать существующие файлы

        Returns:
            Общая статистика обогащения
        """
        available_files = self.get_available_lists()

        if file_patterns:
            # Фильтруем файлы по паттернам
            files_to_process = []
            for pattern in file_patterns:
                matching_files = [f for f in available_files if pattern in f["filename"]]
                files_to_process.extend(matching_files)
        else:
            # Обрабатываем все доступные файлы (кроме уже обогащенных, если не force)
            if force_overwrite:
                files_to_process = available_files
            else:
                files_to_process = [f for f in available_files if not f["already_enriched"]]

        if not files_to_process:
            return {
                "success": False,
                "message": "Нет файлов для обогащения. Все файлы уже обогащены или используйте force_overwrite=True"
            }

        print(f"🚀 Начинаем обогащение {len(files_to_process)} файлов...")

        results = []
        for file_info in files_to_process:
            result = self.enrich_email_list(file_info["path"], force_overwrite)
            results.append(result)

        # Подсчитываем общую статистику
        total_processed = len([r for r in results if r["success"]])
        total_failed = len(results) - total_processed

        return {
            "success": True,
            "files_processed": total_processed,
            "files_failed": total_failed,
            "overall_stats": self.enrichment_stats.copy(),
            "results": results
        }

    def get_enrichment_suggestions(self) -> Dict:
        """Возвращает предложения для обогащения"""
        available_files = self.get_available_lists()

        # Разделяем на обогащенные и необогащенные
        enriched_files = [f for f in available_files if f["already_enriched"]]
        pending_files = [f for f in available_files if not f["already_enriched"]]

        # Подсчитываем общие email
        total_pending_emails = sum(f["email_count"] for f in pending_files)
        total_enriched_emails = sum(f["email_count"] for f in enriched_files)

        return {
            "pending_enrichment": pending_files,
            "already_enriched": enriched_files,
            "summary": {
                "pending_files": len(pending_files),
                "enriched_files": len(enriched_files),
                "pending_emails": total_pending_emails,
                "enriched_emails": total_enriched_emails
            }
        }

    def close(self):
        """Закрывает соединение с базой данных"""
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def main():
    """Главная функция для CLI обогащения"""
    import argparse

    parser = argparse.ArgumentParser(description="Обогащение email списков метаданными")
    parser.add_argument("--list", action="store_true", help="Показать доступные файлы для обогащения")
    parser.add_argument("--enrich-all", action="store_true", help="Обогатить все необогащенные списки")
    parser.add_argument("--force", action="store_true", help="Перезаписать существующие обогащенные файлы")
    parser.add_argument("files", nargs="*", help="Конкретные файлы для обогащения")

    args = parser.parse_args()

    with EmailEnricher() as enricher:
        if args.list:
            # Показываем доступные файлы
            suggestions = enricher.get_enrichment_suggestions()

            print("📋 ФАЙЛЫ ДЛЯ ОБОГАЩЕНИЯ:")
            for file_info in suggestions["pending_enrichment"]:
                size_mb = file_info["size"] / (1024 * 1024)
                print(f"  📄 {file_info['filename']} ({file_info['email_count']} emails, {size_mb:.1f}MB)")

            print(f"\n✅ УЖЕ ОБОГАЩЕННЫЕ ФАЙЛЫ:")
            for file_info in suggestions["already_enriched"]:
                size_mb = file_info["size"] / (1024 * 1024)
                print(f"  📄 {file_info['filename']} ({file_info['email_count']} emails, {size_mb:.1f}MB)")

            summary = suggestions["summary"]
            print(f"\n📊 ИТОГО:")
            print(f"🔄 К обогащению: {summary['pending_files']} файлов, {summary['pending_emails']:,} email")
            print(f"✅ Уже обогащено: {summary['enriched_files']} файлов, {summary['enriched_emails']:,} email")

        elif args.enrich_all:
            # Обогащаем все доступные файлы
            result = enricher.enrich_multiple_lists(force_overwrite=args.force)

            if result["success"]:
                print(f"\n🎉 Обогащение завершено!")
                print(f"📊 Обработано файлов: {result['files_processed']}")
                print(f"❌ Ошибки: {result['files_failed']}")
                stats = result["overall_stats"]
                print(f"📧 Всего email: {stats['total_emails']:,}")
                print(f"✅ Обогащено: {stats['enriched_emails']:,}")
                print(f"❌ Не найдено: {stats['not_found_emails']:,}")
            else:
                print(f"❌ {result['message']}")

        elif args.files:
            # Обогащаем указанные файлы
            for file_path in args.files:
                result = enricher.enrich_email_list(file_path, args.force)
                if result["success"]:
                    print(f"✅ {file_path} обогащен успешно")
                else:
                    print(f"❌ Ошибка обогащения {file_path}: {result['error']}")

        else:
            print("❌ Укажите --list, --enrich-all или конкретные файлы для обогащения")


if __name__ == "__main__":
    main()