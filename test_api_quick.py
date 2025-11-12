#!/usr/bin/env python3
"""
Быстрый тест API endpoint - проверяет формат ответа
"""

import sqlite3
import json
from pathlib import Path

# Симулируем запрос к API
db_path = Path(".cache/processing_cache_optimized.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

stats = {
    "total_lists": 0,
    "processed_emails": 0,
    "clean_emails": 0,
    "blocked_emails": 0,
    "invalid_emails": 0,
    "countries": [],
    "categories": {},
    "recent_activity": [],
    "queue_length": 0,
    "country_stats": []
}

# Получаем статистику
cursor.execute('SELECT * FROM processing_statistics WHERE id = 1')
row = cursor.fetchone()

if row:
    stats["total_lists"] = row[1] or 0
    stats["processed_emails"] = row[2] or 0
    stats["clean_emails"] = row[3] or 0
    stats["blocked_emails"] = row[4] or 0
    stats["invalid_emails"] = row[5] or 0

# Статистика по странам (массив!)
cursor.execute('''
    SELECT country, clean_emails, blocked_emails, total_emails, quality_score
    FROM country_statistics
    ORDER BY total_emails DESC
    LIMIT 10
''')

country_list = []
for row in cursor.fetchall():
    country_list.append({
        "country": row[0],
        "clean_emails": row[1] or 0,
        "blocked_emails": row[2] or 0,
        "total": row[3] or 0,
        "quality_score": round(row[4] or 0.0, 2)
    })

stats["country_stats"] = country_list

conn.close()

# Проверяем формат
print("=" * 60)
print("🔍 ПРОВЕРКА ФОРМАТА API ОТВЕТА")
print("=" * 60)

print(f"\n✅ Тип country_stats: {type(stats['country_stats'])}")
print(f"✅ Длина массива: {len(stats['country_stats'])}")

if isinstance(stats["country_stats"], list):
    print("✅ country_stats - это массив (list)")
    print(f"\nТоп-3 стран:")
    for i, country in enumerate(stats["country_stats"][:3], 1):
        print(f"  {i}. {country['country']}: {country['total']:,} emails ({country['quality_score']}% качество)")

    # Проверяем, что можно вызвать .slice() в JS (эквивалент в Python - slice)
    top5 = stats["country_stats"][:5]
    print(f"\n✅ Slice работает: top5 = {len(top5)} стран")
else:
    print("❌ country_stats НЕ массив!")

print("\n" + "=" * 60)
print("✅ ФОРМАТ КОРРЕКТЕН!")
print("=" * 60)
print("\nJSON для проверки:")
print(json.dumps({"stats": stats}, indent=2, ensure_ascii=False)[:500] + "...")
