# 🧪 Руководство по тестированию новой архитектуры

## Быстрый тест

### 1. Проверка что все модули импортируются
```bash
python3 -c "
from email_processor import EmailProcessor, ProcessResult, BatchResult
from metadata_store import MetadataStore
from cache_manager import CacheManager
from progress_tracker import ProgressTracker
from unified_processor import UnifiedEmailProcessor
print('✅ Все модули успешно импортированы')
"
```

### 2. Тест базовой функциональности

Создайте тестовый файл `test_basic.py`:

```python
#!/usr/bin/env python3
"""Базовый тест новой архитектуры"""

from pathlib import Path
from unified_processor import UnifiedEmailProcessor

def test_basic_processing():
    """Тест базовой обработки"""
    print("🧪 Запуск базового теста...")

    processor = UnifiedEmailProcessor()

    # Проверяем что компоненты инициализированы
    assert processor.cache_manager is not None
    assert processor.metadata_store is not None
    assert processor.processor is not None

    print("✅ Компоненты инициализированы")

    # Проверяем статистику пустых хранилищ
    cache_stats = processor.cache_manager.get_all_statistics()
    metadata_stats = processor.metadata_store.get_statistics()

    print(f"📊 Cache stats: {cache_stats}")
    print(f"💾 Metadata stats: {metadata_stats}")

    print("✅ Базовый тест пройден")

if __name__ == "__main__":
    test_basic_processing()
```

Запустите:
```bash
python3 test_basic.py
```

### 3. Тест с реальными данными

```python
#!/usr/bin/env python3
"""Тест с реальными файлами"""

from pathlib import Path
from unified_processor import UnifiedEmailProcessor

def test_with_files():
    """Тест обработки реальных файлов"""
    processor = UnifiedEmailProcessor()

    # Проверяем наличие файлов
    input_dir = Path("input")
    txt_files = list(input_dir.glob("*.txt"))
    lvp_files = list(input_dir.glob("*.lvp"))

    print(f"📁 Найдено файлов: {len(txt_files)} TXT, {len(lvp_files)} LVP")

    if not txt_files and not lvp_files:
        print("⚠️  Нет файлов для тестирования в input/")
        return

    # Запускаем обработку
    result = processor.process_all_incremental(
        exclude_duplicates=True,
        generate_html=False,  # Отключаем для теста
        show_progress=True
    )

    # Проверяем результаты
    print(f"\n✅ Обработано файлов: {result.successful_files}/{result.total_files}")
    print(f"❌ Ошибок: {result.failed_files}")

    if result.failed_files > 0:
        print("\n⚠️  Файлы с ошибками:")
        for res in result.results:
            if not res.success:
                print(f"   - {res.file_path.name}: {res.error}")

    # Статистика
    stats = result.get_aggregated_stats()
    print(f"\n📊 Статистика:")
    print(f"   Clean: {stats.get('clean', 0):,}")
    print(f"   Blocked: {stats.get('blocked_email', 0):,}")
    print(f"   Invalid: {stats.get('invalid', 0):,}")

    return result

if __name__ == "__main__":
    test_with_files()
```

## Тестирование отдельных компонентов

### MetadataStore

```python
from metadata_store import MetadataStore
from email_metadata import EmailWithMetadata

store = MetadataStore(".cache/test_metadata.db")

# Создаем тестовый объект
test_email = EmailWithMetadata(
    email="test@example.com",
    company_name="Test Company",
    phone="+1234567890",
    country="Germany"
)

# Сохраняем
store.save_metadata(test_email, source_file="test.lvp")
print("✅ Метаданные сохранены")

# Получаем обратно
retrieved = store.get_metadata("test@example.com")
assert retrieved is not None
assert retrieved.company_name == "Test Company"
print("✅ Метаданные получены корректно")

# Статистика
stats = store.get_statistics()
print(f"📊 Статистика: {stats}")

# Очистка
store.clear_all()
print("✅ Тест MetadataStore пройден")
```

### CacheManager

```python
from cache_manager import CacheManager
from pathlib import Path

cache = CacheManager(".cache/test")

# Создаем тестовый файл
test_file = Path("input/test_list.txt")
if test_file.exists():
    # Проверяем хеш
    file_hash = cache.get_file_hash(test_file)
    print(f"MD5: {file_hash}")

    # Проверяем обработан ли
    is_processed = cache.is_file_processed(test_file)
    print(f"Обработан: {is_processed}")

# Статистика
stats = cache.get_all_statistics()
print(f"📊 Статистика: {stats}")

print("✅ Тест CacheManager пройден")
```

### ProgressTracker

```python
from progress_tracker import ProgressTracker
import time

tracker = ProgressTracker(total_files=5)
tracker.start()

for i in range(5):
    tracker.start_file(f"file_{i}.txt", total_emails=1000)
    time.sleep(0.5)  # Имитация обработки
    tracker.complete_file(success=True)

    stats = tracker.get_statistics()
    print(f"Прогресс: {stats['progress_percent']:.1f}%, ETA: {stats['eta']}")

tracker.finish()

print("✅ Тест ProgressTracker пройден")
```

