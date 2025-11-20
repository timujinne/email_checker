#!/usr/bin/env python3
"""
Валидация доменов перед парсингом метаданных

Проверяет существование доменов через:
1. DNS Lookup (A записи) - проверка резолва домена
2. HTTP/HTTPS проверка - наличие веб-сайта
3. Опционально: WHOIS проверка (требует установки python-whois)

Использование:
    python validate_domains.py output/POST_SOVIET_DOMAINS_NO_METADATA.txt
    python validate_domains.py output/POST_SOVIET_DOMAINS_NO_METADATA.txt --threads 50 --timeout 5
"""

import socket
import urllib.request
import urllib.error
import ssl
from pathlib import Path
from typing import Dict, List, Set, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import argparse
import time
import json

# Глобальные счетчики для статистики
stats = {
    'total': 0,
    'dns_ok': 0,
    'dns_fail': 0,
    'http_ok': 0,
    'https_ok': 0,
    'http_fail': 0,
    'timeout': 0,
    'errors': 0
}


class DomainValidator:
    """Валидатор доменов с проверкой DNS и HTTP/HTTPS"""

    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    def check_dns(self, domain: str) -> Tuple[bool, str]:
        """
        Проверка DNS записей домена

        Returns:
            (success, ip_address or error_message)
        """
        try:
            # Пытаемся резолвить домен
            ip = socket.gethostbyname(domain)
            return True, ip
        except socket.gaierror as e:
            return False, f"DNS error: {str(e)}"
        except socket.timeout:
            return False, "DNS timeout"
        except Exception as e:
            return False, f"Error: {str(e)}"

    def check_http(self, domain: str, protocol: str = 'http') -> Tuple[bool, int, str]:
        """
        Проверка HTTP/HTTPS доступности

        Returns:
            (success, status_code, message)
        """
        url = f"{protocol}://{domain}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=self.timeout, context=self.ssl_context) as response:
                status_code = response.getcode()
                return True, status_code, f"{protocol.upper()} OK"
        except urllib.error.HTTPError as e:
            # 4xx/5xx коды - сайт существует, но есть ошибка
            return True, e.code, f"{protocol.upper()} error: {e.code}"
        except urllib.error.URLError as e:
            return False, 0, f"{protocol.upper()} connection failed: {str(e.reason)}"
        except socket.timeout:
            return False, 0, f"{protocol.upper()} timeout"
        except Exception as e:
            return False, 0, f"{protocol.upper()} error: {str(e)}"

    def validate_domain(self, domain: str) -> Dict:
        """
        Полная валидация домена

        Returns:
            Dict с результатами проверки
        """
        result = {
            'domain': domain,
            'dns_ok': False,
            'ip_address': None,
            'http_ok': False,
            'https_ok': False,
            'http_status': 0,
            'https_status': 0,
            'message': '',
            'is_valid': False
        }

        # 1. DNS проверка
        dns_ok, dns_result = self.check_dns(domain)
        result['dns_ok'] = dns_ok

        if dns_ok:
            result['ip_address'] = dns_result
            stats['dns_ok'] += 1

            # 2. HTTP проверка
            http_ok, http_status, http_msg = self.check_http(domain, 'http')
            result['http_ok'] = http_ok
            result['http_status'] = http_status

            # 3. HTTPS проверка
            https_ok, https_status, https_msg = self.check_http(domain, 'https')
            result['https_ok'] = https_ok
            result['https_status'] = https_status

            if http_ok:
                stats['http_ok'] += 1
            if https_ok:
                stats['https_ok'] += 1

            # Домен валиден, если DNS OK и хотя бы один из протоколов доступен
            result['is_valid'] = http_ok or https_ok
            result['message'] = f"DNS: {dns_result}, HTTP: {http_status}, HTTPS: {https_status}"

            if not (http_ok or https_ok):
                stats['http_fail'] += 1
        else:
            result['message'] = dns_result
            stats['dns_fail'] += 1

        return result


