#!/usr/bin/env python3
"""
Smart Filter Processor V2 - Полный аналог Google Script логики
Автономная система для умной фильтрации по странам и тематикам
Полностью независимая реализация без конфликтов с существующим кодом
"""

import json
import os
import re
import time
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import shutil
import tempfile

@dataclass
class SmartFilterResult:
    """Результат умной фильтрации одного email"""
    email: str
    original_score: float
    final_score: float
    priority: str
    target_category: str
    exclusion_reasons: List[str]
    indicators: Dict[str, Any]
    metadata: Dict[str, Any]
    processing_timestamp: str

@dataclass
class SmartFilterStatistics:
    """Статистика обработки"""
    total_processed: int = 0
    hard_excluded: int = 0
    valid_emails: int = 0
    qualified_leads: int = 0
    high_priority: int = 0
    medium_priority: int = 0
    low_priority: int = 0
    processing_time: float = 0.0
    errors: int = 0
    excluded_by_category: Dict[str, int] = None

    def __post_init__(self):
        if self.excluded_by_category is None:
            self.excluded_by_category = defaultdict(int)

class SmartFilterLogger:
    """Логгер для умной фильтрации"""

    def __init__(self, filter_name: str = "smart_filter"):
        self.filter_name = filter_name
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        self.log_file = self.logs_dir / f"{filter_name}_{datetime.now().strftime('%Y%m%d')}.log"

    def info(self, message: str, details: str = ""):
        self._log("INFO", message, details)

    def warn(self, message: str, details: str = ""):
        self._log("WARN", message, details)

    def error(self, message: str, details: str = ""):
        self._log("ERROR", message, details)

    def debug(self, message: str, details: str = ""):
        self._log("DEBUG", message, details)

    def _log(self, level: str, message: str, details: str = ""):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {self.filter_name}: {message}"
        if details:
            log_entry += f" - {details}"

        print(log_entry)

        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(log_entry + '\n')
        except Exception as e:
            print(f"Failed to write to log file: {e}")

class SmartHardExclusionFilter:
    """Фильтр жестких исключений - полный аналог из Google Script"""

    def __init__(self, config: Dict):
        self.config = config
        self.logger = SmartFilterLogger("exclusion_filter")

        # Загружаем множества для быстрого поиска
        self.personal_domains = set(config.get('exclusions', {}).get('personal_domains', []))
        self.hr_prefixes = set(config.get('exclusions', {}).get('hr_prefixes', []))
        self.service_prefixes = set(config.get('exclusions', {}).get('service_prefixes', []))
        self.suspicious_domains = set(config.get('exclusions', {}).get('suspicious_domains', []))
        self.excluded_country_domains = set(config.get('exclusions', {}).get('excluded_country_domains', []))

        self.excluded_industries = config.get('exclusions', {}).get('excluded_industries', {})
        self.suspicious_patterns = [re.compile(pattern) for pattern in
                                  config.get('exclusions', {}).get('suspicious_patterns', [])]

    def should_exclude(self, email: str, company_name: str = "", description: str = "",
                      domain: str = "") -> Dict[str, Any]:
        """Проверяет, нужно ли исключить email"""
        exclusion_reasons = []

        try:
            # Проверка персональных доменов
            if self.is_personal_domain(email):
                exclusion_reasons.append('personal_domain')

            # Проверка HR и сервисных email
            if self.is_hr_or_service_email(email):
                exclusion_reasons.append('hr_service_prefix')

            # Проверка географических исключений
            if self.is_geographically_excluded(email, description, domain):
                exclusion_reasons.append('geographic_restriction')

            # Проверка подозрительных паттернов
            if self.is_suspicious_pattern(email):
                exclusion_reasons.append('suspicious_pattern')

            # Проверка исключенных индустрий
            if self.is_excluded_industry(company_name, description):
                exclusion_reasons.append('excluded_industry')

        except Exception as error:
            self.logger.error("Error in exclusion filter", str(error))
            exclusion_reasons.append('filter_error')

        return {
            'should_exclude': len(exclusion_reasons) > 0,
            'reasons': exclusion_reasons,
            'severity': 'critical' if len(exclusion_reasons) >= 2 else 'warning'
        }

    def is_personal_domain(self, email: str) -> bool:
        if not email or '@' not in email:
            return False

        try:
            domain = email.split('@')[1].lower().strip()
            return domain in self.personal_domains
        except Exception:
            return False

    def is_hr_or_service_email(self, email: str) -> bool:
        if not email:
            return False

        try:
            email_lower = email.lower().strip()

            # Проверка префиксов
            for prefix in self.hr_prefixes:
                if email_lower.startswith(prefix):
                    return True

            for prefix in self.service_prefixes:
                if prefix in email_lower:
                    return True

            # Проверка подозрительных доменов
            domain = email.split('@')[1].lower().strip()
            for suspicious_domain in self.suspicious_domains:
                if suspicious_domain in domain:
                    return True

        except Exception as error:
            self.logger.error("Error checking HR/service email", str(error))

        return False

    def is_geographically_excluded(self, email: str, description: str = "", domain: str = "") -> bool:
        if not email:
            return False

        try:
            email_domain = email.split('@')[1].lower().strip()
            text = f"{email} {description} {domain}".lower()

            # Проверка доменов стран
            for country_domain in self.excluded_country_domains:
                if email_domain.endswith(country_domain):
                    return True

        except Exception as error:
            self.logger.error("Error checking geographic exclusions", str(error))

        return False

    def is_suspicious_pattern(self, email: str) -> bool:
        if not email:
            return False

        try:
            for pattern in self.suspicious_patterns:
                if pattern.search(email):
                    return True
        except Exception as error:
            self.logger.error("Error checking suspicious patterns", str(error))

        return False

    def is_excluded_industry(self, company_name: str = "", description: str = "") -> bool:
        try:
            text = f"{company_name} {description}".lower()

            # Проверка ключевых слов исключенных индустрий
            for industry_keywords in self.excluded_industries.values():
                for keyword in industry_keywords:
                    if keyword.lower() in text:
                        return True

        except Exception as error:
            self.logger.error("Error checking excluded industries", str(error))

        return False

