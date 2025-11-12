#!/usr/bin/env python3
"""
Тестирование LVP парсера
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from email_metadata import EmailMetadataManager, LVPParser

def test_lvp_parsing():
    """Тестирует парсинг LVP файла"""
    print("🧪 Тестирование LVP парсера...\n")

    # Путь к LVP файлу
    lvp_file = "/mnt/e/Shtim/Downloads/Сербия, HC, Агро, по картам.lvp"

    # Создаем менеджер метаданных
    manager = EmailMetadataManager()

    # Загружаем данные
    emails = manager.load_emails_from_file(lvp_file)

    if not emails:
        print("❌ Не удалось загрузить email из LVP файла")
        return

    print(f"✅ Успешно загружено {len(emails)} email с метаданными\n")

    # Показываем первые 3 записи
    print("📋 Примеры загруженных данных:\n")
    for i, email in enumerate(emails[:3], 1):
        print(f"--- Email #{i} ---")
        print(f"📧 Email: {email.email}")
        print(f"🌐 Источник: {email.source_url}")
        print(f"📝 Заголовок: {email.page_title}")
        print(f"🏢 Компания: {email.company_name}")
        print(f"📞 Телефон: {email.phone}")
        print(f"🌍 Страна: {email.country}")
        print(f"🏙️  Город: {email.city}")
        print(f"📍 Адрес: {email.address}")
        print(f"🏷️  Категория: {email.category}")
        print(f"🔍 Ключевые слова: {email.keywords}")
        print(f"✅ Статус валидации: {email.validation_status}")
        print()

    # Статистика по полям
    print("📊 Статистика заполненности полей:")
    total = len(emails)

    fields_stats = {
        'source_url': sum(1 for e in emails if e.source_url),
        'page_title': sum(1 for e in emails if e.page_title),
        'company_name': sum(1 for e in emails if e.company_name),
        'phone': sum(1 for e in emails if e.phone),
        'country': sum(1 for e in emails if e.country),
        'city': sum(1 for e in emails if e.city),
        'address': sum(1 for e in emails if e.address),
        'category': sum(1 for e in emails if e.category),
        'keywords': sum(1 for e in emails if e.keywords),
        'validation_status': sum(1 for e in emails if e.validation_status)
    }

    for field, count in fields_stats.items():
        percentage = (count / total) * 100
        print(f"  {field}: {count}/{total} ({percentage:.1f}%)")

    # Сохраняем в JSON для проверки
    output_json = "/mnt/e/shtim/Downloads/email_checker/test_output_metadata.json"
    manager.save_emails_to_json(emails[:10], output_json)  # Сохраняем первые 10 для проверки

    print(f"\n💾 Первые 10 записей сохранены в {output_json}")

    return emails

if __name__ == "__main__":
    emails = test_lvp_parsing()