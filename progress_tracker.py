#!/usr/bin/env python3
"""
Progress Tracker - отслеживание прогресса обработки с ETA

Предоставляет real-time информацию о ходе обработки для UI
"""

import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Callable
from dataclasses import dataclass, field
from collections import deque


@dataclass
class FileProgress:
    """Прогресс обработки одного файла"""
    filename: str
    total_emails: int = 0
    processed_emails: int = 0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    status: str = 'pending'  # pending, processing, completed, failed
    error: Optional[str] = None

    @property
    def progress_percent(self) -> float:
        """Процент завершения"""
        if self.total_emails == 0:
            return 0.0
        return (self.processed_emails / self.total_emails) * 100

    @property
    def processing_time(self) -> Optional[float]:
        """Время обработки в секундах"""
        if self.start_time is None:
            return None
        end = self.end_time or time.time()
        return end - self.start_time


class ProgressTracker:
    """
    Отслеживает прогресс batch обработки файлов

    Features:
    - Real-time прогресс по файлам
    - Расчет ETA (estimated time to completion)
    - Статистика производительности
    - Callback уведомления для UI
    """

    def __init__(self, total_files: int = 0):
        """
        Args:
            total_files: Общее количество файлов для обработки
        """
        self.total_files = total_files
        self.current_file_index = 0
        self.current_file: Optional[FileProgress] = None

        # История обработки файлов
        self.files: List[FileProgress] = []

        # Метрики
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None

        # Скользящее окно для расчета скорости
        self.processing_times = deque(maxlen=10)  # Последние 10 файлов

        # Callbacks
        self.progress_listeners: List[Callable] = []
        self.file_completed_listeners: List[Callable] = []

    def start(self):
        """Начинает отслеживание прогресса"""
        self.start_time = time.time()
        self._notify_progress()

    def start_file(self, filename: str, total_emails: int = 0):
        """
        Начинает обработку файла

        Args:
            filename: Имя файла
            total_emails: Ожидаемое количество email в файле
        """
        self.current_file = FileProgress(
            filename=filename,
            total_emails=total_emails,
            start_time=time.time(),
            status='processing'
        )
        self.current_file_index += 1
        self._notify_progress()

    def update_file_progress(self, processed_emails: int):
        """
        Обновляет прогресс текущего файла

        Args:
            processed_emails: Количество обработанных email
        """
        if self.current_file:
            self.current_file.processed_emails = processed_emails
            self._notify_progress()

    def complete_file(self, success: bool = True, error: Optional[str] = None):
        """
        Завершает обработку файла

        Args:
            success: Успешно ли завершена обработка
            error: Сообщение об ошибке если была
        """
        if self.current_file:
            self.current_file.end_time = time.time()
            self.current_file.status = 'completed' if success else 'failed'
            self.current_file.error = error

            # Сохраняем время обработки для расчета ETA
            if success and self.current_file.processing_time:
                self.processing_times.append(self.current_file.processing_time)

            # Добавляем в историю
            self.files.append(self.current_file)

            # Уведомляем listeners
            for listener in self.file_completed_listeners:
                try:
                    listener(self.current_file)
                except Exception as e:
                    print(f"⚠️  Ошибка в file_completed listener: {e}")

            self.current_file = None
            self._notify_progress()

    def finish(self):
        """Завершает отслеживание прогресса"""
        self.end_time = time.time()
        self._notify_progress()

    def get_progress_percent(self) -> float:
        """Возвращает общий процент завершения"""
        if self.total_files == 0:
            return 0.0

        completed = len([f for f in self.files if f.status in ('completed', 'failed')])
        return (completed / self.total_files) * 100

    def get_eta(self) -> Optional[timedelta]:
        """
        Рассчитывает оставшееся время до завершения

        Returns:
            timedelta с ETA или None если недостаточно данных
        """
        if not self.processing_times or not self.start_time:
            return None

        # Средняя скорость обработки файла
        avg_time_per_file = sum(self.processing_times) / len(self.processing_times)

        # Оставшиеся файлы
        completed = len(self.files)
        remaining = self.total_files - completed

        if remaining <= 0:
            return timedelta(seconds=0)

        # ETA в секундах
        eta_seconds = avg_time_per_file * remaining

        return timedelta(seconds=int(eta_seconds))

    def get_elapsed_time(self) -> Optional[timedelta]:
        """Возвращает прошедшее время"""
        if not self.start_time:
            return None

        end = self.end_time or time.time()
        elapsed_seconds = end - self.start_time

        return timedelta(seconds=int(elapsed_seconds))

    def get_statistics(self) -> Dict:
        """Возвращает подробную статистику"""
        stats = {
            'total_files': self.total_files,
            'completed_files': len([f for f in self.files if f.status == 'completed']),
            'failed_files': len([f for f in self.files if f.status == 'failed']),
            'remaining_files': self.total_files - len(self.files),
            'progress_percent': self.get_progress_percent(),
            'elapsed_time': str(self.get_elapsed_time()) if self.get_elapsed_time() else None,
            'eta': str(self.get_eta()) if self.get_eta() else None,
            'current_file': self.current_file.filename if self.current_file else None,
            'current_file_progress': self.current_file.progress_percent if self.current_file else 0,
        }

        # Скорость обработки
        if self.processing_times:
            avg_time = sum(self.processing_times) / len(self.processing_times)
            stats['avg_time_per_file'] = f"{avg_time:.2f}s"
            stats['files_per_minute'] = f"{60 / avg_time:.1f}"

        return stats

    def add_progress_listener(self, callback: Callable[[Dict], None]):
        """
        Добавляет listener для обновлений прогресса

        Args:
            callback: Функция вида (stats: Dict) -> None
        """
        self.progress_listeners.append(callback)

    def add_file_completed_listener(self, callback: Callable[[FileProgress], None]):
        """
        Добавляет listener для завершения файлов

        Args:
            callback: Функция вида (file_progress: FileProgress) -> None
        """
        self.file_completed_listeners.append(callback)

    def _notify_progress(self):
        """Уведомляет всех listeners об обновлении прогресса"""
        stats = self.get_statistics()

        for listener in self.progress_listeners:
            try:
                listener(stats)
            except Exception as e:
                print(f"⚠️  Ошибка в progress listener: {e}")

    def get_summary(self) -> str:
        """Возвращает текстовую сводку прогресса"""
        stats = self.get_statistics()

        summary = f"""
📊 ПРОГРЕСС ОБРАБОТКИ
{'='*60}
📁 Файлов: {stats['completed_files']}/{stats['total_files']} ({stats['progress_percent']:.1f}%)
✅ Успешно: {stats['completed_files']}
❌ Ошибок: {stats['failed_files']}
⏱️  Время: {stats['elapsed_time'] or 'N/A'}
⏰ ETA: {stats['eta'] or 'Расчет...'}
"""

        if self.current_file:
            summary += f"""
🔄 Текущий файл: {self.current_file.filename}
   Прогресс: {self.current_file.progress_percent:.1f}%
"""

        if 'avg_time_per_file' in stats:
            summary += f"""
⚡ Скорость: {stats['avg_time_per_file']} на файл ({stats['files_per_minute']} файлов/мин)
"""

        return summary