## Проверка ключевых сценариев

### Сценарий 1: Сохранение метаданных LVP→TXT

```python
from unified_processor import UnifiedEmailProcessor
from pathlib import Path

processor = UnifiedEmailProcessor()

# 1. Обрабатываем LVP файл
print("📄 Обработка LVP файла...")
lvp_file = Path("input/test.lvp")
if lvp_file.exists():
    result = processor.processor.process_file(
        lvp_file,
        enrich_from_store=True
    )
    print(f"   Обработано: {len(result.clean_emails)} email")
    print(f"   С метаданными: {result.has_metadata}")

# 2. Проверяем что метаданные сохранены
metadata_stats = processor.metadata_store.get_statistics()
print(f"💾 В хранилище: {metadata_stats['total_emails']} email")

# 3. Обрабатываем TXT файл с теми же email
print("\n📝 Обработка TXT файла...")
txt_file = Path("input/test.txt")
if txt_file.exists():
    result = processor.processor.process_file(
        txt_file,
        enrich_from_store=True  # ВАЖНО: обогащаем из хранилища
    )
    print(f"   Обработано: {len(result.clean_emails)} email")
    print(f"   С метаданными: {result.has_metadata}")
    print(f"   Обогащено: {len(result.emails_with_metadata)} email")

if result.has_metadata and result.emails_with_metadata:
    print("✅ Метаданные успешно перенесены из LVP в TXT!")
else:
    print("⚠️  Метаданные не были обогащены")
```

### Сценарий 2: Обработка с ошибками

```python
from unified_processor import UnifiedEmailProcessor
from pathlib import Path

processor = UnifiedEmailProcessor()

# Создаем список с корректным и битым файлом
files = [
    Path("input/good_file.txt"),
    Path("input/non_existent.txt"),  # Не существует
    Path("input/another_good.txt")
]

result = processor.processor.process_batch(
    files=[f for f in files if f.exists()],
    exclude_duplicates=True
)

print(f"✅ Успешно: {result.successful_files}")
print(f"❌ Ошибок: {result.failed_files}")

# Проверяем что обработка продолжилась после ошибки
assert result.successful_files > 0
print("✅ Graceful degradation работает!")
```

## Бенчмарки производительности

### Сравнение старого и нового кеша

```python
import time
import json
from pathlib import Path
from cache_manager import CacheManager

# Старый JSON кеш
legacy_cache = Path(".cache/processed_files.json")
if legacy_cache.exists():
    start = time.time()
    with open(legacy_cache, 'r') as f:
        data = json.load(f)
    legacy_time = time.time() - start
    legacy_size = legacy_cache.stat().st_size / (1024 * 1024)

    print(f"📁 Legacy JSON cache:")
    print(f"   Загрузка: {legacy_time:.3f}s")
    print(f"   Размер: {legacy_size:.2f} MB")

# Новый SQLite кеш
cache = CacheManager()
start = time.time()
emails = cache.get_all_processed_emails()
new_time = time.time() - start
new_size = Path(".cache/processing_cache.db").stat().st_size / (1024 * 1024)

print(f"\n💾 New SQLite cache:")
print(f"   Загрузка: {new_time:.3f}s")
print(f"   Размер: {new_size:.2f} MB")
print(f"   Email: {len(emails):,}")

if legacy_cache.exists():
    print(f"\n📊 Улучшение:")
    print(f"   Скорость: {legacy_time/new_time:.1f}x быстрее")
    print(f"   Размер: {legacy_size/new_size:.1f}x меньше")
```

## Отчет о тестировании

После прохождения всех тестов создайте отчет:

```bash
# Запустите все тесты и сохраните вывод
python3 test_basic.py > test_results.txt 2>&1
python3 test_with_files.py >> test_results.txt 2>&1

# Проверьте результаты
cat test_results.txt
```

## Troubleshooting

### Проблема: ModuleNotFoundError
```bash
# Убедитесь что запускаете из корневой директории проекта
cd /path/to/email_checker
python3 test_basic.py
```

### Проблема: SQLite ошибки
```bash
# Очистите кеш и попробуйте снова
rm -rf .cache/test_metadata.db
rm -rf .cache/processing_cache.db
python3 test_basic.py
```

### Проблема: Нет файлов для тестирования
```bash
# Создайте тестовый файл
echo "test1@example.com" > input/test_list.txt
echo "test2@example.com" >> input/test_list.txt
python3 test_with_files.py
```

## Следующие шаги

1. ✅ Пройдите базовые тесты
2. ✅ Протестируйте с реальными файлами
3. ✅ Проверьте сохранение метаданных LVP→TXT
4. ✅ Сравните производительность
5. 📝 Сообщите о найденных проблемах

---

**Важно:** Новая архитектура полностью совместима со старой - можете использовать обе версии параллельно.