def load_domains(file_path: str) -> List[str]:
    """Загружает список доменов из файла"""
    domains = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            domain = line.strip()
            if domain:
                domains.append(domain)
    return domains


def validate_domains_parallel(domains: List[str], max_workers: int = 20, timeout: int = 5) -> List[Dict]:
    """
    Параллельная валидация доменов

    Args:
        domains: Список доменов для проверки
        max_workers: Количество потоков
        timeout: Таймаут для каждого запроса (секунды)

    Returns:
        Список результатов валидации
    """
    validator = DomainValidator(timeout=timeout)
    results = []

    stats['total'] = len(domains)
    processed = 0
    start_time = time.time()

    print(f"\n🔍 Начинаем проверку {len(domains):,} доменов...")
    print(f"⚙️  Настройки: {max_workers} потоков, таймаут {timeout}s\n")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Запускаем проверку всех доменов
        future_to_domain = {
            executor.submit(validator.validate_domain, domain): domain
            for domain in domains
        }

        # Обрабатываем результаты по мере выполнения
        for future in as_completed(future_to_domain):
            domain = future_to_domain[future]
            processed += 1

            try:
                result = future.result()
                results.append(result)

                # Прогресс
                if processed % 100 == 0:
                    elapsed = time.time() - start_time
                    rate = processed / elapsed if elapsed > 0 else 0
                    eta = (len(domains) - processed) / rate if rate > 0 else 0

                    print(f"   [{processed:,}/{len(domains):,}] "
                          f"({processed/len(domains)*100:.1f}%) | "
                          f"DNS OK: {stats['dns_ok']} | "
                          f"HTTP: {stats['http_ok']} | "
                          f"HTTPS: {stats['https_ok']} | "
                          f"Rate: {rate:.1f}/s | "
                          f"ETA: {eta/60:.1f}m")

            except Exception as e:
                print(f"❌ Ошибка при проверке {domain}: {e}")
                stats['errors'] += 1
                results.append({
                    'domain': domain,
                    'dns_ok': False,
                    'is_valid': False,
                    'message': f'Error: {str(e)}'
                })

    elapsed = time.time() - start_time
    print(f"\n✅ Проверка завершена за {elapsed:.1f}s ({len(domains)/elapsed:.1f} доменов/сек)")

    return results


