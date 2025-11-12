#!/usr/bin/env python3
"""
Email Metadata Classes - структуры данных для хранения расширенной информации об email
"""

import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path


@dataclass
class EmailWithMetadata:
    """Класс для хранения email с полными метаданными"""

    # Основные поля
    email: str

    # Информация об источнике
    source_url: Optional[str] = None
    domain: Optional[str] = None
    page_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None

    # Контактная информация
    company_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None

    # Категоризация
    category: Optional[str] = None
    keywords: Optional[str] = None

    # Валидация (из LVP)
    validation_status: Optional[str] = None
    validation_log: Optional[str] = None
    validation_date: Optional[str] = None

    # Служебные поля
    found_date: Optional[str] = None
    id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Конвертация в словарь"""
        return asdict(self)

    def to_json(self) -> str:
        """Конвертация в JSON"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmailWithMetadata':
        """Создание из словаря"""
        return cls(**data)

    @classmethod
    def from_simple_email(cls, email: str) -> 'EmailWithMetadata':
        """Создание из простого email строки (для обратной совместимости)"""
        return cls(email=email)


class LVPParser:
    """Парсер для LVP (XML) файлов от системы валидации email"""

    def __init__(self):
        self.namespace = {
            '': 'http://schemas.datacontract.org/2004/07/Verifier',
            'i': 'http://www.w3.org/2001/XMLSchema-instance',
            'a': 'http://schemas.microsoft.com/2003/10/Serialization/Arrays'
        }

    def parse_file(self, filepath: str) -> List[EmailWithMetadata]:
        """Парсит LVP файл и возвращает список EmailWithMetadata"""
        emails = []

        try:
            # Сначала пробуем обычный парсинг
            try:
                tree = ET.parse(filepath)
                root = tree.getroot()
            except ET.ParseError as e:
                if "reference to invalid character number" in str(e):
                    print(f"⚠️  Обнаружены невалидные символы в XML, выполняем очистку...")
                    # Пробуем очистить файл и парсить заново
                    cleaned_content = self._sanitize_xml_file(filepath)
                    root = ET.fromstring(cleaned_content)
                else:
                    raise  # Если это другая ошибка, пробрасываем дальше

            print(f"🔍 Root tag: {root.tag}")
            print(f"🔍 Root namespace: {root.attrib}")

            # Пробуем разные варианты поиска элементов
            items_variants = [
                root.findall('.//ValidatorDataClass.ValidatorDataClassItem'),
                root.findall('.//{http://schemas.datacontract.org/2004/07/Verifier}ValidatorDataClass.ValidatorDataClassItem'),
                root.findall('.//Items/ValidatorDataClass.ValidatorDataClassItem'),
                root.findall('.//{http://schemas.datacontract.org/2004/07/Verifier}Items/{http://schemas.datacontract.org/2004/07/Verifier}ValidatorDataClass.ValidatorDataClassItem')
            ]

            items = []
            for variant in items_variants:
                if variant:
                    items = variant
                    print(f"✓ Найдено {len(items)} элементов")
                    break

            if not items:
                print("⚠️  Пробуем найти все дочерние элементы...")
                all_children = list(root.iter())
                print(f"🔍 Всего элементов в XML: {len(all_children)}")
                for i, child in enumerate(all_children[:10]):  # Показываем первые 10
                    print(f"  {i}: {child.tag}")

            for item in items:
                email_data = self._parse_item(item)
                if email_data:
                    emails.append(email_data)

            print(f"✓ Загружено {len(emails)} email с метаданными из {filepath}")

        except ET.ParseError as e:
            print(f"❌ Ошибка парсинга XML файла {filepath}: {e}")
        except Exception as e:
            print(f"❌ Ошибка при обработке файла {filepath}: {e}")

        return emails

    def _sanitize_xml_file(self, filepath: str) -> str:
        """Очищает XML файл от невалидных символов"""
        print(f"🧹 Очистка XML файла от невалидных символов...")

        # Читаем файл как текст
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        # Удаляем проблемные символы
        invalid_chars = [
            '&#xFFFF;', '&#xFFFE;',  # Основные проблемные символы
            '&#x0;', '&#x1;', '&#x2;', '&#x3;', '&#x4;', '&#x5;', '&#x6;', '&#x7;', '&#x8;',
            '&#xB;', '&#xC;', '&#xE;', '&#xF;', '&#x10;', '&#x11;', '&#x12;', '&#x13;',
            '&#x14;', '&#x15;', '&#x16;', '&#x17;', '&#x18;', '&#x19;', '&#x1A;', '&#x1B;',
            '&#x1C;', '&#x1D;', '&#x1E;', '&#x1F;'  # Контрольные символы
        ]

        removed_count = 0
        for invalid_char in invalid_chars:
            if invalid_char in content:
                removed_count += content.count(invalid_char)
                content = content.replace(invalid_char, '')  # Удаляем невалидные символы

        if removed_count > 0:
            print(f"✅ Удалено {removed_count} невалидных символов из XML")

        return content

    def _parse_item(self, item: ET.Element) -> Optional[EmailWithMetadata]:
        """Парсит один элемент ValidatorDataClassItem"""
        try:
            ns = '{http://schemas.datacontract.org/2004/07/Verifier}'

            # Основной email
            email_elem = item.find(f'{ns}Email')
            if email_elem is None or not email_elem.text:
                print(f"⚠️  Email не найден в элементе: {item.tag}")
                return None

            email = email_elem.text.strip().lower()

            # ID
            id_elem = item.find(f'{ns}ID')
            item_id = id_elem.text if id_elem is not None else None

            # Статус валидации
            status_elem = item.find(f'{ns}Status')
            validation_status = status_elem.text if status_elem is not None else None

            # Маппинг цифровых статусов в строковые
            if validation_status and validation_status.isdigit():
                status_map = {
                    '0': 'Valid',
                    '1': 'NotSure',
                    '2': 'Invalid',
                    '3': 'NotChecked',
                    '4': 'Temp'
                }
                validation_status = status_map.get(validation_status, validation_status)

            # Лог валидации
            log_elem = item.find(f'{ns}Log')
            validation_log = log_elem.text if log_elem is not None else None

            # Парсим дополнительные данные из _Data секции
            data_dict = self._parse_data_section(item)

            # Создаем объект EmailWithMetadata
            email_obj = EmailWithMetadata(
                email=email,
                id=item_id,
                validation_status=validation_status,
                validation_log=validation_log,
                validation_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),

                # Данные из _Data секции
                phone=data_dict.get('Column_Phone2'),
                company_name=data_dict.get('Column_Name'),
                source_url=data_dict.get('Column_Source'),
                keywords=data_dict.get('Column_Keywords'),
                page_title=data_dict.get('Column_Title'),
                meta_description=data_dict.get('Column_METADescription'),
                meta_keywords=data_dict.get('Column_METAKeywords'),
                domain=data_dict.get('Column_Domain'),
                country=data_dict.get('Column_Country'),
                city=data_dict.get('Column_City'),
                address=data_dict.get('Column_Address'),
                category=data_dict.get('Column_Category')
            )

            return email_obj

        except Exception as e:
            print(f"⚠️  Ошибка парсинга элемента: {e}")
            return None

    def _parse_data_section(self, item: ET.Element) -> Dict[str, str]:
        """Парсит секцию _Data с дополнительными полями"""
        data_dict = {}

        ns = '{http://schemas.datacontract.org/2004/07/Verifier}'
        a_ns = '{http://schemas.microsoft.com/2003/10/Serialization/Arrays}'

        # Находим секцию _Data
        data_section = item.find(f'{ns}_Data')
        if data_section is None:
            return data_dict

        # Парсим все KeyValueOfstringstring элементы
        for kv_pair in data_section.findall(f'.//{a_ns}KeyValueOfstringstring'):
            key_elem = kv_pair.find(f'{a_ns}Key')
            value_elem = kv_pair.find(f'{a_ns}Value')

            if key_elem is not None and value_elem is not None:
                key = key_elem.text
                value = value_elem.text if value_elem.text else ""

                if key and value.strip():
                    data_dict[key] = value.strip()

        return data_dict


