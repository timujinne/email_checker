#!/usr/bin/env python3
"""
LVP Exporter - Экспорт метаданных email из базы данных в формат LVP (XML)
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import uuid
from metadata_database import MetadataDatabase, EmailMetadata


class LVPExporter:
    """Класс для экспорта метаданных email в формат LVP"""

    def __init__(self, db_path: str = "metadata.db"):
        self.db = MetadataDatabase(db_path)
        self.namespace = "http://schemas.datacontract.org/2004/07/Verifier"
        self.arrays_namespace = "http://schemas.microsoft.com/2003/10/Serialization/Arrays"

    def export_all_metadata(self, output_path: str, limit: Optional[int] = None) -> Dict:
        """
        Экспортирует все метаданные из базы данных в LVP файл

        Args:
            output_path: Путь к выходному LVP файлу
            limit: Максимальное количество записей (None = все)

        Returns:
            Словарь с результатами экспорта
        """
        print(f"\n📤 Экспорт метаданных в LVP формат")
        print(f"📁 Выходной файл: {output_path}")

        try:
            # Получаем все email из базы данных
            emails_metadata = self._load_all_metadata(limit)

            if not emails_metadata:
                return {
                    "success": False,
                    "error": "Нет данных для экспорта",
                    "total_exported": 0
                }

            print(f"📊 Загружено {len(emails_metadata)} email из базы данных")

            # Генерируем XML структуру
            xml_content = self._generate_xml_structure(emails_metadata)

            # Записываем в файл
            self._save_xml_to_file(xml_content, output_path)

            print(f"✅ Экспорт завершен успешно")
            print(f"💾 Сохранено {len(emails_metadata)} email в {output_path}")

            return {
                "success": True,
                "file_path": output_path,
                "total_exported": len(emails_metadata)
            }

        except Exception as e:
            error_msg = f"Ошибка при экспорте: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "total_exported": 0
            }

    def export_filtered_metadata(self, output_path: str, filters: Dict) -> Dict:
        """
        Экспортирует отфильтрованные метаданные из базы данных

        Args:
            output_path: Путь к выходному LVP файлу
            filters: Словарь с фильтрами (country, validation_status, source_file, etc.)

        Returns:
            Словарь с результатами экспорта
        """
        print(f"\n📤 Экспорт отфильтрованных метаданных в LVP формат")
        print(f"🔍 Фильтры: {filters}")

        try:
            # Получаем отфильтрованные данные
            emails_metadata = self._load_filtered_metadata(filters)

            if not emails_metadata:
                return {
                    "success": False,
                    "error": "Нет данных, соответствующих фильтрам",
                    "total_exported": 0
                }

            print(f"📊 Загружено {len(emails_metadata)} email после фильтрации")

            # Генерируем XML структуру
            xml_content = self._generate_xml_structure(emails_metadata)

            # Записываем в файл
            self._save_xml_to_file(xml_content, output_path)

            print(f"✅ Экспорт завершен успешно")

            return {
                "success": True,
                "file_path": output_path,
                "total_exported": len(emails_metadata),
                "filters_applied": filters
            }

        except Exception as e:
            error_msg = f"Ошибка при экспорте: {str(e)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "total_exported": 0
            }

    def _load_all_metadata(self, limit: Optional[int] = None) -> List[EmailMetadata]:
        """Загружает все метаданные из базы данных"""
        # Используем существующий метод search_metadata без фильтров
        return self.db.search_metadata(limit=limit if limit else 1000000)

    def _load_filtered_metadata(self, filters: Dict) -> List[EmailMetadata]:
        """Загружает отфильтрованные метаданные из базы данных"""
        # Поддержка множественного выбора статусов
        validation_statuses = None
        validation_status_param = filters.get('validation_status')
        if validation_status_param:
            # Если передан как строка с разделителями - разбиваем
            if isinstance(validation_status_param, str) and ',' in validation_status_param:
                validation_statuses = [s.strip() for s in validation_status_param.split(',') if s.strip()]
            # Если передан как список
            elif isinstance(validation_status_param, list):
                validation_statuses = validation_status_param
            # Если одиночное значение
            else:
                validation_statuses = [validation_status_param]

        return self.db.search_metadata(
            country=filters.get('country'),
            category=filters.get('category'),
            validation_statuses=validation_statuses,
            source_file=filters.get('source_file'),
            has_phone=filters.get('has_phone'),
            country_mismatch=filters.get('country_mismatch'),
            limit=filters.get('limit', 1000000)
        )

    def _generate_xml_structure(self, emails_metadata: List[EmailMetadata]) -> ET.Element:
        """
        Генерирует XML структуру LVP формата

        Args:
            emails_metadata: Список объектов EmailMetadata

        Returns:
            Корневой элемент XML дерева
        """
        # Создаем корневой элемент с namespaces
        root = ET.Element(
            'ValidatorDataClass',
            attrib={
                'xmlns': self.namespace,
                'xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance'
            }
        )

        # Создаем контейнер Items
        items = ET.SubElement(root, 'Items')

        # Добавляем каждый email как отдельный элемент
        for email_metadata in emails_metadata:
            item = self._create_email_item(email_metadata)
            items.append(item)

        return root

    def _create_email_item(self, email_metadata: EmailMetadata) -> ET.Element:
        """
        Создает XML элемент для одного email с метаданными

        Args:
            email_metadata: Объект EmailMetadata

        Returns:
            XML элемент ValidatorDataClass.ValidatorDataClassItem
        """
        item = ET.Element('ValidatorDataClass.ValidatorDataClassItem')

        # Email (обязательное поле)
        email_elem = ET.SubElement(item, 'Email')
        email_elem.text = self._sanitize_for_xml(email_metadata.email or '')

        # GetPropertyNames - список доступных полей
        properties = ET.SubElement(
            item,
            'GetPropertyNames',
            attrib={'xmlns:a': self.arrays_namespace}
        )
        property_names = [
            'ID', 'Email', 'Log', 'Status',
            'Column_Phone2', 'Column_Name', 'Column_Source',
            'Column_Keywords', 'Column_Title', 'Column_METADescription',
            'Column_METAKeywords', 'Column_Domain', 'Column_Country',
            'Column_City', 'Column_Address', 'Column_Category'
        ]
        for prop_name in property_names:
            prop_elem = ET.SubElement(properties, '{' + self.arrays_namespace + '}string')
            prop_elem.text = prop_name

        # ID - генерируем UUID если нет
        id_elem = ET.SubElement(item, 'ID')
        id_elem.text = str(uuid.uuid4())

        # Log - лог валидации
        log_elem = ET.SubElement(item, 'Log')
        if email_metadata.validation_log:
            log_elem.text = self._sanitize_for_xml(email_metadata.validation_log)
        else:
            # Создаем простой лог если нет данных
            log_text = f"{email_metadata.email} validation.\n"
            if email_metadata.validation_date:
                log_text += f"Validation Date: {email_metadata.validation_date}\n"
            log_text += f"Status: {email_metadata.validation_status or 'Unknown'}\n"
            log_elem.text = self._sanitize_for_xml(log_text)

        # Status - статус валидации
        status_elem = ET.SubElement(item, 'Status')
        status_elem.text = self._sanitize_for_xml(email_metadata.validation_status or 'Valid')

        # _Data section - дополнительные поля
        data_elem = ET.SubElement(
            item,
            '_Data',
            attrib={'xmlns:a': self.arrays_namespace}
        )

        # Маппинг полей: БД → LVP
        fields_mapping = {
            'Column_Phone2': email_metadata.phone,
            'Column_Name': email_metadata.company_name,
            'Column_Source': email_metadata.source_url,
            'Column_Keywords': email_metadata.keywords,
            'Column_Title': email_metadata.page_title,
            'Column_METADescription': email_metadata.meta_description,
            'Column_METAKeywords': email_metadata.meta_keywords,
            'Column_Domain': email_metadata.domain,
            'Column_Country': email_metadata.country,
            'Column_City': email_metadata.city,
            'Column_Address': email_metadata.address,
            'Column_Category': email_metadata.category
        }

        # Добавляем каждое поле как KeyValuePair
        for key, value in fields_mapping.items():
            kv_pair = ET.SubElement(data_elem, '{' + self.arrays_namespace + '}KeyValueOfstringstring')

            key_elem = ET.SubElement(kv_pair, '{' + self.arrays_namespace + '}Key')
            key_elem.text = key

            value_elem = ET.SubElement(kv_pair, '{' + self.arrays_namespace + '}Value')
            value_elem.text = self._sanitize_for_xml(value) if value else ''

        return item

    def _sanitize_for_xml(self, text: str) -> str:
        """
        Очищает текст от невалидных XML символов

        Args:
            text: Исходный текст

        Returns:
            Очищенный текст
        """
        if not text:
            return ''

        # Преобразуем в строку если это не строка
        text = str(text)

        # Заменяем проблемные символы для XML
        replacements = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;'
        }

        # Сначала заменяем &, потом остальные
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')

        # Удаляем невалидные XML символы (контрольные символы)
        valid_chars = []
        for char in text:
            code_point = ord(char)
            # Разрешаем: tab(9), newline(10), return(13), и символы >= 32
            if code_point == 9 or code_point == 10 or code_point == 13 or code_point >= 32:
                valid_chars.append(char)

        return ''.join(valid_chars)

    def _save_xml_to_file(self, root: ET.Element, output_path: str):
        """
        Сохраняет XML дерево в файл с правильным форматированием

        Args:
            root: Корневой элемент XML
            output_path: Путь к выходному файлу
        """
        # Создаем папку output если не существует
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)

        # Конвертируем в строку
        xml_str = ET.tostring(root, encoding='unicode')

        # Форматируем с отступами для читаемости
        try:
            dom = minidom.parseString(xml_str)
            pretty_xml = dom.toprettyxml(indent='  ', encoding='utf-8')

            # Записываем в файл
            with open(output_path, 'wb') as f:
                f.write(pretty_xml)
        except Exception as e:
            # Если форматирование не удалось, пишем как есть
            print(f"⚠️  Предупреждение: не удалось отформатировать XML: {e}")
            tree = ET.ElementTree(root)
            tree.write(output_path, encoding='utf-8', xml_declaration=True)

    def __enter__(self):
        """Context manager support"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager support"""
        if hasattr(self.db, '__exit__'):
            self.db.__exit__(exc_type, exc_val, exc_tb)
        return False


# Пример использования
if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 lvp_exporter.py <output_file.lvp> [limit]")
        sys.exit(1)

    output_file = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else None

    with LVPExporter() as exporter:
        result = exporter.export_all_metadata(output_file, limit=limit)

        if result['success']:
            print(f"\n✅ Успешно экспортировано: {result['total_exported']} email")
            print(f"📁 Файл: {result['file_path']}")
        else:
            print(f"\n❌ Ошибка экспорта: {result['error']}")
            sys.exit(1)
