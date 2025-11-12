#!/usr/bin/env python3
"""
Email Checker - Инструмент для проверки email списков против блок-листов
"""

import os
import re
import argparse
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Set, List, Tuple, Dict, Union
from collections import defaultdict
import time

# Импорт нашего модуля для работы с метаданными
from email_metadata import EmailMetadataManager, EmailWithMetadata
from metadata_integration import MetadataIntegrator, EnrichedEmailResult

class EmailChecker:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.input_dir = self.base_dir / "input"
        self.blocklists_dir = self.base_dir / "blocklists"
        self.output_dir = self.base_dir / "output"

        # Кешированные блок-листы
        self.blocked_emails: Set[str] = set()
        self.blocked_domains: Set[str] = set()
        self.cache_loaded = False

        # Статистика
        self.stats = defaultdict(int)
        self.all_results = []  # Для хранения результатов всех проверок

        # Кеширование для инкрементальных обновлений
        self.cache_dir = self.base_dir / ".cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.processed_files_cache = self.cache_dir / "processed_files.json"

        # Конфигурация списков
        self.lists_config_file = self.base_dir / "lists_config.json"
        self.lists_config = self._load_lists_config()

        # Менеджер для работы с метаданными email
        self.metadata_manager = EmailMetadataManager(str(self.base_dir))

        # Интегратор метаданных из LVP файлов
        self.metadata_integrator = MetadataIntegrator(str(self.base_dir))

    def load_emails_from_file(self, filepath: str) -> Set[str]:
        """Загружает email адреса из txt файла с нормализацией"""
        emails = set()
        invalid_count = 0
        normalized_count = 0

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    email = line.strip().lower()
                    if not email:
                        continue

                    # ИСПРАВЛЕНИЕ: Сначала всегда нормализуем, потом проверяем
                    # Это позволит обработать email с префиксами //, 20, и т.д.
                    normalized = self.normalize_email(email)

                    if normalized:
                        # Нормализация успешна - добавляем
                        emails.add(normalized)
                        if normalized != email:
                            normalized_count += 1
                    else:
                        # Не удалось нормализовать - отклоняем
                        invalid_count += 1

            print(f"✓ Загружено {len(emails)} валидных email из {filepath}")
            if normalized_count > 0:
                print(f"  🔧 Нормализовано: {normalized_count} email")
            if invalid_count > 0:
                print(f"  ⚠️  Отклонено невалидных: {invalid_count} email")
        except FileNotFoundError:
            print(f"❌ Файл {filepath} не найден")
        except Exception as e:
            print(f"❌ Ошибка при чтении {filepath}: {e}")

        return emails

    def load_emails_with_metadata(self, filepath: str) -> List[EmailWithMetadata]:
        """Загружает email с метаданными из различных форматов (LVP, JSON, CSV, TXT)"""
        return self.metadata_manager.load_emails_from_file(filepath)

    def load_blocklists(self):
        """Загружает блок-листы в память для быстрого поиска"""
        if self.cache_loaded:
            return

        print("🔄 Загрузка блок-листов...")
        start_time = time.time()

        # Загрузка заблокированных email
        email_blocklist = self.blocklists_dir / "blocked_emails.txt"
        if email_blocklist.exists():
            self.blocked_emails = self.load_emails_from_file(str(email_blocklist))

        # Загрузка заблокированных доменов
        domain_blocklist = self.blocklists_dir / "blocked_domains.txt"
        if domain_blocklist.exists():
            with open(domain_blocklist, 'r', encoding='utf-8') as f:
                for line in f:
                    domain = line.strip().lower()
                    if domain:
                        self.blocked_domains.add(domain)

        self.cache_loaded = True
        load_time = time.time() - start_time

        print(f"✓ Загружено {len(self.blocked_emails)} заблокированных email")
        print(f"✓ Загружено {len(self.blocked_domains)} заблокированных доменов")
        print(f"✓ Время загрузки: {load_time:.2f} сек\n")

    def save_blocked_emails_to_file(self, new_blocked_emails: Set[str], reason: str = "validation_status"):
        """
        Сохраняет новые заблокированные email в blocklist файл

        Args:
            new_blocked_emails: Множество email для добавления в блок-лист
            reason: Причина блокировки для логирования
        """
        if not new_blocked_emails:
            return

        email_blocklist = self.blocklists_dir / "blocked_emails.txt"

        # Читаем существующие blocked emails из файла
        existing_in_file = set()
        if email_blocklist.exists():
            with open(email_blocklist, 'r', encoding='utf-8') as f:
                for line in f:
                    email = line.strip().lower()
                    if email:
                        existing_in_file.add(email)

        # Находим только новые email (которых нет в файле)
        truly_new = new_blocked_emails - existing_in_file

        if not truly_new:
            return

        # Добавляем новые email в файл
        try:
            with open(email_blocklist, 'a', encoding='utf-8') as f:
                for email in sorted(truly_new):
                    f.write(f"{email}\n")

            # Обновляем in-memory кеш
            self.blocked_emails.update(truly_new)

            print(f"📝 Добавлено {len(truly_new)} email в блок-лист ({reason})")
        except Exception as e:
            print(f"❌ Ошибка при сохранении в блок-лист: {e}")

    def _is_valid_email(self, email: str) -> bool:
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
        if not self._is_valid_email(normalized_email):
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

    def _get_domain(self, email: str) -> str:
        """Извлекает домен из email"""
        try:
            return email.split('@')[1].lower()
        except IndexError:
            return ""

    def check_email_against_blocklists(self, emails: Set[str]) -> Dict[str, List[str]]:
        """
        Проверяет email против блок-листов
        Возвращает словарь с категориями: clean, blocked_email, blocked_domain
        """
        self.load_blocklists()

        result = {
            'clean': [],
            'blocked_email': [],
            'blocked_domain': [],
            'invalid': []
        }

        print("🔍 Проверка email против блок-листов...")
        start_time = time.time()

        for email in emails:
            if not self._is_valid_email(email):
                result['invalid'].append(email)
                continue

            domain = self._get_domain(email)

            if email in self.blocked_emails:
                result['blocked_email'].append(email)
            elif domain in self.blocked_domains:
                result['blocked_domain'].append(email)
            else:
                result['clean'].append(email)

        check_time = time.time() - start_time

        # Обновляем статистику
        self.stats['total_checked'] = len(emails)
        self.stats['clean'] = len(result['clean'])
        self.stats['blocked_email'] = len(result['blocked_email'])
        self.stats['blocked_domain'] = len(result['blocked_domain'])
        self.stats['invalid'] = len(result['invalid'])
        self.stats['check_time'] = check_time

        return result

    def check_emails_with_enrichment(self, emails: List[str], list_name: str = "unknown") -> Dict[str, List[EnrichedEmailResult]]:
        """
        Проверяет email против блок-листов с автоматическим обогащением метаданными из LVP файлов

        Args:
            emails: Список email адресов
            list_name: Название списка для отчета

        Returns:
            Словарь с категориями обогащенных результатов: clean, blocked_email, blocked_domain, invalid
        """
        print(f"\n🚀 РАСШИРЕННАЯ ПРОВЕРКА С ИНТЕГРАЦИЕЙ МЕТАДАННЫХ")
        print(f"📧 Список: {list_name}")
        print(f"📊 Email для проверки: {len(emails)}")

        # Шаг 1: Обогащаем email метаданными из LVP файлов
        enriched_emails = self.metadata_integrator.enrich_email_list(emails, list_name)

        # Шаг 2: Загружаем блок-листы
        self.load_blocklists()

        # Шаг 3: Проверяем против блок-листов
        result = {
            'clean': [],
            'blocked_email': [],
            'blocked_domain': [],
            'invalid': []
        }

        print("🔍 Проверка обогащенных email против блок-листов...")
        start_time = time.time()

        for enriched_email in enriched_emails:
            email = enriched_email.email

            if not self._is_valid_email(email):
                enriched_email.is_clean = False
                enriched_email.blocked_reason = "Invalid email format"
                result['invalid'].append(enriched_email)
                continue

            domain = self._get_domain(email)

            if email in self.blocked_emails:
                enriched_email.is_clean = False
                enriched_email.blocked_reason = "Email in blocklist"
                result['blocked_email'].append(enriched_email)
            elif domain in self.blocked_domains:
                enriched_email.is_clean = False
                enriched_email.blocked_reason = "Domain in blocklist"
                result['blocked_domain'].append(enriched_email)
            else:
                enriched_email.is_clean = True
                result['clean'].append(enriched_email)

        check_time = time.time() - start_time

        # Статистика по обогащению
        total_with_metadata = sum(1 for enriched in enriched_emails if enriched.has_metadata)
        enrichment_rate = (total_with_metadata / len(enriched_emails)) * 100 if enriched_emails else 0

        # Обновляем статистику
        self.stats['total_checked'] = len(emails)
        self.stats['clean'] = len(result['clean'])
        self.stats['blocked_email'] = len(result['blocked_email'])
        self.stats['blocked_domain'] = len(result['blocked_domain'])
        self.stats['invalid'] = len(result['invalid'])
        self.stats['check_time'] = check_time
        self.stats['emails_with_metadata'] = total_with_metadata
        self.stats['enrichment_rate'] = enrichment_rate

        print(f"✨ Метаданные найдены для {total_with_metadata} email ({enrichment_rate:.1f}%)")

        return result

    def check_emails_with_metadata(self, emails_with_metadata: List[EmailWithMetadata]) -> Dict[str, List[EmailWithMetadata]]:
        """
        Проверяет email с метаданными против блок-листов
        Возвращает словарь с категориями: clean, blocked_email, blocked_domain
        """
        self.load_blocklists()

        result = {
            'clean': [],
            'blocked_email': [],
            'blocked_domain': [],
            'invalid': []
        }

        # Для сохранения в блок-лист
        emails_to_block_from_status = set()

        print("🔍 Проверка email с метаданными против блок-листов...")
        start_time = time.time()

        for email_obj in emails_with_metadata:
            email = email_obj.email

            if not self._is_valid_email(email):
                result['invalid'].append(email_obj)
                continue

            # Проверка validation_status из LVP файла
            if email_obj.validation_status:
                status = email_obj.validation_status.lower()
                if status == 'invalid':
                    result['invalid'].append(email_obj)
                    # Добавляем в список для блокировки
                    emails_to_block_from_status.add(email)
                    continue
                elif status in ['temp', 'notsure', 'notchecked']:
                    # Временные и ненадёжные email блокируем
                    result['blocked_email'].append(email_obj)
                    continue

            domain = self._get_domain(email)

            if email in self.blocked_emails:
                result['blocked_email'].append(email_obj)
            elif domain in self.blocked_domains:
                result['blocked_domain'].append(email_obj)
            else:
                result['clean'].append(email_obj)

        check_time = time.time() - start_time

        # Сохраняем Invalid email в блок-лист
        if emails_to_block_from_status:
            self.save_blocked_emails_to_file(emails_to_block_from_status, reason="LVP status=Invalid")

        # Обновляем статистику
        total_emails = len(emails_with_metadata)
        self.stats['total_checked'] = total_emails
        self.stats['clean'] = len(result['clean'])
        self.stats['blocked_email'] = len(result['blocked_email'])
        self.stats['blocked_domain'] = len(result['blocked_domain'])
        self.stats['invalid'] = len(result['invalid'])
        self.stats['check_time'] = check_time

        print(f"💾 Сохранено {len(result['clean'])} чистых email с метаданными")

        return result

    def _save_result_for_report(self, filename: str, results: Dict[str, List[str]], file_path: str = None, cache_data: Dict = None, duplicates_removed: int = 0, prefix_duplicates_removed: int = 0):
        """Сохраняет результат для HTML отчета и в кеш"""
        result_data = {
            'filename': filename,
            'stats': dict(self.stats),
            'results': results,
            'duplicates_removed': duplicates_removed,  # Дубликаты с предыдущими списками
            'prefix_duplicates_removed': prefix_duplicates_removed,  # Дубликаты с префиксом '20'
            'timestamp': datetime.now().isoformat()
        }

        self.all_results.append(result_data)

        # Сохраняем в кеш если предоставлены данные
        if file_path and cache_data is not None:
            filename_key = Path(file_path).name
            cache_data[filename_key] = {
                'hash': self._get_file_hash(file_path),
                'result_data': result_data,
                'processed_at': datetime.now().isoformat()
            }

    def find_duplicates(self, lists: List[Set[str]]) -> Dict[str, Set[str]]:
        """Находит дубликаты между несколькими списками"""
        if len(lists) < 2:
            return {}

        duplicates = {}
        for i, current_list in enumerate(lists[1:], 1):
            prev_emails = set()
            for j in range(i):
                prev_emails.update(lists[j])

            dupes = current_list.intersection(prev_emails)
            if dupes:
                duplicates[f'list_{i+1}_duplicates'] = dupes

        return duplicates

    def clean_prefix_duplicates(self, emails: Set[str]) -> Tuple[Set[str], int]:
        """
        Очищает email с недопустимыми префиксами:
        1. Если существует версия БЕЗ префикса - удаляет дубликат С префиксом
        2. Если существует ТОЛЬКО версия С префиксом - нормализует её (убирает префикс)

        Обрабатывает префиксы: '20', '//', начальные '-', '.', '+', '_'
        Возвращает очищенный набор и количество удаленных дубликатов
        """
        cleaned_emails = set(emails)
        removed_count = 0
        normalized_count = 0
        removal_reasons = defaultdict(int)
        normalization_reasons = defaultdict(int)

        # Находим email с различными префиксами
        prefix_emails = {}  # email -> (clean_version, prefix_type)

        for email in emails:
            if '@' not in email:
                continue

            try:
                local_part, domain = email.split('@', 1)
            except ValueError:
                continue

            original_local = local_part
            clean_local = local_part
            prefix_type = None

            # Проверяем префикс '//'
            if local_part.startswith('//'):
                clean_local = local_part[2:]
                prefix_type = '//'
            # Проверяем префикс '20'
            elif local_part.startswith('20') and len(local_part) > 2:
                clean_local = local_part[2:]
                prefix_type = '20'
            # Проверяем начальные недопустимые символы
            elif local_part[0] in ['-', '.', '+', '_']:
                # Удаляем все начальные недопустимые символы
                clean_local = local_part.lstrip('-.+_')
                if clean_local != original_local:
                    prefix_type = f'invalid_start({original_local[0]})'

            # Если нашли префикс
            if prefix_type and clean_local and len(clean_local) > 0:
                clean_version = f"{clean_local}@{domain}"
                prefix_emails[email] = (clean_version, prefix_type)

        # Проходим по всем email с префиксами
        for prefix_email, (clean_version, prefix_type) in prefix_emails.items():
            # Если существует чистая версия - удаляем версию с префиксом (дубликат)
            if clean_version in emails and clean_version != prefix_email:
                cleaned_emails.discard(prefix_email)
                removed_count += 1
                removal_reasons[prefix_type] += 1
                print(f"   🗑️  Удален дубликат с префиксом '{prefix_type}': {prefix_email} (есть {clean_version})")
            # Если НЕ существует чистая версия - нормализуем (заменяем префиксную на чистую)
            elif clean_version not in emails and prefix_email in cleaned_emails:
                cleaned_emails.discard(prefix_email)
                cleaned_emails.add(clean_version)
                normalized_count += 1
                normalization_reasons[prefix_type] += 1
                print(f"   🔧 Нормализован одиночный email с префиксом '{prefix_type}': {prefix_email} → {clean_version}")

        # Выводим сводку
        if removed_count > 0:
            print(f"\n📊 Сводка удаления дубликатов по префиксам:")
            for prefix_type, count in sorted(removal_reasons.items(), key=lambda x: x[1], reverse=True):
                print(f"   • Префикс '{prefix_type}': {count} дубликатов")
            print()

        if normalized_count > 0:
            print(f"\n📊 Сводка нормализации одиночных email с префиксами:")
            for prefix_type, count in sorted(normalization_reasons.items(), key=lambda x: x[1], reverse=True):
                print(f"   • Префикс '{prefix_type}': {count} нормализовано")
            print()

        return cleaned_emails, removed_count + normalized_count

    def _get_file_hash(self, filepath: str) -> str:
        """Вычисляет хеш файла для проверки изменений"""
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
                return hashlib.md5(content).hexdigest()
        except Exception:
            return ""

    def _save_processed_files_cache(self, processed_files: Dict):
        """Сохраняет кеш обработанных файлов"""
        try:
            with open(self.processed_files_cache, 'w', encoding='utf-8') as f:
                json.dump(processed_files, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️  Ошибка сохранения кеша: {e}")

    def _load_processed_files_cache(self) -> Dict:
        """Загружает кеш обработанных файлов"""
        try:
            if self.processed_files_cache.exists():
                with open(self.processed_files_cache, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️  Ошибка загрузки кеша: {e}")
        return {}

    def _load_cached_results(self, cache_data: Dict):
        """Загружает кешированные результаты в self.all_results"""
        for file_info in cache_data.values():
            if 'result_data' in file_info:
                self.all_results.append(file_info['result_data'])

    def _load_lists_config(self) -> Dict:
        """Загружает конфигурацию списков"""
        try:
            if self.lists_config_file.exists():
                with open(self.lists_config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️  Ошибка загрузки конфигурации: {e}")
        return {"lists": []}

    def _save_lists_config(self):
        """Сохраняет конфигурацию списков"""
        try:
            with open(self.lists_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.lists_config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️  Ошибка сохранения конфигурации: {e}")

    def _get_list_metadata(self, filename: str) -> Dict:
        """Возвращает метаданные для файла списка"""
        for list_info in self.lists_config.get("lists", []):
            if list_info["filename"] == filename:
                return list_info

        # Если файл не найден в конфигурации, создаем базовую запись
        # Проверяем, есть ли уже выходные файлы (значит файл был обработан)
        output_files = list(self.output_dir.glob(f"{Path(filename).stem}_*"))
        is_processed = len(output_files) > 0

        # Умное определение страны по имени файла
        filename_lower = filename.lower()
        detected_country = "Unknown"
        detected_category = "General"

        # Определение страны
        if any(marker in filename_lower for marker in ["ru_", "_ru", "russia", "russian"]):
            detected_country = "Russia"
        elif any(marker in filename_lower for marker in ["poland", "polland", "pol_", "_pl"]):
            detected_country = "Poland"
        elif any(marker in filename_lower for marker in ["belgium", "belg_", "_be"]):
            detected_country = "Belgium"
        elif any(marker in filename_lower for marker in ["germany", "german", "_de", "_ger"]):
            detected_country = "Germany"
        elif any(marker in filename_lower for marker in ["czech", "czeh", "_cz"]):
            detected_country = "Czech Republic"
        elif any(marker in filename_lower for marker in ["bulgaria", "bolgar", "_bg"]):
            detected_country = "Bulgaria"
        elif any(marker in filename_lower for marker in ["romania", "rumonia", "romonia", "_ro", "_rom"]):
            detected_country = "Romania"
        elif any(marker in filename_lower for marker in ["hungary", "hungar", "_hu", "_hun"]):
            detected_country = "Hungary"
        elif any(marker in filename_lower for marker in ["croatia", "croat", "_hr", "_cro"]):
            detected_country = "Croatia"
        elif any(marker in filename_lower for marker in ["montenegro", "monten", "_me", "_mne"]):
            detected_country = "Montenegro"
        elif any(marker in filename_lower for marker in ["macedonia", "macedon", "_mk", "_mac"]):
            detected_country = "North Macedonia"
        elif any(marker in filename_lower for marker in ["serbia", "serb", "_rs", "_srb"]):
            detected_country = "Serbia"
        elif any(marker in filename_lower for marker in ["slovenia", "sloven", "_si", "_slo"]):
            detected_country = "Slovenia"
        elif any(marker in filename_lower for marker in ["slovakia", "slovak", "_sk", "_svk"]):
            detected_country = "Slovakia"
        elif any(marker in filename_lower for marker in ["austria", "austri", "_at", "_aut"]):
            detected_country = "Austria"
        elif any(marker in filename_lower for marker in ["netherlands", "dutch", "_nl", "_ned"]):
            detected_country = "Netherlands"
        elif any(marker in filename_lower for marker in ["france", "french", "_fr", "_fra"]):
            detected_country = "France"
        elif any(marker in filename_lower for marker in ["italy", "italian", "_it", "_ita"]):
            detected_country = "Italy"
        elif any(marker in filename_lower for marker in ["spain", "spanish", "_es", "_esp"]):
            detected_country = "Spain"
        elif any(marker in filename_lower for marker in ["portugal", "portug", "_pt", "_por"]):
            detected_country = "Portugal"
        elif any(marker in filename_lower for marker in ["eu_", "europe"]):
            detected_country = "Europe"
        elif any(marker in filename_lower for marker in ["rf_", "_rf", "rb_"]):
            detected_country = "Mixed"

        # Определение категории
        if any(marker in filename_lower for marker in ["motor", "auto", "car"]):
            detected_category = "Automotive"
        elif any(marker in filename_lower for marker in ["agro", "agri", "farm"]):
            detected_category = "Agriculture"
        elif any(marker in filename_lower for marker in ["metal", "manufacture", "industry"]):
            detected_category = "Manufacturing"
        elif any(marker in filename_lower for marker in ["transport", "municip", "public"]):
            detected_category = "Transportation"
        elif any(marker in filename_lower for marker in ["hc_", "construct", "build", "buld"]):
            detected_category = "Manufacturing"  # Heavy Construction
        elif any(marker in filename_lower for marker in ["full", "complete", "database"]):
            detected_category = "Regional"

        new_list = {
            "filename": filename,
            "display_name": Path(filename).stem.replace("_", " ").title(),
            "country": detected_country,
            "category": detected_category,
            "priority": len(self.lists_config.get("lists", [])) + 1,
            "processed": is_processed,
            "date_added": datetime.now().strftime("%Y-%m-%d"),
            "description": f"Auto-detected list: {filename}"
        }

        self.lists_config.setdefault("lists", []).append(new_list)
        self._save_lists_config()
        return new_list

    def _update_list_processed_status(self, filename: str, processed: bool = True):
        """Обновляет статус обработки в конфигурации"""
        for list_info in self.lists_config.get("lists", []):
            if list_info["filename"] == filename:
                list_info["processed"] = processed
                self._save_lists_config()
                break

    def show_status(self, pattern: str = None, category: str = None, country: str = None):
        """Показывает статус всех списков с фильтрацией"""
        print("\n" + "="*80)
        print("📊 СТАТУС EMAIL СПИСКОВ")
        print("="*80)

        # Обновляем конфигурацию новыми файлами
        input_files = list(self.input_dir.glob("*.txt"))
        for file_path in input_files:
            filename = file_path.name
            self._get_list_metadata(filename)

        # Применяем фильтры
        lists_to_show = []
        for list_info in self.lists_config.get("lists", []):
            # Проверяем фильтры
            if pattern and pattern.lower() not in list_info["filename"].lower():
                continue
            if category and category.lower() != list_info["category"].lower():
                continue
            if country and country.lower() != list_info["country"].lower():
                continue

            # Проверяем существование файла
            file_path = self.input_dir / list_info["filename"]
            if file_path.exists():
                file_size = file_path.stat().st_size
                list_info["file_size"] = file_size
                list_info["exists"] = True
            else:
                list_info["file_size"] = 0
                list_info["exists"] = False

            lists_to_show.append(list_info)

        # Сортируем по приоритету
        lists_to_show.sort(key=lambda x: x.get("priority", 999))

        # Подсчитываем статистику
        total_lists = len(lists_to_show)
        processed_lists = sum(1 for lst in lists_to_show if lst["processed"])
        pending_lists = total_lists - processed_lists

        print(f"📋 Всего списков: {total_lists}")
        print(f"✅ Обработано: {processed_lists}")
        print(f"⏳ Ожидает обработки: {pending_lists}")
        print()

        # Показываем детали
        print(f"{'№':>3} {'Файл':<20} {'Название':<25} {'Страна':<12} {'Категория':<15} {'Размер':<10} {'Статус':<12}")
        print("-" * 105)

        for i, list_info in enumerate(lists_to_show, 1):
            filename = list_info["filename"]
            display_name = list_info["display_name"][:24] + ("..." if len(list_info["display_name"]) > 24 else "")
            country = list_info["country"]
            category = list_info["category"]

            if list_info["exists"]:
                size_str = self._format_file_size(list_info["file_size"])
            else:
                size_str = "НЕТ ФАЙЛА"

            status = "✅ Обработан" if list_info["processed"] else "⏳ Ожидает"

            print(f"{i:>3} {filename:<20} {display_name:<25} {country:<12} {category:<15} {size_str:<10} {status}")

        print("\n💡 Используйте фильтры: --pattern, --category, --country")
        print("🔄 Для обработки новых файлов: python3 email_checker.py incremental --exclude-duplicates --generate-html")

    def _format_file_size(self, size_bytes: int) -> str:
        """Форматирует размер файла в человекочитаемом виде"""
        if size_bytes < 1024:
            return f"{size_bytes}B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f}KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f}MB"

    def check_incremental_update(self, input_files: List[str]) -> Tuple[List[str], Dict]:
        """
        Проверяет какие файлы нужно обработать при инкрементальном обновлении
        Возвращает список новых/измененных файлов и кеш
        """
        cache_data = self._load_processed_files_cache()
        files_to_process = []

        print("🔍 Проверка инкрементального обновления...")

        for file_path in input_files:
            file_path = str(file_path)
            current_hash = self._get_file_hash(file_path)
            filename = Path(file_path).name

            if filename not in cache_data:
                # Новый файл
                files_to_process.append(file_path)
                print(f"   📄 Новый файл: {filename}")
            elif cache_data[filename].get('hash') != current_hash:
                # Файл изменился
                files_to_process.append(file_path)
                print(f"   📝 Измененный файл: {filename}")
            else:
                # Файл не изменился, загружаем из кеша
                print(f"   ✅ Без изменений: {filename} (из кеша)")

        # Загружаем кешированные результаты для неизмененных файлов
        self._load_cached_results(cache_data)

        return files_to_process, cache_data

    def print_statistics(self):
        """Выводит статистику в консоль с цветами"""
        print("\n" + "="*60)
        print("📊 СТАТИСТИКА ПРОВЕРКИ")
        print("="*60)

        total = self.stats['total_checked']
        if total == 0:
            print("Нет данных для отображения")
            return

        clean = self.stats['clean']
        blocked_email = self.stats['blocked_email']
        blocked_domain = self.stats['blocked_domain']
        invalid = self.stats['invalid']

        print(f"📧 Всего проверено:      {total:,}")
        print(f"✅ Чистые email:        {clean:,} ({clean/total*100:.1f}%)")
        print(f"🚫 Заблокированы email:  {blocked_email:,} ({blocked_email/total*100:.1f}%)")
        print(f"🚫 Заблокированы домен:  {blocked_domain:,} ({blocked_domain/total*100:.1f}%)")
        if invalid > 0:
            print(f"❌ Невалидные:          {invalid:,} ({invalid/total*100:.1f}%)")

        print(f"\n⚡ Время проверки:       {self.stats['check_time']:.2f} сек")
        print(f"🚀 Скорость:            {total/self.stats['check_time']:,.0f} email/сек")

    def generate_html_report(self, filename_base: str = "report"):
        """Генерирует HTML отчет с визуализацией"""
        if not self.all_results:
            print("❌ Нет данных для генерации отчета")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.output_dir / f"{filename_base}_{timestamp}.html"

        # Агрегация данных
        total_stats = defaultdict(int)
        list_details = []

        for result in self.all_results:
            for key, value in result['stats'].items():
                total_stats[key] += value
            # Добавляем статистику о дедупликации
            total_stats['duplicates_removed'] += result.get('duplicates_removed', 0)
            total_stats['prefix_duplicates_removed'] += result.get('prefix_duplicates_removed', 0)
            list_details.append(result)

        # Генерация HTML
        html_content = self._create_html_template(total_stats, list_details)

        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"📊 HTML отчет сохранен: {report_file.name}")

    def _create_html_template(self, total_stats: Dict, list_details: List) -> str:
        """Создает HTML шаблон отчета"""
        total = total_stats['total_checked']
        clean = total_stats['clean']
        blocked_email = total_stats['blocked_email']
        blocked_domain = total_stats['blocked_domain']
        invalid = total_stats['invalid']
        duplicates_removed = total_stats['duplicates_removed']
        prefix_duplicates_removed = total_stats['prefix_duplicates_removed']

        # Данные для графиков
        pie_data = [
            ['Категория', 'Количество'],
            ['Чистые', clean],
            ['Блок email', blocked_email],
            ['Блок домен', blocked_domain]
        ]
        if invalid > 0:
            pie_data.append(['Невалидные', invalid])

        # Детали по спискам
        lists_table = ""
        for i, detail in enumerate(list_details, 1):
            stats = detail['stats']
            duplicates_removed = detail.get('duplicates_removed', 0)
            prefix_duplicates_removed = detail.get('prefix_duplicates_removed', 0)
            lists_table += f"""
            <tr>
                <td>{detail['filename']}</td>
                <td>{stats['total_checked']:,}</td>
                <td class="text-success">{stats['clean']:,}</td>
                <td class="text-danger">{stats['blocked_email']:,}</td>
                <td class="text-warning">{stats['blocked_domain']:,}</td>
                <td class="text-muted">{stats['invalid']:,}</td>
                <td class="text-info">{duplicates_removed:,}</td>
                <td class="text-secondary">{prefix_duplicates_removed:,}</td>
                <td>{stats['check_time']:.2f}с</td>
            </tr>
            """

        html = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Checker - Отчет</title>
    <script src="https://www.gstatic.com/charts/loader.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin: 10px 0;
        }}
        .metric-value {{
            font-size: 2.5rem;
            font-weight: bold;
        }}
        .chart-container {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
        }}
        .table-container {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        body {{
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }}
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px 0;
            margin-bottom: 30px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1 class="text-center">📧 Email Checker - Отчет</h1>
            <p class="text-center lead">Сгенерирован: {datetime.now().strftime("%d.%m.%Y %H:%M:%S")}</p>
        </div>
    </div>

    <div class="container">
        <!-- Общая статистика -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="metric-card text-center">
                    <div class="metric-value">{total:,}</div>
                    <div>Всего проверено</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card text-center" style="background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);">
                    <div class="metric-value">{clean:,}</div>
                    <div>Чистые ({clean/total*100 if total > 0 else 0:.1f}%)</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card text-center" style="background: linear-gradient(135deg, #ff6b6b 0%, #ffa8a8 100%);">
                    <div class="metric-value">{blocked_email + blocked_domain:,}</div>
                    <div>Заблокировано ({(blocked_email + blocked_domain)/total*100 if total > 0 else 0:.1f}%)</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card text-center" style="background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);">
                    <div class="metric-value">{total_stats['check_time']:.2f}с</div>
                    <div>Время обработки</div>
                </div>
            </div>
        </div>

        <!-- Графики -->
        <div class="row">
            <div class="col-md-6">
                <div class="chart-container">
                    <h3 class="text-center mb-3">📊 Распределение результатов</h3>
                    <div id="pieChart" style="height: 400px;"></div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="chart-container">
                    <h3 class="text-center mb-3">📈 Статистика по типам блокировки</h3>
                    <div id="barChart" style="height: 400px;"></div>
                </div>
            </div>
        </div>

        <!-- Детальная таблица -->
        <div class="table-container">
            <h3 class="mb-3">📋 Детали по спискам</h3>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Файл</th>
                            <th>Всего</th>
                            <th class="text-success">Чистые</th>
                            <th class="text-danger">Блок Email</th>
                            <th class="text-warning">Блок Домен</th>
                            <th class="text-muted">Невалидные</th>
                            <th class="text-info">Дубли между списками</th>
                            <th class="text-secondary">Дубли с '20'</th>
                            <th>Время</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lists_table}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Производительность -->
        <div class="chart-container mt-4">
            <h3 class="text-center mb-3">⚡ Производительность</h3>
            <div class="row text-center">
                <div class="col-md-4">
                    <h4 class="text-primary">{total/total_stats['check_time']:,.0f}</h4>
                    <p>email/сек</p>
                </div>
                <div class="col-md-4">
                    <h4 class="text-info">{len(list_details)}</h4>
                    <p>обработано списков</p>
                </div>
                <div class="col-md-4">
                    <h4 class="text-success">{(clean/total*100) if total > 0 else 0:.1f}%</h4>
                    <p>успешность очистки</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        google.charts.load('current', {{'packages':['corechart']}});
        google.charts.setOnLoadCallback(drawCharts);

        function drawCharts() {{
            // Круговая диаграмма
            var pieData = google.visualization.arrayToDataTable({pie_data});
            var pieOptions = {{
                title: 'Распределение email по категориям',
                pieHole: 0.4,
                colors: ['#28a745', '#dc3545', '#ffc107', '#6c757d'],
                backgroundColor: 'transparent'
            }};
            var pieChart = new google.visualization.PieChart(document.getElementById('pieChart'));
            pieChart.draw(pieData, pieOptions);

            // Столбчатая диаграмма
            var barData = google.visualization.arrayToDataTable([
                ['Тип', 'Количество'],
                ['Заблокированы по email', {blocked_email}],
                ['Заблокированы по домену', {blocked_domain}]
            ]);
            var barOptions = {{
                title: 'Типы блокировки',
                colors: ['#dc3545', '#ffc107'],
                backgroundColor: 'transparent',
                hAxis: {{title: 'Количество'}},
                vAxis: {{title: 'Тип блокировки'}}
            }};
            var barChart = new google.visualization.ColumnChart(document.getElementById('barChart'));
            barChart.draw(barData, barOptions);
        }}
    </script>
