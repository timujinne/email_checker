import time
import json
from pathlib import Path
from datetime import datetime
from typing import Set, List, Tuple, Dict, Union
from collections import defaultdict

from .validation import EmailValidator
from .blocklist import BlocklistManager
from .config import ConfigManager
from .reporting import ReportGenerator
from .cache import CacheManager

# Import from root directory modules
import sys
sys.path.append(str(Path(__file__).parent.parent))
from email_metadata import EmailMetadataManager, EmailWithMetadata
from metadata_integration import MetadataIntegrator, EnrichedEmailResult

class EmailChecker:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.input_dir = self.base_dir / "input"
        self.blocklists_dir = self.base_dir / "blocklists"
        self.output_dir = self.base_dir / "output"
        self.cache_dir = self.base_dir / ".cache"
        self.cache_dir.mkdir(exist_ok=True)

        # Components
        self.validator = EmailValidator()
        self.blocklist_manager = BlocklistManager(self.blocklists_dir)
        self.config_manager = ConfigManager(self.base_dir)
        self.report_generator = ReportGenerator(self.output_dir)
        self.cache_manager = CacheManager(self.cache_dir)
        self.metadata_manager = EmailMetadataManager(str(self.base_dir))
        self.metadata_integrator = MetadataIntegrator(str(self.base_dir))

        # State
        self.stats = defaultdict(int)

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

                    normalized = self.validator.normalize_email(email)

                    if normalized:
                        emails.add(normalized)
                        if normalized != email:
                            normalized_count += 1
                    else:
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

    def check_email_against_blocklists(self, emails: Set[str]) -> Dict[str, List[str]]:
        """
        Проверяет email против блок-листов
        Возвращает словарь с категориями: clean, blocked_email, blocked_domain
        """
        self.blocklist_manager.load_blocklists()

        result = {
            'clean': [],
            'blocked_email': [],
            'blocked_domain': [],
            'invalid': []
        }

        print("🔍 Проверка email против блок-листов...")
        start_time = time.time()

        for email in emails:
            if not self.validator.is_valid_email(email):
                result['invalid'].append(email)
                continue

            domain = self.validator.get_domain(email)

            if self.blocklist_manager.is_blocked_email(email):
                result['blocked_email'].append(email)
            elif self.blocklist_manager.is_blocked_domain(domain):
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
        """
        print(f"\n🚀 РАСШИРЕННАЯ ПРОВЕРКА С ИНТЕГРАЦИЕЙ МЕТАДАННЫХ")
        print(f"📧 Список: {list_name}")
        print(f"📊 Email для проверки: {len(emails)}")

        # Шаг 1: Обогащаем email метаданными из LVP файлов
        enriched_emails = self.metadata_integrator.enrich_email_list(emails, list_name)

        # Шаг 2: Загружаем блок-листы
        self.blocklist_manager.load_blocklists()

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

            if not self.validator.is_valid_email(email):
                enriched_email.is_clean = False
                enriched_email.blocked_reason = "Invalid email format"
                result['invalid'].append(enriched_email)
                continue

            domain = self.validator.get_domain(email)

            if self.blocklist_manager.is_blocked_email(email):
                enriched_email.is_clean = False
                enriched_email.blocked_reason = "Email in blocklist"
                result['blocked_email'].append(enriched_email)
            elif self.blocklist_manager.is_blocked_domain(domain):
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
        """
        self.blocklist_manager.load_blocklists()

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

            if not self.validator.is_valid_email(email):
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

            domain = self.validator.get_domain(email)

            if self.blocklist_manager.is_blocked_email(email):
                result['blocked_email'].append(email_obj)
            elif self.blocklist_manager.is_blocked_domain(domain):
                result['blocked_domain'].append(email_obj)
            else:
                result['clean'].append(email_obj)

        check_time = time.time() - start_time

        # Сохраняем Invalid email в блок-лист
        if emails_to_block_from_status:
            self.blocklist_manager.save_blocked_emails_to_file(emails_to_block_from_status, reason="LVP status=Invalid")

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

    def check_single_list(self, input_file: str):
        """Проверяет один список email"""
        if not Path(input_file).exists():
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
        self.report_generator.save_results(filename_base, results)
        
        # Сохраняем результат для отчета
        result_data = {
            'filename': filename_base,
            'stats': dict(self.stats),
            'results': results,
            'duplicates_removed': 0,
            'prefix_duplicates_removed': removed_count,
            'timestamp': datetime.now().isoformat()
        }
        self.report_generator.add_result(result_data)

    def check_single_list_with_metadata(self, input_file: str):
        """Проверяет один файл с метаданными (LVP, JSON, CSV, TXT)"""
        if not Path(input_file).exists():
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
        
        result_data = {
            'filename': filename_base,
            'stats': dict(self.stats),
            'results': old_format_results,
            'duplicates_removed': 0,
            'prefix_duplicates_removed': 0,
            'timestamp': datetime.now().isoformat()
        }
        self.report_generator.add_result(result_data)

        # Обновляем статус обработки в конфигурации
        filename = Path(input_file).name
        self.config_manager.update_list_processed_status(filename, processed=True)

        self.print_statistics()

    def check_single_list_enriched(self, input_file: str):
        """Проверяет один список email с автоматическим обогащением метаданными из LVP файлов"""
        if not Path(input_file).exists():
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
        
        result_data = {
            'filename': filename_base,
            'stats': dict(self.stats),
            'results': old_format_results,
            'duplicates_removed': 0,
            'prefix_duplicates_removed': removed_count,
            'timestamp': datetime.now().isoformat()
        }
        self.report_generator.add_result(result_data)

        # Обновляем статус обработки в конфигурации
        filename = Path(input_file).name
        self.config_manager.update_list_processed_status(filename, processed=True)

    def save_results_with_metadata(self, filename_base: str, results: Dict[str, List[EmailWithMetadata]]):
        """Сохраняет результаты с метаданными в JSON и CSV форматах"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for category, emails_objs in results.items():
            if not emails_objs:
                continue

            # SAFETY NET: Дедупликация внутри категории по email адресу
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
            try:
                with open(output_txt, 'w', encoding='utf-8') as f:
                    for email_obj in sorted(emails_objs, key=lambda x: x.email):
                        f.write(f"{email_obj.email}\n")
            except Exception as e:
                print(f"❌ Ошибка при сохранении {output_txt}: {e}")

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

            try:
                with open(output_json, 'w', encoding='utf-8') as f:
                    json.dump(enriched_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"❌ Ошибка при сохранении {output_json}: {e}")

            # Сохранение в CSV для удобного просмотра
            output_csv = self.output_dir / f"{filename_base}_{category}_enriched_{timestamp}.csv"
            try:
                with open(output_csv, 'w', encoding='utf-8') as f:
                    f.write("email,is_clean,blocked_reason,has_metadata,metadata_source,source_url,page_title,company_name,phone,country,city,address,category,domain,keywords,validation_status\n")
                    for e in enriched_emails:
                        f.write(f'"{e.email}",{e.is_clean},"{e.blocked_reason or ""}",{e.has_metadata},"{e.metadata_source or ""}","{e.source_url or ""}","{e.page_title or ""}","{e.company_name or ""}","{e.phone or ""}","{e.country or ""}","{e.city or ""}","{e.address or ""}","{e.category or ""}","{e.domain or ""}","{e.keywords or ""}","{e.validation_status or ""}"\n')
            except Exception as e:
                print(f"❌ Ошибка при сохранении {output_csv}: {e}")

            # Также сохраняем обычный TXT файл (только email) для совместимости
            output_txt = self.output_dir / f"{filename_base}_{category}_{timestamp}.txt"
            try:
                with open(output_txt, 'w', encoding='utf-8') as f:
                    for enriched_email in sorted(enriched_emails, key=lambda x: x.email):
                        f.write(f"{enriched_email.email}\n")
            except Exception as e:
                print(f"❌ Ошибка при сохранении {output_txt}: {e}")

            print(f"💾 Сохранено {len(enriched_emails)} обогащенных email:")
            print(f"  📄 JSON: {output_json.name}")
            print(f"  📊 CSV: {output_csv.name}")
            print(f"  📝 TXT: {output_txt.name}")

    def clean_prefix_duplicates(self, emails: Set[str]) -> Tuple[Set[str], int]:
        """
        Очищает email с недопустимыми префиксами:
        1. Если существует версия БЕЗ префикса - удаляет дубликат С префиксом
        2. Если существует ТОЛЬКО версия С префиксом - нормализует её (убирает префикс)
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

        return cleaned_emails, removed_count + normalized_count

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
        if self.stats['check_time'] > 0:
            print(f"🚀 Скорость:            {total/self.stats['check_time']:,.0f} email/сек")

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

    def show_status(self, pattern: str = None, category: str = None, country: str = None):
        """Показывает статус всех списков с фильтрацией"""
        print("\n" + "="*80)
        print("📊 СТАТУС EMAIL СПИСКОВ")
        print("="*80)

        # Обновляем конфигурацию новыми файлами
        input_files = list(self.input_dir.glob("*.txt"))
        for file_path in input_files:
            filename = file_path.name
            self.config_manager.get_list_metadata(filename, self.output_dir)

        # Применяем фильтры
        lists_to_show = []
        for list_info in self.config_manager.lists_config.get("lists", []):
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

    def check_multiple_lists(self, input_files: List[str], exclude_duplicates: bool = False):
        """Проверяет несколько списков, опционально исключая дубликаты"""
        all_lists = []

        for input_file in input_files:
            if not Path(input_file).exists():
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
            self.report_generator.save_results(filename_base, results)
            
            result_data = {
                'filename': filename_base,
                'stats': dict(self.stats),
                'results': results,
                'duplicates_removed': removed_dupes,
                'prefix_duplicates_removed': removed_count,
                'timestamp': datetime.now().isoformat()
            }
            self.report_generator.add_result(result_data)
            
            self.print_statistics()

    def check_lvp_file(self, input_file: str):
        """
        Проверяет LVP файл напрямую с метаданными
        """
        if not Path(input_file).exists():
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
        
        result_data = {
            'filename': filename_base,
            'stats': dict(self.stats),
            'results': old_format_results,
            'duplicates_removed': 0,
            'prefix_duplicates_removed': removed_count,
            'timestamp': datetime.now().isoformat()
        }
        self.report_generator.add_result(result_data)

        # Обновляем статус обработки в конфигурации
        filename = Path(input_file).name
        self.config_manager.update_list_processed_status(filename, processed=True)

    def check_multiple_lvp_files(self, input_files: List[str], exclude_duplicates: bool = False):
        """
        Проверяет несколько LVP файлов последовательно, опционально исключая дубликаты
        """
        all_lists = []

        # Загружаем все файлы
        for input_file in input_files:
            if not Path(input_file).exists():
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
            
            result_data = {
                'filename': filename_base,
                'stats': dict(self.stats),
                'results': old_format_results,
                'duplicates_removed': removed_dupes,
                'prefix_duplicates_removed': removed_count,
                'timestamp': datetime.now().isoformat()
            }
            self.report_generator.add_result(result_data)

            # Обновляем статус обработки в конфигурации
            filename = Path(input_file).name
            self.config_manager.update_list_processed_status(filename, processed=True)

            self.print_statistics()

    def check_lvp_batch(self, exclude_duplicates: bool = False, generate_html: bool = False):
        """
        Batch обработка всех LVP файлов в папке input/
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
            list_metadata = self.config_manager.get_list_metadata(filename, self.output_dir)
            if not list_metadata.get("processed", False):
                unprocessed_files.append(str(input_file))

        if not unprocessed_files:
            print("🎉 Все LVP файлы уже обработаны!")
            if generate_html:
                self.report_generator.generate_html_report("lvp_batch_report")
            return

        print(f"📋 Обработка {len(unprocessed_files)} необработанных LVP файлов из {len(input_files)}")

        # Обрабатываем файлы
        self.check_multiple_lvp_files(unprocessed_files, exclude_duplicates=exclude_duplicates)

        if generate_html:
            self.report_generator.generate_html_report("lvp_batch_report")

        print(f"\n🎉 Обработка завершена!")

    def check_all_incremental(self, exclude_duplicates: bool = False, generate_html: bool = False):
        """
        Unified incremental обработка ВСЕХ файлов (TXT + LVP) в папке input/ с кешированием
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
            list_metadata = self.config_manager.get_list_metadata(filename, self.output_dir)
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
                cache_data = self.cache_manager.load_processed_files_cache()
                for filename, cached_result in cache_data.items():
                    if 'result_data' in cached_result:
                        self.report_generator.add_result(cached_result['result_data'])
                self.report_generator.generate_html_report("all_incremental_report")
            return

        print(f"📋 Необработанных: {len(unprocessed_txt)} TXT + {len(unprocessed_lvp)} LVP = {total_unprocessed} файлов")

        # Загружаем уже обработанные email для дедупликации (если требуется)
        already_processed_emails = set()
        if exclude_duplicates:
            already_processed_emails = self.cache_manager.load_already_processed_emails()

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
                    self.config_manager.update_list_processed_status(Path(txt_file).name, processed=True)
                    continue

                # Очистка дубликатов с префиксом '20'
                emails, removed_count = self.clean_prefix_duplicates(emails)
                if removed_count > 0:
                    print(f"   🧹 Очищено {removed_count} дубликатов с префиксом '20'")

                # Обрабатываем
                results = self.check_email_against_blocklists(emails)
                filename_base = f"{Path(txt_file).stem}_incremental"
                self.report_generator.save_results(filename_base, results)

                # Сохраняем для отчета
                result_data = {
                    'filename': filename_base,
                    'stats': dict(self.stats),
                    'results': results,
                    'duplicates_removed': original_count - len(emails),
                    'prefix_duplicates_removed': removed_count,
                    'timestamp': datetime.now().isoformat()
                }
                self.report_generator.add_result(result_data)
                
                # Update cache
                cache_data = self.cache_manager.load_processed_files_cache()
                filename_key = Path(txt_file).name
                cache_data[filename_key] = {
                    'hash': self.cache_manager.get_file_hash(txt_file),
                    'result_data': result_data,
                    'processed_at': datetime.now().isoformat()
                }
                self.cache_manager.save_processed_files_cache(cache_data)

                # Добавляем в набор обработанных
                processed_emails_from_txt.update(emails)

                # Обновляем статус
                self.config_manager.update_list_processed_status(Path(txt_file).name, processed=True)
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
                    self.config_manager.update_list_processed_status(Path(lvp_file).name, processed=True)
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
                
                result_data = {
                    'filename': filename_base,
                    'stats': dict(self.stats),
                    'results': old_format_results,
                    'duplicates_removed': original_count - len(emails_with_metadata),
                    'prefix_duplicates_removed': removed_count,
                    'timestamp': datetime.now().isoformat()
                }
                self.report_generator.add_result(result_data)
                
                # Update cache
                cache_data = self.cache_manager.load_processed_files_cache()
                filename_key = Path(lvp_file).name
                cache_data[filename_key] = {
                    'hash': self.cache_manager.get_file_hash(lvp_file),
                    'result_data': result_data,
                    'processed_at': datetime.now().isoformat()
                }
                self.cache_manager.save_processed_files_cache(cache_data)

                # Добавляем в набор обработанных
                for obj in emails_with_metadata:
                    all_processed_emails.add(obj.email.lower())

                # Обновляем статус
                self.config_manager.update_list_processed_status(Path(lvp_file).name, processed=True)
                self.print_statistics()

        # Генерируем единый отчет
        if generate_html:
            # Загружаем ВСЕ результаты из кеша (включая ранее обработанные файлы)
            cache_data = self.cache_manager.load_processed_files_cache()
            # Очищаем all_results и загружаем из кеша для полного отчета
            self.report_generator.all_results.clear()
            for filename, cached_result in cache_data.items():
                if 'result_data' in cached_result:
                    self.report_generator.add_result(cached_result['result_data'])
            self.report_generator.generate_html_report("all_incremental_report")

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
            list_metadata = self.config_manager.get_list_metadata(filename, self.output_dir)
            if not list_metadata.get("processed", False):
                unprocessed_files.append(str(input_file))

        if not unprocessed_files:
            print("🎉 Все файлы уже обработаны согласно конфигурации!")
            if generate_html:
                self.report_generator.generate_html_report("incremental_report")
            return

        print(f"\n📋 Найдено {len(unprocessed_files)} необработанных файлов из {len(input_files)}")

        file_paths = unprocessed_files
        
        # Check what needs processing
        cache_data = self.cache_manager.load_processed_files_cache()
        files_to_process = []
        
        print("🔍 Проверка инкрементального обновления...")

        for file_path in file_paths:
            file_path = str(file_path)
            current_hash = self.cache_manager.get_file_hash(file_path)
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
                if 'result_data' in cache_data[filename]:
                    self.report_generator.add_result(cache_data[filename]['result_data'])

        if not files_to_process:
            print("🎉 Все необработанные файлы находятся в кеше и не изменялись!")
            # Отмечаем файлы как обработанные в конфигурации
            for file_path in file_paths:
                filename = Path(file_path).name
                self.config_manager.update_list_processed_status(filename, processed=True)
            if generate_html:
                self.report_generator.generate_html_report("incremental_report")
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
                self.report_generator.save_results(filename_base, results)
                
                result_data = {
                    'filename': filename_base,
                    'stats': dict(self.stats),
                    'results': results,
                    'duplicates_removed': removed_dupes,
                    'prefix_duplicates_removed': removed_count,
                    'timestamp': datetime.now().isoformat()
                }
                self.report_generator.add_result(result_data)
                
                # Update cache
                filename_key = Path(input_file).name
                cache_data[filename_key] = {
                    'hash': self.cache_manager.get_file_hash(input_file),
                    'result_data': result_data,
                    'processed_at': datetime.now().isoformat()
                }

                # Обновляем статус обработки в конфигурации
                self.config_manager.update_list_processed_status(filename, processed=True)

                self.print_statistics()
            else:
                print(f"   ✅ Файл из кеша, результаты уже сохранены ранее")

        # Сохраняем обновленный кеш
        self.cache_manager.save_processed_files_cache(cache_data)
        print(f"\n💾 Кеш обновлен: {len(cache_data)} файлов")

        if generate_html:
            self.report_generator.generate_html_report("incremental_batch_report")
