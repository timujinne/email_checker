#!/usr/bin/env python3
"""
UK Business Exclusions Smart Filter - Фильтр для UK с исключением нежелательных категорий

Исключает:
- Travel agencies и туристические компании
- Media, news, publishing
- Legal services (solicitors, lawyers, barristers)
- Financial services (banks, insurance, accounting)
- Recruitment agencies
- Retail/e-commerce
"""

import re
import json
from pathlib import Path
from typing import Set, List, Dict, Tuple, Optional


class UKBusinessExclusionsFilter:
    """
    Фильтр для UK бизнес-контактов с исключением нежелательных индустрий

    Функции:
    1. Жесткие исключения (travel, media, legal, financial)
    2. Географическая фильтрация (UK приоритет)
    3. Позитивный скоринг для manufacturing/B2B
    """

    def __init__(self, config: dict):
        """
        Args:
            config: Словарь конфигурации из uk_business_exclusions_config.json
        """
        self.config = config

        # Персональные домены
        self.personal_domains = set(config['hard_exclusions']['personal_domains'])

        # HR и service префиксы
        self.hr_prefixes = set(config['hard_exclusions']['hr_prefixes'])
        self.service_prefixes = set(config['hard_exclusions']['service_prefixes'])

        # Исключенные индустрии
        self._load_excluded_industries()

        # География
        self.priority_high = set(x.lower() for x in config['geographic']['priority_high'])
        self.priority_medium = set(x.lower() for x in config['geographic']['priority_medium'])
        self.excluded_countries = set(config['geographic']['excluded_countries'])
        self.excluded_cities = set(x.lower() for x in config['geographic']['excluded_cities'])

        # Позитивные ключевые слова (manufacturing, B2B)
        self.positive_keywords = set()
        for category in config['industry_keywords'].values():
            if isinstance(category, dict):
                self.positive_keywords.update(category.get('primary', []))
                self.positive_keywords.update(category.get('secondary', []))
            elif isinstance(category, list):
                self.positive_keywords.update(category)

        # Domain patterns
        self.manufacturing_patterns = set(config['domain_patterns']['manufacturing'])
        self.b2b_indicators = set(config['domain_patterns']['b2b_indicators'])

        # Suspicious patterns
        self.suspicious_patterns = [
            re.compile(r'^[a-f0-9]{20,}@', re.IGNORECASE),  # Hash-like emails
            re.compile(r'^[a-z0-9]{15,}@', re.IGNORECASE),  # Random strings
        ]

    def _load_excluded_industries(self):
        """Загружает все ключевые слова исключенных индустрий"""
        excluded = self.config['hard_exclusions']['excluded_industries']

        self.excluded_keywords = {}
        self.excluded_domain_keywords = {}

        for industry, data in excluded.items():
            keywords = set()
            keywords.update(data.get('primary', []))
            keywords.update(data.get('secondary', []))
            self.excluded_keywords[industry] = keywords

            # Domain keywords отдельно (для доменов)
            if 'domain_keywords' in data:
                self.excluded_domain_keywords[industry] = set(data['domain_keywords'])

    def should_exclude(self, email: str, company_name: str = '',
                      description: str = '', domain: str = '') -> Dict:
        """
        Проверяет, нужно ли исключить email по жестким критериям

        Args:
            email: Email адрес
            company_name: Название компании
            description: Описание компании
            domain: Веб-домен компании

        Returns:
            {
                'should_exclude': bool,
                'reasons': List[str],
                'excluded_industries': List[str],
                'severity': 'critical' | 'warning' | 'low'
            }
        """
        exclusion_reasons = []
        excluded_industries = []

        try:
            # 1. Персональные домены
            if self._is_personal_domain(email):
                exclusion_reasons.append('personal_domain')

            # 2. HR/service email
            if self._is_hr_or_service_email(email):
                exclusion_reasons.append('hr_service_prefix')

            # 3. Географические ограничения
            if self._is_geographically_excluded(email, description, domain):
                exclusion_reasons.append('geographic_restriction')

            # 4. Suspicious patterns
            if self._is_suspicious_pattern(email):
                exclusion_reasons.append('suspicious_pattern')

            # 5. Исключенные индустрии (главная проверка)
            industry_check = self._check_excluded_industries(company_name, description, domain)
            if industry_check['is_excluded']:
                exclusion_reasons.append('excluded_industry')
                excluded_industries = industry_check['industries']

        except Exception as error:
            print(f'⚠️ Ошибка в фильтре для {email}: {error}')
            exclusion_reasons.append('filter_error')

        # Определение severity
        severity = 'low'
        if len(exclusion_reasons) >= 3 or 'excluded_industry' in exclusion_reasons:
            severity = 'critical'
        elif len(exclusion_reasons) >= 2:
            severity = 'warning'

        return {
            'should_exclude': len(exclusion_reasons) > 0,
            'reasons': exclusion_reasons,
            'excluded_industries': excluded_industries,
            'severity': severity
        }

    def calculate_score(self, email: str, company_name: str = '',
                       description: str = '', domain: str = '') -> Dict:
        """
        Рассчитывает score для контакта

        Returns:
            {
                'total_score': int,
                'email_quality': int,
                'company_relevance': int,
                'geographic_priority': int,
                'engagement': int,
                'bonuses': List[str],
                'penalties': List[str]
            }
        """
        weights = self.config['scoring']['weights']
        bonuses = []
        penalties = []

        # 1. Email Quality (0-100)
        email_quality = self._score_email_quality(email, domain)

        # 2. Company Relevance (0-100)
        company_relevance = self._score_company_relevance(company_name, description, domain)

        # 3. Geographic Priority (0-100)
        geographic_priority = self._score_geographic_priority(email, description, domain)

        # 4. Engagement (0-100)
        engagement = self._score_engagement(email)

        # Base score
        base_score = (
            email_quality * weights['email_quality'] +
            company_relevance * weights['company_relevance'] +
            geographic_priority * weights['geographic_priority'] +
            engagement * weights['engagement']
        ) * 10  # Scale to 0-1000

        # Bonuses
        multipliers = self.config['scoring']['bonus_multipliers']
        total_multiplier = 1.0

        if self._is_manufacturing_company(company_name, description, domain):
            total_multiplier *= multipliers['manufacturing_company']
            bonuses.append('manufacturing_company')

        if geographic_priority >= 80:
            total_multiplier *= multipliers['target_geography']
            bonuses.append('target_geography')

        if self._has_domain_match(domain):
            total_multiplier *= multipliers['domain_match']
            bonuses.append('domain_match')

        if self._has_b2b_indicator(company_name, domain):
            total_multiplier *= multipliers['b2b_indicator']
            bonuses.append('b2b_indicator')

        # Penalties
        penalty_multipliers = self.config['scoring']['penalty_multipliers']

        industry_check = self._check_excluded_industries(company_name, description, domain)
        if industry_check['is_excluded']:
            total_multiplier *= penalty_multipliers['excluded_industry']
            penalties.append(f"excluded_industry: {', '.join(industry_check['industries'])}")

        if self._has_excluded_domain_keywords(domain):
            total_multiplier *= penalty_multipliers['excluded_domain_keyword']
            penalties.append('excluded_domain_keyword')

        total_score = int(base_score * total_multiplier)

        return {
            'total_score': total_score,
            'email_quality': int(email_quality),
            'company_relevance': int(company_relevance),
            'geographic_priority': int(geographic_priority),
            'engagement': int(engagement),
            'bonuses': bonuses,
            'penalties': penalties
        }

    # ==================== Helper Methods ====================

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

            for prefix in self.hr_prefixes:
                if email_lower.startswith(prefix):
                    return True

            for prefix in self.service_prefixes:
                if prefix in email_lower:
                    return True

            return False
        except:
            return False

    def _is_geographically_excluded(self, email: str, description: str = '', domain: str = '') -> bool:
        """Проверка на исключенную географию"""
        text = f"{email} {description} {domain}".lower()

        # Проверка исключенных доменов
        if email and '@' in email:
            try:
                email_domain = email.split('@')[1].lower()
                for excluded in self.excluded_countries:
                    if excluded in email_domain:
                        return True
            except:
                pass

        # Проверка исключенных городов
        for city in self.excluded_cities:
            if city in text:
                return True

        return False

    def _is_suspicious_pattern(self, email: str) -> bool:
        """Проверка на подозрительные паттерны"""
        for pattern in self.suspicious_patterns:
            if pattern.search(email):
                return True
        return False

    def _check_excluded_industries(self, company_name: str, description: str, domain: str) -> Dict:
        """
        Проверяет на принадлежность к исключенным индустриям

        Returns:
            {'is_excluded': bool, 'industries': List[str]}
        """
        text = f"{company_name} {description}".lower()
        excluded_industries = []

        for industry, keywords in self.excluded_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    excluded_industries.append(industry)
                    break

        # Дополнительная проверка domain keywords
        if domain:
            domain_lower = domain.lower()
            for industry, keywords in self.excluded_domain_keywords.items():
                for keyword in keywords:
                    if keyword.lower() in domain_lower:
                        if industry not in excluded_industries:
                            excluded_industries.append(industry)
                        break

        return {
            'is_excluded': len(excluded_industries) > 0,
            'industries': excluded_industries
        }

    def _score_email_quality(self, email: str, domain: str) -> int:
        """Оценка качества email (0-100)"""
        score = 50  # Base score

        if not email or '@' not in email:
            return 0

        try:
            local, email_domain = email.split('@')

            # Corporate domain (not personal)
            if email_domain.lower() not in self.personal_domains:
                score += 30

            # Professional prefix (info, contact, sales, etc.)
            professional_prefixes = ['info', 'contact', 'sales', 'enquiries', 'enquiry']
            if any(local.lower().startswith(p) for p in professional_prefixes):
                score += 20

            # UK domain
            if '.uk' in email_domain or '.co.uk' in email_domain:
                score += 10

        except:
            return 0

        return min(score, 100)

    def _score_company_relevance(self, company_name: str, description: str, domain: str) -> int:
        """Оценка релевантности компании (0-100)"""
        score = 20  # Base score

        text = f"{company_name} {description} {domain}".lower()

        # Проверка позитивных keywords
        matches = 0
        for keyword in self.positive_keywords:
            if keyword.lower() in text:
                matches += 1
                if matches >= 5:
                    break

        score += matches * 16  # Max +80

        return min(score, 100)

    def _score_geographic_priority(self, email: str, description: str, domain: str) -> int:
        """Оценка географического приоритета (0-100)"""
        text = f"{email} {description} {domain}".lower()

        # High priority (UK)
        for keyword in self.priority_high:
            if keyword in text:
                return 100

        # Medium priority (Ireland, etc.)
        for keyword in self.priority_medium:
            if keyword in text:
                return 60

        # Default
        return 30

    def _score_engagement(self, email: str) -> int:
        """Оценка потенциального engagement (0-100)"""
        if not email:
            return 0

        try:
            local = email.split('@')[0].lower()

            # Высокий engagement
            high_engagement = ['sales', 'contact', 'enquiries', 'enquiry', 'business']
            if any(prefix in local for prefix in high_engagement):
                return 90

            # Средний engagement
            medium_engagement = ['info', 'hello', 'mail']
            if any(prefix in local for prefix in medium_engagement):
                return 60

            # Персональный email (имя@домен)
            if re.match(r'^[a-z]+\.[a-z]+@', email.lower()):
                return 70

            return 40
        except:
            return 40

    def _is_manufacturing_company(self, company_name: str, description: str, domain: str) -> bool:
        """Проверка на производственную компанию"""
        text = f"{company_name} {description} {domain}".lower()

        manufacturing_keywords = [
            'manufacturer', 'manufacturing', 'factory', 'production',
            'engineering', 'fabrication', 'machinery', 'equipment',
            'industrial', 'oem', 'supplier'
        ]

        return any(keyword in text for keyword in manufacturing_keywords)

    def _has_domain_match(self, domain: str) -> bool:
        """Проверка на соответствие manufacturing domain patterns"""
        if not domain:
            return False

        domain_lower = domain.lower()
        return any(pattern in domain_lower for pattern in self.manufacturing_patterns)

    def _has_b2b_indicator(self, company_name: str, domain: str) -> bool:
        """Проверка на B2B индикаторы"""
        text = f"{company_name} {domain}".lower()
        return any(indicator in text for indicator in self.b2b_indicators)

    def _has_excluded_domain_keywords(self, domain: str) -> bool:
        """Проверка на исключенные domain keywords"""
        if not domain:
            return False

        domain_lower = domain.lower()

        for keywords in self.excluded_domain_keywords.values():
            if any(keyword in domain_lower for keyword in keywords):
                return True

        return False