class EmailMetadataManager:
    """Менеджер для работы с различными форматами метаданных email"""

    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.lvp_parser = LVPParser()

    def load_emails_from_file(self, filepath: str) -> List[EmailWithMetadata]:
        """Загружает email из файла, автоматически определяя формат"""
        filepath = Path(filepath)

        if not filepath.exists():
            print(f"❌ Файл {filepath} не найден")
            return []

        # Определяем формат по расширению
        if filepath.suffix.lower() == '.lvp':
            return self._load_from_lvp(str(filepath))
        elif filepath.suffix.lower() == '.json':
            return self._load_from_json(str(filepath))
        elif filepath.suffix.lower() == '.csv':
            return self._load_from_csv(str(filepath))
        elif filepath.suffix.lower() == '.txt':
            return self._load_from_txt(str(filepath))
        else:
            print(f"⚠️  Неизвестный формат файла: {filepath}")
            return []

    def _load_from_lvp(self, filepath: str) -> List[EmailWithMetadata]:
        """Загрузка из LVP файла"""
        return self.lvp_parser.parse_file(filepath)

    def _load_from_json(self, filepath: str) -> List[EmailWithMetadata]:
        """Загрузка из JSON файла"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            emails = []
            if isinstance(data, list):
                # Массив email объектов
                for item in data:
                    if isinstance(item, dict):
                        emails.append(EmailWithMetadata.from_dict(item))
            elif isinstance(data, dict) and 'emails' in data:
                # Объект с массивом emails
                for item in data['emails']:
                    emails.append(EmailWithMetadata.from_dict(item))

            print(f"✓ Загружено {len(emails)} email из JSON {filepath}")
            return emails

        except Exception as e:
            print(f"❌ Ошибка загрузки JSON файла {filepath}: {e}")
            return []

    def _load_from_csv(self, filepath: str) -> List[EmailWithMetadata]:
        """Загрузка из CSV файла"""
        import csv

        try:
            emails = []
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if 'email' in row and row['email']:
                        # Создаем объект EmailWithMetadata из CSV строки
                        email_obj = EmailWithMetadata(
                            email=row['email'].strip().lower(),
                            source_url=row.get('source_url'),
                            page_title=row.get('page_title'),
                            company_name=row.get('company_name'),
                            category=row.get('category'),
                            country=row.get('country'),
                            city=row.get('city'),
                            address=row.get('address'),
                            phone=row.get('phone'),
                            domain=row.get('domain'),
                            keywords=row.get('keywords'),
                            meta_description=row.get('meta_description'),
                            meta_keywords=row.get('meta_keywords')
                        )
                        emails.append(email_obj)

            print(f"✓ Загружено {len(emails)} email из CSV {filepath}")
            return emails

        except Exception as e:
            print(f"❌ Ошибка загрузки CSV файла {filepath}: {e}")
            return []

    def _load_from_txt(self, filepath: str) -> List[EmailWithMetadata]:
        """Загрузка из обычного TXT файла (для обратной совместимости)"""
        import re

        emails = []
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    email = line.strip().lower()
                    if email and self._is_valid_email(email):
                        emails.append(EmailWithMetadata.from_simple_email(email))

            print(f"✓ Загружено {len(emails)} email из TXT {filepath}")
            return emails

        except Exception as e:
            print(f"❌ Ошибка загрузки TXT файла {filepath}: {e}")
            return []

    def _is_valid_email(self, email: str) -> bool:
        """Базовая валидация email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def save_emails_to_json(self, emails: List[EmailWithMetadata], filepath: str):
        """Сохранение email с метаданными в JSON"""
        try:
            data = {
                "metadata": {
                    "generated_date": datetime.now().isoformat(),
                    "total_count": len(emails),
                    "format_version": "1.0"
                },
                "emails": [email.to_dict() for email in emails]
            }

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"✓ Сохранено {len(emails)} email с метаданными в {filepath}")

        except Exception as e:
            print(f"❌ Ошибка сохранения в JSON {filepath}: {e}")

    def save_emails_to_csv(self, emails: List[EmailWithMetadata], filepath: str):
        """Сохранение email с метаданными в CSV"""
        import csv

        try:
            fieldnames = [
                'email', 'source_url', 'page_title', 'company_name', 'phone',
                'country', 'city', 'address', 'category', 'domain', 'keywords',
                'meta_description', 'meta_keywords', 'validation_status', 'found_date'
            ]

            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()

                for email in emails:
                    row = {}
                    for field in fieldnames:
                        row[field] = getattr(email, field, '')
                    writer.writerow(row)

            print(f"✓ Сохранено {len(emails)} email с метаданными в CSV {filepath}")

        except Exception as e:
            print(f"❌ Ошибка сохранения в CSV {filepath}: {e}")