class SmartHydraulicDetector:
    """Детектор гидравлических цилиндров - полный аналог Google Script"""

    def __init__(self, config: Dict):
        self.config = config
        self.logger = SmartFilterLogger("hydraulic_detector")

        # Загружаем ключевые слова
        self.hydraulic_keywords = config.get('keywords', {}).get('hydraulic_cylinders', [])
        self.application_keywords = config.get('keywords', {}).get('applications', [])
        self.component_keywords = config.get('keywords', {}).get('components', [])
        self.oem_indicators = config.get('keywords', {}).get('oem_indicators', [])

        # Доменные паттерны
        self.domain_patterns = config.get('domain_patterns', {}).get('relevant_patterns', [])
        self.high_value_domains = config.get('domain_patterns', {}).get('high_value_domains', [])

    def detect_hydraulic_relevance(self, text: str) -> Dict[str, Any]:
        """Определяет релевантность текста гидравлической тематике"""
        score = 0
        found_indicators = []

        try:
            if not text or not isinstance(text, str):
                return self._create_empty_detection_result()

            text_lower = text.lower()

            # Проверка основных ключевых слов гидравлики
            for keyword in self.hydraulic_keywords:
                if keyword.lower() in text_lower:
                    weight = 25 if len(keyword) > 15 else 20 if len(keyword) > 10 else 15
                    score += weight
                    found_indicators.append(f"hydraulic:{keyword}")

            # Проверка слов применения
            for keyword in self.application_keywords:
                if keyword.lower() in text_lower:
                    weight = 15 if len(keyword) > 10 else 10
                    score += weight
                    found_indicators.append(f"application:{keyword}")

            # Проверка компонентов
            for keyword in self.component_keywords:
                if keyword.lower() in text_lower:
                    weight = 10
                    score += weight
                    found_indicators.append(f"component:{keyword}")

            # Проверка OEM индикаторов
            for keyword in self.oem_indicators:
                if keyword.lower() in text_lower:
                    weight = 20
                    score += weight
                    found_indicators.append(f"oem:{keyword}")

        except Exception as error:
            self.logger.error("Error in hydraulic detection", str(error))

        return {
            'is_relevant': score >= 20,
            'confidence': min(100, score),
            'score': score,
            'indicators': found_indicators,
            'categories': self._categorize_indicators(found_indicators)
        }

    def detect_domain_relevance(self, domain: str) -> Dict[str, Any]:
        """Определяет релевантность домена"""
        score = 0
        found_patterns = []

        try:
            if not domain or not isinstance(domain, str):
                return {'relevant': False, 'score': 0, 'patterns': []}

            domain_lower = domain.lower()

            # Проверка релевантных паттернов
            for pattern in self.domain_patterns:
                if pattern in domain_lower:
                    score += 15
                    found_patterns.append(pattern)

            # Проверка высокоценных доменов
            for pattern in self.high_value_domains:
                if pattern in domain_lower:
                    score += 25
                    found_patterns.append(f"high_value:{pattern}")

        except Exception as error:
            self.logger.error("Error checking domain relevance", str(error))

        return {
            'relevant': score >= 15,
            'score': score,
            'patterns': found_patterns
        }

    def _create_empty_detection_result(self) -> Dict[str, Any]:
        return {
            'is_relevant': False,
            'confidence': 0,
            'score': 0,
            'indicators': [],
            'categories': {}
        }

    def _categorize_indicators(self, indicators: List[str]) -> Dict[str, List[str]]:
        """Категоризирует найденные индикаторы"""
        categories = defaultdict(list)

        for indicator in indicators:
            if ':' in indicator:
                category, value = indicator.split(':', 1)
                categories[category].append(value)
            else:
                categories['general'].append(indicator)

        return dict(categories)