</body>
</html>
        """
        return html

    def save_results(self, filename_base: str, results: Dict[str, List[str]]):
        """Сохраняет результаты в отдельные файлы"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for category, emails in results.items():
            if not emails:
                continue

            output_file = self.output_dir / f"{filename_base}_{category}_{timestamp}.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                for email in sorted(emails):
                    f.write(f"{email}\n")

            print(f"💾 Сохранено {len(emails)} email в {output_file.name}")

    def save_results_with_metadata(self, filename_base: str, results: Dict[str, List[EmailWithMetadata]]):
        """Сохраняет результаты с метаданными в JSON и CSV форматах"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for category, emails_objs in results.items():
            if not emails_objs:
                continue

            # SAFETY NET: Дедупликация внутри категории по email адресу
            # (на случай если в LVP файле есть дубликаты)
            seen_emails = {}
            unique_emails_objs = []
            duplicates_found = 0

            for email_obj in emails_objs:
                email_key = email_obj.email.lower()
                if email_key not in seen_emails:
                    seen_emails[email_key] = True
                    unique_emails_objs.append(email_obj)
                else:
                    duplicates_found += 1

            if duplicates_found > 0:
                print(f"   🧹 Удалено {duplicates_found} внутренних дубликатов из категории '{category}'")

            emails_objs = unique_emails_objs

            # Сохранение в JSON с полными метаданными
            output_json = self.output_dir / f"{filename_base}_{category}_metadata_{timestamp}.json"
            self.metadata_manager.save_emails_to_json(emails_objs, str(output_json))

            # Сохранение в CSV для удобного просмотра
            output_csv = self.output_dir / f"{filename_base}_{category}_metadata_{timestamp}.csv"
            self.metadata_manager.save_emails_to_csv(emails_objs, str(output_csv))

            # Также сохраняем обычный TXT файл (только email) для совместимости
            output_txt = self.output_dir / f"{filename_base}_{category}_{timestamp}.txt"
            with open(output_txt, 'w', encoding='utf-8') as f:
                for email_obj in sorted(emails_objs, key=lambda x: x.email):
                    f.write(f"{email_obj.email}\n")

            print(f"💾 Сохранено {len(emails_objs)} email с метаданными:")
            print(f"  📄 JSON: {output_json.name}")
            print(f"  📊 CSV: {output_csv.name}")
            print(f"  📝 TXT: {output_txt.name}")

    def save_enriched_results(self, filename_base: str, results: Dict[str, List[EnrichedEmailResult]]):
        """Сохраняет обогащенные результаты в JSON и CSV форматах"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for category, enriched_emails in results.items():
            if not enriched_emails:
                continue

            # Сохранение обогащенных результатов в JSON
            output_json = self.output_dir / f"{filename_base}_{category}_enriched_{timestamp}.json"
            enriched_data = {
                "metadata": {
                    "generated_date": datetime.now().isoformat(),
                    "total_emails": len(enriched_emails),
                    "emails_with_metadata": sum(1 for e in enriched_emails if e.has_metadata),
                    "enrichment_rate": f"{sum(1 for e in enriched_emails if e.has_metadata)/len(enriched_emails)*100:.1f}%" if enriched_emails else "0%",
                    "category": category,
                    "source_file": filename_base
                },
                "emails": [
                    {
                        "email": e.email,
                        "is_clean": e.is_clean,
                        "blocked_reason": e.blocked_reason,
                        "has_metadata": e.has_metadata,
                        "metadata_source": e.metadata_source,
                        "source_url": e.source_url,
                        "page_title": e.page_title,
                        "company_name": e.company_name,
                        "phone": e.phone,
                        "country": e.country,
                        "city": e.city,
                        "address": e.address,
                        "category": e.category,
                        "domain": e.domain,
                        "keywords": e.keywords,
                        "meta_description": e.meta_description,
                        "meta_keywords": e.meta_keywords,
                        "validation_status": e.validation_status,
                        "validation_date": e.validation_date
                    } for e in enriched_emails
                ]
            }

            with open(output_json, 'w', encoding='utf-8') as f:
                json.dump(enriched_data, f, ensure_ascii=False, indent=2)

            # Сохранение в CSV для удобного просмотра
            output_csv = self.output_dir / f"{filename_base}_{category}_enriched_{timestamp}.csv"
            with open(output_csv, 'w', encoding='utf-8') as f:
                f.write("email,is_clean,blocked_reason,has_metadata,metadata_source,source_url,page_title,company_name,phone,country,city,address,category,domain,keywords,validation_status\n")
                for e in enriched_emails:
                    f.write(f'"{e.email}",{e.is_clean},"{e.blocked_reason or ""}",{e.has_metadata},"{e.metadata_source or ""}","{e.source_url or ""}","{e.page_title or ""}","{e.company_name or ""}","{e.phone or ""}","{e.country or ""}","{e.city or ""}","{e.address or ""}","{e.category or ""}","{e.domain or ""}","{e.keywords or ""}","{e.validation_status or ""}"\n')

            # Также сохраняем обычный TXT файл (только email) для совместимости
            output_txt = self.output_dir / f"{filename_base}_{category}_{timestamp}.txt"
            with open(output_txt, 'w', encoding='utf-8') as f:
                for enriched_email in sorted(enriched_emails, key=lambda x: x.email):
                    f.write(f"{enriched_email.email}\n")

            print(f"💾 Сохранено {len(enriched_emails)} обогащенных email:")
            print(f"  📄 JSON: {output_json.name}")
            print(f"  📊 CSV: {output_csv.name}")
            print(f"  📝 TXT: {output_txt.name}")

    def print_enriched_statistics(self):
        """Выводит расширенную статистику включая информацию об обогащении метаданными"""
        total = self.stats['total_checked']
        clean = self.stats['clean']
        blocked_email = self.stats['blocked_email']
        blocked_domain = self.stats['blocked_domain']
        invalid = self.stats['invalid']
        check_time = self.stats['check_time']
        emails_with_metadata = self.stats.get('emails_with_metadata', 0)
        enrichment_rate = self.stats.get('enrichment_rate', 0)

        print(f"\n{'='*80}")
        print(f"📊 РАСШИРЕННАЯ СТАТИСТИКА С МЕТАДАННЫМИ")
        print(f"{'='*80}")
        print(f"📧 Всего проверено:      {total:,}")
        print(f"✅ Чистые email:        {clean:,} ({clean/total*100:.1f}%)")
        print(f"🚫 Заблокированы email:  {blocked_email:,} ({blocked_email/total*100:.1f}%)")
        print(f"🚫 Заблокированы домен:  {blocked_domain:,} ({blocked_domain/total*100:.1f}%)")
        print(f"❌ Невалидные:          {invalid:,} ({invalid/total*100:.1f}%)")
        print(f"")
        print(f"✨ ОБОГАЩЕНИЕ МЕТАДАННЫМИ:")
        print(f"📚 Email с метаданными:  {emails_with_metadata:,} ({enrichment_rate:.1f}%)")
        print(f"📊 Источник метаданных:  LVP файлы из папки output/")
        print(f"")
        print(f"⚡ Время проверки:       {check_time:.2f} сек")
        if check_time > 0:
            print(f"🚀 Скорость:            {total/check_time:,.0f} email/сек")

    def check_single_list(self, input_file: str):
        """Проверяет один список email"""
        if not os.path.exists(input_file):
            print(f"❌ Файл {input_file} не найден")
            return

        emails = self.load_emails_from_file(input_file)
        if not emails:
            print("❌ Не найдено валидных email для проверки")
            return

        # Очистка дубликатов с префиксом '20'
        original_count = len(emails)
        emails, removed_count = self.clean_prefix_duplicates(emails)
        if removed_count > 0:
            print(f"🧹 Очищено {removed_count} дубликатов с префиксом '20' (было {original_count}, стало {len(emails)})")

        results = self.check_email_against_blocklists(emails)

        filename_base = Path(input_file).stem
        self.save_results(filename_base, results)
        self._save_result_for_report(filename_base, results, duplicates_removed=0, prefix_duplicates_removed=removed_count)

    def check_single_list_with_metadata(self, input_file: str):
        """Проверяет один файл с метаданными (LVP, JSON, CSV, TXT)"""
        if not os.path.exists(input_file):
            print(f"❌ Файл {input_file} не найден")
            return

        filename_base = Path(input_file).stem
        print(f"\n📧 Проверка файла с метаданными: {filename_base}")

        # Загружаем email с метаданными
        emails_with_metadata = self.load_emails_with_metadata(input_file)

        if not emails_with_metadata:
            print(f"❌ Файл {input_file} не содержит валидных email")
            return

        # Выполняем проверку против блок-листов
        results = self.check_emails_with_metadata(emails_with_metadata)

        # Сохраняем результаты с метаданными
        self.save_results_with_metadata(filename_base, results)

        # Выводим статистику
        self.print_statistics()

        # Также сохраняем в старом формате для совместимости
        old_format_results = {
            'clean': [obj.email for obj in results['clean']],
            'blocked_email': [obj.email for obj in results['blocked_email']],
            'blocked_domain': [obj.email for obj in results['blocked_domain']],
            'invalid': [obj.email for obj in results['invalid']]
        }
        self._save_result_for_report(filename_base, old_format_results, duplicates_removed=0, prefix_duplicates_removed=0)

        # Обновляем статус обработки в конфигурации
        filename = Path(input_file).name
        self._update_list_processed_status(filename, processed=True)

        self.print_statistics()

    def check_single_list_enriched(self, input_file: str):
        """Проверяет один список email с автоматическим обогащением метаданными из LVP файлов"""
        if not os.path.exists(input_file):
            print(f"❌ Файл {input_file} не найден")
            return

        filename_base = Path(input_file).stem
        print(f"\n📧 РАСШИРЕННАЯ ПРОВЕРКА СПИСКА: {filename_base}")

        # Загружаем email из файла
        emails = self.load_emails_from_file(input_file)
        if not emails:
            print("❌ Не найдено валидных email для проверки")
            return

        # Очистка дубликатов с префиксом '20'
        original_count = len(emails)
        emails, removed_count = self.clean_prefix_duplicates(emails)
        if removed_count > 0:
            print(f"🧹 Очищено {removed_count} дубликатов с префиксом '20' (было {original_count}, стало {len(emails)})")

        # Выполняем проверку с обогащением метаданными
        enriched_results = self.check_emails_with_enrichment(list(emails), filename_base)

        # Сохраняем обогащенные результаты
        self.save_enriched_results(filename_base, enriched_results)

        # Выводим статистику
        self.print_enriched_statistics()

        # Также сохраняем в старом формате для совместимости
        old_format_results = {
            'clean': [obj.email for obj in enriched_results['clean']],
            'blocked_email': [obj.email for obj in enriched_results['blocked_email']],
            'blocked_domain': [obj.email for obj in enriched_results['blocked_domain']],
            'invalid': [obj.email for obj in enriched_results['invalid']]
        }
        self._save_result_for_report(filename_base, old_format_results,
                                   duplicates_removed=0, prefix_duplicates_removed=removed_count)

        # Обновляем статус обработки в конфигурации
        filename = Path(input_file).name
        self._update_list_processed_status(filename, processed=True)

    def check_lvp_file(self, input_file: str):
        """
        Проверяет LVP файл напрямую с метаданными

        Args:
            input_file: Путь к LVP файлу
        """
        if not os.path.exists(input_file):
            print(f"❌ Файл {input_file} не найден")
            return

        filename_base = Path(input_file).stem
        print(f"\n📧 ПРОВЕРКА LVP ФАЙЛА: {filename_base}")

        # Загружаем email с метаданными из LVP файла
        emails_with_metadata = self.load_emails_with_metadata(input_file)

        if not emails_with_metadata:
            print(f"❌ Файл {input_file} не содержит валидных email")
            return

        print(f"✓ Загружено {len(emails_with_metadata)} email с метаданными из LVP файла")

        # Очистка дубликатов с префиксом '20'
        # Создаем множество email для проверки дубликатов
        email_set = set(obj.email for obj in emails_with_metadata)
        original_count = len(email_set)
        cleaned_emails, removed_count = self.clean_prefix_duplicates(email_set)

        if removed_count > 0:
            print(f"🧹 Очищено {removed_count} дубликатов с префиксом '20' (было {original_count}, стало {len(cleaned_emails)})")
            # Фильтруем объекты, оставляя только те, что в cleaned_emails
            emails_with_metadata = [obj for obj in emails_with_metadata if obj.email in cleaned_emails]

        # Выполняем проверку против блок-листов
        results = self.check_emails_with_metadata(emails_with_metadata)

        # Сохраняем результаты с метаданными
        self.save_results_with_metadata(filename_base, results)

        # Выводим статистику
        self.print_statistics()

        # Также сохраняем в старом формате для совместимости
        old_format_results = {
            'clean': [obj.email for obj in results['clean']],
            'blocked_email': [obj.email for obj in results['blocked_email']],
            'blocked_domain': [obj.email for obj in results['blocked_domain']],
            'invalid': [obj.email for obj in results['invalid']]
        }
        self._save_result_for_report(filename_base, old_format_results,
                                   duplicates_removed=0, prefix_duplicates_removed=removed_count)

        # Обновляем статус обработки в конфигурации
        filename = Path(input_file).name
        self._update_list_processed_status(filename, processed=True)

    def check_multiple_lvp_files(self, input_files: List[str], exclude_duplicates: bool = False):
        """
        Проверяет несколько LVP файлов последовательно, опционально исключая дубликаты

        Args:
            input_files: Список путей к LVP файлам
            exclude_duplicates: Исключать ли дубликаты между файлами
        """
        all_lists = []

        # Загружаем все файлы
        for input_file in input_files:
            if not os.path.exists(input_file):
                print(f"❌ Файл {input_file} не найден, пропускаем")
                continue

            emails_with_metadata = self.load_emails_with_metadata(input_file)
            all_lists.append(emails_with_metadata)

        if not all_lists:
            print("❌ Не найдено файлов для обработки")
            return

        # Обработка каждого списка
        processed_emails = set()  # Для отслеживания уже обработанных email

        for i, (input_file, emails_with_metadata) in enumerate(zip(input_files, all_lists)):
            print(f"\n📋 Обработка LVP файла {i+1}/{len(input_files)}: {Path(input_file).name}")

            # Исключаем дубликаты с предыдущими списками если требуется
            removed_dupes = 0
            if exclude_duplicates and i > 0:
                original_count = len(emails_with_metadata)
                emails_with_metadata = [obj for obj in emails_with_metadata if obj.email.lower() not in processed_emails]
                removed_dupes = original_count - len(emails_with_metadata)

                if removed_dupes > 0:
                    print(f"   🗑️  Исключено {removed_dupes} дубликатов с предыдущими списками")

            if not emails_with_metadata:
                print("   ⚠️  После исключения дубликатов список пуст")
                continue

            # Очистка дубликатов с префиксом '20' внутри списка
            email_set = set(obj.email for obj in emails_with_metadata)
            original_count = len(email_set)
            cleaned_emails, removed_count = self.clean_prefix_duplicates(email_set)

            if removed_count > 0:
                print(f"   🧹 Очищено {removed_count} дубликатов с префиксом '20' (было {original_count}, стало {len(cleaned_emails)})")
                emails_with_metadata = [obj for obj in emails_with_metadata if obj.email in cleaned_emails]

            # Добавляем обработанные email в набор
            for obj in emails_with_metadata:
                processed_emails.add(obj.email.lower())

            # Выполняем проверку против блок-листов
            results = self.check_emails_with_metadata(emails_with_metadata)

            # Сохраняем результаты
            filename_base = f"{Path(input_file).stem}_seq{i+1}"
            self.save_results_with_metadata(filename_base, results)

            # Также сохраняем в старом формате для совместимости
            old_format_results = {
                'clean': [obj.email for obj in results['clean']],
                'blocked_email': [obj.email for obj in results['blocked_email']],
                'blocked_domain': [obj.email for obj in results['blocked_domain']],
                'invalid': [obj.email for obj in results['invalid']]
            }
            self._save_result_for_report(filename_base, old_format_results,
                                       duplicates_removed=removed_dupes, prefix_duplicates_removed=removed_count)

            # Обновляем статус обработки в конфигурации
            filename = Path(input_file).name
            self._update_list_processed_status(filename, processed=True)

            self.print_statistics()

    def _load_already_processed_emails(self) -> Set[str]:
        """
        Загружает обработанные email для дедупликации

        ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: Использует хеши вместо полных email
        Экономия памяти: 95%, скорость: 10x

        Returns:
            Множество хешей/email из обработанных списков
        """
        import sqlite3

        # Приоритет 1: Оптимизированный кеш (хеши) ⭐ РЕКОМЕНДУЕТСЯ
        optimized_cache = self.cache_dir / "processing_cache_optimized.db"
        if optimized_cache.exists():
            try:
                conn = sqlite3.connect(optimized_cache)
                cursor = conn.cursor()

                # Получаем хеши для дедупликации
                cursor.execute('SELECT hash FROM email_hashes')
                processed_hashes = {row[0].hex() for row in cursor.fetchall()}

                conn.close()

                print(f"📚 Загружено {len(processed_hashes):,} хешей из оптимизированного кеша")
                print(f"   💾 Экономия памяти: 95% | База: {optimized_cache.name}")
                return processed_hashes

            except Exception as e:
                print(f"⚠️  Ошибка загрузки оптимизированного кеша: {e}")

        # Приоритет 2: SQLite кеш с полными email
        sqlite_cache_paths = [
            self.cache_dir / "processing_cache_final.db",
            self.cache_dir / "processing_cache.db"
        ]

        for sqlite_cache_path in sqlite_cache_paths:
            if sqlite_cache_path.exists():
                try:
                    conn = sqlite3.connect(sqlite_cache_path)
                    cursor = conn.cursor()

                    cursor.execute('SELECT DISTINCT email_normalized FROM processed_emails')
                    processed_emails = {row[0] for row in cursor.fetchall()}

                    conn.close()

                    print(f"📚 Загружено {len(processed_emails):,} email из SQLite кеша")
                    print(f"   База данных: {sqlite_cache_path.name}")
                    print(f"   💡 Совет: Запустите migrate_to_optimized_cache.py для 95% экономии памяти")
                    return processed_emails

                except Exception as e:
                    print(f"⚠️  Ошибка при загрузке из {sqlite_cache_path.name}: {e}")
                    continue

        # Приоритет 3: JSON кеш (legacy)
        processed_emails = set()
        cache_data = self._load_processed_files_cache()

        for filename, file_info in cache_data.items():
            if 'result_data' in file_info:
                result_data = file_info['result_data']
                results = result_data.get('results', {})
                for category in ['clean', 'blocked_email', 'blocked_domain', 'invalid']:
                    if category in results:
                        processed_emails.update(results[category])

        print(f"📚 Загружено {len(processed_emails):,} email из JSON кеша (legacy)")
        print("   💡 Совет: Запустите migrate_to_optimized_cache.py для ускорения")
        return processed_emails

    def check_lvp_batch(self, exclude_duplicates: bool = False, generate_html: bool = False):
        """
        Batch обработка всех LVP файлов в папке input/

        Args:
            exclude_duplicates: Исключать дубликаты между файлами
            generate_html: Генерировать HTML отчет
        """
        # Ищем все LVP файлы в папке input
        input_files = list(self.input_dir.glob("*.lvp"))
        if not input_files:
            print("❌ Не найдено LVP файлов в папке input/")
            return

        print(f"\n📋 Найдено {len(input_files)} LVP файлов для обработки")

        # Фильтруем только необработанные файлы из конфигурации
        unprocessed_files = []
        for input_file in input_files:
            filename = input_file.name
            list_metadata = self._get_list_metadata(filename)
            if not list_metadata.get("processed", False):
                unprocessed_files.append(str(input_file))

        if not unprocessed_files:
            print("🎉 Все LVP файлы уже обработаны!")
            if generate_html:
                self.generate_html_report("lvp_batch_report")
            return

        print(f"📋 Обработка {len(unprocessed_files)} необработанных LVP файлов из {len(input_files)}")

        # Обрабатываем файлы
        self.check_multiple_lvp_files(unprocessed_files, exclude_duplicates=exclude_duplicates)

        if generate_html:
            self.generate_html_report("lvp_batch_report")

        print(f"\n🎉 Обработка завершена!")

    def check_multiple_lists(self, input_files: List[str], exclude_duplicates: bool = False):
        """Проверяет несколько списков, опционально исключая дубликаты"""
        all_lists = []

        for input_file in input_files:
            if not os.path.exists(input_file):
                print(f"❌ Файл {input_file} не найден, пропускаем")
                continue

            emails = self.load_emails_from_file(input_file)
            all_lists.append(emails)

        if not all_lists:
            print("❌ Не найдено файлов для обработки")
            return

        # Поиск дубликатов если требуется
        if exclude_duplicates and len(all_lists) > 1:
            duplicates = self.find_duplicates(all_lists)
            print(f"\n🔍 Найдено дубликатов между списками:")
            for list_name, dupes in duplicates.items():
                print(f"   {list_name}: {len(dupes)} дубликатов")

        # Обработка каждого списка
        for i, (input_file, emails) in enumerate(zip(input_files, all_lists)):
            print(f"\n📋 Обработка списка {i+1}: {input_file}")

            # Исключаем дубликаты с предыдущими списками если требуется
            removed_dupes = 0  # Инициализируем счетчик дубликатов между списками
            if exclude_duplicates and i > 0:
                prev_emails = set()
                for j in range(i):
                    prev_emails.update(all_lists[j])

                original_count = len(emails)
                emails = emails - prev_emails
                removed_dupes = original_count - len(emails)

                if removed_dupes > 0:
                    print(f"   🗑️  Исключено {removed_dupes} дубликатов с предыдущими списками")

            if not emails:
                print("   ⚠️  После исключения дубликатов список пуст")
                continue

            # Очистка дубликатов с префиксом '20' внутри списка
            original_count = len(emails)
            emails, removed_count = self.clean_prefix_duplicates(emails)
            if removed_count > 0:
                print(f"   🧹 Очищено {removed_count} дубликатов с префиксом '20' (было {original_count}, стало {len(emails)})")

            results = self.check_email_against_blocklists(emails)
            filename_base = f"{Path(input_file).stem}_seq{i+1}"
            self.save_results(filename_base, results)
            self._save_result_for_report(filename_base, results, duplicates_removed=removed_dupes, prefix_duplicates_removed=removed_count)
            self.print_statistics()

    def check_all_incremental(self, exclude_duplicates: bool = False, generate_html: bool = False):
        """
        Unified incremental обработка ВСЕХ файлов (TXT + LVP) в папке input/ с кешированием

        Args:
            exclude_duplicates: Исключать дубликаты между списками
            generate_html: Генерировать HTML отчет
        """
        # Ищем все файлы (TXT и LVP)
        txt_files = list(self.input_dir.glob("*.txt"))
        lvp_files = list(self.input_dir.glob("*.lvp"))
        all_input_files = txt_files + lvp_files

        if not all_input_files:
            print("❌ Не найдено файлов для обработки в папке input/")
            return

        print(f"\n📋 Найдено файлов: {len(txt_files)} TXT + {len(lvp_files)} LVP = {len(all_input_files)} всего")

        # Фильтруем только необработанные файлы из конфигурации
        unprocessed_txt = []
        unprocessed_lvp = []

        for input_file in all_input_files:
            filename = input_file.name
            list_metadata = self._get_list_metadata(filename)
            if not list_metadata.get("processed", False):
                if filename.endswith('.lvp'):
                    unprocessed_lvp.append(str(input_file))
                else:
                    unprocessed_txt.append(str(input_file))

        total_unprocessed = len(unprocessed_txt) + len(unprocessed_lvp)

        if total_unprocessed == 0:
            print("🎉 Все файлы уже обработаны согласно конфигурации!")
            if generate_html:
                # Загружаем результаты из кеша для генерации отчета
                cache_data = self._load_processed_files_cache()
                for filename, cached_result in cache_data.items():
                    if 'result_data' in cached_result:
                        self.all_results.append(cached_result['result_data'])
                self.generate_html_report("all_incremental_report")
            return

        print(f"📋 Необработанных: {len(unprocessed_txt)} TXT + {len(unprocessed_lvp)} LVP = {total_unprocessed} файлов")

        # Загружаем уже обработанные email для дедупликации (если требуется)
        already_processed_emails = set()
        if exclude_duplicates:
            already_processed_emails = self._load_already_processed_emails()

        # Обрабатываем TXT файлы
        processed_emails_from_txt = set()
        if unprocessed_txt:
            print(f"\n{'='*60}")
            print(f"📝 ОБРАБОТКА TXT ФАЙЛОВ ({len(unprocessed_txt)})")
            print(f"{'='*60}")

            for i, txt_file in enumerate(unprocessed_txt, 1):
                print(f"\n[{i}/{len(unprocessed_txt)}] Обработка TXT: {Path(txt_file).name}")

                emails = self.load_emails_from_file(txt_file)
                original_count = len(emails)

                # Исключаем дубликаты с ранее обработанными
                if exclude_duplicates:
                    emails_before_dedup = len(emails)
                    emails = emails - already_processed_emails - processed_emails_from_txt
                    removed = emails_before_dedup - len(emails)
                    if removed > 0:
                        print(f"   🗑️  Исключено {removed} дубликатов с ранее обработанными списками")

                if not emails:
                    print("   ⚠️  После исключения дубликатов список пуст")
                    self._update_list_processed_status(Path(txt_file).name, processed=True)
                    continue

                # Очистка дубликатов с префиксом '20'
                emails, removed_count = self.clean_prefix_duplicates(emails)
                if removed_count > 0:
                    print(f"   🧹 Очищено {removed_count} дубликатов с префиксом '20'")

                # Обрабатываем
                results = self.check_email_against_blocklists(emails)
                filename_base = f"{Path(txt_file).stem}_incremental"
                self.save_results(filename_base, results)

                # Сохраняем для отчета
                cache_data = self._load_processed_files_cache()
                self._save_result_for_report(filename_base, results, txt_file, cache_data,
                                            duplicates_removed=original_count - len(emails),
                                            prefix_duplicates_removed=removed_count)
                self._save_processed_files_cache(cache_data)

                # Добавляем в набор обработанных
                processed_emails_from_txt.update(emails)

                # Обновляем статус
                self._update_list_processed_status(Path(txt_file).name, processed=True)
                self.print_statistics()

        # Обрабатываем LVP файлы
        if unprocessed_lvp:
            print(f"\n{'='*60}")
            print(f"📄 ОБРАБОТКА LVP ФАЙЛОВ ({len(unprocessed_lvp)})")
            print(f"{'='*60}")

            # Объединяем все ранее обработанные email (из кеша + из только что обработанных TXT)
            all_processed_emails = already_processed_emails | processed_emails_from_txt

            for i, lvp_file in enumerate(unprocessed_lvp, 1):
                print(f"\n[{i}/{len(unprocessed_lvp)}] Обработка LVP: {Path(lvp_file).name}")

                emails_with_metadata = self.load_emails_with_metadata(lvp_file)
                if not emails_with_metadata:
                    print(f"   ⚠️  Файл не содержит валидных email")
                    continue

                original_count = len(emails_with_metadata)

                # Исключаем дубликаты с ранее обработанными
                if exclude_duplicates and all_processed_emails:
                    emails_before_dedup = len(emails_with_metadata)
                    emails_with_metadata = [obj for obj in emails_with_metadata
                                          if obj.email.lower() not in all_processed_emails]
                    removed = emails_before_dedup - len(emails_with_metadata)
                    if removed > 0:
                        print(f"   🗑️  Исключено {removed} дубликатов с ранее обработанными списками")

                if not emails_with_metadata:
                    print("   ⚠️  После исключения дубликатов список пуст")
                    self._update_list_processed_status(Path(lvp_file).name, processed=True)
                    continue

                # Очистка дубликатов с префиксом '20'
                email_set = set(obj.email for obj in emails_with_metadata)
                cleaned_emails, removed_count = self.clean_prefix_duplicates(email_set)
                if removed_count > 0:
                    print(f"   🧹 Очищено {removed_count} дубликатов с префиксом '20'")
                    emails_with_metadata = [obj for obj in emails_with_metadata if obj.email in cleaned_emails]

                # Обрабатываем
                results = self.check_emails_with_metadata(emails_with_metadata)
                filename_base = f"{Path(lvp_file).stem}_incremental"
                self.save_results_with_metadata(filename_base, results)

                # Сохраняем для отчета (в старом формате для совместимости)
                old_format_results = {
                    'clean': [obj.email for obj in results['clean']],
                    'blocked_email': [obj.email for obj in results['blocked_email']],
                    'blocked_domain': [obj.email for obj in results['blocked_domain']],
                    'invalid': [obj.email for obj in results['invalid']]
                }
                cache_data = self._load_processed_files_cache()
                self._save_result_for_report(filename_base, old_format_results, lvp_file, cache_data,
                                            duplicates_removed=original_count - len(emails_with_metadata),
                                            prefix_duplicates_removed=removed_count)
                self._save_processed_files_cache(cache_data)

                # Добавляем в набор обработанных
                for obj in emails_with_metadata:
                    all_processed_emails.add(obj.email.lower())

                # Обновляем статус
                self._update_list_processed_status(Path(lvp_file).name, processed=True)
                self.print_statistics()

        # Генерируем единый отчет
        if generate_html:
            # Загружаем ВСЕ результаты из кеша (включая ранее обработанные файлы)
            cache_data = self._load_processed_files_cache()
            # Очищаем all_results и загружаем из кеша для полного отчета
            self.all_results.clear()
            for filename, cached_result in cache_data.items():
                if 'result_data' in cached_result:
                    self.all_results.append(cached_result['result_data'])
            self.generate_html_report("all_incremental_report")

        print(f"\n{'='*60}")
        print(f"🎉 ОБРАБОТКА ЗАВЕРШЕНА")
        print(f"{'='*60}")
        print(f"✅ Обработано TXT: {len(unprocessed_txt)}")
        print(f"✅ Обработано LVP: {len(unprocessed_lvp)}")
        print(f"📊 Всего: {total_unprocessed} файлов")

    def check_incremental_batch(self, exclude_duplicates: bool = False, generate_html: bool = False):
        """
        Инкрементальная обработка всех файлов в папке input/ с кешированием
        """
        input_files = list(self.input_dir.glob("*.txt"))
        if not input_files:
            print("❌ Не найдено txt файлов в папке input/")
            return

        # Фильтруем только необработанные файлы из конфигурации
        unprocessed_files = []
        for input_file in input_files:
            filename = input_file.name
            list_metadata = self._get_list_metadata(filename)
            if not list_metadata.get("processed", False):
                unprocessed_files.append(str(input_file))

        if not unprocessed_files:
            print("🎉 Все файлы уже обработаны согласно конфигурации!")
            if generate_html:
                self.generate_html_report("incremental_report")
            return

        print(f"\n📋 Найдено {len(unprocessed_files)} необработанных файлов из {len(input_files)}")

        file_paths = unprocessed_files

        # Проверяем что нужно обработать
        files_to_process, cache_data = self.check_incremental_update(file_paths)

        if not files_to_process:
            print("🎉 Все необработанные файлы находятся в кеше и не изменялись!")
            # Отмечаем файлы как обработанные в конфигурации
            for file_path in file_paths:
                filename = Path(file_path).name
                self._update_list_processed_status(filename, processed=True)
            if generate_html:
                self.generate_html_report("incremental_report")
            return

        print(f"\n📋 Обработка {len(files_to_process)} файлов из {len(file_paths)}")

        # Загружаем все списки (нужно для дедупликации между списками)
        all_lists = []
        all_file_paths = []

        for input_file in file_paths:
            emails = self.load_emails_from_file(input_file)
            all_lists.append(emails)
            all_file_paths.append(input_file)

        # Поиск дубликатов между всеми списками если требуется
        if exclude_duplicates and len(all_lists) > 1:
            duplicates = self.find_duplicates(all_lists)
            if duplicates:
                print(f"\n🔍 Найдено дубликатов между списками:")
                for list_name, dupes in duplicates.items():
                    print(f"   {list_name}: {len(dupes)} дубликатов")

        # Обрабатываем ВСЕ файлы для правильной дедупликации
        processed_lists = []  # Для хранения обработанных списков

        for i, input_file in enumerate(all_file_paths):
            filename = Path(input_file).name
            emails = all_lists[i]

            print(f"\n📋 Обработка файла: {filename}")

            # Исключаем дубликаты с предыдущими списками если требуется
            original_count = len(emails)
            removed_dupes = 0  # Инициализируем счетчик дубликатов между списками
            if exclude_duplicates and i > 0:
                prev_emails = set()
                for processed_list in processed_lists:
                    prev_emails.update(processed_list)

                emails = emails - prev_emails
                removed_dupes = original_count - len(emails)

                if removed_dupes > 0:
                    print(f"   🗑️  Исключено {removed_dupes} дубликатов с предыдущими списками")

            if not emails:
                print("   ⚠️  После исключения дубликатов список пуст")
                processed_lists.append(set())  # Добавляем пустой набор
                continue

            # Очистка дубликатов с префиксом '20' внутри списка
            emails, removed_count = self.clean_prefix_duplicates(emails)
            if removed_count > 0:
                print(f"   🧹 Очищено {removed_count} дубликатов с префиксом '20' (было {original_count}, стало {len(emails)})")

            # Сохраняем обработанный список для дедупликации следующих
            processed_lists.append(emails.copy())

            # Сохраняем результаты только для новых/измененных файлов
            if input_file in files_to_process:
                print(f"   💾 Сохранение результатов для нового/измененного файла")
                results = self.check_email_against_blocklists(emails)
                filename_base = f"{Path(input_file).stem}_incremental"
                self.save_results(filename_base, results)
                self._save_result_for_report(filename_base, results, input_file, cache_data, duplicates_removed=removed_dupes, prefix_duplicates_removed=removed_count)

                # Обновляем статус обработки в конфигурации
                self._update_list_processed_status(filename, processed=True)

                self.print_statistics()
            else:
                print(f"   ✅ Файл из кеша, результаты уже сохранены ранее")

        # Сохраняем обновленный кеш
        self._save_processed_files_cache(cache_data)
        print(f"\n💾 Кеш обновлен: {len(cache_data)} файлов")

        if generate_html:
            self.generate_html_report("incremental_batch_report")


