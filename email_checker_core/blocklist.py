import time
from pathlib import Path
from typing import Set

class BlocklistManager:
    def __init__(self, blocklists_dir: Path):
        self.blocklists_dir = blocklists_dir
        self.blocked_emails: Set[str] = set()
        self.blocked_domains: Set[str] = set()
        self.cache_loaded = False

    def load_blocklists(self):
        """Загружает блок-листы в память для быстрого поиска"""
        if self.cache_loaded:
            return

        print("🔄 Загрузка блок-листов...")
        start_time = time.time()

        # Загрузка заблокированных email
        email_blocklist = self.blocklists_dir / "blocked_emails.txt"
        if email_blocklist.exists():
            try:
                with open(email_blocklist, 'r', encoding='utf-8') as f:
                    for line in f:
                        email = line.strip().lower()
                        if email:
                            self.blocked_emails.add(email)
            except Exception as e:
                print(f"❌ Ошибка при чтении {email_blocklist}: {e}")

        # Загрузка заблокированных доменов
        domain_blocklist = self.blocklists_dir / "blocked_domains.txt"
        if domain_blocklist.exists():
            try:
                with open(domain_blocklist, 'r', encoding='utf-8') as f:
                    for line in f:
                        domain = line.strip().lower()
                        if domain:
                            self.blocked_domains.add(domain)
            except Exception as e:
                print(f"❌ Ошибка при чтении {domain_blocklist}: {e}")

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
            try:
                with open(email_blocklist, 'r', encoding='utf-8') as f:
                    for line in f:
                        email = line.strip().lower()
                        if email:
                            existing_in_file.add(email)
            except Exception as e:
                print(f"❌ Ошибка при чтении {email_blocklist}: {e}")

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

    def is_blocked_email(self, email: str) -> bool:
        return email in self.blocked_emails

    def is_blocked_domain(self, domain: str) -> bool:
        return domain in self.blocked_domains