class SmartGeographicPrioritizer:
    """Географический приоритезер - полный аналог Google Script"""

    def __init__(self, config: Dict):
        self.config = config
        self.logger = SmartFilterLogger("geographic_prioritizer")

        self.high_priority_geo = set(config.get('geographic_priorities', {}).get('high', []))
        self.medium_priority_geo = set(config.get('geographic_priorities', {}).get('medium', []))
        self.regions = set(config.get('geographic_priorities', {}).get('regions', []))

    def get_geographic_priority(self, text: str = "", domain: str = "", email: str = "") -> Dict[str, Any]:
        """Определяет географический приоритет"""
        try:
            combined_text = f"{text} {domain} {email}".lower()

            # Высокий приоритет
            for keyword in self.high_priority_geo:
                if keyword.lower() in combined_text:
                    return {
                        'priority': 'high',
                        'score': 100,
                        'matched_keywords': [keyword],
                        'confidence': 0.9
                    }

            # Средний приоритет
            for keyword in self.medium_priority_geo:
                if keyword.lower() in combined_text:
                    return {
                        'priority': 'medium',
                        'score': 60,
                        'matched_keywords': [keyword],
                        'confidence': 0.6
                    }

            # Проверка регионов
            for keyword in self.regions:
                if keyword.lower() in combined_text:
                    return {
                        'priority': 'medium',
                        'score': 40,
                        'matched_keywords': [keyword],
                        'confidence': 0.4
                    }

        except Exception as error:
            self.logger.error("Error in geographic prioritization", str(error))

        return {
            'priority': 'low',
            'score': 20,
            'matched_keywords': [],
            'confidence': 0.1
        }