def save_results(results: List[Dict], output_dir: str = "output/domain_validation"):
    """Сохраняет результаты валидации в файлы"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Разделяем домены на категории
    valid_domains = []
    invalid_dns = []
    invalid_http = []

    for result in results:
        if result['is_valid']:
            valid_domains.append(result)
        elif not result['dns_ok']:
            invalid_dns.append(result)
        else:
            invalid_http.append(result)

    # 1. Валидные домены (TXT + JSON + CSV)
    valid_file = output_path / f"VALID_DOMAINS_{timestamp}.txt"
    with open(valid_file, 'w', encoding='utf-8') as f:
        for r in sorted(valid_domains, key=lambda x: x['domain']):
            f.write(f"{r['domain']}\n")
    print(f"\n💾 Валидные домены: {valid_file}")
    print(f"   Всего: {len(valid_domains):,}")

    # 2. Детальный JSON отчет
    json_file = output_path / f"VALIDATION_REPORT_{timestamp}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': timestamp,
            'stats': stats,
            'valid_domains': valid_domains,
            'invalid_dns': invalid_dns,
            'invalid_http': invalid_http
        }, f, indent=2, ensure_ascii=False)
    print(f"\n💾 JSON отчет: {json_file}")

    # 3. CSV отчет с деталями
    csv_file = output_path / f"VALIDATION_DETAILS_{timestamp}.csv"
    with open(csv_file, 'w', encoding='utf-8') as f:
        f.write("Domain,DNS_OK,IP_Address,HTTP_OK,HTTPS_OK,HTTP_Status,HTTPS_Status,Is_Valid,Message\n")
        for r in sorted(results, key=lambda x: (not x['is_valid'], x['domain'])):
            f.write(f"{r['domain']},"
                   f"{r['dns_ok']},"
                   f"{r.get('ip_address', '')},"
                   f"{r['http_ok']},"
                   f"{r['https_ok']},"
                   f"{r['http_status']},"
                   f"{r['https_status']},"
                   f"{r['is_valid']},"
                   f"\"{r['message']}\"\n")
    print(f"\n💾 CSV детали: {csv_file}")

    # 4. Невалидные домены (для анализа)
    if invalid_dns:
        invalid_dns_file = output_path / f"INVALID_DNS_{timestamp}.txt"
        with open(invalid_dns_file, 'w', encoding='utf-8') as f:
            for r in sorted(invalid_dns, key=lambda x: x['domain']):
                f.write(f"{r['domain']}\t{r['message']}\n")
        print(f"\n💾 Невалидные DNS: {invalid_dns_file}")
        print(f"   Всего: {len(invalid_dns):,}")

    if invalid_http:
        invalid_http_file = output_path / f"INVALID_HTTP_{timestamp}.txt"
        with open(invalid_http_file, 'w', encoding='utf-8') as f:
            for r in sorted(invalid_http, key=lambda x: x['domain']):
                f.write(f"{r['domain']}\t{r['message']}\n")
        print(f"\n💾 DNS OK, но HTTP недоступен: {invalid_http_file}")
        print(f"   Всего: {len(invalid_http):,}")


def print_statistics():
    """Выводит статистику проверки"""
    print("\n" + "="*80)
    print("📊 СТАТИСТИКА ВАЛИДАЦИИ ДОМЕНОВ")
    print("="*80)

    total = stats['total']
    valid = stats['dns_ok']
    invalid = stats['dns_fail']

    print(f"\nВсего доменов проверено:          {total:,}")
    print(f"\n✅ DNS валидация успешна:         {valid:,} ({valid/total*100:.1f}%)")
    print(f"❌ DNS валидация провалена:       {invalid:,} ({invalid/total*100:.1f}%)")

    print(f"\n🌐 HTTP доступны:                 {stats['http_ok']:,} ({stats['http_ok']/total*100:.1f}%)")
    print(f"🔒 HTTPS доступны:                {stats['https_ok']:,} ({stats['https_ok']/total*100:.1f}%)")
    print(f"❌ HTTP недоступны:               {stats['http_fail']:,} ({stats['http_fail']/total*100:.1f}%)")

    if stats['errors'] > 0:
        print(f"\n⚠️  Ошибки при проверке:          {stats['errors']:,}")

    print("="*80 + "\n")


def main():
    """Основная функция"""
    parser = argparse.ArgumentParser(
        description='Валидация доменов перед парсингом метаданных'
    )
    parser.add_argument(
        'input_file',
        help='Файл со списком доменов (один домен на строку)'
    )
    parser.add_argument(
        '--threads',
        type=int,
        default=50,
        help='Количество параллельных потоков (по умолчанию: 50)'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=5,
        help='Таймаут для каждого запроса в секундах (по умолчанию: 5)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Ограничить количество проверяемых доменов (для тестирования)'
    )
    parser.add_argument(
        '--output-dir',
        default='output/domain_validation',
        help='Директория для сохранения результатов'
    )

    args = parser.parse_args()

    print("="*80)
    print("🔍 ВАЛИДАЦИЯ ДОМЕНОВ")
    print("="*80)

    # Загружаем домены
    print(f"\n📂 Загружаем домены из: {args.input_file}")
    domains = load_domains(args.input_file)
    print(f"✅ Загружено: {len(domains):,} доменов")

    # Ограничение для тестирования
    if args.limit:
        domains = domains[:args.limit]
        print(f"⚠️  Ограничено до {args.limit} доменов для тестирования")

    # Валидация
    results = validate_domains_parallel(
        domains,
        max_workers=args.threads,
        timeout=args.timeout
    )

    # Статистика
    print_statistics()

    # Сохранение результатов
    save_results(results, args.output_dir)

    print("\n" + "="*80)
    print("✅ ВАЛИДАЦИЯ ЗАВЕРШЕНА!")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
