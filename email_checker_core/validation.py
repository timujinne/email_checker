import re
from typing import Union, Dict
from collections import defaultdict

class EmailValidator:
    def __init__(self):
        self.stats = defaultdict(int)

    def is_valid_email(self, email: str) -> bool:
        """
        Валидация финального email формата (ПОСЛЕ нормализации)
        Проверяет только реальные RFC требования и фильтрует технические токены
        НЕ проверяет префиксы - они удаляются в normalize_email()
        """
        # Базовая проверка формата
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False

        # Разделяем на локальную часть и домен
        try:
            local_part, domain = email.split('@', 1)
        except ValueError:
            return False

        # RFC требования для локальной части
        # Email не может начинаться с: . - + _
        if local_part[0] in ['.', '-', '+', '_']:
            return False

        # Email не может заканчиваться точкой перед @
        if local_part[-1] == '.':
            return False

        # Две точки подряд недопустимы
        if '..' in local_part:
            return False

        # Слишком длинные локальные части (более 64 символов по RFC)
        if len(local_part) > 64:
            return False

        # Слишком короткие локальные части (менее 1 символа)
        if len(local_part) < 1:
            return False

        # Проверка на недопустимые символы (те, что не удаляются в normalize)
        invalid_chars = ['<', '>', '(', ')', '[', ']', ',', ';', ':', '\\', '"', ' ', '/', '\t', '\n']
        if any(char in local_part for char in invalid_chars):
            return False

        # RFC требования для домена
        # Домен не может начинаться или заканчиваться точкой или дефисом
        if domain[0] in ['.', '-'] or domain[-1] in ['.', '-']:
            return False

        # Фильтрация технических токенов и хешей
        # 1. MD5 хеши (32 символа hex)
        if re.match(r'^[a-f0-9]{32}$', local_part.lower()):
            return False

        # 2. SHA1 хеши (40 символов hex)
        if re.match(r'^[a-f0-9]{40}$', local_part.lower()):
            return False

        # 3. UUID формат (8-4-4-4-12 символов)
        if re.match(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', local_part.lower()):
            return False

        # 4. Технические домены сервисов мониторинга
        tech_domains = ['sentry.', 'getsentry.', 'bugsnag.', 'rollbar.', 'airbrake.']
        if any(tech_domain in domain.lower() for tech_domain in tech_domains):
            return False

        # 5. Исключаем очень длинные hex строки (вероятные токены)
        if len(local_part) > 20 and re.match(r'^[a-f0-9]+$', local_part.lower()):
            return False

        return True

    def normalize_email(self, email: str) -> Union[str, None]:
        """
        Агрессивно нормализует email: удаляет недопустимые префиксы и символы
        Всегда применяется ко всем email, даже если они выглядят валидными
        Возвращает нормализованный email или None если невозможно исправить
        """
        if not email or '@' not in email:
            return None

        try:
            local_part, domain = email.split('@', 1)
        except ValueError:
            return None

        original_email = email
        original_local = local_part
        normalized = False

        # Удаляем префикс "//" если есть (ПРИОРИТЕТ 1 - самый частый)
        if local_part.startswith('//'):
            local_part = local_part[2:]
            normalized = True
            self.stats['normalized_slash_prefix'] += 1

        # Удаляем префикс "20" если есть и остается валидная часть (ПРИОРИТЕТ 2)
        if local_part.startswith('20') and len(local_part) > 2:
            local_part = local_part[2:]
            normalized = True
            self.stats['normalized_20_prefix'] += 1

        # Удаляем ВСЕ недопустимые символы в начале: . - + _
        # Используем while чтобы удалить все подряд идущие
        while local_part and local_part[0] in ['.', '-', '+', '_']:
            local_part = local_part[1:]
            normalized = True
            self.stats['normalized_invalid_start'] += 1

        # Удаляем точки в конце локальной части
        while local_part and local_part[-1] == '.':
            local_part = local_part[:-1]
            normalized = True
            self.stats['normalized_trailing_dot'] += 1

        # Проверяем что после нормализации что-то осталось
        if not local_part or len(local_part) < 1:
            self.stats['invalid_after_normalization'] += 1
            return None

        # Собираем нормализованный email
        normalized_email = f"{local_part}@{domain}"

        # Проверяем валидность ПОСЛЕ нормализации
        if not self.is_valid_email(normalized_email):
            self.stats['invalid_after_normalization'] += 1
            # Логируем проблему для отладки
            if normalized:
                print(f"   ⚠️  Не удалось нормализовать: {original_email} → {normalized_email} (не прошел валидацию)")
            return None

        # Логируем если была нормализация
        if normalized and original_local != local_part:
            print(f"   🔧 Нормализован: {original_email} → {normalized_email}")

        # Возвращаем нормализованный email (даже если не было изменений)
        return normalized_email

    def get_domain(self, email: str) -> str:
        """Извлекает домен из email"""
        try:
            return email.split('@')[1].lower()
        except IndexError:
            return ""
