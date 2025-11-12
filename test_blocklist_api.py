#!/usr/bin/env python3
"""
Тест импорта и базовой функциональности blocklist_api
"""

try:
    print("🔍 Тестирование blocklist_api...")

    from blocklist_api import (
        get_manager,
        handle_get_blocklist,
        handle_get_blocklist_stats,
        handle_blocklist_search
    )

    print("✅ Импорт успешен!")

    # Тест получения статистики
    print("\n📊 Тест: получение статистики...")
    stats = handle_get_blocklist_stats()
    print(f"✅ Статистика получена: {stats['stats']['total']} элементов")

    # Тест поиска
    print("\n🔍 Тест: поиск...")
    results = handle_blocklist_search("gmail")
    print(f"✅ Поиск работает: найдено {results['count']} элементов")

    print("\n" + "="*60)
    print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
    print("="*60)
    print("\n📝 Теперь можно перезапустить веб-сервер:")
    print("   python3 web_server.py")

except Exception as e:
    print(f"❌ ОШИБКА: {e}")
    import traceback
    traceback.print_exc()
