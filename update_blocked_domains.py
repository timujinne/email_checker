#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Читаем список доменов для добавления
with open(r'e:\Shtim\Downloads\список.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Читаем текущий blocked_domains.txt
with open('blocklists/blocked_domains.txt', 'r', encoding='utf-8') as f:
    existing_domains = set(line.strip().lower() for line in f if line.strip())

# Извлекаем домены из список.txt
new_domains = []
for line in content.split('\n'):
    line = line.strip()
    if not line:
        continue

    # Извлекаем домен (все после @)
    if '@' in line:
        domain = line.split('@')[-1].strip()
        if domain and domain != '':
            # Нормализуем домен (lowercase)
            domain = domain.lower()
            new_domains.append(domain)

# Удаляем дубликаты
new_domains = list(set(new_domains))

# Фильтруем домены, которых еще нет в blocked_domains.txt
domains_to_add = [d for d in new_domains if d and d not in existing_domains]

print(f'📊 Статистика анализа:')
print(f'   Найдено уникальных доменов в список.txt: {len(new_domains)}')
print(f'   Уже есть в blocked_domains.txt: {len(new_domains) - len(domains_to_add)}')
print(f'   Новых доменов для добавления: {len(domains_to_add)}')
print()

if domains_to_add:
    print('✨ Новые домены для добавления:')
    for domain in sorted(domains_to_add):
        print(f'   ➕ {domain}')
    print()

    # Спрашиваем подтверждение
    confirm = input('Добавить эти домены в blocked_domains.txt? (y/n): ').strip().lower()

    if confirm == 'y':
        # Добавляем новые домены
        with open('blocklists/blocked_domains.txt', 'a', encoding='utf-8') as f:
            for domain in sorted(domains_to_add):
                f.write(f'{domain}\n')

        print(f'✅ Успешно добавлено {len(domains_to_add)} новых доменов!')
    else:
        print('❌ Отменено.')
else:
    print('✅ Все домены из список.txt уже есть в blocked_domains.txt!')
