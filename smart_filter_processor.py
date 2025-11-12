#!/usr/bin/env python3
"""
Smart Filter Processor - Процессор умной фильтрации clean-листов

Применяет контекстную фильтрацию к уже очищенным email-листам с использованием
специализированных фильтров (например, italy_hydraulics_filter)
"""

import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Set, Optional, Tuple
from collections import defaultdict

# Импортируем Italy Hydraulics Filter
from smart_filters.italy_hydraulics_filter import (
    ItalyHydraulicsHardExclusionFilter,
    ItalyHydraulicsDetector,
    ItalyHydraulicsClassifier,
    ItalyHydraulicsLeadScorer,
    load_config
)

# Импортируем метаданные
from email_metadata import EmailWithMetadata


class FilterResult:
    """
    Результат фильтрации одного файла
    """
    def __init__(self, source_file: Path):
        self.source_file = source_file
        self.timestamp = datetime.now()

        # Категории по приоритетам
        self.high_priority: List[Dict] = []
        self.medium_priority: List[Dict] = []
        self.low_priority: List[Dict] = []
        self.excluded: List[Dict] = []

        # Статистика
        self.stats = {
            'total_input': 0,
            'hard_excluded': 0,
            'high_priority': 0,
            'medium_priority': 0,
            'low_priority': 0,
            'excluded': 0,
            'processing_time': 0.0
        }

        # Причины исключений
        self.exclusion_reasons: List[Dict] = []

    def get_statistics(self) -> Dict:
        """Возвращает статистику обработки"""
        return {
            'source_file': self.source_file.name,
            **self.stats,
            'success_rate': round((self.stats['high_priority'] + self.stats['medium_priority']) /
                                 max(1, self.stats['total_input']) * 100, 2)
        }


