#!/usr/bin/env python3
"""
Italy Hydraulics Smart Filter - Умная фильтрация для итальянского рынка гидравлики

Включает 4 класса:
1. ItalyHydraulicsHardExclusionFilter - жесткие исключения
2. ItalyHydraulicsDetector - детектор гидравлических терминов
3. ItalyHydraulicsClassifier - классификация компаний
4. ItalyHydraulicsLeadScorer - скоринг лидов
"""

import re
import json
from pathlib import Path
from typing import Set, List, Dict, Tuple, Optional


class ItalyHydraulicsHardExclusionFilter:
    """
    Жесткие исключения для итальянского рынка гидравлики

    Исключает:
    - Персональные домены (gmail, libero.it и т.д.)
    - HR email (hr@, lavoro@, jobs@ и т.д.)
    - Нерелевантные индустрии (образование, финансы, медиа)
    - Географические ограничения (Китай, Индия, Турция и т.д.)
    """

    def __init__(self, config: dict):
        """
        Args:
            config: Словарь конфигурации из italy_hydraulics_config.json
        """
        self.config = config

        # Персональные домены
        self.personal_domains = set(config['hard_exclusions']['personal_domains'])

        # HR префиксы (IT + EN)
        hr_prefixes = config['hard_exclusions']['hr_prefixes']
        self.hr_prefixes = set(hr_prefixes['italian'] + hr_prefixes['english'])

        # Сервисные префиксы
        self.service_prefixes = set(config['hard_exclusions']['service_prefixes'])

        # Исключенные индустрии (IT + EN)
        excluded_industries = config['hard_exclusions']['excluded_industries']
        self.excluded_keywords = set()
        for industry_data in excluded_industries.values():
            self.excluded_keywords.update(industry_data.get('italian', []))
            self.excluded_keywords.update(industry_data.get('english', []))

        # Исключенные страны и города
        self.excluded_country_domains = set(config['geographic']['excluded_countries'])
        self.excluded_cities = set(config['geographic']['excluded_cities'])

        # Подозрительные паттерны
        self.suspicious_patterns = [
            re.compile(r'^[a-f0-9]{20,}@', re.IGNORECASE),  # Хеш-подобные email
            re.compile(r'^[a-z0-9]{15,}@', re.IGNORECASE),  # Случайные строки
            re.compile(r'[\u4e00-\u9fff]'),  # Китайские символы
            re.compile(r'[\u0590-\u05FF]'),  # Иврит
            re.compile(r'[\u0600-\u06FF]'),  # Арабский
        ]

    def should_exclude(self, email: str, company_name: str = '',
                      description: str = '', domain: str = '') -> Dict:
        """
        Проверяет, нужно ли исключить email по жестким критериям

        Args:
            email: Email адрес
            company_name: Название компании
            description: Описание (keywords, meta description и т.д.)
            domain: Веб-домен компании

        Returns:
            {
                'should_exclude': bool,
                'reasons': List[str],
                'severity': 'critical' | 'warning'
            }
        """
        exclusion_reasons = []

        try:
            # Проверка персональных доменов
            if self._is_personal_domain(email):
                exclusion_reasons.append('personal_domain')

            # Проверка HR/service email
            if self._is_hr_or_service_email(email):
                exclusion_reasons.append('hr_service_prefix')

            # Географические ограничения
            if self._is_geographically_excluded(email, description, domain):
                exclusion_reasons.append('geographic_restriction')

            # Подозрительные паттерны
            if self._is_suspicious_pattern(email):
                exclusion_reasons.append('suspicious_pattern')

            # Исключенные индустрии
            if self._is_excluded_industry(company_name, description):
                exclusion_reasons.append('excluded_industry')

        except Exception as error:
            print(f'⚠️ Ошибка в фильтре исключений для {email}: {error}')
            exclusion_reasons.append('filter_error')

        return {
            'should_exclude': len(exclusion_reasons) > 0,
            'reasons': exclusion_reasons,
            'severity': 'critical' if len(exclusion_reasons) >= 2 else 'warning'
        }

    def _is_personal_domain(self, email: str) -> bool:
        """Проверка на персональный домен"""
        if not email or '@' not in email:
            return False

        try:
            domain = email.split('@')[1].lower().strip()
            return domain in self.personal_domains
        except:
            return False

    def _is_hr_or_service_email(self, email: str) -> bool:
        """Проверка на HR или сервисный email"""
        if not email:
            return False

        try:
            email_lower = email.lower().strip()

            # Проверка HR префиксов
            for prefix in self.hr_prefixes:
                if email_lower.startswith(prefix):
                    return True

            # Проверка сервисных префиксов
            for prefix in self.service_prefixes:
                if prefix in email_lower:
                    return True

            return False
        except:
            return False

    def _is_geographically_excluded(self, email: str, description: str = '', domain: str = '') -> bool:
        """Проверка географических ограничений"""
        if not email:
            return False

        try:
            email_domain = email.split('@')[1].lower() if '@' in email else ''
            text = f"{email} {description} {domain}".lower()

            # Проверка исключенных стран по доменам
            for country_domain in self.excluded_country_domains:
                if email_domain.endswith(country_domain.lower()):
                    return True

            # Проверка исключенных городов
            for city in self.excluded_cities:
                if city.lower() in text:
                    return True

            return False
        except:
            return False

    def _is_suspicious_pattern(self, email: str) -> bool:
        """Проверка подозрительных паттернов"""
        if not email:
            return False

        try:
            return any(pattern.search(email) for pattern in self.suspicious_patterns)
        except:
            return False

    def _is_excluded_industry(self, company_name: str = '', description: str = '') -> bool:
        """Проверка на исключенную индустрию"""
        try:
            text = f"{company_name} {description}".lower()

            for keyword in self.excluded_keywords:
                if keyword.lower() in text:
                    return True

            return False
        except:
            return False


