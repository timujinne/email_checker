#!/usr/bin/env python3
"""
Анализ результатов смарт-фильтрации для Франции порошок
"""

import json
import sys
from collections import Counter

def analyze_smart_filter_results():
    """Анализируем результаты смарт-фильтрации"""

    json_file = "output/smart_filtered_Франция порошок_clean_20251025_215617.json"

    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"🇫🇷 Анализ результатов смарт-фильтрации")
        print(f"📅 Файл: {json_file}")
        print(f"📊 Всего записей: {len(data):,}")
        print(f"⏱️  Размер файла: {len(json.dumps(data)) / 1024:.1f} KB")
        print("=" * 60)

        # Анализ приоритетов
        priorities = Counter()
        scores = []
        exclusion_reasons = []

        for item in data:
            priority = item.get('priority', 'unknown')
            priorities[priority] += 1
            scores.append(item.get('final_score', 0))

            # Анализ причин исключений
            if priority == 'excluded':
                reasons = item.get('exclusion_reasons', [])
                exclusion_reasons.extend(reasons)

        print("🎯 Распределение по приоритетам:")
        for priority, count in sorted(priorities.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(data)) * 100
            print(f"   {priority.upper():>15}: {count:>6} ({percentage:>5.1f}%)")

        if scores:
            print(f"\n📈 Статистика оценок:")
            print(f"   Минимальная оценка: {min(scores):.1f}")
            print(f"   Максимальная оценка: {max(scores):.1f}")
            print(f"   Средняя оценка: {sum(scores)/len(scores):.1f}")

        if exclusion_reasons:
            print(f"\n🚫 Причины исключений:")
            reason_counts = Counter(exclusion_reasons)
            for reason, count in reason_counts.most_common(10):
                print(f"   {reason}: {count}")

        # Показать несколько примеров каждого типа
        print(f"\n📋 Примеры по категориям:")
        examples_by_priority = {}
        for item in data:
            priority = item.get('priority', 'unknown')
            if priority not in examples_by_priority:
                examples_by_priority[priority] = []
            if len(examples_by_priority[priority]) < 3:
                examples_by_priority[priority].append(item['email'])

        for priority, examples in examples_by_priority.items():
            print(f"\n   {priority.upper()} (первые {len(examples)}):")
            for email in examples[:3]:
                print(f"     • {email}")

        # Проверка качества
        total_processed = len(data)
        excluded_count = priorities.get('excluded', 0)
        low_count = priorities.get('low', 0)

        print(f"\n📊 Качественные метрики:")
        print(f"   Исключено: {excluded_count} ({excluded_count/total_processed*100:.1f}%)")
        print(f"   Низкий приоритет: {low_count} ({low_count/total_processed*100:.1f}%)")
        print(f"   Высокий/средний приоритет: {total_processed - excluded_count - low_count} ({(total_processed - excluded_count - low_count)/total_processed*100:.1f}%)")

        # Рекомендации
        print(f"\n💡 Рекомендации:")
        if excluded_count / total_processed > 0.8:
            print("   ⚠️  Высокий процент исключений - проверьте фильтры")
        else:
            print("   ✅ Адекватный процент исключений")

        if (total_processed - excluded_count - low_count) / total_processed < 0.1:
            print(f"   ⚠️  Мало высокоприоритетных контактов - рассмотрите возможность снижения порогов")
        else:
            print(f"   ✅ Достаточное количество качественных контактов")

        return True

    except FileNotFoundError:
        print(f"❌ Файл не найден: {json_file}")
        return False
    except json.JSONDecodeError:
        print(f"❌ Ошибка чтения JSON файла: {json_file}")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    analyze_smart_filter_results()