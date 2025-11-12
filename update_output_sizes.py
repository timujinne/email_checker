#!/usr/bin/env python3
"""
Обновление output_size в processing_history для существующих записей

Заполняет размеры выходных файлов для записей, где output_size = 0

Использование:
    python3 update_output_sizes.py
"""

import sqlite3
from pathlib import Path


def update_output_sizes():
    """Обновляет output_size в processing_history"""
    db_path = Path(".cache/processing_cache_optimized.db")

    if not db_path.exists():
        print("❌ База данных не найдена")
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("=" * 70)
    print("🔄 ОБНОВЛЕНИЕ РАЗМЕРОВ ВЫХОДНЫХ ФАЙЛОВ")
    print("=" * 70)

    try:
        # Получаем записи с output_size = 0 или NULL
        cursor.execute('''
            SELECT id, filename, file_path, clean_emails
            FROM processing_history
            WHERE output_size IS NULL OR output_size = 0
        ''')

        records = cursor.fetchall()
        total_records = len(records)

        if total_records == 0:
            print("\n✅ Все записи уже имеют размеры файлов")
            conn.close()
            return True

        print(f"\n📊 Найдено записей для обновления: {total_records}")

        output_dir = Path("output")
        updated_count = 0
        estimated_count = 0

        for record_id, filename, file_path, clean_emails in records:
            output_size = 0

            try:
                # Пытаемся найти соответствующий output файл
                stem = Path(file_path).stem

                # Паттерн: stem_clean_*.txt
                clean_files = list(output_dir.glob(f"{stem}_clean_*.txt"))

                if clean_files:
                    # Берем самый новый файл
                    latest_file = max(clean_files, key=lambda f: f.stat().st_mtime)
                    output_size = latest_file.stat().st_size
                    status = "📂 файл найден"
                else:
                    # Примерная оценка: ~50 байт на email
                    output_size = (clean_emails or 0) * 50
                    status = "📊 оценка"
                    estimated_count += 1

                # Обновляем запись
                cursor.execute('''
                    UPDATE processing_history
                    SET output_size = ?
                    WHERE id = ?
                ''', (output_size, record_id))

                updated_count += 1

                if updated_count % 10 == 0:
                    print(f"  ⏳ Обработано: {updated_count}/{total_records}")

            except Exception as e:
                print(f"  ⚠️  Ошибка для {filename}: {e}")
                continue

        conn.commit()

        print(f"\n✅ Обновлено записей: {updated_count}/{total_records}")
        print(f"   📂 По реальным файлам: {updated_count - estimated_count}")
        print(f"   📊 По оценке: {estimated_count}")

        # Показываем статистику
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(output_size) as total_size,
                AVG(output_size) as avg_size,
                MIN(output_size) as min_size,
                MAX(output_size) as max_size
            FROM processing_history
            WHERE output_size > 0
        ''')

        stats = cursor.fetchone()
        if stats and stats[0] > 0:
            total, total_size, avg_size, min_size, max_size = stats

            print(f"\n📈 Статистика размеров:")
            print(f"   Всего записей: {total}")
            print(f"   Общий размер: {format_bytes(total_size or 0)}")
            print(f"   Средний размер: {format_bytes(avg_size or 0)}")
            print(f"   Минимальный: {format_bytes(min_size or 0)}")
            print(f"   Максимальный: {format_bytes(max_size or 0)}")

        conn.close()

        print("\n" + "=" * 70)
        print("✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!")
        print("=" * 70)

        return True

    except Exception as e:
        print(f"\n❌ Ошибка обновления: {e}")
        import traceback
        print(traceback.format_exc())
        conn.rollback()
        conn.close()
        return False


def format_bytes(bytes_value):
    """Форматирует байты в человекочитаемый формат"""
    if bytes_value == 0:
        return "0 B"

    units = ['B', 'KB', 'MB', 'GB']
    unit_index = 0

    while bytes_value >= 1024 and unit_index < len(units) - 1:
        bytes_value /= 1024.0
        unit_index += 1

    return f"{bytes_value:.2f} {units[unit_index]}"


if __name__ == "__main__":
    import sys
    success = update_output_sizes()
    sys.exit(0 if success else 1)
