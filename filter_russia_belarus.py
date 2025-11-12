#!/usr/bin/env python3
"""
Фильтр email для рассылок по российским, белорусским и СНГ компаниям.
Исключает европейские и украинские домены, а также уже отправленные письма.
Включает русскоязычные страны СНГ: Казахстан, Узбекистан, Таджикистан,
Кыргызстан, Туркменистан, Армения, Азербайджан, Молдова.
"""

import re
from pathlib import Path

# Европейские домены для ИСКЛЮЧЕНИЯ
EUROPEAN_DOMAINS = {
    '.uk', '.co.uk',        # Великобритания
    '.de',                  # Германия
    '.fr',                  # Франция
    '.it',                  # Италия
    '.es',                  # Испания
    '.nl',                  # Нидерланды
    '.pl',                  # Польша
    '.se',                  # Швеция
    '.no',                  # Норвегия
    '.fi',                  # Финляндия
    '.dk',                  # Дания
    '.at',                  # Австрия
    '.ch',                  # Швейцария
    '.be',                  # Бельгия
    '.pt',                  # Португалия
    '.cz',                  # Чехия
    '.sk',                  # Словакия
    '.eu',                  # Европейский Союз
    '.ee',                  # Эстония
    '.hr',                  # Хорватия
    '.bg',                  # Болгария
    '.rs',                  # Сербия
    '.gr',                  # Греция
    '.ie',                  # Ирландия
    '.hu',                  # Венгрия
    '.ro',                  # Румыния
    '.si',                  # Словения
    '.lt',                  # Литва
    '.lv',                  # Латвия
    '.lu',                  # Люксембург
    '.mt',                  # Мальта
    '.cy',                  # Кипр
    '.is',                  # Исландия
}

# ИСКЛЮЧАЕМ Украину
EXCLUDED_DOMAINS = {
    '.ua',                  # Украина - ИСКЛЮЧАЕМ
}

# Российские, белорусские и СНГ домены для СОХРАНЕНИЯ
# (остальные международные .com, .net, .org и т.д. тоже сохраняем)
RU_BY_CIS_DOMAINS = {
    '.ru', '.рф', '.su',    # Россия
    '.by', '.бел',          # Беларусь
    '.kz',                  # Казахстан
    '.uz',                  # Узбекистан
    '.tj',                  # Таджикистан
    '.kg',                  # Кыргызстан
    '.tm',                  # Туркменистан
    '.am',                  # Армения
    '.az',                  # Азербайджан
    '.md',                  # Молдова
}

def load_emails(file_path):
    """Загрузить список email из файла."""
    emails = set()
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and '@' in line:
                # Извлечь email (убрать стрелку если есть)
                email = line.split('→')[-1].strip()
                if email and '@' in email:
                    emails.add(email.lower())
    return emails

def get_domain(email):
    """Получить домен из email."""
    try:
        return email.split('@')[1].lower()
    except:
        return None

def is_european_domain(email):
    """Проверить, является ли домен европейским."""
    domain = get_domain(email)
    if not domain:
        return False

    # Проверяем все европейские домены
    for eu_domain in EUROPEAN_DOMAINS:
        if domain.endswith(eu_domain):
            return True
    return False

def is_excluded_domain(email):
    """Проверить, является ли домен исключенным (Украина и др.)."""
    domain = get_domain(email)
    if not domain:
        return False

    # Проверяем исключенные домены (UA и др.)
    for excl_domain in EXCLUDED_DOMAINS:
        if domain.endswith(excl_domain):
            return True
    return False

def is_allowed_domain(email):
    """Проверить, разрешен ли домен (не европейский и не исключенный)."""
    # Если это европейский домен или исключенный - НЕ разрешаем
    if is_european_domain(email):
        return False
    if is_excluded_domain(email):
        return False
    # Остальные разрешаем (международные + РФ/BY/СНГ)
    return True

def filter_emails(source_emails, exclude_emails):
    """Фильтровать email список."""
    # Исключаем уже отправленные
    remaining = source_emails - exclude_emails

    # Фильтруем европейские и исключенные домены
    filtered = set()
    excluded_european = set()
    excluded_ukraine = set()

    for email in remaining:
        if is_allowed_domain(email):
            filtered.add(email)
        elif is_excluded_domain(email):
            excluded_ukraine.add(email)
        else:
            excluded_european.add(email)

    return filtered, excluded_european, excluded_ukraine

def save_results(emails, output_path):
    """Сохранить результаты в файл."""
    # Сортируем для читаемости
    sorted_emails = sorted(emails)

    with open(output_path, 'w', encoding='utf-8') as f:
        for email in sorted_emails:
            f.write(f"{email}\n")

    return len(sorted_emails)