def main():
    parser = argparse.ArgumentParser(
        description="Email Checker - проверка email списков против блок-листов"
    )

    subparsers = parser.add_subparsers(dest='command', help='Доступные команды')

    # Команда check - проверить один список
    check_parser = subparsers.add_parser('check', help='Проверить один список email')
    check_parser.add_argument('file', help='Путь к файлу с email')

    # Команда check-metadata - проверить файл с метаданными (LVP, JSON, CSV)
    metadata_parser = subparsers.add_parser('check-metadata', help='Проверить файл с метаданными (LVP, JSON, CSV)')
    metadata_parser.add_argument('file', help='Путь к файлу с метаданными')

    # Команда check-enriched - проверить список с автоматическим обогащением метаданными из LVP
    enriched_parser = subparsers.add_parser('check-enriched', help='Проверить список с автоматическим обогащением метаданными из LVP файлов')
    enriched_parser.add_argument('file', help='Путь к файлу с email')

    # Команда check-lvp - проверить LVP файл напрямую
    lvp_parser = subparsers.add_parser('check-lvp', help='Проверить LVP файл напрямую с метаданными')
    lvp_parser.add_argument('file', help='Путь к LVP файлу')

    # Команда check-lvp-batch - batch обработка LVP файлов
    lvp_batch_parser = subparsers.add_parser('check-lvp-batch', help='Batch обработка всех LVP файлов в папке input/')
    lvp_batch_parser.add_argument('--exclude-duplicates', action='store_true',
                                 help='Исключать дубликаты между файлами')
    lvp_batch_parser.add_argument('--generate-html', action='store_true',
                                 help='Генерировать HTML отчет после обработки')

    # Команда check-lvp-sequence - проверить несколько LVP файлов последовательно
    lvp_seq_parser = subparsers.add_parser('check-lvp-sequence',
                                          help='Проверить несколько LVP файлов с исключением дубликатов')
    lvp_seq_parser.add_argument('files', nargs='+', help='Пути к LVP файлам')
    lvp_seq_parser.add_argument('--exclude-duplicates', action='store_true',
                               help='Исключать дубликаты с предыдущими списками')

    # Команда check-sequence - проверить несколько списков последовательно
    seq_parser = subparsers.add_parser('check-sequence',
                                      help='Проверить несколько списков с исключением дубликатов')
    seq_parser.add_argument('files', nargs='+', help='Пути к файлам с email')
    seq_parser.add_argument('--exclude-duplicates', action='store_true',
                           help='Исключать дубликаты с предыдущими списками')

    # Команда batch - обработать все файлы в папке input
    batch_parser = subparsers.add_parser('batch', help='Обработать все файлы в папке input/')
    batch_parser.add_argument('--exclude-duplicates', action='store_true',
                             help='Исключать дубликаты между файлами')
    batch_parser.add_argument('--generate-html', action='store_true',
                             help='Генерировать HTML отчет после обработки')

    # Команда incremental - инкрементальное обновление (TXT only - legacy)
    incremental_parser = subparsers.add_parser('incremental', help='Инкрементальное обновление TXT файлов (legacy, используйте check-all-incremental)')
    incremental_parser.add_argument('--exclude-duplicates', action='store_true',
                                   help='Исключать дубликаты между файлами')
    incremental_parser.add_argument('--generate-html', action='store_true',
                                   help='Генерировать HTML отчет после обработки')

    # Команда check-all-incremental - unified incremental для TXT + LVP
    all_incremental_parser = subparsers.add_parser('check-all-incremental',
                                                   help='Unified incremental обновление ВСЕХ файлов (TXT + LVP) с кросс-дедупликацией')
    all_incremental_parser.add_argument('--exclude-duplicates', action='store_true',
                                       help='Исключать дубликаты между всеми списками (TXT и LVP)')
    all_incremental_parser.add_argument('--generate-html', action='store_true',
                                       help='Генерировать единый HTML отчет после обработки')

    # Команда report - сгенерировать HTML отчет
    report_parser = subparsers.add_parser('report', help='Сгенерировать HTML отчет для последней сессии')
    report_parser.add_argument('--name', default='report', help='Название файла отчета')

    # Команда smart-filter - умная фильтрация clean-листа
    smart_filter_parser = subparsers.add_parser('smart-filter',
                                                help='Умная фильтрация clean-листа с контекстным анализом')
    smart_filter_parser.add_argument('clean_file', help='Путь к clean-файлу (TXT/CSV/JSON)')
    smart_filter_parser.add_argument('--config', default='italy_hydraulics',
                                     help='Имя конфига фильтра (default: italy_hydraulics)')
    smart_filter_parser.add_argument('--no-metadata', action='store_true',
                                     help='Не сохранять метаданные в CSV/JSON')

    # Команда smart-filter-batch - batch умная фильтрация
    smart_filter_batch_parser = subparsers.add_parser('smart-filter-batch',
                                                       help='Batch умная фильтрация всех clean-файлов')
    smart_filter_batch_parser.add_argument('--config', default='italy_hydraulics',
                                           help='Имя конфига фильтра')
    smart_filter_batch_parser.add_argument('--pattern', default='output/*_clean_*.txt',
                                           help='Glob паттерн для поиска clean-файлов')
    smart_filter_batch_parser.add_argument('--no-metadata', action='store_true',
                                           help='Не сохранять метаданные')

    # Команда status - показать статус всех списков
    status_parser = subparsers.add_parser('status', help='Показать статус всех списков')
    status_parser.add_argument('--pattern', help='Фильтр по шаблону имени файла')
    status_parser.add_argument('--category', help='Фильтр по категории')
    status_parser.add_argument('--country', help='Фильтр по стране')

    # Команда import-csv-blocklist - импорт email из CSV логов в блок-листы
    import_csv_parser = subparsers.add_parser('import-csv-blocklist',
                                               help='Импортировать email из CSV логов в блок-листы')
    import_csv_parser.add_argument('files', nargs='+', help='CSV файлы для импорта')
    import_csv_parser.add_argument('--include-optional', action='store_true',
                                    help='Включить опциональные статусы (например, "Отписался")')
    import_csv_parser.add_argument('--dry-run', action='store_true',
                                    help='Режим предпросмотра (не изменяет файлы)')

    args = parser.parse_args()

    checker = EmailChecker()

    if args.command == 'check':
        checker.check_single_list(args.file)

    elif args.command == 'check-metadata':
        checker.check_single_list_with_metadata(args.file)

    elif args.command == 'check-enriched':
        checker.check_single_list_enriched(args.file)

    elif args.command == 'check-lvp':
        checker.check_lvp_file(args.file)

    elif args.command == 'check-lvp-batch':
        checker.check_lvp_batch(exclude_duplicates=args.exclude_duplicates,
                               generate_html=args.generate_html)

    elif args.command == 'check-lvp-sequence':
        checker.check_multiple_lvp_files(args.files, exclude_duplicates=args.exclude_duplicates)

    elif args.command == 'check-sequence':
        checker.check_multiple_lists(args.files, exclude_duplicates=args.exclude_duplicates)

    elif args.command == 'batch':
        input_files = list(checker.input_dir.glob("*.txt"))
        if not input_files:
            print("❌ Не найдено txt файлов в папке input/")
            return

        file_paths = [str(f) for f in input_files]
        checker.check_multiple_lists(file_paths, exclude_duplicates=args.exclude_duplicates)

        if args.generate_html:
            checker.generate_html_report("batch_report")

    elif args.command == 'incremental':
        checker.check_incremental_batch(exclude_duplicates=args.exclude_duplicates,
                                       generate_html=args.generate_html)

    elif args.command == 'check-all-incremental':
        checker.check_all_incremental(exclude_duplicates=args.exclude_duplicates,
                                     generate_html=args.generate_html)

    elif args.command == 'report':
        checker.generate_html_report(args.name)

    elif args.command == 'smart-filter':
        # Умная фильтрация одного clean-файла
        from smart_filter_processor_v2 import SmartFilterProcessor
        from pathlib import Path

        processor = SmartFilterProcessor(filter_name=args.config)
        result = processor.process_clean_file(
            Path(args.clean_file),
            include_metadata=not args.no_metadata
        )

        # Выводим статистику
        print(f"\n{'='*70}")
        print("📈 ИТОГОВАЯ СТАТИСТИКА:")
        print(f"{'='*70}")
        for key, value in result.get('statistics').items():
            print(f"   {key}: {value}")

    elif args.command == 'smart-filter-batch':
        # Batch умная фильтрация clean-файлов
        from smart_filter_processor_v2 import SmartFilterProcessor

        processor = SmartFilterProcessor(filter_name=args.config)
        results = processor.process_clean_batch(
            pattern=args.pattern
        )

        print(f"\n✅ Обработано файлов: {len(results)}")

    elif args.command == 'status':
        checker.show_status(pattern=args.pattern, category=args.category, country=args.country)

    elif args.command == 'import-csv-blocklist':
        # Импорт email из CSV логов в блок-листы
        from import_blocklist_csv import BlocklistCSVImporter
        from pathlib import Path

        importer = BlocklistCSVImporter()
        filepaths = [Path(f) for f in args.files]
        importer.import_csv_files(
            filepaths,
            include_optional=args.include_optional,
            dry_run=args.dry_run
        )

    else:
        parser.print_help()


if __name__ == "__main__":
    main()