import json
import hashlib
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Dict, Set

class CacheManager:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(exist_ok=True)
        self.processed_files_cache = self.cache_dir / "processed_files.json"

    def get_file_hash(self, filepath: str) -> str:
        """Вычисляет хеш файла для проверки изменений"""
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
                return hashlib.md5(content).hexdigest()
        except Exception:
            return ""

    def save_processed_files_cache(self, processed_files: Dict):
        """Сохраняет кеш обработанных файлов"""
        try:
            with open(self.processed_files_cache, 'w', encoding='utf-8') as f:
                json.dump(processed_files, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️  Ошибка сохранения кеша: {e}")

    def load_processed_files_cache(self) -> Dict:
        """Загружает кеш обработанных файлов"""
        try:
            if self.processed_files_cache.exists():
                with open(self.processed_files_cache, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️  Ошибка загрузки кеша: {e}")
        return {}

    def load_already_processed_emails(self) -> Set[str]:
        """
        Загружает обработанные email для дедупликации
        """
        # Приоритет 1: Оптимизированный кеш (хеши) ⭐ РЕКОМЕНДУЕТСЯ
        optimized_cache = self.cache_dir / "processing_cache_optimized.db"
        if optimized_cache.exists():
            try:
                conn = sqlite3.connect(optimized_cache)
                cursor = conn.cursor()

                # Получаем хеши для дедупликации
                cursor.execute('SELECT hash FROM email_hashes')
                processed_hashes = {row[0].hex() for row in cursor.fetchall()}

                conn.close()

                print(f"📚 Загружено {len(processed_hashes):,} хешей из оптимизированного кеша")
                print(f"   💾 Экономия памяти: 95% | База: {optimized_cache.name}")
                return processed_hashes

            except Exception as e:
                print(f"⚠️  Ошибка загрузки оптимизированного кеша: {e}")

        # Приоритет 2: SQLite кеш с полными email
        sqlite_cache_paths = [
            self.cache_dir / "processing_cache_final.db",
            self.cache_dir / "processing_cache.db"
        ]

        for sqlite_cache_path in sqlite_cache_paths:
            if sqlite_cache_path.exists():
                try:
                    conn = sqlite3.connect(sqlite_cache_path)
                    cursor = conn.cursor()

                    cursor.execute('SELECT DISTINCT email_normalized FROM processed_emails')
                    processed_emails = {row[0] for row in cursor.fetchall()}

                    conn.close()

                    print(f"📚 Загружено {len(processed_emails):,} email из SQLite кеша")
                    print(f"   База данных: {sqlite_cache_path.name}")
                    print(f"   💡 Совет: Запустите migrate_to_optimized_cache.py для 95% экономии памяти")
                    return processed_emails

                except Exception as e:
                    print(f"⚠️  Ошибка при загрузке из {sqlite_cache_path.name}: {e}")
                    continue

        # Приоритет 3: JSON кеш (legacy)
        processed_emails = set()
        cache_data = self.load_processed_files_cache()

        for filename, file_info in cache_data.items():
            if 'result_data' in file_info:
                result_data = file_info['result_data']
                results = result_data.get('results', {})
                for category in ['clean', 'blocked_email', 'blocked_domain', 'invalid']:
                    if category in results:
                        processed_emails.update(results[category])

        print(f"📚 Загружено {len(processed_emails):,} email из JSON кеша (legacy)")
        print("   💡 Совет: Запустите migrate_to_optimized_cache.py для ускорения")
        return processed_emails