class SmartLeadScorer:
    """Скорер лидов - полный аналог Google Script"""

    def __init__(self, config: Dict):
        self.config = config
        self.logger = SmartFilterLogger("lead_scorer")

        self.weights = config.get('scoring', {}).get('weights', {
            'email_quality': 0.10,
            'company_relevance': 0.45,
            'geographic_priority': 0.30,
            'engagement': 0.15
        })

        self.thresholds = config.get('scoring', {}).get('thresholds', {
            'high_priority': 100,
            'medium_priority': 50,
            'low_priority': 10,
            'exclude': 0
        })

        # Инициализация компонентов
        self.hydraulic_detector = SmartHydraulicDetector(config)
        self.geographic_prioritizer = SmartGeographicPrioritizer(config)

    def score_contact(self, email: str, company_name: str = "", description: str = "",
                     title: str = "", domain: str = "", source: str = "") -> Dict[str, Any]:
        """Скорит контакт"""
        try:
            # Качество email
            email_score = self.score_email_quality(email, domain)

            # Релевантность компании
            relevance_score = self.score_company_relevance(
                company_name, description, title, email, domain
            )

            # Географический приоритет
            geo_score = self.score_geographic_priority(
                company_name, description, email, domain
            )

            # Вовлеченность
            engagement_score = self.score_engagement(source)

            # Общий скор
            overall_score = (
                email_score * self.weights['email_quality'] +
                relevance_score * self.weights['company_relevance'] +
                geo_score * self.weights['geographic_priority'] +
                engagement_score * self.weights['engagement']
            )

            # Определение приоритета
            priority = self.get_priority_level(overall_score)
            target_category = self.get_target_category(relevance_score, geo_score)

            return {
                'overall': round(overall_score, 2),
                'breakdown': {
                    'email': email_score,
                    'relevance': relevance_score,
                    'geographic': geo_score,
                    'engagement': engagement_score
                },
                'priority': priority,
                'target_category': target_category,
                'is_qualified': overall_score >= self.thresholds['low_priority']
            }

        except Exception as error:
            self.logger.error("Error scoring contact", str(error))
            return self._create_empty_score()

    def score_email_quality(self, email: str, domain: str = "") -> float:
        """Оценивает качество email"""
        if not email or '@' not in email:
            return 0

        try:
            score = 25
            email_domain = email.split('@')[1].lower().strip()

            # Проверка на персональные домены
            personal_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                              'libero.it', 'virgilio.it', 'tim.it']

            if email_domain not in personal_domains:
                score += 35
            else:
                score += 15

            # Проверка локальной части
            local_part = email.split('@')[0]
            if '.' in local_part:
                score += 15
            if 3 < len(local_part) < 25:
                score += 10

            # Бонус за релевантный домен
            if domain:
                domain_check = self.hydraulic_detector.detect_domain_relevance(domain)
                if domain_check['relevant']:
                    score += 25

            return min(100, score)

        except Exception as error:
            self.logger.error("Error scoring email quality", str(error))
            return 0

    def score_company_relevance(self, company_name: str, description: str, title: str,
                              email: str, domain: str) -> float:
        """Оценивает релевантность компании"""
        try:
            text = f"{company_name} {description} {title}"

            # Детекция гидравлической релевантности
            hydraulic_check = self.hydraulic_detector.detect_hydraulic_relevance(text)

            # Проверка домена
            email_domain = email.split('@')[1] if '@' in email else ""
            domain_check = self.hydraulic_detector.detect_domain_relevance(email_domain)
            if domain:
                domain_check_full = self.hydraulic_detector.detect_domain_relevance(domain)
                # Используем лучший результат
                if domain_check_full['score'] > domain_check['score']:
                    domain_check = domain_check_full

            # Комбинированный скор
            base_score = hydraulic_check['score'] + domain_check['score']

            return min(100, max(0, base_score))

        except Exception as error:
            self.logger.error("Error scoring company relevance", str(error))
            return 0

    def score_geographic_priority(self, company_name: str, description: str,
                                email: str, domain: str) -> float:
        """Оценивает географический приоритет"""
        try:
            geo_result = self.geographic_prioritizer.get_geographic_priority(
                f"{company_name} {description}", domain, email
            )
            return geo_result['score']

        except Exception as error:
            self.logger.error("Error scoring geographic priority", str(error))
            return 30

    def score_engagement(self, source: str = "") -> float:
        """Оценивает вовлеченность"""
        try:
            if not source:
                return 25

            source_lower = source.lower()
            if 'contact' in source_lower:
                return 75
            elif 'about' in source_lower:
                return 65
            elif 'product' in source_lower:
                return 85
            elif 'service' in source_lower:
                return 80

            return 40

        except Exception as error:
            self.logger.error("Error scoring engagement", str(error))
            return 25

    def get_priority_level(self, score: float) -> str:
        """Определяет уровень приоритета"""
        if score >= self.thresholds['high_priority']:
            return 'high'
        elif score >= self.thresholds['medium_priority']:
            return 'medium'
        elif score >= self.thresholds['low_priority']:
            return 'low'
        return 'exclude'

    def get_target_category(self, relevance_score: float, geo_score: float) -> str:
        """Определяет целевую категорию"""
        if relevance_score >= 70 and geo_score >= 80:
            return 'primary_target'
        elif relevance_score >= 50 and geo_score >= 50:
            return 'secondary_target'
        elif relevance_score >= 30:
            return 'potential'
        return 'excluded'

    def _create_empty_score(self) -> Dict[str, Any]:
        return {
            'overall': 0,
            'breakdown': {'email': 0, 'relevance': 0, 'geographic': 0, 'engagement': 0},
            'priority': 'exclude',
            'target_category': 'excluded',
            'is_qualified': False
        }

