#!/usr/bin/env python3
"""
Email Processor - Unified processing logic для всех типов файлов

Этот модуль предоставляет единую точку обработки email списков,
независимо от формата (TXT, LVP) с поддержкой:
- Автоматической обработки ошибок
- Сохранения метаданных между форматами
- Progress tracking
- Дедупликации
"""

import os
import time
from pathlib import Path
from typing import Set, List, Dict, Optional, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

# Импорт существующих классов
from email_metadata import EmailWithMetadata, EmailMetadataManager


@dataclass
class ProcessResult:
    """Результат обработки одного файла"""

    file_path: Path
    file_type: str  # 'txt' или 'lvp'

    # Результаты проверки
    total_emails: int = 0
    clean_emails: List[str] = field(default_factory=list)
    blocked_email: List[str] = field(default_factory=list)
    blocked_domain: List[str] = field(default_factory=list)
    invalid_emails: List[str] = field(default_factory=list)

    # Метаданные (для LVP файлов)
    emails_with_metadata: List[EmailWithMetadata] = field(default_factory=list)
    has_metadata: bool = False

    # Дедупликация
    duplicates_removed: int = 0
    prefix_duplicates_removed: int = 0

    # Метрики производительности
    processing_time: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    # Ошибки
    success: bool = True
    error: Optional[str] = None
    error_type: Optional[str] = None

    def __post_init__(self):
        """Автоматический подсчет total_emails если не указан"""
        if self.total_emails == 0 and self.success:
            self.total_emails = (len(self.clean_emails) +
                                len(self.blocked_email) +
                                len(self.blocked_domain) +
                                len(self.invalid_emails))

    def get_statistics(self) -> Dict:
        """Возвращает статистику для отчетов"""
        return {
            'total_checked': self.total_emails,
            'clean': len(self.clean_emails),
            'blocked_email': len(self.blocked_email),
            'blocked_domain': len(self.blocked_domain),
            'invalid': len(self.invalid_emails),
            'duplicates_removed': self.duplicates_removed,
            'prefix_duplicates_removed': self.prefix_duplicates_removed,
            'processing_time': self.processing_time,
            'has_metadata': self.has_metadata,
        }


@dataclass
class BatchResult:
    """Результат batch обработки"""

    results: List[ProcessResult] = field(default_factory=list)
    total_files: int = 0
    successful_files: int = 0
    failed_files: int = 0
    total_processing_time: float = 0.0

    def get_aggregated_stats(self) -> Dict:
        """Агрегирует статистику по всем файлам"""
        stats = defaultdict(int)

        for result in self.results:
            if result.success:
                result_stats = result.get_statistics()
                for key, value in result_stats.items():
                    if isinstance(value, (int, float)) and key != 'processing_time':
                        stats[key] += value

        stats['total_processing_time'] = self.total_processing_time
        stats['total_files'] = self.total_files
        stats['successful_files'] = self.successful_files
        stats['failed_files'] = self.failed_files

        return dict(stats)