def main():
    # Пути к файлам
    input_file = Path(r'e:\Shtim\Downloads\ru-list.groovy')
    exclude_file = Path(r'e:\Shtim\Downloads\exclude.txt')
    output_file = Path(r'e:\Shtim\Downloads\ru-by-cis-filtered-list.txt')
    excluded_european_output = Path(r'e:\Shtim\Downloads\excluded-european.txt')
    excluded_ukraine_output = Path(r'e:\Shtim\Downloads\excluded-ukraine.txt')
    stats_file = Path(r'e:\Shtim\Downloads\filter-statistics.txt')

    print("📧 Фильтрация email списка для рассылки по РФ, Беларуси и СНГ\n")
    print("🌍 Включены: Россия, Беларусь, Казахстан, Узбекистан, Таджикистан,")
    print("             Кыргызстан, Туркменистан, Армения, Азербайджан, Молдова")
    print("🚫 Исключены: Европа, Украина\n")

    # Загружаем списки
    print("📁 Загрузка списков...")
    source_emails = load_emails(input_file)
    exclude_emails = load_emails(exclude_file)

    print(f"   ✓ Исходный список: {len(source_emails)} адресов")
    print(f"   ✓ К исключению: {len(exclude_emails)} адресов")

    # Фильтруем
    print("\n🔍 Применение фильтров...")
    filtered, excluded_european, excluded_ukraine = filter_emails(source_emails, exclude_emails)

    # Подсчитываем статистику по доменам
    domain_stats = {}
    cis_count = 0
    ru_by_count = 0

    for email in filtered:
        domain = get_domain(email)
        if domain:
            # Получаем TLD (последнюю часть домена)
            tld = '.' + domain.split('.')[-1]
            domain_stats[tld] = domain_stats.get(tld, 0) + 1

            # Подсчитываем РФ/BY и СНГ
            if tld in ['.ru', '.рф', '.su', '.by', '.бел']:
                ru_by_count += 1
            elif tld in ['.kz', '.uz', '.tj', '.kg', '.tm', '.am', '.az', '.md']:
                cis_count += 1

    # Сохраняем результаты
    print("\n💾 Сохранение результатов...")
    saved_count = save_results(filtered, output_file)
    excluded_european_count = save_results(excluded_european, excluded_european_output)
    excluded_ukraine_count = save_results(excluded_ukraine, excluded_ukraine_output)

    # Статистика
    print("\n" + "="*70)
    print("📊 СТАТИСТИКА ФИЛЬТРАЦИИ")
    print("="*70)
    print(f"Исходный список:                   {len(source_emails):>6} адресов")
    print(f"Уже отправлено (исключено):        {len(exclude_emails):>6} адресов")
    print(f"Европейские домены (удалено):      {len(excluded_european):>6} адресов")
    print(f"Украинские домены (удалено):       {len(excluded_ukraine):>6} адресов")
    print(f"-" * 70)
    print(f"✅ ИТОГОВЫЙ СПИСОК:                 {saved_count:>6} адресов")
    print(f"   └─ РФ/Беларусь (.ru/.by/.su):   {ru_by_count:>6} адресов ({ru_by_count/saved_count*100:>5.1f}%)")
    print(f"   └─ СНГ (.kz/.uz/.tj/.kg и др.): {cis_count:>6} адресов ({cis_count/saved_count*100:>5.1f}%)")
    print(f"   └─ Международные (.com/.org):   {saved_count-ru_by_count-cis_count:>6} адресов ({(saved_count-ru_by_count-cis_count)/saved_count*100:>5.1f}%)")
    print("="*70)

    # Топ-10 доменов в итоговом списке
    print("\n📈 ТОП-10 ДОМЕНОВ В ИТОГОВОМ СПИСКЕ:")
    sorted_domains = sorted(domain_stats.items(), key=lambda x: x[1], reverse=True)
    for i, (domain, count) in enumerate(sorted_domains[:10], 1):
        percentage = (count / saved_count) * 100
        print(f"{i:2}. {domain:10} - {count:4} адресов ({percentage:5.1f}%)")

    # Сохраняем статистику в файл
    with open(stats_file, 'w', encoding='utf-8') as f:
        f.write("="*70 + "\n")
        f.write("СТАТИСТИКА ФИЛЬТРАЦИИ EMAIL ДЛЯ РФ, БЕЛАРУСИ И СНГ\n")
        f.write("="*70 + "\n\n")
        f.write(f"Дата: {Path(__file__).stat().st_mtime}\n\n")
        f.write("ВКЛЮЧЕНЫ: Россия, Беларусь, Казахстан, Узбекистан, Таджикистан,\n")
        f.write("          Кыргызстан, Туркменистан, Армения, Азербайджан, Молдова\n")
        f.write("          + Международные домены (.com, .org, .net и др.)\n")
        f.write("ИСКЛЮЧЕНЫ: Европа, Украина\n\n")
        f.write(f"Исходный список:                   {len(source_emails):>6} адресов\n")
        f.write(f"Уже отправлено (исключено):        {len(exclude_emails):>6} адресов\n")
        f.write(f"Европейские домены (удалено):      {len(excluded_european):>6} адресов\n")
        f.write(f"Украинские домены (удалено):       {len(excluded_ukraine):>6} адресов\n")
        f.write(f"-" * 70 + "\n")
        f.write(f"ИТОГОВЫЙ СПИСОК:                   {saved_count:>6} адресов\n")
        f.write(f"  РФ/Беларусь (.ru/.by/.su):       {ru_by_count:>6} адресов ({ru_by_count/saved_count*100:>5.1f}%)\n")
        f.write(f"  СНГ (.kz/.uz/.tj/.kg и др.):     {cis_count:>6} адресов ({cis_count/saved_count*100:>5.1f}%)\n")
        f.write(f"  Международные (.com/.org):       {saved_count-ru_by_count-cis_count:>6} адресов ({(saved_count-ru_by_count-cis_count)/saved_count*100:>5.1f}%)\n")
        f.write("="*70 + "\n\n")
        f.write("РАСПРЕДЕЛЕНИЕ ПО ДОМЕНАМ:\n\n")
        for domain, count in sorted_domains:
            percentage = (count / saved_count) * 100
            f.write(f"{domain:10} - {count:4} адресов ({percentage:5.1f}%)\n")

    print(f"\n✅ Результаты сохранены:")
    print(f"   📄 Итоговый список: {output_file}")
    print(f"   📄 Исключенные (европейские): {excluded_european_output}")
    print(f"   📄 Исключенные (украинские): {excluded_ukraine_output}")
    print(f"   📊 Статистика: {stats_file}")
    print("\n✨ Готово! Список готов для рассылки по РФ, Беларуси и СНГ.\n")

if __name__ == '__main__':
    main()