class ItalyHydraulicsDetector:
    """
    Детектор гидравлических терминов для итальянского рынка

    Определяет использование гидравлической терминологии в тексте
    с поддержкой итальянского и английского языков
    """

    def __init__(self, config: dict):
        """
        Args:
            config: Словарь конфигурации из italy_hydraulics_config.json
        """
        self.config = config

        # Итальянские термины
        hydraulics_it = config['industry_keywords']['hydraulics_italian']
        self.it_primary = set(hydraulics_it['primary'])
        self.it_secondary = set(hydraulics_it['secondary'])
        self.it_oem = set(hydraulics_it['oem_indicators'])
        self.it_applications = set(hydraulics_it['applications'])

        # Английские термины
        hydraulics_en = config['industry_keywords']['hydraulics_english']
        self.en_primary = set(hydraulics_en['primary'])
        self.en_secondary = set(hydraulics_en['secondary'])
        self.en_oem = set(hydraulics_en['oem_indicators'])
        self.en_applications = set(hydraulics_en['applications'])

        # Негативные ключевые слова
        self.negative_keywords = set(config['industry_keywords']['negative_keywords'])

    def detect_hydraulics_usage(self, text: str) -> Dict:
        """
        Детектирует использование гидравлической терминологии

        Args:
            text: Текст для анализа (описание компании, keywords и т.д.)

        Returns:
            {
                'uses_hydraulics': bool,
                'confidence': int (0-100),
                'indicators': List[str],
                'language': 'italian' | 'english' | 'mixed'
            }
        """
        if not text:
            return self._create_empty_result()

        try:
            text_lower = text.lower()
            score = 0
            found_indicators = []
            it_count = 0
            en_count = 0

            # Проверка негативных ключевых слов (сильный минус)
            for negative in self.negative_keywords:
                if negative.lower() in text_lower:
                    score -= 50
                    found_indicators.append(f"NEGATIVE: {negative}")

            # Итальянские primary термины (высокий вес)
            for term in self.it_primary:
                if term.lower() in text_lower:
                    score += 25
                    found_indicators.append(f"IT-Primary: {term}")
                    it_count += 1

            # Английские primary термины
            for term in self.en_primary:
                if term.lower() in text_lower:
                    score += 20
                    found_indicators.append(f"EN-Primary: {term}")
                    en_count += 1

            # Итальянские secondary термины
            for term in self.it_secondary:
                if term.lower() in text_lower:
                    score += 10
                    it_count += 1

            # Английские secondary термины
            for term in self.en_secondary:
                if term.lower() in text_lower:
                    score += 8
                    en_count += 1

            # OEM indicators (IT + EN)
            for term in self.it_oem:
                if term.lower() in text_lower:
                    score += 15
                    found_indicators.append(f"IT-OEM: {term}")

            for term in self.en_oem:
                if term.lower() in text_lower:
                    score += 12
                    found_indicators.append(f"EN-OEM: {term}")

            # Application indicators
            for term in self.it_applications:
                if term.lower() in text_lower:
                    score += 5

            for term in self.en_applications:
                if term.lower() in text_lower:
                    score += 5

            # Определение языка
            if it_count > en_count:
                language = 'italian'
            elif en_count > it_count:
                language = 'english'
            else:
                language = 'mixed' if (it_count > 0 and en_count > 0) else 'unknown'

            confidence = min(100, max(0, score))

            return {
                'uses_hydraulics': confidence >= 20,
                'confidence': confidence,
                'indicators': found_indicators[:10],  # Top 10
                'language': language
            }

        except Exception as error:
            print(f'⚠️ Ошибка детектора гидравлики: {error}')
            return self._create_empty_result()

    def detect_domain_relevance(self, domain: str) -> Dict:
        """
        Анализирует релевантность веб-домена

        Args:
            domain: Веб-домен для анализа

        Returns:
            {
                'relevant': bool,
                'score': int,
                'patterns': List[str]
            }
        """
        if not domain:
            return {'relevant': False, 'score': 0, 'patterns': []}

        try:
            domain_lower = domain.lower()
            score = 0
            found_patterns = []

            # Гидравлические паттерны
            hydraulics_patterns = (
                self.config['domain_patterns']['hydraulics_it'] +
                self.config['domain_patterns']['hydraulics_en'] +
                self.config['domain_patterns']['manufacturing']
            )

            for pattern in hydraulics_patterns:
                if pattern in domain_lower:
                    score += 15
                    found_patterns.append(pattern)

            return {
                'relevant': score >= 15,
                'score': score,
                'patterns': found_patterns
            }

        except Exception as error:
            print(f'⚠️ Ошибка анализа домена: {error}')
            return {'relevant': False, 'score': 0, 'patterns': []}

    def _create_empty_result(self) -> Dict:
        """Создает пустой результат"""
        return {
            'uses_hydraulics': False,
            'confidence': 0,
            'indicators': [],
            'language': 'unknown'
        }