class SmartFileProcessor:
    """Безопасный процессор файлов с бэкапами"""

    def __init__(self, config: Dict):
        self.config = config
        self.logger = SmartFilterLogger("file_processor")

        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)

        self.processing_config = config.get('processing', {})
        self.backup_original = self.processing_config.get('backup_original', True)

    def create_backup(self, file_path: Path) -> Optional[Path]:
        """Создает бэкап файла"""
        if not self.backup_original:
            return None

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{file_path.stem}_backup_{timestamp}{file_path.suffix}"
            backup_path = self.backup_dir / backup_name

            shutil.copy2(file_path, backup_path)
            self.logger.info(f"Backup created: {backup_path}")
            return backup_path

        except Exception as error:
            self.logger.error(f"Failed to create backup for {file_path}", str(error))
            return None

    def atomic_write(self, file_path: Path, data: Any, is_binary: bool = False) -> bool:
        """Атомарная запись файла"""
        try:
            # Создаем временный файл
            with tempfile.NamedTemporaryFile(
                mode='wb' if is_binary else 'w',
                dir=file_path.parent,
                delete=False,
                encoding=None if is_binary else 'utf-8'
            ) as temp_file:
                temp_path = Path(temp_file.name)

                if is_binary:
                    temp_file.write(data)
                else:
                    if isinstance(data, list):
                        # Записываем CSV/JSON данные
                        if file_path.suffix.lower() == '.json':
                            json.dump(data, temp_file, ensure_ascii=False, indent=2)
                        else:
                            # TXT/CSV формат
                            if data and isinstance(data[0], list):
                                # CSV-like данные
                                for row in data:
                                    if isinstance(row, list):
                                        temp_file.write('\t'.join(str(x) for x in row) + '\n')
                                    else:
                                        temp_file.write(str(row) + '\n')
                            else:
                                # Простые строки
                                for item in data:
                                    temp_file.write(str(item) + '\n')
                    else:
                        temp_file.write(str(data))

            # Атомарное переименование
            temp_path.replace(file_path)
            self.logger.info(f"File written successfully: {file_path}")
            return True

        except Exception as error:
            self.logger.error(f"Failed to write file {file_path}", str(error))
            # Очистка временного файла при ошибке
            try:
                if 'temp_path' in locals():
                    temp_path.unlink()
            except:
                pass
            return False

    def ensure_directory_exists(self, file_path: Path) -> bool:
        """Убеждается, что директория существует"""
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            return True
        except Exception as error:
            self.logger.error(f"Failed to create directory {file_path.parent}", str(error))
            return False

