#!/usr/bin/env python3
"""Temporary script to parse LVP file and extract company samples"""

from email_metadata import EmailMetadataManager
import json

manager = EmailMetadataManager()
emails = manager.load_emails_with_metadata('input/Чехия Глеб HC.lvp')

print(f'Total emails: {len(emails)}')
print('\n' + '='*80)
print('SAMPLE COMPANIES (First 15):')
print('='*80)

for i, email_data in enumerate(emails[:15], 1):
    email_addr = email_data.get('email', 'N/A')
    title = email_data.get('Column_4', email_data.get('title', 'N/A'))
    description = email_data.get('Column_5', email_data.get('meta_description', 'N/A'))
    search_query = email_data.get('Column_3', 'N/A')
    
    print(f'\n{i}. Email: {email_addr}')
    print(f'   Title: {title}')
    print(f'   Description: {description[:150]}...' if len(description) > 150 else f'   Description: {description}')
    print(f'   Search Query: {search_query}')

print('\n' + '='*80)
print('METADATA FIELDS AVAILABLE:')
print('='*80)
if emails:
    sample = emails[0]
    print(json.dumps({k: type(v).__name__ for k, v in sample.items()}, indent=2, ensure_ascii=False))