class ItalyHydraulicsClassifier:
    """
    Классификатор компаний для итальянского рынка гидравлики

    Определяет категорию компании и её релевантность для целевого рынка
    """

    def __init__(self, config: dict):
        """
        Args:
            config: Словарь конфигурации из italy_hydraulics_config.json
        """
        self.config = config
        self.detector = ItalyHydraulicsDetector(config)

        # Географические приоритеты
        self.geo_high = set(config['geographic']['priority_high'])
        self.geo_medium = set(config['geographic']['priority_medium'])

    def classify_company(self, company_name: str, description: str,
                        keywords: str, email_domain: str, web_domain: str = '') -> Dict:
        """
        Классифицирует компанию по релевантности

        Args:
            company_name: Название компании
            description: Описание (meta description)
            keywords: Ключевые слова
            email_domain: Домен из email
            web_domain: Веб-домен компании

        Returns:
            {
                'category': str,
                'score': int (0-100),
                'geographic_priority': 'high' | 'medium' | 'low',
                'is_target': bool,
                'details': dict
            }
        """
        try:
            # Объединяем текст для анализа
            full_text = f"{company_name} {description} {keywords}".lower()

            # Детектируем гидравлику
            hydraulics_check = self.detector.detect_hydraulics_usage(full_text)

            # Анализируем домены
            email_domain_check = self.detector.detect_domain_relevance(email_domain)
            web_domain_check = self.detector.detect_domain_relevance(web_domain)

            # Базовый score из гидравлики
            base_score = hydraulics_check['confidence']

            # Бонусы за домены
            if email_domain_check['relevant']:
                base_score += email_domain_check['score']
            if web_domain_check['relevant']:
                base_score += web_domain_check['score']

            # Определяем географический приоритет
            geo_priority = self._determine_geographic_priority(full_text, email_domain, web_domain)

            # Применяем географический мультипликатор
            multipliers = self.config['scoring']['bonus_multipliers']
            if geo_priority == 'high':
                final_score = min(100, int(base_score * multipliers['target_geography']))
            elif geo_priority == 'medium':
                final_score = min(100, int(base_score * 1.4))
            else:
                final_score = base_score

            # OEM мультипликатор
            if any(ind for ind in hydraulics_check['indicators'] if 'OEM' in ind):
                final_score = min(100, int(final_score * multipliers['oem_manufacturer']))

            # Определяем категорию
            if final_score >= 70 and geo_priority == 'high':
                category = 'primary_target'
            elif final_score >= 50:
                category = 'secondary_target'
            elif final_score >= 30:
                category = 'potential'
            else:
                category = 'excluded'

            return {
                'category': category,
                'score': min(100, final_score),
                'geographic_priority': geo_priority,
                'is_target': final_score >= 30,
                'details': {
                    'hydraulics_confidence': hydraulics_check['confidence'],
                    'language': hydraulics_check['language'],
                    'domain_relevant': email_domain_check['relevant'] or web_domain_check['relevant'],
                    'base_score': base_score
                }
            }

        except Exception as error:
            print(f'⚠️ Ошибка классификации компании: {error}')
            return {
                'category': 'error',
                'score': 0,
                'geographic_priority': 'unknown',
                'is_target': False,
                'details': {'error': str(error)}
            }

    def _determine_geographic_priority(self, text: str, email_domain: str = '',
                                      web_domain: str = '') -> str:
        """Определяет географический приоритет"""
        try:
            combined_text = f"{text} {email_domain} {web_domain}".lower()

            # Проверка высокого приоритета (Италия)
            for keyword in self.geo_high:
                if keyword.lower() in combined_text:
                    return 'high'

            # Проверка среднего приоритета (Европа)
            for keyword in self.geo_medium:
                if keyword.lower() in combined_text:
                    return 'medium'

            return 'low'

        except:
            return 'low'


