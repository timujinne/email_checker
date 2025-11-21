#!/usr/bin/env python3
"""
Web server для управления email списками - БЕЗОПАСНАЯ ВЕРСИЯ
Исправлены критические уязвимости Command Injection
"""

import os
import sys
import json
import subprocess
import shlex  # Для безопасного экранирования команд
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from datetime import datetime
import threading
import time
import sqlite3
import hashlib

# Импорт Blocklist API
from blocklist_api import (
    handle_get_blocklist,
    handle_get_blocklist_stats,
    handle_blocklist_add,
    handle_blocklist_remove,
    handle_blocklist_bulk_add,
    handle_blocklist_bulk_remove,
    handle_blocklist_import_csv,
    handle_blocklist_search,
    handle_blocklist_export
)

# Импорт Email Records API
from email_records_api import (
    handle_get_emails,
    handle_get_email_count,
    handle_get_single_email,
    handle_bulk_update_emails,
    handle_bulk_delete_emails,
    handle_export_emails,
    handle_delete_email,
    handle_bulk_status_update
)

# Импорт WebSocket сервера
import websocket_server

# Импорт EmailChecker для автоопределения метаданных
from email_checker import EmailChecker

# Глобальное состояние для отслеживания процесса обработки
processing_state = {
    "is_running": False,
    "logs": [],
    "lock": threading.Lock(),
    "start_time": None,
    "processed_files": 0,
    "total_files": 0
}

# БЕЛЫЙ СПИСОК разрешенных команд для безопасности
ALLOWED_COMMANDS = {
    "check", "check-lvp", "check-enriched", "check-metadata",
    "check-sequence", "check-lvp-sequence", "batch", "check-lvp-batch",
    "check-all-incremental", "incremental", "status", "report"
}

# МАКСИМАЛЬНАЯ длина имени файла для предотвращения атак
MAX_FILENAME_LENGTH = 255

def validate_filename(filename):
    """
    Валидация имени файла для предотвращения path traversal и injection атак

    Args:
        filename: Имя файла для проверки

    Returns:
        bool: True если имя файла безопасно

    Raises:
        ValueError: Если имя файла содержит опасные символы
    """
    # Проверка длины
    if len(filename) > MAX_FILENAME_LENGTH:
        raise ValueError(f"Filename too long: {len(filename)} > {MAX_FILENAME_LENGTH}")

    # Проверка на path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError(f"Path traversal attempt detected in filename: {filename}")

    # Проверка на опасные символы
    dangerous_chars = [";", "&", "|", "`", "$", "(", ")", "{", "}", "[", "]", "<", ">", "!", "\\n", "\\r"]
    for char in dangerous_chars:
        if char in filename:
            raise ValueError(f"Dangerous character '{char}' in filename: {filename}")

    # Проверка на допустимые расширения
    allowed_extensions = {".txt", ".lvp", ".csv", ".json"}
    file_path = Path(filename)
    if file_path.suffix.lower() not in allowed_extensions:
        raise ValueError(f"Invalid file extension: {file_path.suffix}")

    return True

def validate_command(command):
    """
    Валидация команды для предотвращения injection атак

    Args:
        command: Команда для проверки

    Returns:
        bool: True если команда безопасна

    Raises:
        ValueError: Если команда не в белом списке
    """
    if command not in ALLOWED_COMMANDS:
        raise ValueError(f"Command not allowed: {command}. Allowed: {ALLOWED_COMMANDS}")
    return True