def load_filter() -> UKBusinessExclusionsFilter:
    """
    Загружает фильтр с конфигурацией

    Returns:
        UKBusinessExclusionsFilter instance
    """
    # Configs находятся в корневой директории проекта
    config_path = Path(__file__).parent.parent / 'configs' / 'uk_business_exclusions_config.json'

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    return UKBusinessExclusionsFilter(config)


if __name__ == '__main__':
    # Test the filter
    filter_instance = load_filter()

    test_cases = [
        {
            'email': 'sales@hydraulics-uk.com',
            'company_name': 'UK Hydraulics Ltd',
            'description': 'Hydraulic equipment manufacturer',
            'domain': 'hydraulics-uk.com'
        },
        {
            'email': 'info@travelagency.co.uk',
            'company_name': 'Travel Agency UK',
            'description': 'Holiday packages and tours',
            'domain': 'travelagency.co.uk'
        },
        {
            'email': 'contact@lawfirm.co.uk',
            'company_name': 'Smith & Jones Solicitors',
            'description': 'Legal services and advice',
            'domain': 'lawfirm.co.uk'
        },
        {
            'email': 'info@ukbank.com',
            'company_name': 'UK Banking Group',
            'description': 'Banking and financial services',
            'domain': 'ukbank.com'
        }
    ]

    print("=" * 80)
    print("UK BUSINESS EXCLUSIONS FILTER - TEST RESULTS")
    print("=" * 80)

    for i, case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {case['email']}")
        print(f"   Company: {case['company_name']}")
        print(f"   Description: {case['description']}")

        exclusion = filter_instance.should_exclude(
            case['email'],
            case['company_name'],
            case['description'],
            case['domain']
        )

        score = filter_instance.calculate_score(
            case['email'],
            case['company_name'],
            case['description'],
            case['domain']
        )

        print(f"\n   EXCLUSION CHECK:")
        print(f"   - Should Exclude: {exclusion['should_exclude']}")
        print(f"   - Reasons: {', '.join(exclusion['reasons']) if exclusion['reasons'] else 'None'}")
        print(f"   - Severity: {exclusion['severity']}")
        if exclusion['excluded_industries']:
            print(f"   - Excluded Industries: {', '.join(exclusion['excluded_industries'])}")

        print(f"\n   SCORING:")
        print(f"   - Total Score: {score['total_score']}")
        print(f"   - Email Quality: {score['email_quality']}")
        print(f"   - Company Relevance: {score['company_relevance']}")
        print(f"   - Geographic Priority: {score['geographic_priority']}")
        print(f"   - Engagement: {score['engagement']}")
        if score['bonuses']:
            print(f"   - Bonuses: {', '.join(score['bonuses'])}")
        if score['penalties']:
            print(f"   - Penalties: {', '.join(score['penalties'])}")

        print("-" * 80)