class ItalyHydraulicsLeadScorer:
    """
    Скоринг лидов для итальянского рынка гидравлики

    Вычисляет итоговый score (0-100) для каждого контакта
    """

    def __init__(self, config: dict):
        """
        Args:
            config: Словарь конфигурации из italy_hydraulics_config.json
        """
        self.config = config
        self.classifier = ItalyHydraulicsClassifier(config)

        # Веса компонентов скоринга
        self.weights = config['scoring']['weights']

        # Пороги приоритетов
        self.thresholds = config['scoring']['thresholds']

        # Бесплатные провайдеры
        self.free_providers = set([
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'libero.it', 'virgilio.it', 'tin.it', 'tiscali.it',
            'mail.ru', 'yandex.ru'
        ])

    def score_contact(self, email: str, company_name: str = '', description: str = '',
                     keywords: str = '', source: str = '', web_domain: str = '') -> Dict:
        """
        Вычисляет итоговый score для контакта

        Args:
            email: Email адрес
            company_name: Название компании
            description: Описание (meta description)
            keywords: Ключевые слова
            source: Источник (откуда взят email)
            web_domain: Веб-домен компании

        Returns:
            {
                'overall': int (0-100),
                'breakdown': {
                    'email': int,
                    'relevance': int,
                    'geographic': int,
                    'engagement': int
                },
                'priority': 'high' | 'medium' | 'low' | 'exclude',
                'target_category': str
            }
        """
        if not email:
            return self._create_empty_score()

        try:
            email_domain = email.split('@')[1] if '@' in email else ''

            # 1. Email Quality Score
            email_score = self._score_email_quality(email)

            # 2. Company Relevance Score
            classification = self.classifier.classify_company(
                company_name, description, keywords, email_domain, web_domain
            )
            relevance_score = classification['score']

            # 3. Geographic Priority Score
            geo_priority = classification['geographic_priority']
            if geo_priority == 'high':
                geo_score = 100
            elif geo_priority == 'medium':
                geo_score = 60
            else:
                geo_score = 30

            # 4. Engagement Score
            engagement_score = self._score_engagement(source)

            # Взвешенный итоговый score
            overall_score = (
                (email_score * self.weights['email_quality']) +
                (relevance_score * self.weights['company_relevance']) +
                (geo_score * self.weights['geographic_priority']) +
                (engagement_score * self.weights['engagement'])
            )

            overall_score = round(overall_score)

            # Определяем приоритет
            priority = self._get_priority_level(overall_score)

            return {
                'overall': overall_score,
                'breakdown': {
                    'email': email_score,
                    'relevance': relevance_score,
                    'geographic': geo_score,
                    'engagement': engagement_score
                },
                'priority': priority,
                'target_category': classification['category']
            }

        except Exception as error:
            print(f'⚠️ Ошибка скоринга контакта {email}: {error}')
            return self._create_empty_score()

    def _score_email_quality(self, email: str) -> int:
        """Оценка качества email (0-100)"""
        if not email or '@' not in email:
            return 0

        try:
            domain = email.split('@')[1].lower()
            local_part = email.split('@')[0]
            score = 25

            # Корпоративный домен (не free provider)
            if domain not in self.free_providers:
                score += 35
            else:
                score += 15

            # Структура local part
            if '.' in local_part:  # firstname.lastname
                score += 15

            if 3 < len(local_part) < 25:  # Разумная длина
                score += 10

            # Гидравлический домен
            if any(pattern in domain for pattern in ['idraulic', 'hydraulic', 'pump', 'cylinder', 'valve']):
                score += 25

            return min(100, score)

        except:
            return 0

    def _score_engagement(self, source: str) -> int:
        """Оценка вовлеченности по источнику (0-100)"""
        if not source:
            return 25

        try:
            source_lower = source.lower()

            if 'product' in source_lower or 'prodott' in source_lower:
                return 85
            if 'service' in source_lower or 'serviz' in source_lower:
                return 80
            if 'contact' in source_lower or 'contatt' in source_lower:
                return 75
            if 'about' in source_lower or 'chi siamo' in source_lower:
                return 65

            return 40

        except:
            return 25

    def _get_priority_level(self, score: int) -> str:
        """Определяет уровень приоритета"""
        if score >= self.thresholds['high_priority']:
            return 'high'
        elif score >= self.thresholds['medium_priority']:
            return 'medium'
        elif score >= self.thresholds['low_priority']:
            return 'low'
        else:
            return 'exclude'

    def _create_empty_score(self) -> Dict:
        """Создает пустой score"""
        return {
            'overall': 0,
            'breakdown': {'email': 0, 'relevance': 0, 'geographic': 0, 'engagement': 0},
            'priority': 'exclude',
            'target_category': 'excluded'
        }


# Вспомогательная функция для загрузки конфига
def load_config(config_path: str) -> dict:
    """
    Загружает конфигурацию из JSON файла

    Args:
        config_path: Путь к файлу конфигурации

    Returns:
        Словарь конфигурации
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as error:
        print(f'❌ Ошибка загрузки конфига {config_path}: {error}')
        raise