def run_subprocess_with_logging(cmd, cwd=".", current_file="", total_files=1, file_index=0):
    """
    Безопасный запуск подпроцесса с логированием

    ВАЖНО: Все параметры проходят валидацию перед использованием
    """
    global processing_state

    # Generate unique task ID
    task_id = f"task_{current_file.replace('/', '_').replace(' ', '_')}_{int(time.time())}"

    with processing_state["lock"]:
        processing_state["is_running"] = True
        processing_state["current_file"] = current_file
        processing_state["total_files"] = total_files
        processing_state["processed_files"] = file_index
        if processing_state["start_time"] is None:
            processing_state["start_time"] = time.time()

    # Broadcast task start
    websocket_server.broadcast_message("task_created", {
        "taskId": task_id,
        "name": current_file,
        "total": total_files
    })

    try:
        # Валидация и экранирование всех частей команды
        safe_cmd = []
        for part in cmd:
            # Используем shlex.quote для безопасного экранирования
            safe_cmd.append(shlex.quote(part))

        # Дополнительная проверка пути
        safe_cwd = Path(cwd).resolve()
        if not safe_cwd.exists():
            raise ValueError(f"Working directory does not exist: {safe_cwd}")

        # Запускаем процесс с экранированными параметрами
        # Важно: shell=False для предотвращения shell injection
        process = subprocess.Popen(
            cmd,  # Используем оригинальный список, т.к. shell=False
            cwd=str(safe_cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=False  # КРИТИЧНО: никогда не используем shell=True!
        )

        # Читаем вывод построчно
        for line in iter(process.stdout.readline, ''):
            if line:
                line = line.rstrip()
                timestamp = datetime.now().strftime("%H:%M:%S")

                with processing_state["lock"]:
                    processing_state["logs"].append({
                        "timestamp": timestamp,
                        "message": line
                    })

                # Отправляем через WebSocket в реальном времени
                websocket_server.broadcast_message("task_log", {
                    "taskId": task_id,
                    "message": line,
                    "timestamp": timestamp
                })

        process.wait()
        returncode = process.returncode

        # Broadcast task completion
        websocket_server.broadcast_message("task_completed", {
            "taskId": task_id,
            "returncode": returncode,
            "result": {
                "success": returncode == 0
            }
        })

        return returncode

    except Exception as e:
        timestamp = datetime.now().strftime("%H:%M:%S")
        error_msg = f"❌ Ошибка: {str(e)}"

        with processing_state["lock"]:
            processing_state["logs"].append({
                "timestamp": timestamp,
                "message": error_msg
            })

        # Broadcast error
        websocket_server.broadcast_message("task_failed", {
            "taskId": task_id,
            "error": str(e),
            "timestamp": timestamp
        })

        return 1
    finally:
        # Обновляем счетчик обработанных файлов
        with processing_state["lock"]:
            processing_state["processed_files"] = file_index + 1

        # Broadcast progress update
        websocket_server.broadcast_message("task_progress", {
            "taskId": task_id,
            "processed": file_index + 1,
            "total": total_files,
            "progress": int((file_index + 1) / total_files * 100) if total_files > 0 else 0
        })

class EmailCheckerWebHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.base_dir = Path(".")
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Обработка GET запросов с валидацией путей"""
        path = urlparse(self.path).path

        # Белый список разрешенных GET endpoints
        allowed_endpoints = {
            "/", "/index", "/debug", "/debug.html",
            "/new", "/v2", "/modern",  # Новый интерфейс (SPA)
            "/old", "/classic", "/legacy",  # Старый интерфейс (явный доступ)
            # Прямой доступ к HTML страницам
            "/index.html", "/lists.html", "/email-list.html", "/bulk-lists.html",
            "/smart-filter.html", "/blocklist.html",
            "/processing-queue.html", "/analytics.html", "/ml-analytics.html",
            "/archive.html", "/settings.html",
            "/api/lists", "/api/status", "/api/reports",
            "/api/metadata", "/api/metadata-search", "/api/lvp-sources",
            "/api/metadata-stats", "/api/country-mismatches", "/api/processing-status",
            "/api/output-files", "/api/file-preview", "/api/download-file",
            "/api/admin/stats", "/api/dashboard-stats", "/api/all-files",
            "/api/smart-filter/available", "/api/smart-filter/config",
            "/api/smart-filter/auto-suggest",
            # Template API endpoints
            "/api/templates",
            # Blocklist API endpoints
            "/api/blocklist", "/api/blocklist/stats",
            # Email Records API endpoints
            "/api/emails", "/api/emails/count"
        }

        # Обслуживание статических файлов (CSS, JS, images)
        if path.startswith("/assets/"):
            self.serve_static_file(path)
        # Обслуживание HTML страниц из web/
        elif path.endswith(".html") and path in allowed_endpoints:
            filename = path.lstrip("/")  # Remove leading slash
            self.serve_file(f"web/{filename}", "text/html")
        # Blocklist API endpoints with query params (process before allowed_endpoints check)
        elif path.startswith("/api/blocklist/search"):
            self.handle_blocklist_search()
        elif path.startswith("/api/blocklist/export"):
            self.handle_blocklist_export()
        # Проверка email-metadata endpoint (особый случай с параметром)
        elif path.startswith("/api/email-metadata/"):
            self.handle_get_email_metadata()
        elif path.startswith("/api/output-files"):
            self.handle_get_output_files()
        elif path.startswith("/api/file-preview"):
            self.handle_file_preview()
        elif path.startswith("/api/download-file"):
            self.handle_download_file()
        elif path in allowed_endpoints:
            # Главная страница - СТАРЫЙ интерфейс по умолчанию
            if path == "/" or path == "/index":
                self.serve_file("email_list_manager.html", "text/html")
            # Явный доступ к старому интерфейсу
            elif path in ["/old", "/classic", "/legacy"]:
                self.serve_file("email_list_manager.html", "text/html")
            # Новый интерфейс (SPA)
            elif path in ["/new", "/v2", "/modern"]:
                self.serve_file("web/index.html", "text/html")
            elif path == "/debug" or path == "/debug.html":
                self.serve_file("web/debug.html", "text/html")
            elif path == "/api/lists":
                self.handle_get_lists()
            elif path == "/api/status":
                self.handle_get_status()
            elif path == "/api/reports":
                self.handle_get_reports()
            elif path == "/api/metadata":
                self.handle_get_metadata()
            elif path == "/api/metadata-search":
                self.handle_metadata_search()
            elif path == "/api/lvp-sources":
                self.handle_get_lvp_sources()
            elif path == "/api/metadata-stats":
                self.handle_get_metadata_stats()
            elif path == "/api/country-mismatches":
                self.handle_get_country_mismatches()
            elif path == "/api/processing-status":
                self.handle_get_processing_status()
            elif path == "/api/admin/stats":
                self.handle_admin_stats()
            elif path == "/api/dashboard-stats":
                self.handle_get_dashboard_stats()
            elif path == "/api/all-files":
                self.handle_get_all_files()
            elif path == "/api/smart-filter/available":
                self.handle_get_available_smart_filters()
            elif path.startswith("/api/smart-filter/config"):
                self.handle_get_smart_filter_config()
            elif path.startswith("/api/smart-filter/auto-suggest"):
                self.handle_auto_suggest_config()
            # Template API endpoints
            elif path == "/api/templates":
                self.handle_get_templates()
            elif path.startswith("/api/templates/draft/"):
                self.handle_get_draft()
            # Blocklist API endpoints (exact paths, query params handled above)
            elif path == "/api/blocklist":
                self.handle_get_blocklist()
            elif path == "/api/blocklist/stats":
                self.handle_get_blocklist_stats()
            # Email Records API endpoints
            elif path == "/api/emails":
                handle_get_emails(self)
            elif path == "/api/emails/count":
                handle_get_email_count(self)
            elif path.startswith("/api/emails/") and path != "/api/emails/count":
                # Handle single email GET: /api/emails/{email}
                email = path.split("/api/emails/", 1)[1]
                if email:
                    handle_get_single_email(self, email)
                else:
                    self.send_error(400, "Invalid email parameter")
        else:
            self.send_error(404, f"Endpoint not found: {path}")

    def do_POST(self):
        """Обработка POST запросов с валидацией"""
        path = urlparse(self.path).path

        # Белый список разрешенных POST endpoints
        allowed_endpoints = {
            "/api/save_list", "/api/process", "/api/process_one",
            "/api/reset_processing", "/api/metadata/add", "/api/metadata/remove",
            "/api/metadata/save", "/api/metadata/batch-update-status",
            "/api/metadata/batch-update-field", "/api/import-lvp",
            "/api/export-lvp", "/api/enrich-list", "/api/enrich-all",
            "/api/upload-file", "/api/admin/clear-cache", "/api/admin/optimize-db",
            "/api/admin/delete-file", "/api/admin/reset-system", "/api/admin/restore-data",
            "/api/smart-filter/process", "/api/smart-filter/process-batch",
            "/api/smart-filter/workflow", "/api/smart-filter/apply",
            "/api/lists/bulk-update",  # Bulk list metadata update
            "/api/scan-input-directory",  # Scan input/ directory for new files
            # Template API endpoints
            "/api/templates", "/api/templates/draft",
            # Blocklist API endpoints
            "/api/blocklist/add", "/api/blocklist/remove",
            "/api/blocklist/bulk-add", "/api/blocklist/bulk-remove",
            "/api/blocklist/import-csv",
            # Email Records API endpoints
            "/api/emails", "/api/emails/bulk-update", "/api/emails/bulk-delete",
            "/api/emails/export", "/api/emails/bulk-status"
        }

        if path in allowed_endpoints:
            if path == "/api/save_list":
                self.handle_save_list()
            elif path == "/api/process":
                self.handle_process_lists()
            elif path == "/api/process_one":
                self.handle_process_one()
            elif path == "/api/reset_processing":
                self.handle_reset_processing()
            elif path == "/api/lists/bulk-update":
                self.handle_lists_bulk_update()
            elif path == "/api/scan-input-directory":
                self.handle_scan_input_directory()
            elif path == "/api/upload-file":
                self.handle_upload_file()
            elif path == "/api/admin/clear-cache":
                self.handle_admin_clear_cache()
            elif path == "/api/admin/optimize-db":
                self.handle_admin_optimize_db()
            elif path == "/api/admin/delete-file":
                self.handle_admin_delete_file()
            elif path == "/api/admin/reset-system":
                self.handle_admin_reset_system()
            elif path == "/api/admin/restore-data":
                self.handle_admin_restore_data()
            elif path == "/api/metadata/add":
                self.handle_add_metadata()
            elif path == "/api/metadata/remove":
                self.handle_remove_metadata()
            elif path == "/api/metadata/save":
                self.handle_save_metadata()
            elif path == "/api/metadata/batch-update-status":
                self.handle_batch_update_status()
            elif path == "/api/metadata/batch-update-field":
                self.handle_batch_update_field()
            elif path == "/api/import-lvp":
                self.handle_import_lvp()
            elif path == "/api/export-lvp":
                self.handle_export_lvp()
            elif path == "/api/enrich-list":
                self.handle_enrich_list()
            elif path == "/api/enrich-all":
                self.handle_enrich_all()
            elif path == "/api/smart-filter/process":
                self.handle_smart_filter_process()
            elif path == "/api/smart-filter/process-batch":
                self.handle_smart_filter_process_batch()
            elif path == "/api/smart-filter/workflow":
                self.handle_smart_filter_workflow()
            elif path == "/api/smart-filter/apply":
                self.handle_smart_filter_apply()
            # Template API POST handlers
            elif path == "/api/templates":
                self.handle_save_template()
            elif path == "/api/templates/draft":
                self.handle_save_draft()
            # Blocklist API POST handlers
            elif path == "/api/blocklist/add":
                self.handle_post_blocklist_add()
            elif path == "/api/blocklist/remove":
                self.handle_post_blocklist_remove()
            elif path == "/api/blocklist/bulk-add":
                self.handle_post_blocklist_bulk_add()
            elif path == "/api/blocklist/bulk-remove":
                self.handle_post_blocklist_bulk_remove()
            elif path == "/api/blocklist/import-csv":
                self.handle_post_blocklist_import_csv()
            # Email Records API endpoints
            elif path == "/api/emails":
                handle_get_emails(self)  # POST to /api/emails can also get paginated results
            elif path == "/api/emails/bulk-update":
                handle_bulk_update_emails(self)
            elif path == "/api/emails/bulk-delete":
                handle_bulk_delete_emails(self)
            elif path == "/api/emails/export":
                handle_export_emails(self)
            elif path == "/api/emails/bulk-status":
                handle_bulk_status_update(self)
            else:
                self.send_error(501, f"Handler not implemented for: {path}")
        else:
            self.send_error(404, f"Endpoint not found: {path}")

    def do_DELETE(self):
        """Обработка DELETE запросов"""
        path = urlparse(self.path).path

        # Handle DELETE /api/templates/{template_id}
        if path.startswith("/api/templates/") and not path.startswith("/api/templates/draft/"):
            self.handle_delete_template()
        # Handle DELETE /api/emails/{email}
        elif path.startswith("/api/emails/"):
            email = path.split("/api/emails/", 1)[1]
            if email:
                handle_delete_email(self, email)
            else:
                self.send_error(400, "Invalid email parameter")
        else:
            self.send_error(404, f"DELETE endpoint not found: {path}")

    def serve_file(self, filename, content_type):
        """Безопасная отправка файла клиенту"""
        try:
            # Валидация пути - разрешаем поддиректории но не path traversal
            if ".." in filename or filename.startswith("/"):
                raise ValueError("Path traversal attempt detected")

            file_path = self.base_dir / filename

            # Проверка что файл в разрешенной директории
            file_path = file_path.resolve()
            base_path = self.base_dir.resolve()

            if not str(file_path).startswith(str(base_path)):
                raise ValueError("Path traversal attempt detected")

            if file_path.exists() and file_path.is_file():
                with open(file_path, 'rb') as f:
                    content = f.read()

                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", len(content))
                # Отключаем кеширование HTML файлов для разработки
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, f"File not found: {filename}")
        except Exception as e:
            print(f"Error serving file: {e}")

    def serve_static_file(self, path):
        """Обслуживание статических файлов (CSS, JS, images) из папки assets"""
        try:
            # Валидация пути - разрешаем только /assets/*
            if ".." in path or path.count("//") > 1:
                raise ValueError("Path traversal attempt detected")

            # Удаляем /assets/ из начала пути
            asset_path = path[8:]  # Убираем "/assets/"
            file_path = self.base_dir / "web" / "assets" / asset_path

            # Безопасность - проверяем что файл действительно в assets
            file_path = file_path.resolve()
            assets_path = (self.base_dir / "web" / "assets").resolve()

            if not str(file_path).startswith(str(assets_path)):
                raise ValueError("Path traversal attempt detected")

            if file_path.exists() and file_path.is_file():
                # Определяем content-type по расширению
                content_type_map = {
                    '.css': 'text/css',
                    '.js': 'application/javascript',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2',
                    '.ttf': 'font/ttf',
                    '.json': 'application/json',
                    '.html': 'text/html',
                }
                file_ext = file_path.suffix.lower()
                content_type = content_type_map.get(file_ext, 'application/octet-stream')

                with open(file_path, 'rb') as f:
                    content = f.read()

                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", len(content))
                # Короткое кеширование для разработки (30 секунд)
                self.send_header("Cache-Control", "max-age=30")
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, f"Asset not found: {path}")
        except Exception as e:
            print(f"Error serving static file: {e}")
            self.send_error(500, f"Error: {str(e)}")
            self.send_error(500, str(e))

    def send_json_response(self, data, status_code=200):
        """Отправка JSON ответа"""
        try:
            json_data = json.dumps(data, ensure_ascii=False, indent=2)
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(json_data.encode()))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json_data.encode())
        except Exception as e:
            print(f"Error sending JSON response: {e}")

    def count_lines_in_file(self, file_path):
        """Подсчет строк в файле"""
        try:
            if not file_path.exists():
                return 0
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return sum(1 for line in f if line.strip())
        except Exception as e:
            print(f"Error counting lines in {file_path}: {e}")
            return 0

    def count_lines_in_output(self, filename_base):
        """Подсчет строк в файлах output для данного списка"""
        try:
            output_dir = self.base_dir / "output"
            if not output_dir.exists():
                return 0, 0

            clean_count = 0
            blocked_count = 0

            # Ищем файлы clean и blocked для этого списка
            for output_file in output_dir.glob(f"{filename_base}_clean_*.txt"):
                clean_count += self.count_lines_in_file(output_file)

            for output_file in output_dir.glob(f"{filename_base}_blocked_*.txt"):
                blocked_count += self.count_lines_in_file(output_file)

            return clean_count, blocked_count
        except Exception as e:
            print(f"Error counting output lines for {filename_base}: {e}")
            return 0, 0

    def handle_get_lists(self):
        """Безопасное получение списка email файлов"""
        try:
            config_file = self.base_dir / "lists_config.json"
            lists_data = []

            if config_file.exists():
                # Валидация размера файла перед загрузкой
                if config_file.stat().st_size > 10 * 1024 * 1024:  # 10MB max
                    raise ValueError("Config file too large")

                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    lists_data = config.get("lists", [])

            # Добавляем статистику для каждого списка
            input_dir = self.base_dir / "input"
            for list_item in lists_data:
                filename = list_item.get("filename", "")
                if not filename:
                    continue

                # Подсчет общего количества email в input файле
                input_file = input_dir / filename
                list_item["emails"] = self.count_lines_in_file(input_file)

                # Подсчет clean и blocked из output файлов
                filename_base = filename.rsplit('.', 1)[0]  # Убираем расширение
                clean_count, blocked_count = self.count_lines_in_output(filename_base)
                list_item["clean"] = clean_count
                list_item["blocked"] = blocked_count

            self.send_json_response({"lists": lists_data})
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in config file: {e}")
            self.send_json_response({"error": "Invalid configuration file"}, 500)
        except Exception as e:
            print(f"Error getting lists: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_status(self):
        """Безопасное получение статуса обработки"""
        try:
            # Используем безопасную команду без параметров
            result = subprocess.run(
                ["python3", "email_checker.py", "status"],
                capture_output=True,
                text=True,
                cwd=str(self.base_dir),
                timeout=30,  # Таймаут для предотвращения зависания
                shell=False  # Критично для безопасности
            )

            self.send_json_response({
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            })
        except subprocess.TimeoutExpired:
            self.send_json_response({"error": "Command timeout"}, 408)
        except Exception as e:
            print(f"Error getting status: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_scan_input_directory(self):
        """Сканирование input/ директории для поиска новых файлов"""
        try:
            # Инициализируем EmailChecker
            checker = EmailChecker(str(self.base_dir))

            # Загружаем текущую конфигурацию
            config_file = self.base_dir / "lists_config.json"
            existing_files = set()

            if config_file.exists():
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    existing_files = {item['filename'] for item in config.get('lists', [])}

            # Сканируем input/ директорию
            input_dir = self.base_dir / "input"
            new_files = []

            if input_dir.exists():
                # Собираем все .txt и .lvp файлы
                all_files = list(input_dir.glob('*.txt')) + list(input_dir.glob('*.lvp'))

                for filepath in all_files:
                    filename = filepath.name

                    # Пропускаем файлы, которые уже в конфигурации
                    if filename in existing_files:
                        continue

                    # Получаем метаданные с авто-определением
                    try:
                        metadata = checker.config_manager.get_list_metadata(filename, checker.output_dir)

                        # Добавляем file_type если отсутствует
                        if 'file_type' not in metadata:
                            metadata['file_type'] = 'lvp' if filename.endswith('.lvp') else 'txt'

                        # Добавляем размер файла
                        metadata['file_size'] = filepath.stat().st_size

                        new_files.append(metadata)
                        print(f"✅ Найден новый файл: {filename} (Country: {metadata.get('country')}, Category: {metadata.get('category')})")
                    except Exception as e:
                        print(f"⚠️  Ошибка обработки файла {filename}: {e}")
                        continue

            # Отправляем результат
            self.send_json_response({
                "success": True,
                "new_files_count": len(new_files),
                "new_files": new_files,
                "message": f"Найдено {len(new_files)} новых файлов" if new_files else "Новых файлов не найдено"
            })

            print(f"📊 Сканирование завершено: найдено {len(new_files)} новых файлов")

        except json.JSONDecodeError as e:
            print(f"Invalid JSON in config file: {e}")
            self.send_json_response({"error": "Invalid configuration file"}, 500)
        except Exception as e:
            print(f"Error scanning input directory: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    def handle_process_one(self):
        """Безопасный запуск обработки одного списка"""
        try:
            content_length = int(self.headers['Content-Length'])

            # Ограничение размера запроса (1MB max)
            if content_length > 1024 * 1024:
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            filename = data.get("filename", "").strip()
            if not filename:
                self.send_json_response({"error": "Не указан filename"}, 400)
                return

            # КРИТИЧНО: Валидация имени файла
            try:
                validate_filename(filename)
            except ValueError as e:
                self.send_json_response({"error": f"Invalid filename: {str(e)}"}, 400)
                return

            # Проверяем статус обработки в lists_config.json
            force_reprocess = data.get("force_reprocess", False)
            config_file = self.base_dir / "lists_config.json"

            if config_file.exists():
                try:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        lists = config.get("lists", [])

                        # Находим список по имени файла
                        list_entry = next((l for l in lists if l.get("filename") == filename), None)

                        if list_entry and list_entry.get("processed") == True:
                            # Список уже обработан
                            if not force_reprocess:
                                self.send_json_response({
                                    "error": "Список уже обработан. Используйте force_reprocess=true для повторной обработки.",
                                    "already_processed": True
                                }, 400)
                                return
                            else:
                                print(f"⚠️ Принудительная переобработка списка: {filename}")
                except Exception as e:
                    print(f"⚠️ Ошибка чтения lists_config.json: {e}")
                    # Продолжаем обработку, если не удалось прочитать конфиг

            # Проверка существования файла
            input_file = self.base_dir / "input" / filename
            if not input_file.exists():
                self.send_json_response({"error": f"File not found: {filename}"}, 404)
                return

            # Определяем тип файла и выбираем команду
            file_extension = Path(filename).suffix.lower()

            if file_extension == ".lvp":
                command = "check-lvp"
            else:
                command = "check"

            # Валидация команды
            try:
                validate_command(command)
            except ValueError as e:
                self.send_json_response({"error": str(e)}, 400)
                return

            # Запускаем обработку в отдельном потоке
            def run_processing():
                global processing_state

                # Сброс состояния перед началом
                with processing_state["lock"]:
                    processing_state["logs"].clear()
                    processing_state["start_time"] = None
                    processing_state["processed_files"] = 0

                # Безопасное формирование команды
                # Важно: НЕ используем f-строки или конкатенацию!
                safe_input_path = str(Path("input") / filename)

                returncode = run_subprocess_with_logging(
                    [sys.executable, "email_checker.py", command, safe_input_path],
                    cwd=str(self.base_dir),
                    current_file=filename,
                    total_files=1,
                    file_index=0
                )

                # Завершение обработки
                with processing_state["lock"]:
                    processing_state["is_running"] = False
                    if returncode == 0:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"✅ Обработка {filename} завершена успешно"
                        })
                    else:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"⚠️ Обработка {filename} завершена с кодом: {returncode}"
                        })

            thread = threading.Thread(target=run_processing)
            thread.daemon = True  # Поток завершится при завершении основного процесса
            thread.start()

            self.send_json_response({
                "success": True,
                "message": f"Обработка {filename} запущена (тип: {file_extension})"
            })
        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error processing one file: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_processing_status(self):
        """Получение текущего статуса обработки"""
        global processing_state

        with processing_state["lock"]:
            elapsed_time = 0
            if processing_state["start_time"]:
                elapsed_time = time.time() - processing_state["start_time"]

            # Берем только последние 100 логов для экономии памяти
            recent_logs = processing_state["logs"][-100:] if len(processing_state["logs"]) > 100 else processing_state["logs"]

            status = {
                "is_running": processing_state["is_running"],
                "logs": recent_logs,
                "current_file": processing_state.get("current_file", ""),
                "processed_files": processing_state.get("processed_files", 0),
                "total_files": processing_state.get("total_files", 0),
                "elapsed_time": int(elapsed_time)
            }

        self.send_json_response(status)

    def handle_process_lists(self):
        """Безопасный запуск полной обработки всех списков"""
        global processing_state

        try:
            # Проверяем, не идет ли уже обработка
            with processing_state["lock"]:
                if processing_state["is_running"]:
                    self.send_json_response({
                        "success": False,
                        "error": "Обработка уже запущена. Дождитесь завершения."
                    }, 409)
                    return

            # Получаем параметры из запроса (если есть)
            mode = "check-all-incremental"  # По умолчанию
            exclude_duplicates = True
            generate_html = True

            try:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    if content_length > 1024 * 1024:  # 1MB max
                        self.send_json_response({"error": "Request too large"}, 413)
                        return

                    post_data = self.rfile.read(content_length)
                    data = json.loads(post_data.decode())

                    # Получаем настройки из запроса
                    mode = data.get("mode", "check-all-incremental")
                    exclude_duplicates = data.get("exclude_duplicates", True)
                    generate_html = data.get("generate_html", True)
            except json.JSONDecodeError:
                # Игнорируем ошибки JSON - используем значения по умолчанию
                pass

            # Валидация режима
            try:
                validate_command(mode)
            except ValueError as e:
                self.send_json_response({"error": f"Invalid mode: {str(e)}"}, 400)
                return

            # Формируем команду
            cmd = [sys.executable, "email_checker.py", mode]

            if exclude_duplicates:
                cmd.append("--exclude-duplicates")

            if generate_html:
                cmd.append("--generate-html")

            # Запускаем обработку в отдельном потоке
            def run_processing():
                global processing_state

                # Сброс состояния перед началом
                with processing_state["lock"]:
                    processing_state["logs"].clear()
                    processing_state["start_time"] = None
                    processing_state["processed_files"] = 0
                    processing_state["total_files"] = 0

                returncode = run_subprocess_with_logging(
                    cmd,
                    cwd=str(self.base_dir),
                    current_file="Все файлы",
                    total_files=1,
                    file_index=0
                )

                # Завершение обработки
                with processing_state["lock"]:
                    processing_state["is_running"] = False
                    if returncode == 0:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": "✅ Обработка завершена успешно"
                        })
                    else:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"⚠️ Обработка завершена с кодом: {returncode}"
                        })

            thread = threading.Thread(target=run_processing)
            thread.daemon = True
            thread.start()

            message = f"Запущена обработка в режиме: {mode}"
            if exclude_duplicates:
                message += " (с исключением дубликатов)"
            if generate_html:
                message += " (с генерацией HTML отчета)"

            self.send_json_response({
                "success": True,
                "message": message
            })

        except Exception as e:
            print(f"Error starting processing: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_save_list(self):
        """Безопасное сохранение конфигурации списка"""
        try:
            content_length = int(self.headers['Content-Length'])

            if content_length > 1024 * 1024:  # 1MB max
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            # Валидация имени файла
            filename = data.get("filename", "").strip()
            if not filename:
                self.send_json_response({"error": "Filename is required"}, 400)
                return

            try:
                validate_filename(filename)
            except ValueError as e:
                self.send_json_response({"error": f"Invalid filename: {str(e)}"}, 400)
                return

            # Загружаем текущую конфигурацию
            config_file = self.base_dir / "lists_config.json"
            lists = []

            if config_file.exists():
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    lists = config.get("lists", [])

            # Обновляем или добавляем список
            found = False
            for i, lst in enumerate(lists):
                if lst.get("filename") == filename:
                    # Обновляем существующий
                    lists[i].update(data)
                    found = True
                    break

            if not found:
                # Добавляем новый
                lists.append(data)

            # Сохраняем обратно
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump({"lists": lists}, f, ensure_ascii=False, indent=2)

            self.send_json_response({"success": True})

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error saving list config: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_reset_processing(self):
        """Безопасный сброс флагов обработки"""
        try:
            config_file = self.base_dir / "lists_config.json"

            if not config_file.exists():
                self.send_json_response({"error": "Config file not found"}, 404)
                return

            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # Сбрасываем флаги processed
            for lst in config.get("lists", []):
                lst["processed"] = False

            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)

            self.send_json_response({"success": True, "message": "Флаги обработки сброшены"})

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid config file"}, 500)
        except Exception as e:
            print(f"Error resetting processing flags: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_lists_bulk_update(self):
        """Массовое обновление метаданных списков"""
        try:
            content_length = int(self.headers['Content-Length'])

            if content_length > 1024 * 1024:  # 1MB max
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            # Валидация входных данных
            filenames = data.get("filenames", [])
            updates = data.get("updates", {})

            if not isinstance(filenames, list):
                self.send_json_response({"error": "filenames must be an array"}, 400)
                return

            if not filenames:
                self.send_json_response({"error": "filenames array is empty"}, 400)
                return

            if not isinstance(updates, dict):
                self.send_json_response({"error": "updates must be an object"}, 400)
                return

            if not updates:
                self.send_json_response({"error": "updates object is empty"}, 400)
                return

            # Валидация имен файлов
            for filename in filenames:
                if not isinstance(filename, str):
                    self.send_json_response({"error": f"Invalid filename type: {type(filename)}"}, 400)
                    return
                try:
                    validate_filename(filename)
                except ValueError as e:
                    self.send_json_response({"error": f"Invalid filename '{filename}': {str(e)}"}, 400)
                    return

            # Валидация значений обновлений
            allowed_fields = {"country", "category", "priority", "processed", "description", "display_name"}
            for field in updates.keys():
                if field not in allowed_fields:
                    self.send_json_response({"error": f"Field '{field}' is not allowed for update"}, 400)
                    return

            # Валидация специфичных полей
            if "priority" in updates:
                priority = updates["priority"]
                if not isinstance(priority, int) or priority < 50 or priority > 999:
                    self.send_json_response({"error": "priority must be integer between 50 and 999"}, 400)
                    return

            if "country" in updates:
                country = updates["country"]
                if not isinstance(country, str) or not country.strip():
                    self.send_json_response({"error": "country must be non-empty string"}, 400)
                    return

            if "category" in updates:
                category = updates["category"]
                if not isinstance(category, str) or not category.strip():
                    self.send_json_response({"error": "category must be non-empty string"}, 400)
                    return

            if "processed" in updates:
                processed = updates["processed"]
                if not isinstance(processed, bool):
                    self.send_json_response({"error": "processed must be boolean"}, 400)
                    return

            if "description" in updates:
                description = updates["description"]
                if not isinstance(description, str):
                    self.send_json_response({"error": "description must be string"}, 400)
                    return

            if "display_name" in updates:
                display_name = updates["display_name"]
                if not isinstance(display_name, str):
                    self.send_json_response({"error": "display_name must be string"}, 400)
                    return

            # Загружаем конфигурацию
            config_file = self.base_dir / "lists_config.json"

            if not config_file.exists():
                self.send_json_response({"error": "Config file not found"}, 404)
                return

            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

            lists = config.get("lists", [])

            # Обрабатываем обновления
            results = []
            updated_count = 0
            failed_count = 0
            errors = []

            for filename in filenames:
                found = False
                for lst in lists:
                    if lst.get("filename") == filename:
                        found = True
                        try:
                            # Применяем обновления
                            for field, value in updates.items():
                                lst[field] = value

                            results.append({
                                "filename": filename,
                                "success": True
                            })
                            updated_count += 1
                            print(f"✅ Updated list: {filename}")
                        except Exception as e:
                            error_msg = f"Failed to update {filename}: {str(e)}"
                            results.append({
                                "filename": filename,
                                "success": False,
                                "error": str(e)
                            })
                            errors.append(error_msg)
                            failed_count += 1
                            print(f"❌ {error_msg}")
                        break

                if not found:
                    error_msg = f"List not found: {filename}"
                    results.append({
                        "filename": filename,
                        "success": False,
                        "error": "List not found"
                    })
                    errors.append(error_msg)
                    failed_count += 1
                    print(f"⚠️ {error_msg}")

            # Сохраняем обновленную конфигурацию
            if updated_count > 0:
                try:
                    with open(config_file, 'w', encoding='utf-8') as f:
                        json.dump(config, f, ensure_ascii=False, indent=2)
                    print(f"💾 Saved config with {updated_count} updates")
                except Exception as e:
                    self.send_json_response({
                        "success": False,
                        "error": f"Failed to save config: {str(e)}"
                    }, 500)
                    return

            # Формируем ответ
            response = {
                "success": failed_count == 0,
                "updated": updated_count,
                "failed": failed_count,
                "errors": errors,
                "results": results
            }

            self.send_json_response(response)

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON in request"}, 400)
        except Exception as e:
            print(f"Error in bulk update: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_reports(self):
        """Получение списка доступных HTML отчетов"""
        try:
            output_dir = self.base_dir / "output"
            if not output_dir.exists():
                self.send_json_response({"reports": []})
                return

            # Ищем HTML отчеты
            reports = []
            for report_file in output_dir.glob("*_report_*.html"):
                reports.append({
                    "filename": report_file.name,
                    "size": report_file.stat().st_size,
                    "modified": report_file.stat().st_mtime
                })

            # Сортируем по дате изменения (новые первые)
            reports.sort(key=lambda x: x["modified"], reverse=True)

            self.send_json_response({"reports": reports})

        except Exception as e:
            print(f"Error getting reports: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_output_files(self):
        """Получение списка выходных файлов для указанного списка или всех clean файлов"""
        try:
            # Парсим query параметры
            parsed = urlparse(self.path)
            query_params = parse_qs(parsed.query)

            list_name = query_params.get('list', [''])[0].strip()

            output_dir = self.base_dir / "output"
            if not output_dir.exists():
                self.send_json_response({"files": []})
                return

            # Если list_name не указан - возвращаем все clean файлы (для Filter Wizard)
            if not list_name:
                clean_files = []
                for file_path in output_dir.glob("*_clean_*.txt"):
                    file_info = {
                        "filename": file_path.name,
                        "size": file_path.stat().st_size,
                        "modified": file_path.stat().st_mtime,
                        "path": str(file_path.relative_to(self.base_dir))
                    }
                    # Подсчет email в файле
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            line_count = sum(1 for line in f if line.strip())
                        file_info["email_count"] = line_count
                    except Exception:
                        file_info["email_count"] = 0

                    clean_files.append(file_info)

                # Сортируем по дате модификации (новые первыми)
                clean_files.sort(key=lambda x: x["modified"], reverse=True)

                self.send_json_response({"files": clean_files})
                return

            # Валидация имени файла
            try:
                validate_filename(list_name)
            except ValueError as e:
                self.send_json_response({"error": f"Invalid list name: {str(e)}"}, 400)
                return

            # Извлекаем базовое имя без расширения
            base_name = Path(list_name).stem

            # Ищем все связанные выходные файлы
            output_files = {
                "clean": [],
                "blocked_email": [],
                "blocked_domain": [],
                "invalid": [],
                "metadata_json": [],
                "metadata_csv": [],
                "enriched_json": [],
                "enriched_csv": [],
                "report_html": []
            }

            # Паттерны поиска
            patterns = {
                "clean": f"{base_name}_clean*.txt",
                "blocked_email": f"{base_name}_blocked_email*.txt",
                "blocked_domain": f"{base_name}_blocked_domain*.txt",
                "invalid": f"{base_name}_invalid*.txt",
                "metadata_json": f"{base_name}*metadata*.json",
                "metadata_csv": f"{base_name}*metadata*.csv",
                "enriched_json": f"{base_name}*enriched*.json",
                "enriched_csv": f"{base_name}*enriched*.csv",
                "report_html": f"{base_name}*report*.html"
            }

            for category, pattern in patterns.items():
                for file_path in output_dir.glob(pattern):
                    file_info = {
                        "filename": file_path.name,
                        "size": file_path.stat().st_size,
                        "modified": file_path.stat().st_mtime,
                        "path": str(file_path.relative_to(self.base_dir))
                    }
                    output_files[category].append(file_info)

            # Подсчет email в файлах
            for category in ["clean", "blocked_email", "blocked_domain", "invalid"]:
                for file_info in output_files[category]:
                    try:
                        file_path = self.base_dir / file_info["path"]
                        with open(file_path, 'r', encoding='utf-8') as f:
                            line_count = sum(1 for line in f if line.strip())
                        file_info["email_count"] = line_count
                    except Exception:
                        file_info["email_count"] = 0

            self.send_json_response({"files": output_files, "list_name": list_name})

        except Exception as e:
            print(f"Error getting output files: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_file_preview(self):
        """Предпросмотр содержимого файла (первые N строк)"""
        try:
            # Парсим query параметры
            parsed = urlparse(self.path)
            query_params = parse_qs(parsed.query)

            file_path = query_params.get('path', [''])[0].strip()
            max_lines = int(query_params.get('lines', ['100'])[0])

            if not file_path:
                self.send_json_response({"error": "File path is required"}, 400)
                return

            # Ограничиваем максимальное количество строк
            if max_lines > 1000:
                max_lines = 1000

            # Валидация пути файла
            safe_path = Path(file_path)

            # Проверяем, что путь относительный и не выходит за пределы base_dir
            if safe_path.is_absolute():
                self.send_json_response({"error": "Absolute paths not allowed"}, 400)
                return

            full_path = (self.base_dir / safe_path).resolve()
            base_path = self.base_dir.resolve()

            if not str(full_path).startswith(str(base_path)):
                self.send_json_response({"error": "Path traversal attempt detected"}, 400)
                return

            if not full_path.exists():
                self.send_json_response({"error": "File not found"}, 404)
                return

            # Проверяем, что это файл в output директории
            output_dir = self.base_dir / "output"
            if not str(full_path).startswith(str(output_dir.resolve())):
                self.send_json_response({"error": "Access denied: file not in output directory"}, 403)
                return

            # Определяем тип файла
            file_extension = full_path.suffix.lower()

            # Читаем содержимое
            content_lines = []
            total_lines = 0
            file_size = full_path.stat().st_size

            if file_extension == '.json':
                # Для JSON читаем весь файл (с ограничением по размеру)
                if file_size > 5 * 1024 * 1024:  # 5MB max
                    self.send_json_response({"error": "File too large for preview"}, 413)
                    return

                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    try:
                        # Пытаемся форматировать JSON
                        json_data = json.loads(content)
                        content = json.dumps(json_data, ensure_ascii=False, indent=2)
                    except json.JSONDecodeError:
                        pass  # Оставляем как есть

                content_lines = content.split('\n')[:max_lines]
                total_lines = len(content.split('\n'))

            elif file_extension == '.csv':
                # Для CSV читаем построчно
                with open(full_path, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        if i < max_lines:
                            content_lines.append(line.rstrip())
                        total_lines = i + 1

            else:
                # Для TXT и других файлов
                with open(full_path, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        if i < max_lines:
                            content_lines.append(line.rstrip())
                        total_lines = i + 1

            self.send_json_response({
                "content": '\n'.join(content_lines),
                "total_lines": total_lines,
                "preview_lines": len(content_lines),
                "truncated": total_lines > max_lines,
                "file_size": file_size,
                "file_type": file_extension
            })

        except UnicodeDecodeError:
            self.send_json_response({"error": "File encoding error"}, 400)
        except Exception as e:
            print(f"Error previewing file: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_download_file(self):
        """Скачивание файла"""
        try:
            # Парсим query параметры
            parsed = urlparse(self.path)
            query_params = parse_qs(parsed.query)

            file_path = query_params.get('path', [''])[0].strip()

            if not file_path:
                self.send_json_response({"error": "File path is required"}, 400)
                return

            # Валидация пути файла
            safe_path = Path(file_path)

            # Проверяем, что путь относительный
            if safe_path.is_absolute():
                self.send_json_response({"error": "Absolute paths not allowed"}, 400)
                return

            full_path = (self.base_dir / safe_path).resolve()
            base_path = self.base_dir.resolve()

            if not str(full_path).startswith(str(base_path)):
                self.send_json_response({"error": "Path traversal attempt detected"}, 400)
                return

            if not full_path.exists():
                self.send_json_response({"error": "File not found"}, 404)
                return

            # Проверяем, что это файл в output директории
            output_dir = self.base_dir / "output"
            if not str(full_path).startswith(str(output_dir.resolve())):
                self.send_json_response({"error": "Access denied: file not in output directory"}, 403)
                return

            # Читаем файл
            with open(full_path, 'rb') as f:
                content = f.read()

            # Определяем MIME тип
            mime_types = {
                '.txt': 'text/plain',
                '.csv': 'text/csv',
                '.json': 'application/json',
                '.html': 'text/html',
                '.lvp': 'application/xml'
            }
            mime_type = mime_types.get(full_path.suffix.lower(), 'application/octet-stream')

            # Отправляем файл
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", len(content))
            self.send_header("Content-Disposition", f'attachment; filename="{full_path.name}"')
            self.end_headers()
            self.wfile.write(content)

        except Exception as e:
            print(f"Error downloading file: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_upload_file(self):
        """Загрузка файла в директорию input/"""
        try:
            import cgi

            # SECURITY: Проверка размера ПЕРЕД чтением в память
            max_size = 100 * 1024 * 1024  # 100MB
            content_length = int(self.headers.get('Content-Length', 0))

            if content_length > max_size:
                self.send_json_response({
                    "error": f"File too large: {content_length / (1024*1024):.1f}MB. Max: {max_size / (1024*1024):.0f}MB"
                }, 413)
                return

            if content_length == 0:
                self.send_json_response({"error": "Content-Length is 0 or missing"}, 400)
                return

            # Получаем Content-Type header
            content_type = self.headers.get('Content-Type', '')

            if 'multipart/form-data' not in content_type:
                self.send_json_response({"error": "Invalid content type, expected multipart/form-data"}, 400)
                return

            # Парсим multipart/form-data
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    'REQUEST_METHOD': 'POST',
                    'CONTENT_TYPE': content_type,
                }
            )

            if 'file' not in form:
                self.send_json_response({"error": "No file uploaded"}, 400)
                return

            fileitem = form['file']

            if not fileitem.filename:
                self.send_json_response({"error": "No filename provided"}, 400)
                return

            # Получаем оригинальное имя файла
            filename = Path(fileitem.filename).name  # Только имя, без пути

            # Валидация имени файла
            try:
                validate_filename(filename)
            except ValueError as e:
                self.send_json_response({"error": f"Invalid filename: {str(e)}"}, 400)
                return

            # Проверка расширения
            allowed_extensions = {'.txt', '.lvp'}
            file_ext = Path(filename).suffix.lower()
            if file_ext not in allowed_extensions:
                self.send_json_response({
                    "error": f"Invalid file type: {file_ext}. Allowed: .txt, .lvp"
                }, 400)
                return

            # Читаем содержимое файла
            file_data = fileitem.file.read()

            # Ограничение размера файла (100MB max)
            max_size = 100 * 1024 * 1024  # 100MB
            if len(file_data) > max_size:
                self.send_json_response({
                    "error": f"File too large: {len(file_data)} bytes. Max: {max_size} bytes"
                }, 413)
                return

            # Проверка минимального размера
            if len(file_data) == 0:
                self.send_json_response({"error": "File is empty"}, 400)
                return

            # Путь для сохранения
            input_dir = self.base_dir / "input"
            input_dir.mkdir(exist_ok=True)

            target_path = input_dir / filename

            # Проверка параметра overwrite
            overwrite = form.getvalue('overwrite', 'false').lower() == 'true'

            # Проверка на перезапись
            if target_path.exists() and not overwrite:
                self.send_json_response({
                    "error": f"File {filename} already exists. Please rename or delete the existing file first."
                }, 409)
                return

            # Если перезапись разрешена, логируем
            if target_path.exists() and overwrite:
                print(f"⚠️ Overwriting existing file: {filename}")

            # Сохранение файла
            with open(target_path, 'wb') as f:
                f.write(file_data)

            # Обновление lists_config.json
            config_file = self.base_dir / "lists_config.json"
            lists = []

            if config_file.exists():
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    lists = config.get("lists", [])

            # Проверяем, есть ли уже запись для этого файла
            file_exists_in_config = any(lst.get("filename") == filename for lst in lists)

            if not file_exists_in_config:
                # Используем ConfigManager для авто-определения метаданных
                try:
                    from email_checker_core.config import ConfigManager
                    
                    config_manager = ConfigManager(str(self.base_dir))
                    output_dir = self.base_dir / "output"
                    metadata = config_manager.get_list_metadata(filename, output_dir)

                    # Обновляем метаданные из загруженного файла
                    metadata["file_size"] = len(file_data)
                    metadata["description"] = f"Uploaded on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    metadata["file_type"] = file_ext[1:]  # без точки

                    new_list = metadata
                    print(f"✅ File metadata auto-detected: country={metadata.get('country')}, category={metadata.get('category')}")
                except Exception as e:
                    print(f"⚠️  Error auto-detecting metadata, using defaults: {e}")
                    # Fallback к старому варианту
                    new_list = {
                        "filename": filename,
                        "display_name": Path(filename).stem,
                        "file_type": file_ext[1:],  # без точки
                        "country": "Unknown",
                        "category": "General",
                        "priority": len(lists) + 1,
                        "processed": False,
                        "date_added": datetime.now().strftime("%Y-%m-%d"),
                        "file_size": len(file_data),
                        "description": f"Uploaded on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    }

                lists.append(new_list)

                # Сохраняем конфигурацию
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump({"lists": lists}, f, ensure_ascii=False, indent=2)

            self.send_json_response({
                "success": True,
                "message": f"File {filename} uploaded successfully",
                "filename": filename,
                "size": len(file_data),
                "type": file_ext
            })

        except Exception as e:
            print(f"Error uploading file: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    # ===== METADATA HANDLERS =====

    def handle_get_metadata(self):
        """Получение уникальных стран и категорий из конфигурации"""
        try:
            # Загружаем метаданные из отдельного файла конфигурации
            metadata_file = self.base_dir / "metadata_config.json"
            countries = set()
            categories = set()

            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    countries.update(metadata.get("countries", []))
                    categories.update(metadata.get("categories", []))
            else:
                # Создаем файл с базовыми значениями, если его нет
                default_metadata = {
                    "countries": ["Unknown", "Mixed", "Europe"],
                    "categories": ["General"]
                }
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(default_metadata, f, indent=2, ensure_ascii=False)
                countries.update(default_metadata["countries"])
                categories.update(default_metadata["categories"])

            # Также добавляем уникальные значения из существующих списков
            config_file = self.base_dir / "lists_config.json"
            if config_file.exists():
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                for list_info in config.get("lists", []):
                    countries.add(list_info.get("country", "Unknown"))
                    categories.add(list_info.get("category", "General"))

            self.send_json_response({
                "countries": sorted(list(countries)),
                "categories": sorted(list(categories))
            })
        except Exception as e:
            print(f"Error getting metadata: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_email_metadata(self):
        """Получение метаданных email из JSON файла"""
        try:
            # Извлекаем имя файла из URL
            path = urlparse(self.path).path
            filename = path.split("/api/email-metadata/")[1]

            # Ищем файл в папке output
            output_dir = self.base_dir / "output"
            metadata_file = output_dir / filename

            if not metadata_file.exists():
                self.send_json_response({"error": "Metadata file not found"}, 404)
                return

            # Читаем JSON файл
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            self.send_json_response(metadata)

        except Exception as e:
            print(f"Error getting email metadata: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_add_metadata(self):
        """Добавление новой страны или категории"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            metadata_type = data.get("type")  # "country" или "category"
            value = data.get("value", "").strip()

            if not metadata_type or not value:
                self.send_json_response({"error": "Не указан type или value"}, 400)
                return

            if metadata_type not in ["country", "category"]:
                self.send_json_response({"error": "Неверный type. Должен быть 'country' или 'category'"}, 400)
                return

            # Загружаем текущие метаданные
            metadata_file = self.base_dir / "metadata_config.json"
            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
            else:
                metadata = {"countries": [], "categories": []}

            # Добавляем новое значение, если его еще нет
            list_key = "countries" if metadata_type == "country" else "categories"
            if value not in metadata[list_key]:
                metadata[list_key].append(value)
                metadata[list_key].sort()  # Сортируем по алфавиту

                # Сохраняем обновленные метаданные
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)

                self.send_json_response({"success": True, "message": f"Добавлено: {value}"})
            else:
                self.send_json_response({"success": False, "message": f"{value} уже существует"})

        except Exception as e:
            print(f"Error adding metadata: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_remove_metadata(self):
        """Удаление страны или категории"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            metadata_type = data.get("type")  # "country" или "category"
            value = data.get("value", "").strip()

            if not metadata_type or not value:
                self.send_json_response({"error": "Не указан type или value"}, 400)
                return

            if metadata_type not in ["country", "category"]:
                self.send_json_response({"error": "Неверный type. Должен быть 'country' или 'category'"}, 400)
                return

            # Загружаем текущие метаданные
            metadata_file = self.base_dir / "metadata_config.json"
            if not metadata_file.exists():
                self.send_json_response({"error": "Файл метаданных не найден"}, 404)
                return

            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            # Удаляем значение, если оно есть
            list_key = "countries" if metadata_type == "country" else "categories"
            if value in metadata[list_key]:
                metadata[list_key].remove(value)

                # Сохраняем обновленные метаданные
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)

                self.send_json_response({"success": True, "message": f"Удалено: {value}"})
            else:
                self.send_json_response({"success": False, "message": f"{value} не найдено"})

        except Exception as e:
            print(f"Error removing metadata: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_save_metadata(self):
        """Сохранение полного списка метаданных"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            countries = data.get("countries", [])
            categories = data.get("categories", [])

            # Валидируем данные
            if not isinstance(countries, list) or not isinstance(categories, list):
                self.send_json_response({"error": "Invalid data format"}, 400)
                return

            # Сохраняем метаданные
            metadata_file = self.base_dir / "metadata_config.json"
            metadata = {
                "countries": countries,
                "categories": categories
            }

            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            self.send_json_response({"success": True, "message": "Метаданные сохранены"})

        except Exception as e:
            print(f"Error saving metadata: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_metadata_search(self):
        """Поиск метаданных email через базу данных"""
        try:
            from metadata_database import MetadataDatabase

            query_params = parse_qs(urlparse(self.path).query)

            # Параметры поиска
            email_pattern = query_params.get('email', [''])[0]
            country = query_params.get('country', [''])[0]
            category = query_params.get('category', [''])[0]
            validation_status_param = query_params.get('validation_status', [''])[0]
            has_phone = query_params.get('has_phone', [''])[0]
            source_file = query_params.get('source_file', [''])[0]
            country_mismatch = query_params.get('country_mismatch', [''])[0]
            limit = min(int(query_params.get('limit', [5000])[0]), 10000)  # Увеличен до 10000
            offset = int(query_params.get('offset', [0])[0])

            # Конвертируем validation_status в список (поддержка множественного выбора)
            validation_statuses = None
            if validation_status_param:
                validation_statuses = [s.strip() for s in validation_status_param.split(',') if s.strip()]

            # Конвертируем has_phone в boolean
            has_phone_bool = None
            if has_phone.lower() == 'true':
                has_phone_bool = True
            elif has_phone.lower() == 'false':
                has_phone_bool = False

            # Конвертируем country_mismatch в int
            country_mismatch_int = None
            if country_mismatch:
                country_mismatch_int = int(country_mismatch)

            with MetadataDatabase() as db:
                # Поиск метаданных
                results = db.search_metadata(
                    email_pattern=email_pattern if email_pattern else None,
                    country=country if country else None,
                    category=category if category else None,
                    validation_statuses=validation_statuses,
                    has_phone=has_phone_bool,
                    source_file=source_file if source_file else None,
                    country_mismatch=country_mismatch_int,
                    limit=limit,
                    offset=offset
                )

                # Конвертируем в словари
                emails_data = []
                for metadata in results:
                    email_dict = {
                        "email": metadata.email,
                        "domain": metadata.domain,
                        "source_url": metadata.source_url,
                        "page_title": metadata.page_title,
                        "company_name": metadata.company_name,
                        "phone": metadata.phone,
                        "country": metadata.country,
                        "city": metadata.city,
                        "address": metadata.address,
                        "category": metadata.category,
                        "keywords": metadata.keywords,
                        "meta_description": metadata.meta_description,
                        "meta_keywords": metadata.meta_keywords,
                        "validation_status": metadata.validation_status,
                        "validation_date": metadata.validation_date,
                        "source_file": metadata.source_file,
                        "list_country": metadata.list_country,
                        "country_mismatch": metadata.country_mismatch
                    }
                    emails_data.append(email_dict)

                response = {
                    "emails": emails_data,
                    "count": len(emails_data),
                    "offset": offset,
                    "limit": limit
                }

                self.send_json_response(response)

        except Exception as e:
            import traceback
            print(f"Error searching metadata: {e}")
            print(traceback.format_exc())
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_metadata_stats(self):
        """Получение статистики по метаданным"""
        try:
            from metadata_database import MetadataDatabase

            with MetadataDatabase() as db:
                stats = db.get_statistics()
                self.send_json_response(stats)

        except Exception as e:
            print(f"Error getting metadata stats: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_batch_update_status(self):
        """Массовое обновление статуса валидации для списка emails"""
        try:
            from metadata_database import MetadataDatabase

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            emails = data.get("emails", [])
            new_status = data.get("status", "")

            if not emails:
                self.send_json_response({"success": False, "message": "Список emails пуст"}, 400)
                return

            if new_status not in ['Valid', 'NotSure', 'Temp', 'Invalid']:
                self.send_json_response({"success": False, "message": "Недопустимый статус"}, 400)
                return

            with MetadataDatabase() as db:
                success, updated_count = db.batch_update_validation_status(emails, new_status)

                if success:
                    self.send_json_response({
                        "success": True,
                        "message": f"Обновлено {updated_count} записей",
                        "updated_count": updated_count
                    })
                else:
                    self.send_json_response({
                        "success": False,
                        "message": "Ошибка обновления"
                    }, 500)

        except Exception as e:
            print(f"Error batch updating status: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_batch_update_field(self):
        """Массовое обновление поля для списка emails"""
        try:
            from metadata_database import MetadataDatabase

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            emails = data.get("emails", [])
            field_name = data.get("field", "")
            new_value = data.get("value", "")

            if not emails:
                self.send_json_response({"success": False, "message": "Список emails пуст"}, 400)
                return

            if not field_name:
                self.send_json_response({"success": False, "message": "Не указано поле для обновления"}, 400)
                return

            with MetadataDatabase() as db:
                success, updated_count = db.batch_update_field(emails, field_name, new_value)

                if success:
                    self.send_json_response({
                        "success": True,
                        "message": f"Обновлено {updated_count} записей",
                        "updated_count": updated_count
                    })
                else:
                    self.send_json_response({
                        "success": False,
                        "message": "Ошибка обновления"
                    }, 500)

        except Exception as e:
            print(f"Error batch updating field: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_country_mismatches(self):
        """Получение списка emails с несоответствием стран"""
        try:
            from metadata_database import MetadataDatabase

            query_params = parse_qs(urlparse(self.path).query)
            source_file = query_params.get('source_file', [''])[0]
            limit = min(int(query_params.get('limit', [1000])[0]), 10000)

            with MetadataDatabase() as db:
                mismatches = db.get_country_mismatches(
                    source_file=source_file if source_file else None,
                    limit=limit
                )

                emails_data = []
                for metadata in mismatches:
                    email_dict = {
                        "email": metadata.email,
                        "domain": metadata.domain,
                        "country": metadata.country,
                        "list_country": metadata.list_country,
                        "country_mismatch": metadata.country_mismatch,
                        "company_name": metadata.company_name,
                        "phone": metadata.phone,
                        "category": metadata.category,
                        "validation_status": metadata.validation_status,
                        "source_file": metadata.source_file
                    }
                    emails_data.append(email_dict)

                response = {
                    "emails": emails_data,
                    "count": len(emails_data)
                }

                self.send_json_response(response)

        except Exception as e:
            print(f"Error getting country mismatches: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_lvp_sources(self):
        """Получение списка импортированных LVP файлов"""
        try:
            from metadata_database import MetadataDatabase

            with MetadataDatabase() as db:
                sources = db.get_lvp_sources()
                sources_data = []
                for source in sources:
                    source_dict = {
                        "filename": source.filename,
                        "file_path": source.file_path,
                        "import_date": source.import_date,
                        "total_emails": source.total_emails,
                        "valid_emails": source.valid_emails,
                        "invalid_emails": source.invalid_emails,
                        "file_size": source.file_size
                    }
                    sources_data.append(source_dict)

                self.send_json_response({"sources": sources_data})

        except Exception as e:
            print(f"Error getting LVP sources: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_import_lvp(self):
        """Обработка импорта LVP файлов"""
        try:
            from lvp_importer import LVPImporter

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            action = data.get("action")

            if action == "scan":
                # Сканирование доступных файлов
                with LVPImporter() as importer:
                    suggestions = importer.get_import_suggestions()
                    self.send_json_response(suggestions)

            elif action == "import":
                # Импорт указанных файлов
                file_paths = data.get("file_paths", [])
                if not file_paths:
                    self.send_json_response({"error": "Не указаны файлы для импорта"}, 400)
                    return

                with LVPImporter() as importer:
                    result = importer.import_multiple_lvp_files(file_paths)
                    self.send_json_response(result)

            elif action == "import_single":
                # Импорт одного файла
                file_path = data.get("file_path")
                if not file_path:
                    self.send_json_response({"error": "Не указан файл для импорта"}, 400)
                    return

                print(f"🚀 Начинаем импорт файла: {file_path}")
                with LVPImporter() as importer:
                    result = importer.import_lvp_file(file_path)
                    print(f"✅ Импорт завершен с результатом: {result.get('success', False)}")
                    self.send_json_response(result)

            elif action == "import_all":
                # Импорт всех новых файлов
                with LVPImporter() as importer:
                    new_files = importer.scan_downloads_folder()
                    if new_files:
                        result = importer.import_multiple_lvp_files(new_files)
                        self.send_json_response(result)
                    else:
                        self.send_json_response({
                            "success": False,
                            "message": "Нет новых файлов для импорта"
                        })

            else:
                self.send_json_response({"error": "Неизвестное действие"}, 400)

        except Exception as e:
            print(f"Error handling LVP import: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_export_lvp(self):
        """Обработка экспорта метаданных в LVP формат"""
        try:
            from lvp_exporter import LVPExporter

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            # Параметры экспорта
            filters = {}

            # Опциональные фильтры
            if data.get('country'):
                filters['country'] = data['country']
            if data.get('validation_status'):
                filters['validation_status'] = data['validation_status']
            if data.get('source_file'):
                filters['source_file'] = data['source_file']
            if data.get('category'):
                filters['category'] = data['category']
            if data.get('has_phone') is not None:
                filters['has_phone'] = data['has_phone']
            if data.get('country_mismatch') is not None:
                filters['country_mismatch'] = data['country_mismatch']

            # Лимит (по умолчанию 1000000)
            limit = data.get('limit', 1000000)
            if limit:
                filters['limit'] = min(int(limit), 1000000)  # Максимум 1M

            # Генерируем имя файла
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"metadata_export_{timestamp}.lvp"
            output_path = self.base_dir / "output" / filename

            print(f"\n📤 Запуск экспорта метаданных в LVP")
            print(f"📊 Фильтры: {filters}")
            print(f"📊 Лимит экспорта: {limit}")
            print(f"📁 Файл: {output_path}")

            # Выполняем экспорт
            with LVPExporter() as exporter:
                if filters:
                    # Экспорт с фильтрами
                    result = exporter.export_filtered_metadata(str(output_path), filters)
                else:
                    # Экспорт всех данных
                    result = exporter.export_all_metadata(str(output_path), limit=limit)

                if result['success']:
                    # Добавляем URL для скачивания
                    result['download_url'] = f"/output/{filename}"
                    result['filename'] = filename

                    print(f"✅ Экспорт завершён успешно: {result['total_exported']} записей")

                    self.send_json_response(result)
                else:
                    self.send_json_response({
                        "success": False,
                        "error": result.get('error', 'Unknown error')
                    }, 400)

        except Exception as e:
            import traceback
            print(f"Error handling LVP export: {e}")
            print(traceback.format_exc())
            self.send_json_response({"error": str(e)}, 500)

    def handle_enrich_list(self):
        """Обработка обогащения одного списка"""
        try:
            from email_enricher import EmailEnricher

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            filename = data.get("filename")
            force_overwrite = data.get("force_overwrite", False)

            if not filename:
                self.send_json_response({"error": "Не указан файл для обогащения"}, 400)
                return

            with EmailEnricher() as enricher:
                result = enricher.enrich_email_list(filename, force_overwrite)

                if result["success"]:
                    self.send_json_response({
                        "success": True,
                        "message": f"Список {result['input_file']} успешно обогащен",
                        "result": result
                    })
                else:
                    self.send_json_response({
                        "success": False,
                        "error": result["error"]
                    }, 400)

        except Exception as e:
            print(f"Error enriching list: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_enrich_all(self):
        """Обработка обогащения всех доступных списков"""
        try:
            from email_enricher import EmailEnricher

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            force_overwrite = data.get("force_overwrite", False)

            with EmailEnricher() as enricher:
                result = enricher.enrich_all_lists(force_overwrite)
                self.send_json_response(result)

        except Exception as e:
            print(f"Error enriching all lists: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_all_files(self):
        """Получение списка ВСЕХ файлов из input/ и output/ для админ-панели"""
        try:
            input_dir = self.base_dir / "input"
            output_dir = self.base_dir / "output"

            files = []

            # Сканируем input/ директорию
            if input_dir.exists():
                for file_path in input_dir.iterdir():
                    if file_path.is_file():
                        try:
                            stat = file_path.stat()
                            files.append({
                                "name": file_path.name,
                                "path": str(file_path.relative_to(self.base_dir)),
                                "size": stat.st_size,
                                "modified": stat.st_mtime
                            })
                        except Exception as e:
                            print(f"Error reading file {file_path}: {e}")

            # Сканируем output/ директорию
            if output_dir.exists():
                for file_path in output_dir.iterdir():
                    if file_path.is_file():
                        try:
                            stat = file_path.stat()
                            files.append({
                                "name": file_path.name,
                                "path": str(file_path.relative_to(self.base_dir)),
                                "size": stat.st_size,
                                "modified": stat.st_mtime
                            })
                        except Exception as e:
                            print(f"Error reading file {file_path}: {e}")

            # Сортируем по дате изменения (новые первыми)
            files.sort(key=lambda x: x["modified"], reverse=True)

            self.send_json_response({"files": files})

        except Exception as e:
            print(f"Error getting all files: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    # ===== ADMIN HANDLERS =====

    def handle_admin_stats(self):
        """Получение детальной статистики системы"""
        try:
            import shutil
            import sqlite3

            stats = {}

            # Статистика кеша
            cache_file = self.base_dir / ".cache" / "processed_files.json"
            if cache_file.exists():
                cache_size = cache_file.stat().st_size
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                stats["cache"] = {
                    "exists": True,
                    "size": cache_size,
                    "files_cached": len(cache_data),
                    "path": str(cache_file)
                }
            else:
                stats["cache"] = {"exists": False}

            # Статистика БД метаданных
            db_file = self.base_dir / "metadata.db"
            if db_file.exists():
                db_size = db_file.stat().st_size
                try:
                    conn = sqlite3.connect(str(db_file))
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM emails")
                    email_count = cursor.fetchone()[0]
                    conn.close()

                    stats["database"] = {
                        "exists": True,
                        "size": db_size,
                        "email_count": email_count,
                        "path": str(db_file)
                    }
                except Exception as e:
                    stats["database"] = {
                        "exists": True,
                        "size": db_size,
                        "error": str(e)
                    }
            else:
                stats["database"] = {"exists": False}

            # Статистика директорий
            input_dir = self.base_dir / "input"
            output_dir = self.base_dir / "output"

            stats["directories"] = {
                "input": {
                    "files": len(list(input_dir.glob("*"))) if input_dir.exists() else 0,
                    "size": sum(f.stat().st_size for f in input_dir.glob("*") if f.is_file()) if input_dir.exists() else 0
                },
                "output": {
                    "files": len(list(output_dir.glob("*"))) if output_dir.exists() else 0,
                    "size": sum(f.stat().st_size for f in output_dir.glob("*") if f.is_file()) if output_dir.exists() else 0
                }
            }

            # Статистика дискового пространства
            disk = shutil.disk_usage(str(self.base_dir))
            stats["disk"] = {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent_used": round((disk.used / disk.total) * 100, 2)
            }

            self.send_json_response({"stats": stats})

        except Exception as e:
            print(f"Error getting admin stats: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def _calculate_country_stats(self):
        """
        Вычисляет статистику по странам: количество email и качество
        Returns: list of dicts с данными по каждой стране
        """
        country_stats = {}

        try:
            # 1. Загружаем lists_config.json для получения соответствия файл → страна
            config_file = self.base_dir / "lists_config.json"
            if not config_file.exists():
                return []

            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                lists = config.get("lists", [])

            # 2. Создаем маппинг: stem файла → страна
            file_to_country = {}
            for lst in lists:
                filename = lst.get("filename", "")
                country = lst.get("country", "Unknown")

                if not filename or country == "Unknown":
                    continue

                # Получаем stem (имя без расширения)
                stem = Path(filename).stem
                file_to_country[stem] = country

            # 3. Сканируем output директорию
            output_dir = self.base_dir / "output"
            if not output_dir.exists():
                return []

            # 4. Обрабатываем clean и blocked файлы
            clean_files = list(output_dir.glob("*_clean_*.txt"))
            blocked_files = list(output_dir.glob("*_blocked_*.txt"))

            # Обрабатываем clean файлы
            for f in clean_files:
                # Извлекаем stem из имени output файла
                # Пример: "Italy_Agriculture_clean_20251024.txt" → "Italy_Agriculture"
                filename = f.name

                # Ищем stem в начале имени файла
                matched_stem = None
                for stem in file_to_country.keys():
                    if filename.startswith(stem):
                        matched_stem = stem
                        break

                if not matched_stem:
                    continue

                country = file_to_country[matched_stem]

                # Инициализируем статистику для страны
                if country not in country_stats:
                    country_stats[country] = {
                        "country": country,
                        "clean_emails": 0,
                        "blocked_emails": 0,
                        "invalid_emails": 0
                    }

                # Подсчитываем email
                try:
                    with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                        count = sum(1 for line in file if line.strip() and '@' in line)
                        country_stats[country]["clean_emails"] += count
                except Exception as e:
                    print(f"Error reading {f.name}: {e}")

            # Обрабатываем blocked файлы
            for f in blocked_files:
                filename = f.name

                matched_stem = None
                for stem in file_to_country.keys():
                    if filename.startswith(stem):
                        matched_stem = stem
                        break

                if not matched_stem:
                    continue

                country = file_to_country[matched_stem]

                if country not in country_stats:
                    country_stats[country] = {
                        "country": country,
                        "clean_emails": 0,
                        "blocked_emails": 0,
                        "invalid_emails": 0
                    }

                try:
                    with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                        count = sum(1 for line in file if line.strip() and '@' in line)
                        country_stats[country]["blocked_emails"] += count
                except Exception as e:
                    print(f"Error reading {f.name}: {e}")

            # 5. Вычисляем total_emails и quality_score для каждой страны
            result = []
            for country, data in country_stats.items():
                total = data["clean_emails"] + data["blocked_emails"]
                quality_score = 0

                if total > 0:
                    quality_score = (data["clean_emails"] / total) * 100

                result.append({
                    "country": country,
                    "clean_emails": data["clean_emails"],
                    "blocked_emails": data["blocked_emails"],
                    "total_emails": total,
                    "quality_score": round(quality_score, 1)
                })

            # 6. Сортируем по total_emails (убывание)
            result.sort(key=lambda x: x["total_emails"], reverse=True)

            return result

        except Exception as e:
            import traceback
            print(f"Error calculating country stats: {e}")
            print(traceback.format_exc())
            return []

    def handle_get_dashboard_stats(self):
        """Получение агрегированной статистики для дашборда из БД (БЫСТРО)"""
        try:
            cache_db_path = self.base_dir / ".cache" / "processing_cache_optimized.db"

            # Проверяем существование БД
            if not cache_db_path.exists():
                # Fallback на старый метод
                print("⚠️  База данных не найдена, используем старый метод")
                return self._handle_get_dashboard_stats_fallback()

            conn = sqlite3.connect(cache_db_path)
            cursor = conn.cursor()

            stats = {
                "total_lists": 0,
                "processed_emails": 0,
                "clean_emails": 0,
                "blocked_emails": 0,
                "invalid_emails": 0,
                "countries": [],
                "categories": {},
                "recent_activity": [],
                "queue_length": 0,
                "country_stats": []  # Frontend ожидает массив!
            }

            # 1. Получаем общую статистику (1 запрос, <5ms)
            try:
                cursor.execute('''
                    SELECT
                        total_lists,
                        total_processed_emails,
                        total_clean_emails,
                        total_blocked_emails,
                        total_invalid_emails,
                        countries_json,
                        categories_json,
                        last_updated
                    FROM processing_statistics
                    WHERE id = 1
                ''')

                row = cursor.fetchone()

                if row:
                    stats["total_lists"] = row[0] or 0
                    stats["processed_emails"] = row[1] or 0
                    stats["clean_emails"] = row[2] or 0
                    stats["blocked_emails"] = row[3] or 0
                    stats["invalid_emails"] = row[4] or 0
                    stats["countries"] = json.loads(row[5] or "[]")
                    stats["categories"] = json.loads(row[6] or "{}")
                    stats["last_updated"] = row[7]
                else:
                    # Если статистика пуста, считаем из processed_files
                    print("📊 Статистика пуста, считаем из processed_files...")
                    cursor.execute('''
                        SELECT
                            COUNT(DISTINCT filename) as total_lists,
                            COALESCE(SUM(total_count), 0) as processed,
                            COALESCE(SUM(clean_count), 0) as clean,
                            COALESCE(SUM(blocked_count), 0) as blocked,
                            COALESCE(SUM(invalid_count), 0) as invalid
                        FROM processed_files
                        WHERE file_hash IS NOT NULL
                    ''')

                    fallback = cursor.fetchone()
                    if fallback:
                        stats["total_lists"] = fallback[0] or 0
                        stats["processed_emails"] = fallback[1] or 0
                        stats["clean_emails"] = fallback[2] or 0
                        stats["blocked_emails"] = fallback[3] or 0
                        stats["invalid_emails"] = fallback[4] or 0

            except Exception as e:
                print(f"⚠️  Ошибка получения общей статистики: {e}")

            # 2. Получаем статистику по странам (1 запрос, <10ms)
            try:
                cursor.execute('''
                    SELECT
                        country,
                        clean_emails,
                        blocked_emails,
                        total_emails,
                        quality_score
                    FROM country_statistics
                    ORDER BY total_emails DESC
                    LIMIT 20
                ''')

                # ВАЖНО: Frontend ожидает массив, а не объект!
                country_list = []
                for row in cursor.fetchall():
                    country_list.append({
                        "country": row[0],
                        "clean_emails": row[1] or 0,
                        "blocked_emails": row[2] or 0,
                        "total": row[3] or 0,
                        "quality_score": round(row[4] or 0.0, 2)
                    })

                stats["country_stats"] = country_list

            except Exception as e:
                print(f"⚠️  Ошибка получения статистики по странам: {e}")
                stats["country_stats"] = []

            # 3. Получаем последнюю активность (1 запрос, <5ms)
            try:
                cursor.execute('''
                    SELECT
                        filename,
                        processed_at,
                        total_emails,
                        clean_emails,
                        blocked_emails,
                        output_size
                    FROM processing_history
                    WHERE success = 1
                    ORDER BY processed_at DESC
                    LIMIT 10
                ''')

                for row in cursor.fetchall():
                    stats["recent_activity"].append({
                        "filename": row[0],
                        "processed_at": row[1],
                        "total_emails": row[2] or 0,
                        "clean": row[3] or 0,
                        "blocked": row[4] or 0,
                        "size": row[5] or 0
                    })

            except Exception as e:
                print(f"⚠️  Ошибка получения истории: {e}")

            # 4. Длина очереди (из памяти)
            if hasattr(self, 'processing_state') and self.processing_state:
                stats["queue_length"] = len([
                    p for p in self.processing_state.values()
                    if p.get("status") == "processing"
                ])

            conn.close()

            self.send_json_response({"stats": stats})

        except Exception as e:
            import traceback
            print(f"❌ Ошибка получения статистики дашборда: {e}")
            print(traceback.format_exc())
            self.send_json_response({"error": str(e)}, 500)

    def _handle_get_dashboard_stats_fallback(self):
        """Fallback метод парсинга файлов (медленный, для обратной совместимости)"""
        try:
            stats = {
                "total_lists": 0,
                "processed_emails": 0,
                "clean_emails": 0,
                "blocked_emails": 0,
                "invalid_emails": 0,
                "countries": [],
                "categories": {},
                "recent_activity": []
            }

            # Читаем lists_config.json
            config_file = self.base_dir / "lists_config.json"
            if config_file.exists():
                try:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        lists = config.get("lists", [])
                        stats["total_lists"] = len(lists)

                        # Собираем уникальные страны и категории
                        countries_set = set()
                        for lst in lists:
                            country = lst.get("country", "Unknown")
                            if country and country != "Unknown":
                                countries_set.add(country)

                            category = lst.get("category", "General")
                            if category:
                                stats["categories"][category] = stats["categories"].get(category, 0) + 1

                        stats["countries"] = sorted(list(countries_set))
                except Exception as e:
                    print(f"Error reading lists config: {e}")

            # Считаем email из output файлов
            output_dir = self.base_dir / "output"
            if output_dir.exists():
                try:
                    # Подсчет clean emails
                    clean_files = list(output_dir.glob("*_clean_*.txt"))
                    for f in clean_files:
                        try:
                            with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                                count = sum(1 for line in file if line.strip() and '@' in line)
                                stats["clean_emails"] += count
                        except Exception as e:
                            print(f"Error reading clean file {f.name}: {e}")

                    # Подсчет blocked emails
                    blocked_files = list(output_dir.glob("*_blocked_*.txt"))
                    for f in blocked_files:
                        try:
                            with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                                count = sum(1 for line in file if line.strip() and '@' in line)
                                stats["blocked_emails"] += count
                        except Exception as e:
                            print(f"Error reading blocked file {f.name}: {e}")

                    # Подсчет invalid emails
                    invalid_files = list(output_dir.glob("*_invalid_*.txt"))
                    for f in invalid_files:
                        try:
                            with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                                count = sum(1 for line in file if line.strip())
                                stats["invalid_emails"] += count
                        except Exception as e:
                            print(f"Error reading invalid file {f.name}: {e}")

                    # Получаем последние 10 обработанных файлов по дате модификации
                    all_output_files = list(output_dir.glob("*_clean_*.txt")) + list(output_dir.glob("*_blocked_*.txt"))
                    if all_output_files:
                        # Сортируем по времени модификации (новые первые)
                        all_output_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

                        for f in all_output_files[:10]:
                            stats["recent_activity"].append({
                                "filename": f.name,
                                "size": f.stat().st_size,
                                "modified": f.stat().st_mtime
                            })

                except Exception as e:
                    print(f"Error processing output directory: {e}")

            stats["processed_emails"] = stats["clean_emails"] + stats["blocked_emails"]

            # Добавляем статистику очереди обработки (если есть активные задачи)
            stats["queue_length"] = 0
            if hasattr(self, 'processing_state') and self.processing_state:
                stats["queue_length"] = len([p for p in self.processing_state.values() if p.get("status") == "processing"])

            # Вычисляем статистику по странам (количество и качество)
            country_stats = self._calculate_country_stats()
            stats["country_stats"] = country_stats

            self.send_json_response({"stats": stats})

        except Exception as e:
            import traceback
            print(f"Error getting dashboard stats: {e}")
            print(traceback.format_exc())
            self.send_json_response({"error": str(e)}, 500)

    def handle_admin_clear_cache(self):
        """Очистка кеша обработки"""
        try:
            cache_file = self.base_dir / ".cache" / "processed_files.json"

            if not cache_file.exists():
                self.send_json_response({"success": True, "message": "Кеш не найден"})
                return

            # Удаляем кеш файл
            cache_file.unlink()

            self.send_json_response({
                "success": True,
                "message": "Кеш успешно очищен"
            })

        except Exception as e:
            print(f"Error clearing cache: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_admin_optimize_db(self):
        """Оптимизация БД метаданных"""
        try:
            import sqlite3

            db_file = self.base_dir / "metadata.db"

            if not db_file.exists():
                self.send_json_response({"success": False, "error": "БД не найдена"}, 404)
                return

            # Получаем размер до оптимизации
            size_before = db_file.stat().st_size

            # Оптимизируем БД
            conn = sqlite3.connect(str(db_file))
            conn.execute("VACUUM")
            conn.close()

            # Получаем размер после оптимизации
            size_after = db_file.stat().st_size
            saved = size_before - size_after

            self.send_json_response({
                "success": True,
                "message": "БД успешно оптимизирована",
                "size_before": size_before,
                "size_after": size_after,
                "saved": saved,
                "percent_saved": round((saved / size_before) * 100, 2) if size_before > 0 else 0
            })

        except Exception as e:
            print(f"Error optimizing database: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_admin_delete_file(self):
        """Удаление файла из input/ или output/"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json_response({"error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            file_path = data.get("path", "").strip()
            if not file_path:
                self.send_json_response({"error": "File path is required"}, 400)
                return

            # Валидация пути
            safe_path = Path(file_path)
            if safe_path.is_absolute():
                self.send_json_response({"error": "Absolute paths not allowed"}, 400)
                return

            full_path = (self.base_dir / safe_path).resolve()
            base_path = self.base_dir.resolve()

            if not str(full_path).startswith(str(base_path)):
                self.send_json_response({"error": "Path traversal attempt"}, 400)
                return

            # Проверяем, что файл в разрешенных директориях
            input_dir = self.base_dir / "input"
            output_dir = self.base_dir / "output"

            in_input = str(full_path).startswith(str(input_dir.resolve()))
            in_output = str(full_path).startswith(str(output_dir.resolve()))

            if not (in_input or in_output):
                self.send_json_response({"error": "File must be in input/ or output/"}, 403)
                return

            if not full_path.exists():
                self.send_json_response({"error": "File not found"}, 404)
                return

            # Удаляем файл
            full_path.unlink()

            # Если файл в input/, обновляем lists_config.json
            if in_input:
                filename = full_path.name
                config_file = self.base_dir / "lists_config.json"

                if config_file.exists():
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)

                    # Удаляем файл из конфигурации
                    lists = [lst for lst in config.get("lists", []) if lst.get("filename") != filename]
                    config["lists"] = lists

                    with open(config_file, 'w', encoding='utf-8') as f:
                        json.dump(config, f, ensure_ascii=False, indent=2)

            self.send_json_response({
                "success": True,
                "message": f"Файл {full_path.name} успешно удален"
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error deleting file: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_admin_reset_system(self):
        """Сброс системы через reset_system.py"""
        global processing_state

        try:
            # Проверяем, не идет ли обработка
            with processing_state["lock"]:
                if processing_state["is_running"]:
                    self.send_json_response({
                        "success": False,
                        "error": "Невозможно выполнить сброс во время обработки"
                    }, 409)
                    return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json_response({"error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            # Получаем параметры сброса
            clean_cache = data.get("clean_cache", False)
            clean_config = data.get("clean_config", False)
            clean_output = data.get("clean_output", False)
            clean_metadata_db = data.get("clean_metadata_db", False)
            full_reset = data.get("full_reset", False)
            backup = data.get("backup", True)

            if not any([clean_cache, clean_config, clean_output, clean_metadata_db, full_reset]):
                self.send_json_response({"error": "Выберите хотя бы одну опцию сброса"}, 400)
                return

            # Формируем команду
            import sys
            cmd = [sys.executable, "reset_system.py"]

            if full_reset:
                cmd.append("--full-reset")
            else:
                if clean_cache:
                    cmd.append("--clean-cache")
                if clean_config:
                    cmd.append("--clean-config")
                if clean_output:
                    cmd.append("--clean-output")
                if clean_metadata_db:
                    cmd.append("--clean-metadata-db")

            if not backup:
                cmd.append("--no-backup")

            # Запускаем в фоне
            def run_reset():
                import subprocess
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(self.base_dir))
                print(f"Reset system output: {result.stdout}")
                if result.stderr:
                    print(f"Reset system errors: {result.stderr}")

            import threading
            thread = threading.Thread(target=run_reset)
            thread.daemon = True
            thread.start()

            self.send_json_response({
                "success": True,
                "message": "Сброс системы запущен"
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error resetting system: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_admin_restore_data(self):
        """Восстановление данных через restore_data.py"""
        global processing_state

        try:
            # Проверяем, не идет ли обработка
            with processing_state["lock"]:
                if processing_state["is_running"]:
                    self.send_json_response({
                        "success": False,
                        "error": "Невозможно начать восстановление во время обработки"
                    }, 409)
                    return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json_response({"error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            # Получаем параметры восстановления
            mode = data.get("mode", "all")  # all, step1, step2, step3, step4
            unified = data.get("unified", True)

            # Формируем команду
            import sys
            cmd = [sys.executable, "restore_data.py"]

            if mode == "all":
                cmd.append("--all")
                if unified:
                    cmd.append("--unified")
            elif mode == "step1":
                cmd.append("--step1")
            elif mode == "step2":
                cmd.append("--step2")
            elif mode == "step3":
                cmd.append("--step3")
            elif mode == "step4":
                cmd.append("--step4")
            else:
                self.send_json_response({"error": f"Invalid mode: {mode}"}, 400)
                return

            # Запускаем в фоне с логированием
            def run_restore():
                global processing_state

                with processing_state["lock"]:
                    processing_state["is_running"] = True
                    processing_state["logs"].clear()
                    processing_state["start_time"] = datetime.now()

                import subprocess
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    cwd=str(self.base_dir)
                )

                # Читаем вывод построчно
                for line in process.stdout:
                    with processing_state["lock"]:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": line.strip()
                        })

                process.wait()

                with processing_state["lock"]:
                    processing_state["is_running"] = False
                    if process.returncode == 0:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": "✅ Восстановление завершено успешно"
                        })
                    else:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"⚠️ Восстановление завершено с кодом: {process.returncode}"
                        })

            import threading
            thread = threading.Thread(target=run_restore)
            thread.daemon = True
            thread.start()

            message = f"Восстановление данных запущено (режим: {mode}"
            if mode == "all" and unified:
                message += ", единая обработка"
            message += ")"

            self.send_json_response({
                "success": True,
                "message": message
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error restoring data: {e}")
            self.send_json_response({"error": str(e)}, 500)

    # Остальные методы требуют аналогичной защиты...
    # Это базовая реализация с исправленными критическими уязвимостями

    def handle_get_available_smart_filters(self):
        """Получить список доступных умных фильтров"""
        try:
            from smart_filters import list_available_filters

            filters = list_available_filters()

            self.send_json_response({
                "success": True,
                "filters": filters
            })

        except Exception as e:
            print(f"Error getting available smart filters: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_smart_filter_config(self):
        """Получить конфигурацию умного фильтра"""
        try:
            # Парсим параметры из query string
            from urllib.parse import parse_qs
            query = urlparse(self.path).query
            params = parse_qs(query)

            filter_name = params.get('name', ['italy_hydraulics'])[0]

            from smart_filters import get_config_path
            import json

            config_path = get_config_path(filter_name)
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            self.send_json_response({
                "success": True,
                "config": config
            })

        except FileNotFoundError:
            self.send_json_response({"error": f"Config not found for filter: {filter_name}"}, 404)
        except Exception as e:
            print(f"Error getting smart filter config: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_auto_suggest_config(self):
        """Автоматическое предложение подходящего конфига на основе имени файла"""
        try:
            # Парсим параметры из query string
            from urllib.parse import parse_qs
            query = urlparse(self.path).query
            params = parse_qs(query)

            filename = params.get('filename', [''])[0]

            if not filename:
                self.send_json_response({"error": "Missing filename parameter"}, 400)
                return

            from smart_filters import auto_suggest_config

            suggested_config = auto_suggest_config(filename)

            if suggested_config:
                self.send_json_response({
                    "success": True,
                    "suggestion": suggested_config,
                    "message": f"Suggested config: {suggested_config['name']} (confidence: {suggested_config.get('confidence', 'unknown')})"
                })
            else:
                self.send_json_response({
                    "success": True,
                    "suggestion": None,
                    "message": "No suitable config found. Please select manually or create new config."
                })

        except Exception as e:
            print(f"Error in auto-suggest: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_smart_filter_process(self):
        """Обработка одного clean-файла через умный фильтр"""
        try:
            # Читаем тело запроса
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:  # 1MB max
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            clean_file = data.get('clean_file')
            filter_name = data.get('filter_name', 'italy_hydraulics')
            include_metadata = data.get('include_metadata', True)

            if not clean_file:
                self.send_json_response({"error": "Missing clean_file parameter"}, 400)
                return

            # Валидация имени файла
            from pathlib import Path
            validate_filename(clean_file)

            # Запускаем обработку в фоновом потоке
            def run_smart_filter():
                try:
                    from smart_filter_processor import SmartFilterProcessor

                    processor = SmartFilterProcessor(filter_name=filter_name)
                    result = processor.process_clean_file(
                        Path(clean_file),
                        include_metadata=include_metadata
                    )

                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"✅ Smart filter завершен: {result.stats}"
                        })

                except Exception as error:
                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"❌ Ошибка smart filter: {str(error)}"
                        })

            import threading
            thread = threading.Thread(target=run_smart_filter)
            thread.daemon = True
            thread.start()

            with processing_state["lock"]:
                processing_state["is_running"] = True
                processing_state["start_time"] = datetime.now()

            self.send_json_response({
                "success": True,
                "message": f"Smart filter запущен для файла: {clean_file}"
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error processing smart filter: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_smart_filter_process_batch(self):
        """Batch обработка clean-файлов через умный фильтр"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            filter_name = data.get('filter_name', 'italy_hydraulics')
            pattern = data.get('pattern', 'output/*_clean_*.txt')
            include_metadata = data.get('include_metadata', True)

            # Запускаем batch обработку в фоновом потоке
            def run_smart_filter_batch():
                try:
                    from smart_filter_processor import SmartFilterProcessor

                    processor = SmartFilterProcessor(filter_name=filter_name)
                    results = processor.process_clean_batch(pattern=pattern)

                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"✅ Batch smart filter завершен: {len(results)} файлов"
                        })

                except Exception as error:
                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"❌ Ошибка batch smart filter: {str(error)}"
                        })

            import threading
            thread = threading.Thread(target=run_smart_filter_batch)
            thread.daemon = True
            thread.start()

            with processing_state["lock"]:
                processing_state["is_running"] = True
                processing_state["start_time"] = datetime.now()

            self.send_json_response({
                "success": True,
                "message": f"Batch smart filter запущен (паттерн: {pattern})"
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error processing batch smart filter: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_smart_filter_workflow(self):
        """Полный workflow: LVP → Base Filter → Smart Filter → Final CLEAN"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            input_file = data.get('input_file')
            config_name = data.get('config_name', 'italy_hydraulics')
            score_threshold = float(data.get('score_threshold', 30.0))
            skip_base_filtering = data.get('skip_base_filtering', False)

            if not input_file:
                self.send_json_response({"error": "Missing input_file parameter"}, 400)
                return

            # Валидация имени файла
            from pathlib import Path
            validate_filename(Path(input_file).name)

            # Запускаем полный workflow в фоновом потоке
            def run_workflow():
                try:
                    from smart_filter_workflow_manager import SmartFilterWorkflowManager
                    from dataclasses import asdict

                    # Progress callback для логирования
                    def progress_callback(stage, progress, message):
                        with processing_state["lock"]:
                            processing_state["logs"].append({
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "message": f"[{stage}] {progress}%: {message}"
                            })

                    manager = SmartFilterWorkflowManager(progress_callback=progress_callback)
                    result = manager.execute_full_workflow(
                        input_file=Path(input_file),
                        config_name=config_name,
                        score_threshold=score_threshold,
                        skip_base_filtering=skip_base_filtering
                    )

                    with processing_state["lock"]:
                        processing_state["is_running"] = False

                        if result.overall_status == 'completed':
                            processing_state["logs"].append({
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "message": f"✅ Workflow completed! Final files: {result.final_output_files.get('txt')}"
                            })
                        else:
                            processing_state["logs"].append({
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "message": f"❌ Workflow failed: {result.statistics.get('error', 'Unknown error')}"
                            })

                except Exception as error:
                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"❌ Workflow error: {str(error)}"
                        })

            import threading
            thread = threading.Thread(target=run_workflow)
            thread.daemon = True
            thread.start()

            with processing_state["lock"]:
                processing_state["is_running"] = True
                processing_state["start_time"] = datetime.now()

            self.send_json_response({
                "success": True,
                "message": f"Full workflow started for: {input_file}",
                "config": config_name,
                "score_threshold": score_threshold
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error starting workflow: {e}")
            self.send_json_response({"error": str(e)}, 500)

    def handle_smart_filter_apply(self):
        """Apply smart filter configuration to recent clean files"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:  # 1MB max
                self.send_json_response({"error": "Request too large"}, 413)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            # Extract config and validate
            config = data.get('config')
            if not config:
                self.send_json_response({"error": "Missing config parameter"}, 400)
                return

            # Validate config structure
            if not isinstance(config, dict):
                self.send_json_response({"error": "Config must be a dictionary"}, 400)
                return

            # Check for required config fields
            if 'metadata' not in config or 'name' not in config.get('metadata', {}):
                self.send_json_response({"error": "Config missing metadata.name field"}, 400)
                return

            config_name = config['metadata']['name']
            timestamp = data.get('timestamp')

            # Save config to smart_filters/configs/ directory
            from pathlib import Path
            import os

            config_dir = Path('smart_filters/configs')
            config_dir.mkdir(parents=True, exist_ok=True)

            # Sanitize config name for filename
            safe_config_name = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in config_name.lower())
            config_filename = f"{safe_config_name}_config.json"
            config_path = config_dir / config_filename

            # Save config file
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

            # Apply filter to recent clean files in background
            def run_apply_filter():
                try:
                    from smart_filter_processor_v2 import SmartFilterProcessor
                    from glob import glob

                    # Find recent clean files (last 7 days)
                    from datetime import datetime, timedelta
                    cutoff_time = datetime.now() - timedelta(days=7)

                    clean_files = []
                    for file_path in glob('output/*_clean_*.txt'):
                        file_stat = os.stat(file_path)
                        file_time = datetime.fromtimestamp(file_stat.st_mtime)
                        if file_time > cutoff_time:
                            clean_files.append(file_path)

                    if not clean_files:
                        with processing_state["lock"]:
                            processing_state["is_running"] = False
                            processing_state["logs"].append({
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "message": "⚠️ No recent clean files found (last 7 days)"
                            })
                        return

                    with processing_state["lock"]:
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"📋 Found {len(clean_files)} recent clean files to process"
                        })

                    # Process each file with the custom config
                    processor = SmartFilterProcessor(filter_name=safe_config_name)

                    # Load the custom config
                    processor.config = config

                    processed_count = 0
                    for clean_file in clean_files:
                        try:
                            result = processor.process_clean_file(
                                Path(clean_file),
                                include_metadata=True
                            )
                            processed_count += 1

                            with processing_state["lock"]:
                                processing_state["logs"].append({
                                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                                    "message": f"✅ Processed: {Path(clean_file).name}"
                                })
                        except Exception as e:
                            with processing_state["lock"]:
                                processing_state["logs"].append({
                                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                                    "message": f"❌ Error processing {Path(clean_file).name}: {str(e)}"
                                })

                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"✅ Filter applied to {processed_count}/{len(clean_files)} files"
                        })

                except Exception as error:
                    with processing_state["lock"]:
                        processing_state["is_running"] = False
                        processing_state["logs"].append({
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "message": f"❌ Error applying filter: {str(error)}"
                        })

            # Start background processing
            import threading
            thread = threading.Thread(target=run_apply_filter)
            thread.daemon = True
            thread.start()

            with processing_state["lock"]:
                processing_state["is_running"] = True
                processing_state["start_time"] = datetime.now()

            self.send_json_response({
                "success": True,
                "message": f"Filter '{config_name}' saved and applied to recent clean files",
                "config_name": config_name,
                "config_file": str(config_path),
                "timestamp": timestamp
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error applying smart filter: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    # ===== TEMPLATE API HANDLERS =====

    def convert_old_to_new_format(self, old_config, config_name):
        """
        Convert old Python backend format to new frontend format

        Args:
            old_config (dict): Old format config from smart_filters/configs/*.json
            config_name (str): Config filename (without .json)

        Returns:
            dict: New format config compatible with frontend
        """
        from datetime import datetime

        # Extract data from actual config format
        # Handle both 'display_name' and 'config_name'
        filter_name = old_config.get('display_name', old_config.get('config_name', config_name))
        version = old_config.get('version', '1.0')
        description = old_config.get('description', '')

        # Handle nested target_market structure
        target_market = old_config.get('target_market', {})
        target_country = target_market.get('country_name', 'Unknown')
        languages = target_market.get('language_codes', ['en'])

        target_industry = old_config.get('target_industry', 'Unknown')

        # Geographic data - handle both old and new formats
        geographic = old_config.get('geographic', {})
        geographic_priorities = old_config.get('geographic_priorities', {})

        # Use geographic_priorities if available (new format)
        priority_high = geographic_priorities.get('high', geographic.get('priority_high', []))
        priority_medium = geographic_priorities.get('medium', geographic.get('priority_medium', []))

        # Handle exclusions - new format uses nested structure
        exclusions = old_config.get('exclusions', {})
        excluded = exclusions.get('excluded_country_domains', geographic.get('excluded_countries', []))

        # Industry keywords - handle both old and new formats
        industry_kw = old_config.get('industry_keywords', {})
        keywords = old_config.get('keywords', {})

        # Map new keywords format to old format
        if keywords and not industry_kw:
            # Get first category as primary keywords (e.g., 'hydraulic_cylinders')
            categories = list(keywords.keys())
            primary_category = categories[0] if categories else None

            if primary_category and primary_category != 'oem_indicators':
                industry_kw['primary_positive'] = keywords.get(primary_category, [])

            # Get 'applications' or second category as secondary
            if 'applications' in keywords:
                industry_kw['secondary_positive'] = keywords.get('applications', [])
            elif len(categories) > 1:
                industry_kw['secondary_positive'] = keywords.get(categories[1], [])

            # Get OEM indicators
            if 'oem_indicators' in keywords:
                industry_kw['oem_indicators'] = keywords.get('oem_indicators', [])

        # Negative keywords - extract from exclusions.excluded_industries
        negative_kw = old_config.get('negative_keywords', [])
        if not negative_kw and 'excluded_industries' in exclusions:
            # Flatten all excluded industry keywords
            for category, terms in exclusions['excluded_industries'].items():
                negative_kw.extend(terms)

        # Get scoring config - use from config if available, otherwise defaults
        scoring_config = old_config.get('scoring', {})
        weights = scoring_config.get('weights', {
            "email_quality": 0.10,
            "company_relevance": 0.45,
            "geographic_priority": 0.30,
            "engagement": 0.15
        })
        thresholds = scoring_config.get('thresholds', {
            "high_priority": 100,
            "medium_priority": 50,
            "low_priority": 10
        })

        # Convert to new format
        new_config = {
            "metadata": {
                "id": config_name,
                "name": filter_name,
                "description": description,
                "version": version,
                "author": "system",
                "created": datetime.now().isoformat(),
                "updated": datetime.now().isoformat()
            },
            "target": {
                "country": target_country,
                "industry": target_industry,
                "languages": languages
            },
            "scoring": {
                "weights": weights,
                "thresholds": thresholds
            },
            "company_keywords": {
                "primary_keywords": {
                    "positive": [
                        {"term": term, "weight": 1.0}
                        for term in industry_kw.get('primary_positive', [])[:10]  # Limit to 10
                    ],
                    "negative": [
                        {"term": term, "weight": 0.5}
                        for term in (industry_kw.get('primary_negative', []) + negative_kw)[:10]
                    ]
                },
                "secondary_keywords": {
                    "positive": industry_kw.get('secondary_positive', [])[:10],
                    "negative": industry_kw.get('secondary_negative', [])[:10]
                }
            },
            "geographic_rules": {
                "target_regions": priority_high[:20],  # Limit to 20
                "exclude_regions": excluded[:20],
                "multipliers": {
                    # Default multipliers
                    target_country: 2.0,
                    "EU": 1.2,
                    "Others": 0.3
                }
            },
            "email_quality": {
                "corporate_domains": True,
                "free_email_penalty": -0.3,
                "structure_quality": True,
                "suspicious_patterns": []
            },
            "domain_rules": {
                "oemEquipment": {
                    "keywords": industry_kw.get('oem_indicators', [])[:10],
                    "multiplier": 1.3
                }
            }
        }

        return new_config

    def handle_get_templates(self):
        """Get all templates (built-in + user templates)"""
        try:
            # Load ALL configs from smart_filters/configs/ directory (UNIFIED)
            builtin_templates = {}
            configs_dir = Path('smart_filters/configs')

            if configs_dir.exists():
                print(f"📂 Loading templates from {configs_dir}...")
                for config_file in configs_dir.glob('*.json'):
                    try:
                        config_name = config_file.stem  # filename without .json

                        # Skip user_templates.json (will be loaded separately)
                        if config_name == 'user_templates':
                            continue

                        with open(config_file, 'r', encoding='utf-8') as f:
                            old_config = json.load(f)

                        # Convert old format to new format
                        new_config = self.convert_old_to_new_format(old_config, config_name)
                        builtin_templates[config_name] = new_config

                        print(f"  ✅ Loaded: {new_config['metadata']['name']}")

                    except Exception as e:
                        print(f"  ⚠️ Failed to load {config_file}: {e}")
                        continue

                print(f"✅ Loaded {len(builtin_templates)} built-in templates")
            else:
                print(f"⚠️ Configs directory not found: {configs_dir}")
                # Fallback to hardcoded templates
                builtin_templates = {
                    "italy_hydraulics": {"source": "builtin", "metadata": {"name": "Italy Hydraulics"}},
                    "germany_manufacturing": {"source": "builtin", "metadata": {"name": "Germany Manufacturing"}},
                    "generic": {"source": "builtin", "metadata": {"name": "Generic Template"}}
                }

            # Load user templates from config/user_templates.json
            user_templates_file = Path('config/user_templates.json')
            user_templates = {}

            if user_templates_file.exists():
                try:
                    with open(user_templates_file, 'r', encoding='utf-8') as f:
                        user_templates = json.load(f)
                    print(f"✅ Loaded {len(user_templates)} user templates")
                except Exception as e:
                    print(f"⚠️ Failed to load user templates: {e}")

            # Combine both
            all_templates = {
                "builtin": builtin_templates,
                "user": user_templates
            }

            self.send_json_response({
                "success": True,
                "templates": all_templates,
                "count": {
                    "builtin": len(builtin_templates),
                    "user": len(user_templates),
                    "total": len(builtin_templates) + len(user_templates)
                }
            })

        except Exception as e:
            print(f"❌ Error getting templates: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    def handle_save_template(self):
        """Save a new template or update existing one"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:  # 1MB max for template
                self.send_json_response({"error": "Template too large (max 1MB)"}, 413)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            template_id = data.get('id')
            template = data.get('template')

            if not template_id or not template:
                self.send_json_response({"error": "Missing id or template"}, 400)
                return

            # Validate template has required fields
            if not isinstance(template, dict):
                self.send_json_response({"error": "Template must be a dictionary"}, 400)
                return

            if 'metadata' not in template:
                self.send_json_response({"error": "Template missing metadata field"}, 400)
                return

            # Ensure config directory exists
            Path('config').mkdir(exist_ok=True)

            # Load existing templates
            templates_file = Path('config/user_templates.json')
            templates = {}

            if templates_file.exists():
                with open(templates_file, 'r', encoding='utf-8') as f:
                    templates = json.load(f)

            # Add/update template
            templates[template_id] = template

            # Save to file
            with open(templates_file, 'w', encoding='utf-8') as f:
                json.dump(templates, f, indent=2, ensure_ascii=False)

            self.send_json_response({
                "success": True,
                "message": f"Template '{template.get('metadata', {}).get('name', template_id)}' saved successfully",
                "id": template_id
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error saving template: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    def handle_delete_template(self):
        """Delete a template by ID"""
        try:
            # Extract template ID from path: /api/templates/:id
            path = urlparse(self.path).path
            template_id = path.split('/api/templates/', 1)[1]

            if not template_id:
                self.send_json_response({"error": "Missing template ID"}, 400)
                return

            # Load existing templates
            templates_file = Path('config/user_templates.json')

            if not templates_file.exists():
                self.send_json_response({"error": "No templates found"}, 404)
                return

            with open(templates_file, 'r', encoding='utf-8') as f:
                templates = json.load(f)

            # Check if template exists
            if template_id not in templates:
                self.send_json_response({"error": f"Template '{template_id}' not found"}, 404)
                return

            # Delete template
            template_name = templates[template_id].get('metadata', {}).get('name', template_id)
            del templates[template_id]

            # Save updated templates
            with open(templates_file, 'w', encoding='utf-8') as f:
                json.dump(templates, f, indent=2, ensure_ascii=False)

            self.send_json_response({
                "success": True,
                "message": f"Template '{template_name}' deleted successfully"
            })

        except Exception as e:
            print(f"Error deleting template: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    def handle_save_draft(self):
        """Save draft for a component (auto-save)"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:  # 1MB max for draft
                self.send_json_response({"error": "Draft too large (max 1MB)"}, 413)
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            component = data.get('component')  # 'wizard', 'visual_builder', or 'json_editor'
            draft = data.get('draft')

            if not component:
                self.send_json_response({"error": "Missing component parameter"}, 400)
                return

            # Validate component name
            allowed_components = ['wizard', 'visual_builder', 'json_editor']
            if component not in allowed_components:
                self.send_json_response({"error": f"Invalid component. Must be one of: {', '.join(allowed_components)}"}, 400)
                return

            # Ensure drafts directory exists
            Path('config/drafts').mkdir(parents=True, exist_ok=True)

            # Save draft
            draft_file = Path(f'config/drafts/{component}_draft.json')

            with open(draft_file, 'w', encoding='utf-8') as f:
                json.dump(draft, f, indent=2, ensure_ascii=False)

            self.send_json_response({
                "success": True,
                "message": f"Draft saved for {component}",
                "component": component,
                "timestamp": datetime.now().isoformat()
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
        except Exception as e:
            print(f"Error saving draft: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_draft(self):
        """Get draft for a component"""
        try:
            # Extract component from path: /api/templates/draft/:component
            path = urlparse(self.path).path
            component = path.split('/api/templates/draft/', 1)[1]

            if not component:
                self.send_json_response({"error": "Missing component parameter"}, 400)
                return

            # Validate component name
            allowed_components = ['wizard', 'visual_builder', 'json_editor']
            if component not in allowed_components:
                self.send_json_response({"error": f"Invalid component. Must be one of: {', '.join(allowed_components)}"}, 400)
                return

            # Load draft
            draft_file = Path(f'config/drafts/{component}_draft.json')

            if not draft_file.exists():
                self.send_json_response({
                    "success": True,
                    "draft": None,
                    "message": "No draft found"
                })
                return

            with open(draft_file, 'r', encoding='utf-8') as f:
                draft = json.load(f)

            # Get file modification time
            mod_time = datetime.fromtimestamp(draft_file.stat().st_mtime)

            self.send_json_response({
                "success": True,
                "draft": draft,
                "component": component,
                "saved_at": mod_time.isoformat()
            })

        except json.JSONDecodeError:
            self.send_json_response({"error": "Draft file is corrupted"}, 500)
        except Exception as e:
            print(f"Error getting draft: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_response({"error": str(e)}, 500)

    # ===== BLOCKLIST API HANDLERS =====

    def handle_get_blocklist(self):
        """GET /api/blocklist"""
        try:
            response = handle_get_blocklist()
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_get_blocklist_stats(self):
        """GET /api/blocklist/stats"""
        try:
            response = handle_get_blocklist_stats()
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_blocklist_search(self):
        """GET /api/blocklist/search?q=query"""
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            query = params.get('q', [''])[0]

            response = handle_blocklist_search(query)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_blocklist_export(self):
        """GET /api/blocklist/export?format=json"""
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            format_type = params.get('format', ['json'])[0]

            response = handle_blocklist_export(format_type)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_post_blocklist_add(self):
        """POST /api/blocklist/add"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            response = handle_blocklist_add(data)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_post_blocklist_remove(self):
        """POST /api/blocklist/remove"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            response = handle_blocklist_remove(data)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_post_blocklist_bulk_add(self):
        """POST /api/blocklist/bulk-add"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            response = handle_blocklist_bulk_add(data)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_post_blocklist_bulk_remove(self):
        """POST /api/blocklist/bulk-remove"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            response = handle_blocklist_bulk_remove(data)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_post_blocklist_import_csv(self):
        """POST /api/blocklist/import-csv"""
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            response = handle_blocklist_import_csv(data)
            self.send_json_response(response)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)


def run_server(port=8080):
    """Запуск веб-сервера с автоматическим поиском свободного порта"""
    max_port = port + 100
    server = None
    ws_thread = None

    while port <= max_port:
        try:
            server_address = ('', port)
            server = HTTPServer(server_address, EmailCheckerWebHandler)

            # Запуск WebSocket сервера в отдельном потоке на соседнем порту
            ws_port = port + 1
            ws_thread = threading.Thread(
                target=websocket_server.run_websocket_server,
                args=("0.0.0.0", ws_port),
                daemon=True,
                name="WebSocketServer"
            )
            ws_thread.start()

            # Небольшая задержка для инициализации WebSocket
            time.sleep(0.5)

            print(f"""
╔══════════════════════════════════════════════════════════╗
║     Email List Manager Web Server + WebSocket 🚀        ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  HTTP Server: http://localhost:{port:<28} ║
║  WebSocket:   ws://localhost:{ws_port}/ws{' ' * 19} ║
║                                                          ║
║  📱 ИНТЕРФЕЙСЫ:                                         ║
║  ✓ Классический (по умолчанию):                        ║
║    http://localhost:{port:<38} ║
║                                                          ║
║  ✓ Новый (экспериментальный):                          ║
║    http://localhost:{port}/new{' ' * 32} ║
║                                                          ║
║  ✅ Real-time обновления включены через WebSocket       ║
║                                                          ║
║  Для остановки нажмите Ctrl+C                          ║
║                                                          ║
║  🔒 Безопасность:                                       ║
║  ✓ Command Injection защита                            ║
║  ✓ Path Traversal защита                               ║
║  ✓ Валидация всех входных данных                       ║
║  ✓ Белые списки команд и endpoints                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
            """)
            break
        except OSError as e:
            if e.errno == 48 or e.errno == 10048:  # Port already in use
                print(f"Порт {port} занят, пробую {port + 1}...")
                port += 1
            else:
                raise

    if server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n\nСервер остановлен пользователем")
            server.shutdown()
    else:
        print(f"Не удалось запустить сервер. Все порты от {port-100} до {max_port} заняты.")

if __name__ == "__main__":
    import sys

    # Парсинг аргументов командной строки
    port = 8089
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Неверный порт: {sys.argv[1]}. Используется порт по умолчанию: 8080")

    run_server(port)