class EmailProcessor:
    """
    Unified processor для обработки email списков

    Объединяет всю логику обработки из EmailChecker в единый интерфейс
    с улучшенной обработкой ошибок и поддержкой метаданных
    """

    def __init__(self, checker, metadata_store: Optional['MetadataStore'] = None):
        """
        Args:
            checker: Экземпляр EmailChecker с базовой функциональностью
            metadata_store: Хранилище метаданных для сохранения между форматами
        """
        self.checker = checker
        self.metadata_store = metadata_store

        # Callbacks для отслеживания прогресса
        self.progress_callback: Optional[Callable] = None
        self.error_callback: Optional[Callable] = None

    def set_progress_callback(self, callback: Callable[[str, float], None]):
        """
        Устанавливает callback для отслеживания прогресса

        Args:
            callback: Функция вида (file_name: str, progress: float) -> None
        """
        self.progress_callback = callback

    def set_error_callback(self, callback: Callable[[Path, Exception], None]):
        """
        Устанавливает callback для обработки ошибок

        Args:
            callback: Функция вида (file_path: Path, error: Exception) -> None
        """
        self.error_callback = callback

    def _notify_progress(self, file_name: str, progress: float):
        """Уведомляет о прогрессе если установлен callback"""
        if self.progress_callback:
            try:
                self.progress_callback(file_name, progress)
            except Exception as e:
                print(f"⚠️  Ошибка в progress callback: {e}")

    def _notify_error(self, file_path: Path, error: Exception):
        """Уведомляет об ошибке если установлен callback"""
        if self.error_callback:
            try:
                self.error_callback(file_path, error)
            except Exception as e:
                print(f"⚠️  Ошибка в error callback: {e}")

    def process_file(self,
                    file_path: Path,
                    exclude_from: Optional[Set[str]] = None,
                    enrich_from_store: bool = True) -> ProcessResult:
        """
        Обрабатывает один файл любого типа (TXT/LVP)

        Args:
            file_path: Путь к файлу
            exclude_from: Множество email для дедупликации
            enrich_from_store: Обогащать TXT файлы метаданными из хранилища

        Returns:
            ProcessResult с результатами обработки
        """
        start_time = time.time()
        file_type = file_path.suffix.lower().lstrip('.')

        try:
            self._notify_progress(file_path.name, 0.0)

            # Определяем тип файла и выбираем метод загрузки
            if file_type == 'lvp':
                result = self._process_lvp_file(file_path, exclude_from)
            elif file_type == 'txt':
                result = self._process_txt_file(file_path, exclude_from, enrich_from_store)
            else:
                raise ValueError(f"Неподдерживаемый тип файла: {file_type}")

            result.processing_time = time.time() - start_time
            self._notify_progress(file_path.name, 1.0)

            return result

        except Exception as e:
            # Обработка ошибок с graceful degradation
            self._notify_error(file_path, e)

            processing_time = time.time() - start_time
            return ProcessResult(
                file_path=file_path,
                file_type=file_type,
                success=False,
                error=str(e),
                error_type=type(e).__name__,
                processing_time=processing_time
            )

    def _process_lvp_file(self,
                         file_path: Path,
                         exclude_from: Optional[Set[str]]) -> ProcessResult:
        """
        Обрабатывает LVP файл с метаданными

        ВАЖНО: Сохраняет метаданные в MetadataStore для последующего
        использования при обработке TXT файлов
        """
        print(f"\n📧 Обработка LVP: {file_path.name}")

        # Загружаем email с метаданными
        emails_with_metadata = self.checker.load_emails_with_metadata(str(file_path))

        if not emails_with_metadata:
            return ProcessResult(
                file_path=file_path,
                file_type='lvp',
                success=False,
                error="Файл не содержит валидных email",
                error_type="EmptyFileError"
            )

        original_count = len(emails_with_metadata)
        print(f"✓ Загружено {original_count} email с метаданными")

        # SAFETY NET: Дедупликация внутри файла (на случай дубликатов в LVP)
        seen_emails = {}
        unique_emails = []
        internal_dups = 0

        for email_obj in emails_with_metadata:
            email_key = email_obj.email.lower()
            if email_key not in seen_emails:
                seen_emails[email_key] = True
                unique_emails.append(email_obj)
            else:
                internal_dups += 1

        if internal_dups > 0:
            print(f"   🧹 Удалено {internal_dups} внутренних дубликатов из LVP файла")
            emails_with_metadata = unique_emails

        # Дедупликация с предыдущими списками
        duplicates_removed = 0
        if exclude_from:
            emails_before = len(emails_with_metadata)
            emails_with_metadata = [
                obj for obj in emails_with_metadata
                if obj.email.lower() not in exclude_from
            ]
            duplicates_removed = emails_before - len(emails_with_metadata)
            if duplicates_removed > 0:
                print(f"   🗑️  Исключено {duplicates_removed} дубликатов")

        # Очистка префиксных дубликатов
        email_set = set(obj.email for obj in emails_with_metadata)
        cleaned_emails, prefix_dups = self.checker.clean_prefix_duplicates(email_set)

        if prefix_dups > 0:
            print(f"   🧹 Очищено {prefix_dups} дубликатов с префиксом '20'")
            emails_with_metadata = [
                obj for obj in emails_with_metadata
                if obj.email in cleaned_emails
            ]

        # Проверка против блок-листов
        # ВАЖНО: check_emails_with_metadata автоматически добавляет email
        # со статусом "Invalid" в blocklists/blocked_emails.txt
        results = self.checker.check_emails_with_metadata(emails_with_metadata)

        # Сохраняем метаданные в хранилище для будущего использования
        if self.metadata_store:
            for obj in emails_with_metadata:
                self.metadata_store.save_metadata(obj)

        # Формируем результат
        return ProcessResult(
            file_path=file_path,
            file_type='lvp',
            clean_emails=[obj.email for obj in results['clean']],
            blocked_email=[obj.email for obj in results['blocked_email']],
            blocked_domain=[obj.email for obj in results['blocked_domain']],
            invalid_emails=[obj.email for obj in results['invalid']],
            emails_with_metadata=emails_with_metadata,
            has_metadata=True,
            duplicates_removed=duplicates_removed,
            prefix_duplicates_removed=prefix_dups,
            success=True
        )

    def _process_txt_file(self,
                         file_path: Path,
                         exclude_from: Optional[Set[str]],
                         enrich_from_store: bool) -> ProcessResult:
        """
        Обрабатывает TXT файл

        ВАЖНО: Если enrich_from_store=True, пытается обогатить email
        метаданными из MetadataStore (которые были сохранены из LVP файлов)
        """
        print(f"\n📧 Обработка TXT: {file_path.name}")

        # Загружаем email из TXT
        emails = self.checker.load_emails_from_file(str(file_path))

        if not emails:
            return ProcessResult(
                file_path=file_path,
                file_type='txt',
                success=False,
                error="Не найдено валидных email",
                error_type="EmptyFileError"
            )

        original_count = len(emails)

        # Дедупликация
        duplicates_removed = 0
        if exclude_from:
            emails_before = len(emails)
            emails = emails - exclude_from
            duplicates_removed = emails_before - len(emails)
            if duplicates_removed > 0:
                print(f"   🗑️  Исключено {duplicates_removed} дубликатов")

        # Очистка префиксных дубликатов
        cleaned_emails, prefix_dups = self.checker.clean_prefix_duplicates(emails)

        if prefix_dups > 0:
            print(f"   🧹 Очищено {prefix_dups} дубликатов с префиксом '20'")
            emails = cleaned_emails

        # Обогащение метаданными из хранилища (если доступно)
        emails_with_metadata = []
        has_metadata = False

        if enrich_from_store and self.metadata_store:
            enriched_count = 0
            for email in emails:
                metadata = self.metadata_store.get_metadata(email)
                if metadata:
                    emails_with_metadata.append(metadata)
                    enriched_count += 1

            if enriched_count > 0:
                print(f"   💎 Обогащено {enriched_count} email метаданными из хранилища")
                has_metadata = True

        # Проверка против блок-листов
        results = self.checker.check_email_against_blocklists(emails)

        # Формируем результат
        return ProcessResult(
            file_path=file_path,
            file_type='txt',
            clean_emails=results['clean'],
            blocked_email=results['blocked_email'],
            blocked_domain=results['blocked_domain'],
            invalid_emails=results['invalid'],
            emails_with_metadata=emails_with_metadata if has_metadata else [],
            has_metadata=has_metadata,
            duplicates_removed=duplicates_removed,
            prefix_duplicates_removed=prefix_dups,
            success=True
        )

    def process_batch(self,
                     files: List[Path],
                     exclude_duplicates: bool = False,
                     enrich_from_store: bool = True) -> BatchResult:
        """
        Обрабатывает пакет файлов с опциональной дедупликацией

        Args:
            files: Список файлов для обработки
            exclude_duplicates: Исключать дубликаты между файлами
            enrich_from_store: Обогащать TXT метаданными из хранилища

        Returns:
            BatchResult с агрегированными результатами
        """
        start_time = time.time()
        results = []
        processed_emails = set()  # Для дедупликации между файлами

        successful = 0
        failed = 0

        for i, file_path in enumerate(files, 1):
            print(f"\n[{i}/{len(files)}] Обработка: {file_path.name}")

            # Передаем набор обработанных email для дедупликации
            exclude_from = processed_emails if exclude_duplicates else None

            # Обрабатываем файл
            result = self.process_file(file_path, exclude_from, enrich_from_store)
            results.append(result)

            if result.success:
                successful += 1
                # Добавляем обработанные email для дедупликации следующих файлов
                if exclude_duplicates:
                    processed_emails.update(
                        email.lower() for email in result.clean_emails
                    )
                    processed_emails.update(
                        email.lower() for email in result.blocked_email
                    )
                    processed_emails.update(
                        email.lower() for email in result.blocked_domain
                    )
            else:
                failed += 1
                print(f"   ❌ Ошибка: {result.error}")

        total_time = time.time() - start_time

        return BatchResult(
            results=results,
            total_files=len(files),
            successful_files=successful,
            failed_files=failed,
            total_processing_time=total_time
        )
