#!/usr/bin/env python3
"""
Скрипт очистки избыточных файлов кеша и оптимизации хранилища
"""

import os
import json
from pathlib import Path
from datetime import datetime, timedelta
import shutil

def cleanup_cache_backups(cache_dir=".cache", keep_latest=1):
    """
    Удаление избыточных резервных копий JSON кеша

    Args:
        cache_dir: Директория кеша
        keep_latest: Количество последних копий для сохранения

    Returns:
        dict: Статистика очистки
    """
    cache_path = Path(cache_dir)
    stats = {
        "deleted_files": [],
        "freed_space_mb": 0,
        "kept_files": [],
        "errors": []
    }

    if not cache_path.exists():
        print(f"❌ Директория {cache_dir} не найдена")
        return stats

    # Находим все backup файлы
    backup_files = list(cache_path.glob("processed_files_backup_*.json"))

    if not backup_files:
        print("✅ Резервные копии не найдены")
        return stats

    # Сортируем по времени модификации (новые первые)
    backup_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    print(f"\n📊 Найдено резервных копий: {len(backup_files)}")
    total_size = sum(f.stat().st_size for f in backup_files) / (1024 * 1024)
    print(f"📦 Общий размер: {total_size:.2f} MB")

    # Оставляем только последние N копий
    files_to_keep = backup_files[:keep_latest]
    files_to_delete = backup_files[keep_latest:]

    print(f"\n🗑️  Файлов для удаления: {len(files_to_delete)}")
    print(f"💾 Файлов для сохранения: {len(files_to_keep)}")

    # Сохраняем последние копии
    for file in files_to_keep:
        size_mb = file.stat().st_size / (1024 * 1024)
        stats["kept_files"].append(f"{file.name} ({size_mb:.2f} MB)")
        print(f"  ✓ Сохраняем: {file.name} ({size_mb:.2f} MB)")

    # Удаляем старые копии
    for file in files_to_delete:
        try:
            size_mb = file.stat().st_size / (1024 * 1024)
            file.unlink()
            stats["deleted_files"].append(file.name)
            stats["freed_space_mb"] += size_mb
            print(f"  🗑️ Удален: {file.name} ({size_mb:.2f} MB)")
        except Exception as e:
            stats["errors"].append(f"{file.name}: {str(e)}")
            print(f"  ❌ Ошибка при удалении {file.name}: {e}")

    return stats

def cleanup_duplicate_db_files(cache_dir=".cache"):
    """
    Удаление дублирующихся или ненужных файлов БД

    Returns:
        dict: Статистика очистки
    """
    cache_path = Path(cache_dir)
    stats = {
        "deleted_files": [],
        "freed_space_mb": 0,
        "errors": []
    }

    # Список файлов для проверки
    db_files_to_check = [
        "processing_cache.db",  # Старая заблокированная БД
        "test_cache.db"  # Тестовая БД
    ]

    for db_file in db_files_to_check:
        file_path = cache_path / db_file
        if file_path.exists():
            try:
                size_mb = file_path.stat().st_size / (1024 * 1024)

                # Проверяем не используется ли файл
                if db_file == "processing_cache.db":
                    # Проверяем есть ли финальная версия
                    final_db = cache_path / "processing_cache_final.db"
                    if final_db.exists():
                        print(f"\n🔍 Найден устаревший {db_file} ({size_mb:.2f} MB)")
                        print("   Используется processing_cache_final.db, удаляем старую версию...")
                        file_path.unlink()
                        stats["deleted_files"].append(db_file)
                        stats["freed_space_mb"] += size_mb
                        print(f"   ✓ Удален: {db_file}")
                elif db_file == "test_cache.db":
                    print(f"\n🗑️  Удаляем тестовую БД: {db_file} ({size_mb:.2f} MB)")
                    file_path.unlink()
                    stats["deleted_files"].append(db_file)
                    stats["freed_space_mb"] += size_mb
                    print(f"   ✓ Удален: {db_file}")

            except PermissionError:
                stats["errors"].append(f"{db_file}: файл используется")
                print(f"   ⚠️  {db_file} используется другим процессом, пропускаем")
            except Exception as e:
                stats["errors"].append(f"{db_file}: {str(e)}")
                print(f"   ❌ Ошибка при удалении {db_file}: {e}")

    return stats

