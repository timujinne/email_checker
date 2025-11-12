
    def _load_already_processed_emails(self) -> Set[str]:
        """
        Загружает хеши обработанных email для дедупликации

        ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует хеши вместо полных email
        """
        import hashlib

        # Проверяем оптимизированный кеш
        optimized_cache = self.cache_dir / "processing_cache_optimized.db"

        if optimized_cache.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(optimized_cache)
                cursor = conn.cursor()

                # Получаем все хеши
                cursor.execute('SELECT hash FROM email_hashes')
                # Возвращаем хеши как строки для совместимости
                processed_hashes = {row[0].hex() for row in cursor.fetchall()}

                conn.close()

                print(f"📚 Загружено {len(processed_hashes):,} хешей из оптимизированного кеша")
                return processed_hashes

            except Exception as e:
                print(f"⚠️  Ошибка загрузки оптимизированного кеша: {e}")

        # Fallback к старому методу
        # ... существующий код ...
    