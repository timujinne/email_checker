"""
Smart Filter for Poland Powder Metallurgy Industry
==================================================

Фильтр для чешского рынка порошковой металлургии.
Работает на чешском и английском языках.

Target: B2B компании в Poland Republic специализирующиеся на:
- Порошковой металлургии (metalurgia proszków)
- Производстве спеченных деталей (sintrované díly)
- Обработке металлов (zpracování kovů)
- Automotive и Aerospace применения
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional


class PolandPMHardExclusionFilter:
    """
    Жесткая фильтрация - исключает неподходящие контакты до scoring

    Категории исключений:
    - HR/Recruitment (personální@, kariera@, prace@)
    - Сервисные email (ochrana@, gdpr@, cert@)
    - Финансы/инвесторы (investors@, ir@, finance@)
    - Образование (škola, univerzita, vzdělávání)
    - Туризм/гостиницы (hotel, penzion, turismus)
    - Ритейл/consumer (maloobchod, e-shop)
    - Медиа/реклама (reklama, média, časopis)
    - Персональные домены (gmail.com, seznam.cz, yahoo.cz)
    - Нецелевые страны (.cn, .in, .ru, .br, .au, .za)
    - Подозрительные паттерны (кириллица, хеши)
    """

    def __init__(self, config: Dict):
        self.config = config
        self.exclusions = config['exclusions']

        # Компилируем регулярки для производительности
        self.suspicious_patterns = [
            re.compile(pattern) for pattern in self.exclusions.get('suspicious_patterns', [])
        ]

    def should_exclude(self, email: str, company_name: str, description: str, domain: str) -> Dict:
        """
        Проверяет, нужно ли исключить email

        Returns:
            {
                'should_exclude': bool,
                'reasons': List[str],
                'severity': 'critical' | 'high' | 'medium'
            }
        """
        reasons = []

        # 1. Персональные домены (CRITICAL)
        if domain.lower() in [d.lower() for d in self.exclusions.get('personal_domains', [])]:
            return {
                'should_exclude': True,
                'reasons': ['personal_domain'],
                'severity': 'critical'
            }

        # 2. HR префиксы (CRITICAL)
        email_prefix = email.split('@')[0].lower()
        for hr_prefix in self.exclusions.get('hr_prefixes', []):
            if email_prefix.startswith(hr_prefix.rstrip('@')):
                return {
                    'should_exclude': True,
                    'reasons': ['hr_prefix'],
                    'severity': 'critical'
                }

        # 3. Сервисные префиксы (HIGH)
        for service_prefix in self.exclusions.get('service_prefixes', []):
            if email_prefix.startswith(service_prefix.rstrip('@')):
                reasons.append('service_prefix')

        # 4. Подозрительные домены (CRITICAL)
        if domain.lower() in [d.lower() for d in self.exclusions.get('suspicious_domains', [])]:
            return {
                'should_exclude': True,
                'reasons': ['suspicious_domain'],
                'severity': 'critical'
            }

        # 5. Нецелевые страны (HIGH)
        for excluded_tld in self.exclusions.get('excluded_country_domains', []):
            if domain.lower().endswith(excluded_tld.lower()):
                return {
                    'should_exclude': True,
                    'reasons': ['excluded_country'],
                    'severity': 'high'
                }

        # 6. Подозрительные паттерны в email (кириллица, хеши) (CRITICAL)
        for pattern in self.suspicious_patterns:
            if pattern.search(email):
                return {
                    'should_exclude': True,
                    'reasons': ['suspicious_pattern'],
                    'severity': 'critical'
                }

        # 7. НОВОЕ: Medical domain patterns (CRITICAL)
        medical_patterns = self.exclusions.get('medical_domain_patterns', [])
        for pattern in medical_patterns:
            if pattern.lower() in domain.lower():
                return {
                    'should_exclude': True,
                    'reasons': ['medical_domain'],
                    'severity': 'critical'
                }

        # 8. НОВОЕ: Educational domain patterns (CRITICAL)
        educational_patterns = self.exclusions.get('educational_domain_patterns', [])
        for pattern in educational_patterns:
            if pattern.lower() in domain.lower():
                return {
                    'should_exclude': True,
                    'reasons': ['educational_domain'],
                    'severity': 'critical'
                }

        # 9. НОВОЕ: Government domain patterns (CRITICAL)
        government_patterns = self.exclusions.get('government_domain_patterns', [])
        for pattern in government_patterns:
            if pattern.lower() in domain.lower():
                return {
                    'should_exclude': True,
                    'reasons': ['government_domain'],
                    'severity': 'critical'
                }

        # 10. НОВОЕ: Medical email prefixes (CRITICAL)
        medical_prefixes = self.exclusions.get('medical_prefixes', [])
        for medical_prefix in medical_prefixes:
            if email_prefix.startswith(medical_prefix.rstrip('@')):
                return {
                    'should_exclude': True,
                    'reasons': ['medical_prefix'],
                    'severity': 'critical'
                }

        # 11. НОВОЕ: Government email prefixes (CRITICAL)
        government_prefixes = self.exclusions.get('government_prefixes', [])
        for gov_prefix in government_prefixes:
            if email_prefix.startswith(gov_prefix.rstrip('@')):
                return {
                    'should_exclude': True,
                    'reasons': ['government_prefix'],
                    'severity': 'critical'
                }

        # 12. Исключенные индустрии (MEDIUM-HIGH) - СНИЖЕН ПОРОГ
        combined_text = f"{company_name} {description}".lower()

        for industry, keywords in self.exclusions.get('excluded_industries', {}).items():
            for keyword in keywords:
                if keyword.lower() in combined_text:
                    reasons.append(f'excluded_industry_{industry}')
                    # ИСПРАВЛЕНО: Снижен порог с >= 2 до >= 1
                    if len(reasons) >= 1:
                        return {
                            'should_exclude': True,
                            'reasons': reasons,
                            'severity': 'high'
                        }

        # Если есть причины, но не критичные
        if reasons:
            return {
                'should_exclude': len(reasons) >= 3,  # Исключаем при 3+ причинах
                'reasons': reasons,
                'severity': 'medium'
            }

        return {
            'should_exclude': False,
            'reasons': [],
            'severity': 'none'
        }


class PolandPMDetector:
    """
    Детектор использования порошковой металлургии в тексте

    Анализирует company_name, description, keywords на наличие:
    - Терминов порошковой металлургии (на чешском и английском)
    - Производственных процессов (slinování, lisování)
    - Применений (automotive, aerospace)
    - Материалов (ocel, titan, wolfram)
    """

    def __init__(self, config: Dict):
        self.config = config
        self.keywords = config['keywords']

    def detect_powder_metallurgy_usage(self, text: str) -> Dict:
        """
        Определяет, связана ли компания с порошковой металлургией

        Returns:
            {
                'uses_pm': bool,
                'confidence': int (0-100),
                'indicators': List[str],
                'language': 'cs' | 'en' | 'mixed'
            }
        """
        text_lower = text.lower()
        indicators = []
        cs_matches = 0
        en_matches = 0

        # 1. Основные термины порошковой металлургии
        pm_keywords = self.keywords.get('powder_metallurgy', [])
        for keyword in pm_keywords:
            if keyword.lower() in text_lower:
                indicators.append(f'pm_term:{keyword}')
                if any(c in keyword for c in 'áčďéěíňóřšťúůýž'):
                    cs_matches += 1
                else:
                    en_matches += 1

        # 2. Производственные термины
        manufacturing_keywords = self.keywords.get('manufacturing', [])
        for keyword in manufacturing_keywords:
            if keyword.lower() in text_lower:
                indicators.append(f'manufacturing:{keyword}')
                if any(c in keyword for c in 'áčďéěíňóřšťúůýž'):
                    cs_matches += 1
                else:
                    en_matches += 1

        # 3. Применения
        application_keywords = self.keywords.get('applications', [])
        for keyword in application_keywords:
            if keyword.lower() in text_lower:
                indicators.append(f'application:{keyword}')
                if any(c in keyword for c in 'áčďéěíňóřšťúůýž'):
                    cs_matches += 1
                else:
                    en_matches += 1

        # 4. Материалы
        material_keywords = self.keywords.get('materials', [])
        for keyword in material_keywords:
            if keyword.lower() in text_lower:
                indicators.append(f'material:{keyword}')
                if any(c in keyword for c in 'áčďéěíňóřšťúůýž'):
                    cs_matches += 1
                else:
                    en_matches += 1

        # Определяем язык
        if cs_matches > en_matches * 1.5:
            language = 'cs'
        elif en_matches > cs_matches * 1.5:
            language = 'en'
        else:
            language = 'mixed'

        # Рассчитываем уверенность
        confidence = min(100, len(indicators) * 15)  # 15 баллов за каждый индикатор

        # Бонус за прямое упоминание PM терминов
        pm_direct = any('pm_term:' in ind for ind in indicators)
        if pm_direct:
            confidence = min(100, confidence + 20)

        return {
            'uses_pm': confidence >= 30,  # Порог 30%
            'confidence': confidence,
            'indicators': indicators,
            'language': language
        }


class PolandPMClassifier:
    """
    Классификатор компаний по категориям

    Категории:
    - primary_target (66+): Производители PM компонентов, OEM
    - secondary_target (56-65): Обработчики металлов, поставщики
    - potential (37-55): Релевантные компании без явных PM признаков
    - excluded (< 37): Не релевантные для PM индустрии
    """

    def __init__(self, config: Dict):
        self.config = config
        self.keywords = config['keywords']
        self.geo_priorities = config['geographic_priorities']

    def classify_company(
        self,
        company_name: str,
        description: str,
        keywords: str,
        email_domain: str,
        web_domain: str
    ) -> Dict:
        """
        Классифицирует компанию

        Returns:
            {
                'category': str,
                'score': int (0-100),
                'geographic_priority': 'high' | 'medium' | 'low',
                'is_target': bool
            }
        """
        combined_text = f"{company_name} {description} {keywords}".lower()
        score = 0
        signals = []

        # 1. OEM индикаторы (+30 баллов)
        oem_indicators = self.keywords.get('oem_indicators', [])
        for indicator in oem_indicators:
            if indicator.lower() in combined_text:
                score += 30
                signals.append(f'oem:{indicator}')
                break  # Считаем только первый

        # 2. PM термины (+25 баллов за каждую категорию)
        pm_keywords = self.keywords.get('powder_metallurgy', [])
        if any(kw.lower() in combined_text for kw in pm_keywords):
            score += 25
            signals.append('pm_keywords')

        manufacturing_keywords = self.keywords.get('manufacturing', [])
        if any(kw.lower() in combined_text for kw in manufacturing_keywords):
            score += 20
            signals.append('manufacturing')

        application_keywords = self.keywords.get('applications', [])
        if any(kw.lower() in combined_text for kw in application_keywords):
            score += 15
            signals.append('applications')

        material_keywords = self.keywords.get('materials', [])
        if any(kw.lower() in combined_text for kw in material_keywords):
            score += 15
            signals.append('materials')

        # 3. Домен релевантности (+10-20 баллов)
        domain_patterns = self.config.get('domain_patterns', {}).get('relevant_patterns', [])
        domain_text = f"{email_domain} {web_domain}".lower()

        for pattern in domain_patterns:
            if pattern.lower() in domain_text:
                score += 15
                signals.append(f'domain:{pattern}')

        # 4. Высококачественные домены (+10 баллов)
        high_value = self.config.get('domain_patterns', {}).get('high_value_domains', [])
        for hv in high_value:
            if hv.lower() in domain_text:
                score += 10
                signals.append(f'high_value_domain:{hv}')
                break

        # 5. Географический приоритет
        geo_priority = self._get_geographic_priority(combined_text, email_domain, web_domain)

        # Определяем категорию
        if score >= 66:
            category = 'primary_target'
            is_target = True
        elif score >= 56:
            category = 'secondary_target'
            is_target = True
        elif score >= 37:
            category = 'potential'
            is_target = True
        else:
            category = 'excluded'
            is_target = False

        return {
            'category': category,
            'score': score,
            'geographic_priority': geo_priority,
            'is_target': is_target,
            'signals': signals
        }

    def _get_geographic_priority(self, text: str, email_domain: str, web_domain: str) -> str:
        """Определяет географический приоритет"""
        combined = f"{text} {email_domain} {web_domain}".lower()

        # High priority (Poland Republic)
        high_geo = self.geo_priorities.get('high', [])
        if any(geo.lower() in combined for geo in high_geo):
            return 'high'

        # Medium priority (Slovakia, Poland, Austria, Germany)
        medium_geo = self.geo_priorities.get('medium', [])
        if any(geo.lower() in combined for geo in medium_geo):
            return 'medium'

        return 'low'


class PolandPMLeadScorer:
    """
    Скоринг контактов для финальной приоритизации

    Компоненты score (0-200):
    - Email Quality (10%): Корпоративный домен, структура email
    - Company Relevance (45%): Соответствие PM индустрии
    - Geographic Priority (30%): Близость к Poland Republic
    - Engagement Potential (15%): Тип контакта (sales@, info@, personal)

    Бонусы:
    - OEM manufacturer: ×1.3
    - High geographic priority: ×2.0
    - Domain match: ×1.5
    """

    def __init__(self, config: Dict):
        self.config = config
        self.weights = config['scoring']['weights']
        self.thresholds = config['scoring']['thresholds']

    def score_contact(
        self,
        email: str,
        company_name: str,
        description: str,
        keywords: str,
        source: str,
        web_domain: str
    ) -> Dict:
        """
        Полный скоринг контакта

        Returns:
            {
                'overall': int (0-200+),
                'breakdown': {
                    'email_quality': int,
                    'company_relevance': int,
                    'geographic_priority': int,
                    'engagement': int
                },
                'bonuses': List[str],
                'priority': 'high' | 'medium' | 'low' | 'exclude',
                'target_category': str
            }
        """
        # 1. Email Quality (0-100)
        email_quality = self._score_email_quality(email, source)

        # 2. Company Relevance (0-100)
        company_relevance = self._score_company_relevance(
            company_name, description, keywords, web_domain
        )

        # 3. Geographic Priority (0-100)
        geographic_priority = self._score_geographic_priority(
            company_name, description, email, web_domain
        )

        # 4. Engagement Potential (0-100)
        engagement = self._score_engagement_potential(email, source)

        # Взвешенная сумма
        weighted_score = (
            email_quality * self.weights['email_quality'] +
            company_relevance * self.weights['company_relevance'] +
            geographic_priority * self.weights['geographic_priority'] +
            engagement * self.weights['engagement']
        )

        # Бонусы (мультипликаторы)
        bonuses = []
        multiplier = 1.0

        combined_text = f"{company_name} {description} {keywords}".lower()

        # OEM бонус
        oem_keywords = self.config['keywords'].get('oem_indicators', [])
        if any(kw.lower() in combined_text for kw in oem_keywords):
            multiplier *= 1.3
            bonuses.append('oem_manufacturer')

        # Географический бонус
        if geographic_priority >= 80:
            multiplier *= 2.0
            bonuses.append('high_geo_priority')
        elif geographic_priority >= 50:
            multiplier *= 1.2
            bonuses.append('medium_geo_priority')

        # Домен совпадает с релевантными паттернами
        domain_patterns = self.config.get('domain_patterns', {}).get('relevant_patterns', [])
        domain_text = f"{email.split('@')[1]} {web_domain}".lower()
        if any(p.lower() in domain_text for p in domain_patterns):
            multiplier *= 1.5
            bonuses.append('domain_match')

        overall_score = int(weighted_score * multiplier)

        # Определяем приоритет
        if overall_score >= self.thresholds['high_priority']:
            priority = 'high'
        elif overall_score >= self.thresholds['medium_priority']:
            priority = 'medium'
        elif overall_score >= self.thresholds['low_priority']:
            priority = 'low'
        else:
            priority = 'exclude'

        # Определяем target_category на основе company_relevance
        if company_relevance >= 66:
            target_category = 'primary_target'
        elif company_relevance >= 56:
            target_category = 'secondary_target'
        elif company_relevance >= 37:
            target_category = 'potential'
        else:
            target_category = 'excluded'

        return {
            'overall': overall_score,
            'breakdown': {
                'email_quality': email_quality,
                'company_relevance': company_relevance,
                'geographic_priority': geographic_priority,
                'engagement': engagement
            },
            'bonuses': bonuses,
            'multiplier': multiplier,
            'priority': priority,
            'target_category': target_category
        }

    def _score_email_quality(self, email: str, source: str) -> int:
        """Оценивает качество email адреса"""
        score = 50  # Базовый

        local, domain = email.split('@')

        # Корпоративный домен (+30)
        personal_domains = self.config['exclusions'].get('personal_domains', [])
        if domain.lower() not in [d.lower() for d in personal_domains]:
            score += 30

        # Персональный контакт (имя.фамилия@) (+20)
        if '.' in local and len(local.split('.')) == 2:
            score += 20

        # Generic info@ (-10)
        if local.lower() in ['info', 'contact', 'kontakt']:
            score -= 10

        return max(0, min(100, score))

    def _score_company_relevance(self, company_name: str, description: str, keywords: str, web_domain: str) -> int:
        """Оценивает релевантность компании PM индустрии"""
        score = 0
        combined_text = f"{company_name} {description} {keywords}".lower()

        # PM термины (+25 за категорию, макс 100)
        pm_keywords = self.config['keywords'].get('powder_metallurgy', [])
        if any(kw.lower() in combined_text for kw in pm_keywords):
            score += 30

        manufacturing = self.config['keywords'].get('manufacturing', [])
        if any(kw.lower() in combined_text for kw in manufacturing):
            score += 25

        applications = self.config['keywords'].get('applications', [])
        if any(kw.lower() in combined_text for kw in applications):
            score += 20

        materials = self.config['keywords'].get('materials', [])
        if any(kw.lower() in combined_text for kw in materials):
            score += 15

        oem = self.config['keywords'].get('oem_indicators', [])
        if any(kw.lower() in combined_text for kw in oem):
            score += 10

        return min(100, score)

    def _score_geographic_priority(self, company_name: str, description: str, email: str, web_domain: str) -> int:
        """Оценивает географический приоритет"""
        combined = f"{company_name} {description} {email} {web_domain}".lower()

        high_geo = self.config['geographic_priorities'].get('high', [])
        if any(geo.lower() in combined for geo in high_geo):
            return 100

        medium_geo = self.config['geographic_priorities'].get('medium', [])
        if any(geo.lower() in combined for geo in medium_geo):
            return 60

        regions = self.config['geographic_priorities'].get('regions', [])
        if any(reg.lower() in combined for reg in regions):
            return 80

        return 20  # Low priority

    def _score_engagement_potential(self, email: str, source: str) -> int:
        """Оценивает потенциал для engagement"""
        score = 50
        local = email.split('@')[0].lower()

        # Персональный email (+30)
        if '.' in local and len(local.split('.')) == 2:
            score += 30

        # Sales/service contacts (+20)
        if any(prefix in local for prefix in ['sales', 'prodej', 'obchod', 'service']):
            score += 20

        # Info/contact (нейтрально)
        if local in ['info', 'contact', 'kontakt']:
            score += 0

        # Generic office@ (-10)
        if local in ['office', 'kancelar', 'general']:
            score -= 10

        return max(0, min(100, score))


# ============================================================================
# Главная функция фильтрации
# ============================================================================

def filter_poland_pm_contacts(emails_data: List[Dict], config_path: Optional[str] = None) -> Dict:
    """
    Основная функция фильтрации Poland PM контактов

    Args:
        emails_data: List of dicts с email данными
        config_path: Путь к конфиг файлу (опционально)

    Returns:
        {
            'total_processed': int,
            'hard_excluded': int,
            'qualified_leads': int,
            'by_priority': {...},
            'by_category': {...},
            'results': List[Dict]
        }
    """
    # Загружаем конфиг
    if config_path is None:
        config_dir = Path(__file__).parent.parent / "configs"
        config_path = config_dir / "poland_powder_metal.json"

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    # Инициализируем фильтры
    hard_filter = PolandPMHardExclusionFilter(config)
    detector = PolandPMDetector(config)
    classifier = PolandPMClassifier(config)
    scorer = PolandPMLeadScorer(config)

    results = []
    stats = {
        'total_processed': 0,
        'hard_excluded': 0,
        'qualified_leads': 0,
        'by_priority': {'high': 0, 'medium': 0, 'low': 0, 'exclude': 0},
        'by_category': {'primary_target': 0, 'secondary_target': 0, 'potential': 0, 'excluded': 0}
    }

    for item in emails_data:
        stats['total_processed'] += 1

        email = item.get('email', '')
        company_name = item.get('company_name', '')
        description = item.get('description', '')
        keywords = item.get('keywords', '')
        source = item.get('source', '')

        # Извлекаем домены
        domain = email.split('@')[1] if '@' in email else ''
        web_domain = item.get('web_domain', domain)

        # 1. Жесткая фильтрация
        exclusion_check = hard_filter.should_exclude(email, company_name, description, domain)

        if exclusion_check['should_exclude']:
            stats['hard_excluded'] += 1
            results.append({
                **item,
                'filter_status': 'hard_excluded',
                'exclusion_reasons': exclusion_check['reasons'],
                'score': 0,
                'priority': 'exclude',
                'target_category': 'excluded'
            })
            continue

        # 2. Детекция PM
        pm_detection = detector.detect_powder_metallurgy_usage(
            f"{company_name} {description} {keywords}"
        )

        # 3. Классификация
        classification = classifier.classify_company(
            company_name, description, keywords, domain, web_domain
        )

        # 4. Скоринг
        scoring = scorer.score_contact(
            email, company_name, description, keywords, source, web_domain
        )

        # Обновляем статистику
        stats['by_priority'][scoring['priority']] += 1
        stats['by_category'][scoring['target_category']] += 1

        if scoring['priority'] != 'exclude':
            stats['qualified_leads'] += 1

        # Сохраняем результат
        results.append({
            **item,
            'filter_status': 'passed',
            'pm_detection': pm_detection,
            'classification': classification,
            'score': scoring['overall'],
            'score_breakdown': scoring['breakdown'],
            'bonuses': scoring['bonuses'],
            'priority': scoring['priority'],
            'target_category': scoring['target_category']
        })

    return {
        **stats,
        'results': results
    }