def cleanup_output_duplicates(output_dir="output", pattern="*_metadata_*.json"):
    """
    Удаление дублирующихся выходных файлов

    Args:
        output_dir: Директория с выходными файлами
        pattern: Шаблон для поиска дубликатов

    Returns:
        dict: Статистика очистки
    """
    output_path = Path(output_dir)
    stats = {
        "deleted_files": 0,
        "freed_space_mb": 0,
        "groups_processed": 0
    }

    if not output_path.exists():
        print(f"❌ Директория {output_dir} не найдена")
        return stats

    # Группируем файлы по базовому имени
    file_groups = {}
    for file in output_path.glob(pattern):
        # Извлекаем базовое имя (без timestamp)
        base_name = "_".join(file.stem.split("_")[:-2])  # Убираем дату и время
        if base_name not in file_groups:
            file_groups[base_name] = []
        file_groups[base_name].append(file)

    print(f"\n📂 Анализ дубликатов в {output_dir}:")
    print(f"   Найдено групп файлов: {len(file_groups)}")

    for base_name, files in file_groups.items():
        if len(files) > 1:
            stats["groups_processed"] += 1
            # Сортируем по времени модификации (новые первые)
            files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

            # Оставляем только самый новый
            newest = files[0]
            duplicates = files[1:]

            if duplicates:
                print(f"\n   📄 {base_name}:")
                print(f"      Сохраняем: {newest.name}")
                for dup in duplicates:
                    size_mb = dup.stat().st_size / (1024 * 1024)
                    try:
                        dup.unlink()
                        stats["deleted_files"] += 1
                        stats["freed_space_mb"] += size_mb
                        print(f"      🗑️ Удален дубликат: {dup.name} ({size_mb:.2f} MB)")
                    except Exception as e:
                        print(f"      ❌ Ошибка при удалении {dup.name}: {e}")

    return stats

def main():
    """Основная функция очистки"""
    print("""
╔══════════════════════════════════════════════════════════╗
║            ОЧИСТКА ИЗБЫТОЧНЫХ ФАЙЛОВ                    ║
╚══════════════════════════════════════════════════════════╝
    """)

    total_freed = 0

    # 1. Очистка резервных копий кеша
    print("\n1️⃣  ОЧИСТКА РЕЗЕРВНЫХ КОПИЙ КЕША")
    print("=" * 60)
    cache_stats = cleanup_cache_backups(keep_latest=1)
    total_freed += cache_stats["freed_space_mb"]

    # 2. Очистка дублирующихся БД
    print("\n2️⃣  ОЧИСТКА ДУБЛИРУЮЩИХСЯ БД")
    print("=" * 60)
    db_stats = cleanup_duplicate_db_files()
    total_freed += db_stats["freed_space_mb"]

    # 3. Очистка дубликатов в output (опционально)
    print("\n3️⃣  АНАЛИЗ ДУБЛИКАТОВ В OUTPUT")
    print("=" * 60)
    response = input("Удалить дубликаты metadata файлов в output/? (y/N): ")
    if response.lower() == 'y':
        output_stats = cleanup_output_duplicates()
        total_freed += output_stats["freed_space_mb"]
    else:
        print("   Пропущено по запросу пользователя")

    # Итоговая статистика
    print("\n" + "=" * 60)
    print("📊 ИТОГОВАЯ СТАТИСТИКА:")
    print("=" * 60)
    print(f"✅ Всего освобождено: {total_freed:.2f} MB")
    print(f"🗑️  Удалено файлов: {len(cache_stats['deleted_files']) + len(db_stats['deleted_files'])}")

    if cache_stats["errors"] or db_stats["errors"]:
        print(f"\n⚠️  Ошибки при очистке:")
        for error in cache_stats["errors"] + db_stats["errors"]:
            print(f"   - {error}")

    print("\n✨ Очистка завершена!")

    # Показываем текущее использование диска
    print("\n📦 ТЕКУЩЕЕ ИСПОЛЬЗОВАНИЕ ДИСКА:")
    print("=" * 60)
    dirs_to_check = [".cache", "output", "input"]
    for dir_name in dirs_to_check:
        dir_path = Path(dir_name)
        if dir_path.exists():
            total_size = sum(f.stat().st_size for f in dir_path.rglob("*") if f.is_file())
            print(f"  {dir_name:20s}: {total_size / (1024**2):>10.2f} MB")

if __name__ == "__main__":
    main()