class ConsoleProgressDisplay:
    """
    Вспомогательный класс для отображения прогресса в консоли

    Использование:
        tracker = ProgressTracker(total_files=10)
        display = ConsoleProgressDisplay(tracker)
        display.start()
        # ... обработка ...
    """

    def __init__(self, tracker: ProgressTracker):
        self.tracker = tracker
        self.last_update = None

    def start(self):
        """Начинает отображение прогресса"""
        self.tracker.add_progress_listener(self._on_progress)
        self.tracker.add_file_completed_listener(self._on_file_completed)

    def _on_progress(self, stats: Dict):
        """Обработчик обновления прогресса"""
        # Обновляем не чаще раза в секунду
        now = time.time()
        if self.last_update and (now - self.last_update) < 1.0:
            return

        self.last_update = now

        # Выводим прогресс-бар
        progress = stats['progress_percent']
        bar_length = 40
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)

        print(f"\r[{bar}] {progress:.1f}% | {stats['current_file'] or 'Ожидание...'}", end='', flush=True)

    def _on_file_completed(self, file_progress: FileProgress):
        """Обработчик завершения файла"""
        if file_progress.status == 'completed':
            icon = '✅'
        else:
            icon = '❌'

        print(f"\n{icon} {file_progress.filename} - {file_progress.processing_time:.2f}s")
