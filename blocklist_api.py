#!/usr/bin/env python3
"""
API endpoints для управления блок-листом
Безопасные операции с блок-листом (blocked_emails.txt, blocked_domains.txt)
"""

import os
import json
from pathlib import Path
from datetime import datetime
import re

BLOCKLISTS_DIR = Path("blocklists")
BLOCKED_EMAILS_FILE = BLOCKLISTS_DIR / "blocked_emails.txt"
BLOCKED_DOMAINS_FILE = BLOCKLISTS_DIR / "blocked_domains.txt"

# Убедимся, что директория существует
BLOCKLISTS_DIR.mkdir(exist_ok=True)

# История изменений для undo/redo
HISTORY_FILE = BLOCKLISTS_DIR / ".blocklist_history.json"
MAX_HISTORY_SIZE = 100


class BlocklistManager:
    """Менеджер блок-листа с поддержкой операций"""

    def __init__(self):
        self.emails = set()
        self.domains = set()
        self.history = []
        self.load()

    def load(self):
        """Загрузить блок-листы из файлов"""
        # Загрузить emails
        if BLOCKED_EMAILS_FILE.exists():
            with open(BLOCKED_EMAILS_FILE, 'r', encoding='utf-8') as f:
                self.emails = {line.strip() for line in f if line.strip()}

        # Загрузить domains
        if BLOCKED_DOMAINS_FILE.exists():
            with open(BLOCKED_DOMAINS_FILE, 'r', encoding='utf-8') as f:
                self.domains = {line.strip() for line in f if line.strip()}

        # Загрузить историю
        if HISTORY_FILE.exists():
            try:
                with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                    self.history = json.load(f)
            except:
                self.history = []

        print(f"✅ Loaded {len(self.emails)} blocked emails, {len(self.domains)} blocked domains")

    def save(self):
        """Сохранить блок-листы в файлы"""
        # Сохранить emails
        with open(BLOCKED_EMAILS_FILE, 'w', encoding='utf-8') as f:
            for email in sorted(self.emails):
                f.write(f"{email}\n")

        # Сохранить domains
        with open(BLOCKED_DOMAINS_FILE, 'w', encoding='utf-8') as f:
            for domain in sorted(self.domains):
                f.write(f"{domain}\n")

        # Сохранить историю (последние MAX_HISTORY_SIZE записей)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.history[-MAX_HISTORY_SIZE:], f, indent=2)

        print(f"💾 Saved {len(self.emails)} emails, {len(self.domains)} domains")

    def add_to_history(self, action_type, data, description):
        """Добавить действие в историю"""
        entry = {
            "type": action_type,
            "data": data,
            "description": description,
            "timestamp": datetime.now().isoformat()
        }
        self.history.append(entry)

    def get_all_items(self):
        """Получить все элементы блок-листа"""
        items = []

        # Добавить emails
        for email in sorted(self.emails):
            domain = email.split('@')[1] if '@' in email else ''
            items.append({
                "email": email,
                "domain": domain,
                "status": "blocked",
                "source": "Blocklist",
                "type": "email",
                "importedAt": None  # TODO: отслеживать дату добавления
            })

        # Добавить domains
        for domain in sorted(self.domains):
            items.append({
                "email": f"*@{domain}",
                "domain": domain,
                "status": "blocked",
                "source": "Blocklist",
                "type": "domain",
                "importedAt": None
            })

        return items

    def get_stats(self):
        """Получить статистику блок-листа"""
        return {
            "total": len(self.emails) + len(self.domains),
            "emails": len(self.emails),
            "domains": len(self.domains),
            "blocked": len(self.emails) + len(self.domains),
            "allowed": 0,
            "new": 0,
            "lastUpdate": datetime.now().isoformat(),
            "historySize": len(self.history)
        }

    def add_email(self, email):
        """Добавить email в блок-лист"""
        email = email.strip().lower()
        if not self._validate_email(email):
            raise ValueError(f"Invalid email format: {email}")

        if email in self.emails:
            return {"status": "already_exists", "email": email}

        self.emails.add(email)
        self.add_to_history("add_email", {"email": email}, f"Added email: {email}")
        self.save()

        return {"status": "added", "email": email}

    def add_domain(self, domain):
        """Добавить домен в блок-лист"""
        domain = domain.strip().lower()
        if not self._validate_domain(domain):
            raise ValueError(f"Invalid domain format: {domain}")

        if domain in self.domains:
            return {"status": "already_exists", "domain": domain}

        self.domains.add(domain)
        self.add_to_history("add_domain", {"domain": domain}, f"Added domain: {domain}")
        self.save()

        return {"status": "added", "domain": domain}

    def remove_email(self, email):
        """Удалить email из блок-листа"""
        email = email.strip().lower()

        if email not in self.emails:
            return {"status": "not_found", "email": email}

        self.emails.remove(email)
        self.add_to_history("remove_email", {"email": email}, f"Removed email: {email}")
        self.save()

        return {"status": "removed", "email": email}

    def remove_domain(self, domain):
        """Удалить домен из блок-листа"""
        domain = domain.strip().lower()

        if domain not in self.domains:
            return {"status": "not_found", "domain": domain}

        self.domains.remove(domain)
        self.add_to_history("remove_domain", {"domain": domain}, f"Removed domain: {domain}")
        self.save()

        return {"status": "removed", "domain": domain}

    def bulk_add_emails(self, emails):
        """Массовое добавление emails"""
        results = {"added": 0, "already_exists": 0, "invalid": 0, "items": []}

        for email in emails:
            email = email.strip().lower()
            if not self._validate_email(email):
                results["invalid"] += 1
                results["items"].append({"email": email, "status": "invalid"})
                continue

            if email in self.emails:
                results["already_exists"] += 1
                results["items"].append({"email": email, "status": "already_exists"})
            else:
                self.emails.add(email)
                results["added"] += 1
                results["items"].append({"email": email, "status": "added"})

        if results["added"] > 0:
            self.add_to_history("bulk_add_emails",
                              {"count": results["added"]},
                              f"Bulk added {results['added']} emails")
            self.save()

        return results

    def bulk_remove_emails(self, emails):
        """Массовое удаление emails"""
        results = {"removed": 0, "not_found": 0, "items": []}

        for email in emails:
            email = email.strip().lower()
            if email in self.emails:
                self.emails.remove(email)
                results["removed"] += 1
                results["items"].append({"email": email, "status": "removed"})
            else:
                results["not_found"] += 1
                results["items"].append({"email": email, "status": "not_found"})

        if results["removed"] > 0:
            self.add_to_history("bulk_remove_emails",
                              {"count": results["removed"]},
                              f"Bulk removed {results['removed']} emails")
            self.save()

        return results

    def import_from_csv(self, csv_data, format_type="smtp"):
        """Импорт из CSV (поддержка различных форматов)"""
        results = {"added": 0, "already_exists": 0, "invalid": 0, "items": []}

        lines = csv_data.strip().split('\n')

        for line in lines:
            if not line.strip() or line.startswith('#'):
                continue

            # Извлечь email в зависимости от формата
            email = None
            if format_type == "smtp":
                # Формат: st_text,ts,sub,frm,email,tag,mid,link
                parts = line.split(',')
                if len(parts) >= 5:
                    email = parts[4].strip()
            elif format_type == "unsubscribe":
                # Формат: Дата отписки;Email адреса;Причина
                parts = line.split(';')
                if len(parts) >= 2:
                    email = parts[1].strip()
            else:
                # Простой формат: один email на строку
                email = line.strip()

            if email and self._validate_email(email):
                email = email.lower()
                if email not in self.emails:
                    self.emails.add(email)
                    results["added"] += 1
                    results["items"].append({"email": email, "status": "added"})
                else:
                    results["already_exists"] += 1
                    results["items"].append({"email": email, "status": "already_exists"})
            else:
                results["invalid"] += 1

        if results["added"] > 0:
            self.add_to_history("import_csv",
                              {"count": results["added"], "format": format_type},
                              f"Imported {results['added']} emails from CSV")
            self.save()

        return results

    def search(self, query):
        """Поиск по блок-листу"""
        query = query.lower()
        results = []

        # Поиск по emails
        for email in self.emails:
            if query in email:
                results.append({
                    "email": email,
                    "domain": email.split('@')[1] if '@' in email else '',
                    "status": "blocked",
                    "type": "email",
                    "match": "email"
                })

        # Поиск по domains
        for domain in self.domains:
            if query in domain:
                results.append({
                    "email": f"*@{domain}",
                    "domain": domain,
                    "status": "blocked",
                    "type": "domain",
                    "match": "domain"
                })

        return results

    @staticmethod
    def _validate_email(email):
        """Валидация email адреса"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def _validate_domain(domain):
        """Валидация домена"""
        pattern = r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, domain))


# Глобальный экземпляр менеджера
_manager = None


def get_manager():
    """Получить глобальный экземпляр менеджера"""
    global _manager
    if _manager is None:
        _manager = BlocklistManager()
    return _manager


# API функции для использования в web_server.py

def handle_get_blocklist():
    """GET /api/blocklist - получить все элементы блок-листа"""
    manager = get_manager()
    items = manager.get_all_items()

    return {
        "status": "success",
        "items": items,
        "count": len(items),
        "timestamp": datetime.now().isoformat()
    }


def handle_get_blocklist_stats():
    """GET /api/blocklist/stats - получить статистику"""
    manager = get_manager()
    stats = manager.get_stats()

    return {
        "status": "success",
        "stats": stats,
        "timestamp": datetime.now().isoformat()
    }


def handle_blocklist_add(request_data):
    """POST /api/blocklist/add - добавить элемент"""
    manager = get_manager()

    item_type = request_data.get("type", "email")
    value = request_data.get("value", "")

    try:
        if item_type == "email":
            result = manager.add_email(value)
        elif item_type == "domain":
            result = manager.add_domain(value)
        else:
            return {"status": "error", "message": f"Invalid type: {item_type}"}

        return {
            "status": "success",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }


def handle_blocklist_remove(request_data):
    """POST /api/blocklist/remove - удалить элемент"""
    manager = get_manager()

    item_type = request_data.get("type", "email")
    value = request_data.get("value", "")

    try:
        if item_type == "email":
            result = manager.remove_email(value)
        elif item_type == "domain":
            result = manager.remove_domain(value)
        else:
            return {"status": "error", "message": f"Invalid type: {item_type}"}

        return {
            "status": "success",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }


def handle_blocklist_bulk_add(request_data):
    """POST /api/blocklist/bulk-add - массовое добавление"""
    manager = get_manager()

    items = request_data.get("items", [])
    item_type = request_data.get("type", "email")

    try:
        if item_type == "email":
            result = manager.bulk_add_emails(items)
        else:
            return {"status": "error", "message": f"Bulk add not supported for type: {item_type}"}

        return {
            "status": "success",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }


def handle_blocklist_bulk_remove(request_data):
    """POST /api/blocklist/bulk-remove - массовое удаление"""
    manager = get_manager()

    items = request_data.get("items", [])
    item_type = request_data.get("type", "email")

    try:
        if item_type == "email":
            result = manager.bulk_remove_emails(items)
        else:
            return {"status": "error", "message": f"Bulk remove not supported for type: {item_type}"}

        return {
            "status": "success",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }


def handle_blocklist_import_csv(request_data):
    """POST /api/blocklist/import-csv - импорт из CSV"""
    manager = get_manager()

    csv_data = request_data.get("csv_data", "")
    format_type = request_data.get("format", "simple")

    try:
        result = manager.import_from_csv(csv_data, format_type)

        return {
            "status": "success",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }


def handle_blocklist_search(query):
    """GET /api/blocklist/search?q=query - поиск"""
    manager = get_manager()

    try:
        results = manager.search(query)

        return {
            "status": "success",
            "results": results,
            "count": len(results),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }


def handle_blocklist_export(format_type="json"):
    """GET /api/blocklist/export?format=json - экспорт"""
    manager = get_manager()
    items = manager.get_all_items()

    if format_type == "json":
        return {
            "status": "success",
            "format": "json",
            "data": items,
            "timestamp": datetime.now().isoformat()
        }
    elif format_type == "csv":
        # Генерация CSV
        csv_lines = ["email,domain,status,type"]
        for item in items:
            csv_lines.append(f"{item['email']},{item['domain']},{item['status']},{item['type']}")

        return {
            "status": "success",
            "format": "csv",
            "data": "\n".join(csv_lines),
            "timestamp": datetime.now().isoformat()
        }
    elif format_type == "txt":
        # Генерация TXT (только emails)
        txt_lines = [item['email'] for item in items if item['type'] == 'email']

        return {
            "status": "success",
            "format": "txt",
            "data": "\n".join(txt_lines),
            "timestamp": datetime.now().isoformat()
        }
    else:
        return {
            "status": "error",
            "message": f"Unsupported export format: {format_type}"
        }
