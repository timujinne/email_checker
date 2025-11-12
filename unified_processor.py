#!/usr/bin/env python3
"""
Unified Processor - новая реализация check_all_incremental с улучшениями

Этот модуль демонстрирует использование новой архитектуры для замены
дублированного кода в email_checker.py
"""

from pathlib import Path
from typing import List, Optional
from email_processor import EmailProcessor, BatchResult
from metadata_store import MetadataStore
from cache_manager import CacheManager
from progress_tracker import ProgressTracker, ConsoleProgressDisplay


class UnifiedEmailProcessor:
    """
    Высокоуровневый интерфейс для обработки email списков

    Объединяет все новые компоненты в единый workflow
    """

    def __init__(self, base_dir: str = "."):
        """
        Args:
            base_dir: Базовая директория проекта
        """
        self.base_dir = Path(base_dir)
        self.input_dir = self.base_dir / "input"
        self.output_dir = self.base_dir / "output"

        # Инициализация компонентов
        self.cache_manager = CacheManager(str(self.base_dir / ".cache"))
        self.metadata_store = MetadataStore(str(self.base_dir / ".cache" / "metadata_store.db"))

        # EmailChecker для базовой функциональности
        # Импортируем здесь чтобы избежать циклических зависимостей
        from email_checker import EmailChecker
        self.checker = EmailChecker(str(self.base_dir))

        # Процессор
        self.processor = EmailProcessor(self.checker, self.metadata_store)

        # Progress tracking
        self.progress_tracker: Optional[ProgressTracker] = None

    def process_all_incremental(self,
                               exclude_duplicates: bool = False,
                               generate_html: bool = False,
                               show_progress: bool = True) -> BatchResult:
        """
        Unified incremental обработка ВСЕХ файлов (TXT + LVP)

        Это новая версия check_all_incremental() с улучшениями:
        - Автоматическая обработка ошибок
        - Сохранение метаданных между форматами
        - Progress tracking
        - Эффективное кеширование

        Args:
            exclude_duplicates: Исключать дубликаты между файлами
            generate_html: Генерировать HTML отчет
            show_progress: Показывать прогресс в консоли

        Returns:
            BatchResult с агрегированными результатами
        """
        print(f"\n{'='*60}")
        print("📦 UNIFIED INCREMENTAL PROCESSING")
        print(f"{'='*60}\n")

        # Находим все файлы
        txt_files = list(self.input_dir.glob("*.txt"))
        lvp_files = list(self.input_dir.glob("*.lvp"))
        all_files = txt_files + lvp_files

        if not all_files:
            print("❌ Не найдено файлов для обработки в папке input/")
            return BatchResult()

        print(f"📋 Найдено файлов: {len(txt_files)} TXT + {len(lvp_files)} LVP = {len(all_files)} всего")

        # Фильтруем уже обработанные файлы (по MD5 хешу)
        files_to_process = []
        files_from_cache = []

        for file_path in all_files:
            if self.cache_manager.is_file_processed(file_path):
                files_from_cache.append(file_path)
            else:
                files_to_process.append(file_path)

        if files_from_cache:
            print(f"✓ Найдено в кеше: {len(files_from_cache)} файлов (пропускаем)")

        if not files_to_process:
            print("\n🎉 Все файлы уже обработаны! Изменений не обнаружено.")

            if generate_html:
                self._generate_html_report_from_cache()

            return BatchResult()

        print(f"🔄 К обработке: {len(files_to_process)} файлов")

        # Сортируем: сначала LVP (чтобы сохранить метаданные), потом TXT
        lvp_to_process = [f for f in files_to_process if f.suffix.lower() == '.lvp']
        txt_to_process = [f for f in files_to_process if f.suffix.lower() == '.txt']
        files_to_process = lvp_to_process + txt_to_process

        print(f"   📄 LVP: {len(lvp_to_process)} (обрабатываются первыми)")
        print(f"   📝 TXT: {len(txt_to_process)} (будут обогащены метаданными из LVP)")

        # Инициализация progress tracker
        if show_progress:
            self.progress_tracker = ProgressTracker(total_files=len(files_to_process))
            display = ConsoleProgressDisplay(self.progress_tracker)
            display.start()
            self.progress_tracker.start()

            # Подключаем callbacks
            self.processor.set_progress_callback(self._on_file_progress)

        # Обрабатываем файлы
        batch_result = self.processor.process_batch(
            files=files_to_process,
            exclude_duplicates=exclude_duplicates,
            enrich_from_store=True  # ВАЖНО: обогащаем TXT из MetadataStore
        )

        # Сохраняем результаты в кеш
        for result in batch_result.results:
            if result.success:
                self.cache_manager.save_processing_result(result)

                # Сохраняем выходные файлы
                self._save_output_files(result)

                # Обновляем статус в конфигурации
                self._update_list_config(result.file_path.name, processed=True)

        if self.progress_tracker:
            self.progress_tracker.finish()
            print(self.progress_tracker.get_summary())

        # Генерация HTML отчета
        if generate_html:
            self._generate_html_report(batch_result)

        # Выводим итоговую статистику
        self._print_summary(batch_result)

        return batch_result

    def _on_file_progress(self, filename: str, progress: float):
        """Callback для обновления прогресса"""
        if self.progress_tracker:
            if progress == 0.0:
                # Начало обработки файла
                self.progress_tracker.start_file(filename)
            elif progress == 1.0:
                # Завершение обработки файла
                self.progress_tracker.complete_file(success=True)

    def _save_output_files(self, result):
        """Сохраняет выходные файлы на диск"""
        from datetime import datetime

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_base = f"{result.file_path.stem}_{timestamp}"

        # Сохраняем категории
        categories = {
            'clean': result.clean_emails,
            'blocked_email': result.blocked_email,
            'blocked_domain': result.blocked_domain,
            'invalid': result.invalid_emails
        }

        for category, emails in categories.items():
            if emails:
                output_file = self.output_dir / f"{filename_base}_{category}.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    for email in emails:
                        f.write(f"{email}\n")

        # Если есть метаданные - сохраняем в JSON/CSV
        if result.has_metadata and result.emails_with_metadata:
            self._save_metadata_files(filename_base, result.emails_with_metadata)

    def _save_metadata_files(self, filename_base: str, emails_with_metadata: List):
        """Сохраняет метаданные в JSON и CSV форматах"""
        import json
        import csv

        # JSON
        json_file = self.output_dir / f"{filename_base}_metadata.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            data = [obj.to_dict() for obj in emails_with_metadata]
            json.dump(data, f, ensure_ascii=False, indent=2)

        # CSV
        csv_file = self.output_dir / f"{filename_base}_metadata.csv"
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            if emails_with_metadata:
                writer = csv.DictWriter(f, fieldnames=emails_with_metadata[0].to_dict().keys())
                writer.writeheader()
                for obj in emails_with_metadata:
                    writer.writerow(obj.to_dict())

    def _update_list_config(self, filename: str, processed: bool):
        """Обновляет статус обработки в lists_config.json"""
        import json

        config_file = self.base_dir / "lists_config.json"

        if not config_file.exists():
            return

        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Находим и обновляем запись
        for item in config.get('lists', []):
            if item['filename'] == filename:
                item['processed'] = processed
                break

        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)

    def _generate_html_report(self, batch_result: BatchResult):
        """Генерирует HTML отчет из результатов обработки"""
        # Используем существующую функциональность EmailChecker
        # Добавляем результаты в checker.all_results
        for result in batch_result.results:
            if result.success:
                result_data = {
                    'filename': result.file_path.stem,
                    'stats': result.get_statistics(),
                    'results': {
                        'clean': result.clean_emails,
                        'blocked_email': result.blocked_email,
                        'blocked_domain': result.blocked_domain,
                        'invalid': result.invalid_emails
                    },
                    'duplicates_removed': result.duplicates_removed,
                    'prefix_duplicates_removed': result.prefix_duplicates_removed,
                    'timestamp': result.timestamp
                }
                self.checker.all_results.append(result_data)

        self.checker.generate_html_report("unified_report")

    def _generate_html_report_from_cache(self):
        """Генерирует HTML отчет из кешированных данных"""
        # Экспортируем кеш в legacy формат для совместимости
        legacy_cache_file = self.base_dir / ".cache" / "legacy_export.json"
        self.cache_manager.export_legacy_format(legacy_cache_file)

        # Загружаем в checker
        import json
        with open(legacy_cache_file, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)

        for filename, file_data in cache_data.items():
            self.checker.all_results.append(file_data['result_data'])

        self.checker.generate_html_report("unified_report")

    def _print_summary(self, batch_result: BatchResult):
        """Выводит итоговую сводку обработки"""
        stats = batch_result.get_aggregated_stats()

        print(f"\n{'='*60}")
        print("🎉 ОБРАБОТКА ЗАВЕРШЕНА")
        print(f"{'='*60}")
        print(f"📁 Обработано файлов: {stats['successful_files']}/{stats['total_files']}")

        if stats['failed_files'] > 0:
            print(f"❌ Ошибок: {stats['failed_files']}")

        print(f"\n📊 СТАТИСТИКА EMAIL:")
        print(f"   Всего проверено: {stats.get('total_checked', 0):,}")
        print(f"   ✅ Чистые: {stats.get('clean', 0):,}")
        print(f"   🚫 Блок email: {stats.get('blocked_email', 0):,}")
        print(f"   🚫 Блок домен: {stats.get('blocked_domain', 0):,}")
        print(f"   ❌ Невалидные: {stats.get('invalid', 0):,}")

        if stats.get('duplicates_removed', 0) > 0:
            print(f"\n🗑️  Дубликаты исключены: {stats['duplicates_removed']:,}")

        if stats.get('prefix_duplicates_removed', 0) > 0:
            print(f"🧹 Префиксные дубликаты: {stats['prefix_duplicates_removed']:,}")

        if stats.get('has_metadata', 0) > 0:
            print(f"\n💎 Файлов с метаданными: {stats['has_metadata']}")

        print(f"\n⏱️  Общее время: {stats['total_processing_time']:.2f} сек")

        # Статистика MetadataStore
        metadata_stats = self.metadata_store.get_statistics()
        if metadata_stats['total_emails'] > 0:
            print(f"\n💾 ХРАНИЛИЩЕ МЕТАДАННЫХ:")
            print(f"   Всего email: {metadata_stats['total_emails']:,}")
            print(f"   С компанией: {metadata_stats['with_company_name']:,}")
            print(f"   С телефоном: {metadata_stats['with_phone']:,}")

        # Статистика кеша
        cache_stats = self.cache_manager.get_all_statistics()
        print(f"\n💿 КЕШИРОВАНИЕ:")
        print(f"   Обработано файлов: {cache_stats['total_files']}")
        print(f"   Уникальных email: {cache_stats['total_unique_emails']:,}")
        print(f"   Размер БД: {cache_stats['database_size_mb']:.2f} MB")


# Пример использования
if __name__ == "__main__":
    import sys

    # Создаем процессор
    processor = UnifiedEmailProcessor()

    # Запускаем обработку
    result = processor.process_all_incremental(
        exclude_duplicates=True,
        generate_html=True,
        show_progress=True
    )

    # Код возврата для CI/CD
    sys.exit(0 if result.failed_files == 0 else 1)