class SmartFilterProcessor:
    """Основной процессор умной фильтрации - полный аналог Google Script"""

    def __init__(self, filter_name: str = "italy_hydraulics"):
        self.filter_name = filter_name
        self.logger = SmartFilterLogger(filter_name)

        # Загрузка конфигурации
        self.config = self._load_config(filter_name)
        if not self.config:
            raise ValueError(f"Configuration not found: {filter_name}")

        # Инициализация компонентов
        self.exclusion_filter = SmartHardExclusionFilter(self.config)
        self.hydraulic_detector = SmartHydraulicDetector(self.config)
        self.geographic_prioritizer = SmartGeographicPrioritizer(self.config)
        self.lead_scorer = SmartLeadScorer(self.config)
        self.file_processor = SmartFileProcessor(self.config)

        # Статистика
        self.statistics = SmartFilterStatistics()

    def _load_config(self, filter_name: str) -> Optional[Dict]:
        """Загружает конфигурацию"""
        try:
            # Use unified configs directory: smart_filters/configs/
            config_path = Path("smart_filters") / "configs" / f"{filter_name}.json"
            if not config_path.exists():
                self.logger.error(f"Configuration file not found: {config_path}")
                return None

            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            self.logger.info(f"Configuration loaded: {filter_name}")
            return config

        except Exception as error:
            self.logger.error(f"Failed to load configuration {filter_name}", str(error))
            return None

    def process_clean_file(self, file_path: Path, include_metadata: bool = True) -> Dict[str, Any]:
        """Обрабатывает clean файл"""
        start_time = time.time()

        try:
            self.logger.info(f"Starting processing: {file_path}")

            # Проверка существования файла
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            # Создание бэкапа
            backup_path = self.file_processor.create_backup(file_path)

            # Загрузка данных
            data = self._load_file_data(file_path)
            if not data:
                raise ValueError("No data loaded from file")

            # Обработка данных
            processed_results = self._process_data_batch(data)

            # Сохранение результатов
            output_files = self._save_results(processed_results, file_path, include_metadata)

            # Обновление статистики
            self.statistics.processing_time = time.time() - start_time

            # Генерация отчета
            self._generate_report(file_path, output_files, backup_path)

            result = {
                'success': True,
                'input_file': str(file_path),
                'output_files': output_files,
                'statistics': asdict(self.statistics),
                'backup_file': str(backup_path) if backup_path else None
            }

            self.logger.info(f"Processing completed: {file_path}")
            return result

        except Exception as error:
            self.logger.error(f"Processing failed: {file_path}", str(error))
            self.statistics.errors += 1

            return {
                'success': False,
                'input_file': str(file_path),
                'error': str(error),
                'statistics': asdict(self.statistics)
            }

    def process_clean_batch(self, pattern: str = "output/*_clean_*.txt") -> List[Dict[str, Any]]:
        """Batch обработка clean файлов"""
        self.logger.info(f"Starting batch processing with pattern: {pattern}")

        results = []

        try:
            # Поиск файлов по паттерну
            input_files = list(Path(".").glob(pattern))

            if not input_files:
                self.logger.warn(f"No files found matching pattern: {pattern}")
                return results

            self.logger.info(f"Found {len(input_files)} files to process")

            # Обработка каждого файла
            for file_path in input_files:
                result = self.process_clean_file(file_path, include_metadata=True)
                results.append(result)

                # Небольшая задержка между файлами
                time.sleep(self.config.get('processing', {}).get('processing_delay', 50) / 1000)

            self.logger.info(f"Batch processing completed: {len(results)} files processed")
            return results

        except Exception as error:
            self.logger.error(f"Batch processing failed", str(error))
            return results

    def _load_file_data(self, file_path: Path) -> List[str]:
        """Загружает данные из файла"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f if line.strip()]

            self.logger.info(f"Loaded {len(lines)} lines from {file_path}")
            return lines

        except Exception as error:
            self.logger.error(f"Failed to load data from {file_path}", str(error))
            return []

    def _process_data_batch(self, data: List[str]) -> List[SmartFilterResult]:
        """Обрабатывает данные батчами"""
        batch_size = self.config.get('processing', {}).get('batch_size', 100)
        results = []

        self.statistics.total_processed = len(data)

        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(data) + batch_size - 1) // batch_size

            self.logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} items)")

            # Обработка батча
            batch_results = self._process_batch(batch)
            results.extend(batch_results)

            # Задержка между батчами
            if i + batch_size < len(data):
                delay = self.config.get('processing', {}).get('processing_delay', 50) / 1000
                time.sleep(delay)

        self.logger.info(f"Data processing completed: {len(results)} results")
        return results

    def _process_batch(self, batch: List[str]) -> List[SmartFilterResult]:
        """Обрабатывает один батч"""
        results = []

        for item in batch:
            try:
                result = self._process_single_item(item)
                if result:
                    results.append(result)
            except Exception as error:
                self.logger.debug(f"Error processing item: {item}", str(error))
                self.statistics.errors += 1

        return results

    def _process_single_item(self, item: str) -> Optional[SmartFilterResult]:
        """Обрабатывает один элемент"""
        try:
            # Проверка формата email
            if not self._is_valid_email_format(item):
                return None

            self.statistics.valid_emails += 1

            # Жесткие исключения
            exclusion_result = self.exclusion_filter.should_exclude(item)
            if exclusion_result['should_exclude']:
                self.statistics.hard_excluded += 1
                for reason in exclusion_result['reasons']:
                    self.statistics.excluded_by_category[reason] += 1
                return None

            # Скоринг
            scoring_result = self.lead_scorer.score_contact(
                email=item,
                company_name="",  # Будет извлечено из метаданных если доступно
                description="",
                domain=item.split('@')[1] if '@' in item else ""
            )

            if not scoring_result['is_qualified']:
                return None

            # Обновление статистики
            self.statistics.qualified_leads += 1
            if scoring_result['priority'] == 'high':
                self.statistics.high_priority += 1
            elif scoring_result['priority'] == 'medium':
                self.statistics.medium_priority += 1
            elif scoring_result['priority'] == 'low':
                self.statistics.low_priority += 1

            # Создание результата
            result = SmartFilterResult(
                email=item,
                original_score=0,  # Будет вычислен если есть метаданные
                final_score=scoring_result['overall'],
                priority=scoring_result['priority'],
                target_category=scoring_result['target_category'],
                exclusion_reasons=[],
                indicators={
                    'scoring_breakdown': scoring_result['breakdown'],
                    'hydraulic_detection': {},  # Будет заполнено при наличии метаданных
                    'geographic_priority': {}   # Будет заполнено при наличии метаданных
                },
                metadata={
                    'filter_name': self.filter_name,
                    'config_version': self.config.get('version', '1.0'),
                    'processing_timestamp': datetime.now().isoformat()
                },
                processing_timestamp=datetime.now().isoformat()
            )

            return result

        except Exception as error:
            self.logger.error(f"Error processing item: {item}", str(error))
            self.statistics.errors += 1
            return None

    def _is_valid_email_format(self, email: str) -> bool:
        """Проверяет формат email"""
        try:
            pattern = r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
            return bool(re.match(pattern, email)) and len(email) <= 254
        except:
            return False

    def _save_results(self, results: List[SmartFilterResult], original_file: Path,
                     include_metadata: bool) -> Dict[str, str]:
        """Сохраняет результаты"""
        output_files = {}

        try:
            output_config = self.config.get('output', {})
            prefix = output_config.get('prefix', 'smart_filtered_')
            base_name = f"{prefix}{original_file.stem}"
            output_dir = original_file.parent

            # Подготовка данных
            qualified_results = [r for r in results if r.priority != 'exclude']

            if not qualified_results:
                self.logger.warn("No qualified results to save")
                return output_files

            # Сохранение email (TXT формат)
            txt_file = output_dir / f"{base_name}.txt"
            txt_data = [r.email for r in qualified_results]
            if self.file_processor.atomic_write(txt_file, txt_data):
                output_files['txt'] = str(txt_file)

            # Сохранение с метаданными (CSV формат)
            if include_metadata:
                csv_file = output_dir / f"{base_name}.csv"
                csv_data = self._prepare_csv_data(qualified_results)
                if self.file_processor.atomic_write(csv_file, csv_data):
                    output_files['csv'] = str(csv_file)

                # Сохранение в JSON формате
                json_file = output_dir / f"{base_name}.json"
                json_data = [asdict(r) for r in qualified_results]
                if self.file_processor.atomic_write(json_file, json_data):
                    output_files['json'] = str(json_file)

            self.logger.info(f"Results saved: {len(output_files)} files")
            return output_files

        except Exception as error:
            self.logger.error("Failed to save results", str(error))
            return output_files

    def _prepare_csv_data(self, results: List[SmartFilterResult]) -> List[List[str]]:
        """Подготавливает CSV данные"""
        try:
            headers = [
                'email', 'final_score', 'priority', 'target_category',
                'processing_timestamp', 'filter_name'
            ]

            data = [headers]

            for result in results:
                row = [
                    result.email,
                    str(result.final_score),
                    result.priority,
                    result.target_category,
                    result.processing_timestamp,
                    result.metadata.get('filter_name', '')
                ]
                data.append(row)

            return data

        except Exception as error:
            self.logger.error("Failed to prepare CSV data", str(error))
            return []

    def _generate_report(self, input_file: Path, output_files: Dict[str, str],
                        backup_file: Optional[Path]):
        """Генерирует отчет об обработке"""
        try:
            report_dir = Path("reports")
            report_dir.mkdir(exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = report_dir / f"{self.filter_name}_report_{timestamp}.txt"

            report_content = self._generate_report_content(
                input_file, output_files, backup_file
            )

            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report_content)

            self.logger.info(f"Report generated: {report_file}")

        except Exception as error:
            self.logger.error("Failed to generate report", str(error))

    def _generate_report_content(self, input_file: Path, output_files: Dict[str, str],
                                backup_file: Optional[Path]) -> str:
        """Генерирует содержимое отчета"""
        lines = [
            "=" * 80,
            f"SMART FILTER PROCESSING REPORT",
            "=" * 80,
            f"Filter: {self.filter_name}",
            f"Config: {self.config.get('display_name', 'Unknown')}",
            f"Input file: {input_file}",
            f"Backup file: {backup_file if backup_file else 'N/A'}",
            f"Processing time: {self.statistics.processing_time:.2f} seconds",
            "",
            "STATISTICS:",
            f"  Total processed: {self.statistics.total_processed}",
            f"  Valid emails: {self.statistics.valid_emails}",
            f"  Hard excluded: {self.statistics.hard_excluded}",
            f"  Qualified leads: {self.statistics.qualified_leads}",
            f"  High priority: {self.statistics.high_priority}",
            f"  Medium priority: {self.statistics.medium_priority}",
            f"  Low priority: {self.statistics.low_priority}",
            f"  Errors: {self.statistics.errors}",
            "",
            "EXCLUSION REASONS:",
        ]

        for reason, count in self.statistics.excluded_by_category.items():
            lines.append(f"  {reason}: {count}")

        lines.extend([
            "",
            "OUTPUT FILES:",
        ])

        for file_type, file_path in output_files.items():
            lines.append(f"  {file_type.upper()}: {file_path}")

        lines.extend([
            "",
            "=" * 80,
            f"Generated: {datetime.now().isoformat()}",
            "=" * 80
        ])

        return '\n'.join(lines)

    def get_statistics(self) -> Dict[str, Any]:
        """Возвращает статистику обработки"""
        return asdict(self.statistics)

# Дополнительные утилиты для удобства использования

def get_available_configs() -> List[str]:
    """Возвращает список доступных конфигураций"""
    try:
        configs_dir = Path("configs")
        if not configs_dir.exists():
            return []

        configs = []
        for config_file in configs_dir.glob("*.json"):
            configs.append(config_file.stem)

        return sorted(configs)

    except Exception:
        return []

def load_config_preview(config_name: str) -> Optional[Dict[str, Any]]:
    """Загружает превью конфигурации"""
    try:
        config_path = Path("configs") / f"{config_name}.json"
        if not config_path.exists():
            return None

        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Возвращаем только основные поля
        return {
            'config_name': config.get('config_name'),
            'display_name': config.get('display_name'),
            'version': config.get('version'),
            'target_market': config.get('target_market'),
            'target_industry': config.get('target_industry')
        }

    except Exception:
        return None

if __name__ == "__main__":
    # Пример использования
    import sys

    if len(sys.argv) > 1:
        config_name = sys.argv[1]
        file_path = sys.argv[2] if len(sys.argv) > 2 else None

        if file_path:
            # Обработка одного файла
            processor = SmartFilterProcessor(config_name)
            result = processor.process_clean_file(Path(file_path))
            print(f"Result: {result}")
        else:
            # Показ доступных конфигураций
            configs = get_available_configs()
            print(f"Available configs: {configs}")
    else:
        print("Usage: python3 smart_filter_processor_v2.py <config_name> [file_path]")