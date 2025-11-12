#!/usr/bin/env python3
"""
Модуль интеграции метаданных из LVP файлов с TXT списками email
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from email_metadata import EmailWithMetadata


@dataclass
class EnrichedEmailResult:
    """Email с результатами проверки и метаданными из LVP"""
    email: str
    is_clean: bool
    blocked_reason: Optional[str] = None

    # Метаданные из LVP файлов
    source_url: Optional[str] = None
    page_title: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    domain: Optional[str] = None
    keywords: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    validation_status: Optional[str] = None
    validation_date: Optional[str] = None

    # Информация о источнике метаданных
    metadata_source: Optional[str] = None
    has_metadata: bool = False


class MetadataIntegrator:
    """Класс для интеграции метаданных из LVP файлов"""

    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.output_dir = self.base_dir / "output"
        self.metadata_cache = {}
        self._load_all_metadata()

    def _load_all_metadata(self):
        """Загружает все доступные метаданные из JSON файлов"""
        print("🔄 Загружаем метаданные из LVP файлов...")

        if not self.output_dir.exists():
            print("⚠️  Папка output не найдена")
            return

        # Ищем все JSON файлы с метаданными
        metadata_files = list(self.output_dir.glob("*metadata*.json"))
        total_emails = 0

        for metadata_file in metadata_files:
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    emails = data.get("emails", [])

                    for email_data in emails:
                        email = email_data.get("email", "").lower()
                        if email:
                            # Создаем объект с метаданными
                            metadata = EmailWithMetadata(
                                email=email_data.get("email", ""),
                                source_url=email_data.get("source_url"),
                                page_title=email_data.get("page_title"),
                                company_name=email_data.get("company_name"),
                                phone=email_data.get("phone"),
                                country=email_data.get("country"),
                                city=email_data.get("city"),
                                address=email_data.get("address"),
                                category=email_data.get("category"),
                                domain=email_data.get("domain"),
                                keywords=email_data.get("keywords"),
                                meta_description=email_data.get("meta_description"),
                                meta_keywords=email_data.get("meta_keywords"),
                                validation_status=email_data.get("validation_status"),
                                validation_date=email_data.get("validation_date")
                            )

                            self.metadata_cache[email] = {
                                "metadata": metadata,
                                "source_file": metadata_file.name
                            }
                            total_emails += 1

                print(f"✓ Загружено {len(emails)} записей из {metadata_file.name}")

            except Exception as e:
                print(f"❌ Ошибка загрузки {metadata_file.name}: {e}")

        print(f"📊 Всего загружено {total_emails} email с метаданными из {len(metadata_files)} файлов")

    def enrich_email_list(self, email_list: List[str], list_name: str = "unknown") -> List[EnrichedEmailResult]:
        """
        Обогащает список email метаданными из LVP файлов

        Args:
            email_list: Список email адресов
            list_name: Название списка для отчета

        Returns:
            Список EnrichedEmailResult с метаданными
        """
        print(f"🔍 Обогащаем список '{list_name}' метаданными...")

        enriched_results = []
        found_metadata = 0

        for email in email_list:
            email_lower = email.lower().strip()

            # Создаем базовый результат
            result = EnrichedEmailResult(
                email=email,
                is_clean=True  # По умолчанию считаем чистым, это может быть изменено позже
            )

            # Ищем метаданные
            if email_lower in self.metadata_cache:
                cache_entry = self.metadata_cache[email_lower]
                metadata = cache_entry["metadata"]

                # Копируем все метаданные
                result.source_url = metadata.source_url
                result.page_title = metadata.page_title
                result.company_name = metadata.company_name
                result.phone = metadata.phone
                result.country = metadata.country
                result.city = metadata.city
                result.address = metadata.address
                result.category = metadata.category
                result.domain = metadata.domain
                result.keywords = metadata.keywords
                result.meta_description = metadata.meta_description
                result.meta_keywords = metadata.meta_keywords
                result.validation_status = metadata.validation_status
                result.validation_date = metadata.validation_date

                result.metadata_source = cache_entry["source_file"]
                result.has_metadata = True
                found_metadata += 1

            enriched_results.append(result)

        print(f"✓ Найдены метаданные для {found_metadata} из {len(email_list)} email ({found_metadata/len(email_list)*100:.1f}%)")

        return enriched_results

    def get_metadata_stats(self) -> Dict:
        """Возвращает статистику по загруженным метаданным"""

        # Статистика по странам
        countries = {}
        categories = {}
        validation_statuses = {}

        for email_data in self.metadata_cache.values():
            metadata = email_data["metadata"]

            # Подсчет по странам
            country = metadata.country or "Unknown"
            countries[country] = countries.get(country, 0) + 1

            # Подсчет по категориям
            category = metadata.category or "Unknown"
            categories[category] = categories.get(category, 0) + 1

            # Подсчет по статусам валидации
            status = metadata.validation_status or "Unknown"
            validation_statuses[status] = validation_statuses.get(status, 0) + 1

        return {
            "total_emails": len(self.metadata_cache),
            "countries": dict(sorted(countries.items(), key=lambda x: x[1], reverse=True)[:10]),
            "categories": dict(sorted(categories.items(), key=lambda x: x[1], reverse=True)[:10]),
            "validation_statuses": validation_statuses
        }

    def save_enriched_results(self, enriched_results: List[EnrichedEmailResult],
                            output_filename: str) -> str:
        """
        Сохраняет обогащенные результаты в JSON файл

        Args:
            enriched_results: Список обогащенных результатов
            output_filename: Имя выходного файла

        Returns:
            Путь к созданному файлу
        """

        # Подготавливаем данные для сохранения
        output_data = {
            "metadata": {
                "generated_date": json.dumps(None, default=str)[1:-1],  # Current datetime as string
                "total_emails": len(enriched_results),
                "emails_with_metadata": sum(1 for r in enriched_results if r.has_metadata),
                "enrichment_rate": f"{sum(1 for r in enriched_results if r.has_metadata)/len(enriched_results)*100:.1f}%"
            },
            "emails": [asdict(result) for result in enriched_results]
        }

        # Создаем файл
        output_path = self.output_dir / output_filename

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"💾 Сохранены обогащенные результаты в {output_path}")
        return str(output_path)


if __name__ == "__main__":
    # Тестирование модуля
    integrator = MetadataIntegrator()

    # Показываем статистику
    stats = integrator.get_metadata_stats()
    print("\n📊 СТАТИСТИКА МЕТАДАННЫХ:")
    print(f"Всего email: {stats['total_emails']}")

    print("\nТоп страны:")
    for country, count in stats['countries'].items():
        print(f"  {country}: {count}")

    print("\nТоп категории:")
    for category, count in stats['categories'].items():
        print(f"  {category}: {count}")

    print("\nСтатусы валидации:")
    for status, count in stats['validation_statuses'].items():
        print(f"  {status}: {count}")