class SmartFilterProcessor:
    """
    Процессор умной фильтрации
    """

    def __init__(self, filter_name: str = 'italy_hydraulics', base_dir: str = '.'):
        """
        Args:
            filter_name: Имя фильтра (например, 'italy_hydraulics')
            base_dir: Базовая директория проекта
        """
        self.filter_name = filter_name
        self.base_dir = Path(base_dir)

        # Загружаем конфиг фильтра
        config_path = self.base_dir / 'smart_filters' / 'configs' / f'{filter_name}_config.json'
        if not config_path.exists():
            raise FileNotFoundError(f"Конфиг не найден: {config_path}")

        self.config = load_config(str(config_path))
        print(f"✓ Загружен конфиг: {self.config['filter_name']} v{self.config['version']}")

        # Инициализируем компоненты фильтра
        self._init_filter_components()

        # Директории
        self.output_dir = self.base_dir / 'output'
        self.output_dir.mkdir(exist_ok=True)

    def _init_filter_components(self):
        """Инициализирует компоненты фильтра"""
        if self.filter_name == 'italy_hydraulics':
            self.hard_exclusion_filter = ItalyHydraulicsHardExclusionFilter(self.config)
            self.detector = ItalyHydraulicsDetector(self.config)
            self.classifier = ItalyHydraulicsClassifier(self.config)
            self.lead_scorer = ItalyHydraulicsLeadScorer(self.config)
        else:
            raise ValueError(f"Неизвестный фильтр: {self.filter_name}")

        print(f"✓ Инициализированы компоненты фильтра: {self.filter_name}")

    def process_clean_file(self, clean_file_path: Path,
                          include_metadata: bool = True) -> FilterResult:
        """
        Обрабатывает один clean-файл

        Args:
            clean_file_path: Путь к clean-файлу (TXT, CSV, JSON)
            include_metadata: Включать ли метаданные в выходные файлы

        Returns:
            FilterResult с результатами обработки
        """
        print(f"\n{'='*70}")
        print(f"🔍 SMART FILTER: {clean_file_path.name}")
        print(f"   Фильтр: {self.config['filter_name']}")
        print(f"{'='*70}\n")

        result = FilterResult(clean_file_path)
        start_time = datetime.now()

        try:
            # 1. Загружаем email из clean-файла
            emails_data = self._load_clean_file(clean_file_path)
            result.stats['total_input'] = len(emails_data)
            print(f"✓ Загружено: {len(emails_data)} email")

            # 2. Применяем жесткие исключения
            after_hard_exclusions = self._apply_hard_exclusions(emails_data, result)
            print(f"✓ После жестких исключений: {len(after_hard_exclusions)} email "
                  f"({result.stats['hard_excluded']} исключено)")

            # 3. Скоринг оставшихся контактов
            self._score_contacts(after_hard_exclusions, result)
            print(f"✓ Скоринг завершен:")
            print(f"   🔥 High priority:   {result.stats['high_priority']}")
            print(f"   ⭐ Medium priority: {result.stats['medium_priority']}")
            print(f"   💡 Low priority:    {result.stats['low_priority']}")
            print(f"   ❌ Excluded:        {result.stats['excluded']}")

            # 4. Сохраняем результаты
            self._save_results(result, include_metadata)

            # 5. Генерируем отчеты
            if self.config['output_settings'].get('generate_html_report', True):
                self._generate_html_report(result)

            if self.config['output_settings'].get('generate_exclusion_report', True):
                self._save_exclusion_report(result)

        except Exception as error:
            print(f"❌ Ошибка обработки {clean_file_path.name}: {error}")
            raise

        finally:
            result.stats['processing_time'] = (datetime.now() - start_time).total_seconds()
            print(f"\n⏱️  Время обработки: {result.stats['processing_time']:.2f} сек")
            print(f"✅ Обработка завершена\n")

        return result

    def process_clean_batch(self, pattern: str = "output/*_clean_*.txt") -> List[FilterResult]:
        """
        Batch обработка нескольких clean-файлов

        Args:
            pattern: Glob паттерн для поиска clean-файлов

        Returns:
            Список FilterResult для каждого файла
        """
        # Находим все clean-файлы
        clean_files = list(Path('.').glob(pattern))

        if not clean_files:
            print(f"❌ Не найдено файлов по паттерну: {pattern}")
            return []

        print(f"\n{'='*70}")
        print(f"📦 BATCH SMART FILTER")
        print(f"   Найдено файлов: {len(clean_files)}")
        print(f"   Фильтр: {self.config['filter_name']}")
        print(f"{'='*70}\n")

        results = []
        for i, clean_file in enumerate(clean_files, 1):
            print(f"\n[{i}/{len(clean_files)}] Обработка: {clean_file.name}")
            try:
                result = self.process_clean_file(clean_file)
                results.append(result)
            except Exception as error:
                print(f"⚠️ Ошибка в файле {clean_file.name}: {error}")
                continue

        # Итоговая статистика
        self._print_batch_summary(results)

        return results

    def _load_clean_file(self, file_path: Path) -> List[Dict]:
        """
        Загружает email из clean-файла

        Поддерживаемые форматы:
        - TXT: один email на строку
        - CSV: с колонками email, company, description, keywords, source, domain
        - JSON: массив объектов с полями
        """
        emails_data = []

        try:
            if file_path.suffix.lower() == '.txt':
                # TXT: только email
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        email = line.strip()
                        if email and '@' in email:
                            emails_data.append({
                                'email': email,
                                'company': '',
                                'description': '',
                                'keywords': '',
                                'source': '',
                                'domain': ''
                            })

            elif file_path.suffix.lower() == '.csv':
                # CSV: с метаданными
                with open(file_path, 'r', encoding='utf-8', newline='') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if row.get('email'):
                            emails_data.append({
                                'email': row.get('email', ''),
                                'company': row.get('company_name', row.get('company', '')),
                                'description': row.get('description', row.get('meta_description', '')),
                                'keywords': row.get('keywords', ''),
                                'source': row.get('source', ''),
                                'domain': row.get('domain', row.get('web_domain', ''))
                            })

            elif file_path.suffix.lower() == '.json':
                # JSON: с метаданными
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            if item.get('email'):
                                emails_data.append({
                                    'email': item.get('email', ''),
                                    'company': item.get('company_name', item.get('company', '')),
                                    'description': item.get('description', ''),
                                    'keywords': item.get('keywords', ''),
                                    'source': item.get('source', ''),
                                    'domain': item.get('domain', '')
                                })

            else:
                raise ValueError(f"Неподдерживаемый формат файла: {file_path.suffix}")

        except Exception as error:
            print(f"❌ Ошибка загрузки {file_path.name}: {error}")
            raise

        return emails_data

    def _apply_hard_exclusions(self, emails_data: List[Dict], result: FilterResult) -> List[Dict]:
        """Применяет жесткие исключения"""
        after_exclusions = []

        for email_data in emails_data:
            email = email_data['email']
            company = email_data.get('company', '')
            description = email_data.get('description', '')
            domain = email_data.get('domain', '')

            # Проверяем жесткие исключения
            exclusion_result = self.hard_exclusion_filter.should_exclude(
                email, company, description, domain
            )

            if exclusion_result['should_exclude']:
                result.stats['hard_excluded'] += 1
                result.exclusion_reasons.append({
                    'email': email,
                    'company': company,
                    'reasons': exclusion_result['reasons'],
                    'severity': exclusion_result['severity']
                })
            else:
                after_exclusions.append(email_data)

        return after_exclusions

    def _score_contacts(self, emails_data: List[Dict], result: FilterResult):
        """Применяет скоринг к контактам"""
        for email_data in emails_data:
            email = email_data['email']
            company = email_data.get('company', '')
            description = email_data.get('description', '')
            keywords = email_data.get('keywords', '')
            source = email_data.get('source', '')
            domain = email_data.get('domain', '')

            # Скоринг
            score_result = self.lead_scorer.score_contact(
                email, company, description, keywords, source, domain
            )

            # Добавляем score к данным
            email_data_with_score = {
                **email_data,
                'overall_score': score_result['overall'],
                'email_score': score_result['breakdown']['email'],
                'relevance_score': score_result['breakdown']['relevance'],
                'geographic_score': score_result['breakdown']['geographic'],
                'engagement_score': score_result['breakdown']['engagement'],
                'priority': score_result['priority'],
                'target_category': score_result['target_category']
            }

            # Распределяем по категориям
            if score_result['priority'] == 'high':
                result.high_priority.append(email_data_with_score)
                result.stats['high_priority'] += 1
            elif score_result['priority'] == 'medium':
                result.medium_priority.append(email_data_with_score)
                result.stats['medium_priority'] += 1
            elif score_result['priority'] == 'low':
                result.low_priority.append(email_data_with_score)
                result.stats['low_priority'] += 1
            else:
                result.excluded.append(email_data_with_score)
                result.stats['excluded'] += 1

    def _save_results(self, result: FilterResult, include_metadata: bool = True):
        """Сохраняет результаты в файлы"""
        timestamp = result.timestamp.strftime("%Y%m%d_%H%M%S")
        filename_prefix = self.config['output_settings'].get('filename_prefix', 'Smart_Filter')
        source_name = result.source_file.stem

        categories = {
            'HIGH': result.high_priority,
            'MEDIUM': result.medium_priority,
            'LOW': result.low_priority,
            'EXCLUDED': result.excluded
        }

        for category_name, emails in categories.items():
            if not emails:
                continue

            # TXT: только email
            txt_file = self.output_dir / f"{filename_prefix}_{source_name}_{category_name}_{timestamp}.txt"
            with open(txt_file, 'w', encoding='utf-8') as f:
                for email_data in emails:
                    f.write(f"{email_data['email']}\n")
            print(f"   ✓ Сохранено TXT: {txt_file.name} ({len(emails)} email)")

            # CSV: с метаданными
            if include_metadata:
                csv_file = self.output_dir / f"{filename_prefix}_{source_name}_{category_name}_metadata_{timestamp}.csv"
                with open(csv_file, 'w', encoding='utf-8', newline='') as f:
                    if emails:
                        fieldnames = emails[0].keys()
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        writer.writerows(emails)
                print(f"   ✓ Сохранено CSV: {csv_file.name}")

                # JSON: с метаданными
                json_file = self.output_dir / f"{filename_prefix}_{source_name}_{category_name}_metadata_{timestamp}.json"
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(emails, f, ensure_ascii=False, indent=2)
                print(f"   ✓ Сохранено JSON: {json_file.name}")

    def _save_exclusion_report(self, result: FilterResult):
        """Сохраняет отчет об исключениях"""
        if not result.exclusion_reasons:
            return

        timestamp = result.timestamp.strftime("%Y%m%d_%H%M%S")
        filename_prefix = self.config['output_settings'].get('filename_prefix', 'Smart_Filter')
        source_name = result.source_file.stem

        report_file = self.output_dir / f"{filename_prefix}_{source_name}_EXCLUSION_REPORT_{timestamp}.csv"

        with open(report_file, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['email', 'company', 'reasons', 'severity']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for exclusion in result.exclusion_reasons:
                writer.writerow({
                    'email': exclusion['email'],
                    'company': exclusion['company'],
                    'reasons': ', '.join(exclusion['reasons']),
                    'severity': exclusion['severity']
                })

        print(f"   ✓ Отчет об исключениях: {report_file.name} ({len(result.exclusion_reasons)} записей)")

    def _generate_html_report(self, result: FilterResult):
        """Генерирует HTML отчет"""
        # TODO: Реализовать HTML отчет с Google Charts
        # Пока пропускаем для MVP
        pass

    def _print_batch_summary(self, results: List[FilterResult]):
        """Выводит итоговую статистику batch обработки"""
        print(f"\n{'='*70}")
        print("📊 ИТОГОВАЯ СТАТИСТИКА BATCH ОБРАБОТКИ")
        print(f"{'='*70}\n")

        total_stats = defaultdict(int)
        for result in results:
            for key, value in result.stats.items():
                total_stats[key] += value

        print(f"✅ Обработано файлов: {len(results)}")
        print(f"📧 Всего email обработано: {total_stats['total_input']}")
        print(f"\n🎯 РЕЗУЛЬТАТЫ:")
        print(f"   🔥 High priority:   {total_stats['high_priority']}")
        print(f"   ⭐ Medium priority: {total_stats['medium_priority']}")
        print(f"   💡 Low priority:    {total_stats['low_priority']}")
        print(f"   ❌ Excluded:        {total_stats['hard_excluded'] + total_stats['excluded']}")
        print(f"\n⏱️  Общее время: {total_stats['processing_time']:.2f} сек")
        print(f"✅ Batch обработка завершена\n")


# Пример использования
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 smart_filter_processor.py <clean_file_path> [filter_name]")
        print("\nExample:")
        print("  python3 smart_filter_processor.py output/list_clean_20251010.txt italy_hydraulics")
        sys.exit(1)

    clean_file = Path(sys.argv[1])
    filter_name = sys.argv[2] if len(sys.argv) > 2 else 'italy_hydraulics'

    # Создаем процессор
    processor = SmartFilterProcessor(filter_name=filter_name)

    # Обрабатываем файл
    result = processor.process_clean_file(clean_file)

    # Выводим статистику
    print("\n" + "="*70)
    print("📈 СТАТИСТИКА:")
    print("="*70)
    for key, value in result.get_statistics().items():
        print(f"   {key}: {value}")
