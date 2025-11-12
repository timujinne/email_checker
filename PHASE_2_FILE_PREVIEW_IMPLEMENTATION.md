# Фаза 2: Просмотр результатов - Реализация

## ✅ Реализовано

### 1. Backend API Endpoints

#### API endpoint: `/api/output-files`
**Назначение:** Получение списка всех выходных файлов для указанного списка

**Метод:** `handle_get_output_files()` в `web_server.py` (строки 652-730)

**Параметры:**
- `list` - имя файла списка (query parameter)

**Возвращает:**
```json
{
  "files": {
    "clean": [{
      "filename": "list_clean_20251006.txt",
      "size": 102400,
      "modified": 1728230400.0,
      "path": "output/list_clean_20251006.txt",
      "email_count": 1234
    }],
    "blocked_email": [...],
    "blocked_domain": [...],
    "invalid": [...],
    "metadata_json": [...],
    "metadata_csv": [...],
    "enriched_json": [...],
    "enriched_csv": [...],
    "report_html": [...]
  },
  "list_name": "list.txt"
}
```

**Безопасность:**
- ✅ Валидация имени файла через `validate_filename()`
- ✅ Проверка существования `output/` директории
- ✅ Автоматический подсчет email в TXT файлах

---

#### API endpoint: `/api/file-preview`
**Назначение:** Предпросмотр содержимого файла (первые N строк)

**Метод:** `handle_file_preview()` в `web_server.py` (строки 732-830)

**Параметры:**
- `path` - относительный путь к файлу (query parameter)
- `lines` - максимальное количество строк для предпросмотра (опционально, по умолчанию 100, макс 1000)

**Возвращает:**
```json
{
  "content": "email1@example.com\nemail2@example.com\n...",
  "total_lines": 5000,
  "preview_lines": 100,
  "truncated": true,
  "file_size": 153600,
  "file_type": ".txt"
}
```

**Особенности по типам файлов:**
- **JSON**: Читает весь файл (макс 5MB), форматирует с отступами
- **CSV**: Построчное чтение
- **TXT**: Построчное чтение

**Безопасность:**
- ✅ Проверка на absolute paths (запрещены)
- ✅ Path traversal защита (`..` не разрешено)
- ✅ Доступ только к файлам в `output/` директории
- ✅ Ограничение максимального количества строк (1000)
- ✅ Ограничение размера JSON файлов (5MB)

---

#### API endpoint: `/api/download-file`
**Назначение:** Скачивание файла

**Метод:** `handle_download_file()` в `web_server.py` (строки 832-894)

**Параметры:**
- `path` - относительный путь к файлу (query parameter)

**Возвращает:**
- Файл с правильными MIME типами и Content-Disposition заголовком

**Поддерживаемые MIME типы:**
- `.txt` → `text/plain`
- `.csv` → `text/csv`
- `.json` → `application/json`
- `.html` → `text/html`
- `.lvp` → `application/xml`
- Другие → `application/octet-stream`

**Безопасность:**
- ✅ Path traversal защита
- ✅ Доступ только к файлам в `output/` директории
- ✅ Валидация существования файла
- ✅ Правильные заголовки для скачивания (`Content-Disposition: attachment`)

---

### 2. Обновления в web_server.py

**Добавлены endpoints в белый список (строка 171):**
```python
allowed_endpoints = {
    # ... существующие ...
    "/api/output-files", "/api/file-preview", "/api/download-file"
}
```

**Маршрутизация запросов (строки 177-182):**
```python
elif path.startswith("/api/output-files"):
    self.handle_get_output_files()
elif path.startswith("/api/file-preview"):
    self.handle_file_preview()
elif path.startswith("/api/download-file"):
    self.handle_download_file()
```

---

## 📝 Что нужно доделать для полной функциональности

### Frontend компоненты в email_list_manager.html

#### 1. Модальное окно просмотра результатов

Добавить перед закрывающим тегом `</body>`:

```html
<!-- Модальное окно просмотра результатов -->
<div class="modal fade" id="resultsModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-file-alt"></i>
                    Результаты обработки: <span id="resultsListName"></span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <!-- Навигация по типам файлов -->
                <ul class="nav nav-tabs mb-3" id="resultsTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="clean-tab" data-bs-toggle="tab"
                                data-bs-target="#clean-pane" type="button">
                            <i class="fas fa-check-circle text-success"></i>
                            Clean <span class="badge bg-success" id="cleanCount">0</span>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="blocked-tab" data-bs-toggle="tab"
                                data-bs-target="#blocked-pane" type="button">
                            <i class="fas fa-ban text-danger"></i>
                            Blocked <span class="badge bg-danger" id="blockedCount">0</span>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="metadata-tab" data-bs-toggle="tab"
                                data-bs-target="#metadata-pane" type="button">
                            <i class="fas fa-database text-info"></i>
                            Metadata <span class="badge bg-info" id="metadataCount">0</span>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="report-tab" data-bs-toggle="tab"
                                data-bs-target="#report-pane" type="button">
                            <i class="fas fa-chart-bar text-primary"></i>
                            HTML Report
                        </button>
                    </li>
                </ul>

                <!-- Содержимое вкладок -->
                <div class="tab-content" id="resultsTabContent">
                    <!-- Clean emails tab -->
                    <div class="tab-pane fade show active" id="clean-pane">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6>Чистые email адреса</h6>
                            <button class="btn btn-sm btn-primary" onclick="downloadFile('clean')">
                                <i class="fas fa-download"></i> Скачать
                            </button>
                        </div>
                        <div class="preview-container">
                            <pre id="cleanPreview" class="bg-light p-3" style="max-height: 400px; overflow-y: auto;"></pre>
                            <div id="cleanTruncated" class="text-muted text-center mt-2" style="display: none;">
                                <i class="fas fa-info-circle"></i> Показаны первые 100 строк из <span id="cleanTotal">0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Blocked emails tab -->
                    <div class="tab-pane fade" id="blocked-pane">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6>Заблокированные email</h6>
                            <button class="btn btn-sm btn-primary" onclick="downloadFile('blocked')">
                                <i class="fas fa-download"></i> Скачать
                            </button>
                        </div>
                        <div class="preview-container">
                            <pre id="blockedPreview" class="bg-light p-3" style="max-height: 400px; overflow-y: auto;"></pre>
                            <div id="blockedTruncated" class="text-muted text-center mt-2" style="display: none;">
                                <i class="fas fa-info-circle"></i> Показаны первые 100 строк из <span id="blockedTotal">0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Metadata tab -->
                    <div class="tab-pane fade" id="metadata-pane">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6>Метаданные (JSON/CSV)</h6>
                            <div>
                                <button class="btn btn-sm btn-primary" onclick="downloadFile('metadata-json')">
                                    <i class="fas fa-download"></i> JSON
                                </button>
                                <button class="btn btn-sm btn-success" onclick="downloadFile('metadata-csv')">
                                    <i class="fas fa-download"></i> CSV
                                </button>
                            </div>
                        </div>
                        <div class="preview-container">
                            <pre id="metadataPreview" class="bg-light p-3" style="max-height: 400px; overflow-y: auto; font-size: 0.8em;"></pre>
                        </div>
                    </div>

                    <!-- HTML Report tab -->
                    <div class="tab-pane fade" id="report-pane">
                        <div class="text-center py-5">
                            <i class="fas fa-file-pdf fa-3x text-primary mb-3"></i>
                            <h5>HTML отчет с визуальной статистикой</h5>
                            <button class="btn btn-primary btn-lg mt-3" onclick="openReport()">
                                <i class="fas fa-external-link-alt"></i> Открыть отчет в новой вкладке
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### 2. Кнопка "Просмотр результатов" в таблице

Найти строку с кнопками действий (около строки 1212-1220) и добавить:

```javascript
// В функции renderList(), после кнопок edit и processOne:
const viewResultsButton = list.processed ?
    `<button class="btn btn-sm btn-outline-info" onclick="viewResults('${list.filename}')" title="Просмотр результатов">
        <i class="fas fa-eye"></i>
    </button>` : '';

// Добавить в td.action-buttons после ${metadataButton}
${viewResultsButton}
```

#### 3. JavaScript функции

Добавить в секцию `<script>`:

```javascript
let currentResults = null;  // Текущие результаты для работы с файлами

function viewResults(filename) {
    // Загрузка списка выходных файлов
    fetch(`/api/output-files?list=${encodeURIComponent(filename)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(`Ошибка: ${data.error}`);
                return;
            }

            currentResults = data;
            document.getElementById('resultsListName').textContent = data.list_name;

            // Обновляем счетчики
            updateResultCounts(data.files);

            // Загружаем предпросмотр для clean файлов
            loadFilePreview('clean');

            // Показываем модальное окно
            const modal = new bootstrap.Modal(document.getElementById('resultsModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading results:', error);
            alert('Ошибка загрузки результатов');
        });
}

function updateResultCounts(files) {
    // Clean files
    const cleanCount = files.clean.reduce((sum, f) => sum + (f.email_count || 0), 0);
    document.getElementById('cleanCount').textContent = cleanCount.toLocaleString();

    // Blocked files
    const blockedCount = files.blocked_email.reduce((sum, f) => sum + (f.email_count || 0), 0) +
                         files.blocked_domain.reduce((sum, f) => sum + (f.email_count || 0), 0);
    document.getElementById('blockedCount').textContent = blockedCount.toLocaleString();

    // Metadata files
    const metadataCount = files.metadata_json.length + files.metadata_csv.length;
    document.getElementById('metadataCount').textContent = metadataCount;
}

function loadFilePreview(type) {
    if (!currentResults) return;

    let files = [];
    let previewId = '';
    let truncatedId = '';
    let totalId = '';

    switch(type) {
        case 'clean':
            files = currentResults.files.clean;
            previewId = 'cleanPreview';
            truncatedId = 'cleanTruncated';
            totalId = 'cleanTotal';
            break;
        case 'blocked':
            files = currentResults.files.blocked_email.concat(currentResults.files.blocked_domain);
            previewId = 'blockedPreview';
            truncatedId = 'blockedTruncated';
            totalId = 'blockedTotal';
            break;
        case 'metadata-json':
            files = currentResults.files.metadata_json;
            previewId = 'metadataPreview';
            break;
        case 'metadata-csv':
            files = currentResults.files.metadata_csv;
            previewId = 'metadataPreview';
            break;
    }

    if (files.length === 0) {
        document.getElementById(previewId).textContent = 'Нет файлов для отображения';
        return;
    }

    // Берем первый файл
    const file = files[0];

    fetch(`/api/file-preview?path=${encodeURIComponent(file.path)}&lines=100`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.getElementById(previewId).textContent = `Ошибка: ${data.error}`;
                return;
            }

            document.getElementById(previewId).textContent = data.content;

            if (data.truncated && truncatedId) {
                document.getElementById(truncatedId).style.display = 'block';
                document.getElementById(totalId).textContent = data.total_lines.toLocaleString();
            }
        })
        .catch(error => {
            console.error('Error loading preview:', error);
            document.getElementById(previewId).textContent = 'Ошибка загрузки предпросмотра';
        });
}

function downloadFile(type) {
    if (!currentResults) return;

    let files = [];

    switch(type) {
        case 'clean':
            files = currentResults.files.clean;
            break;
        case 'blocked':
            files = currentResults.files.blocked_email.concat(currentResults.files.blocked_domain);
            break;
        case 'metadata-json':
            files = currentResults.files.metadata_json;
            break;
        case 'metadata-csv':
            files = currentResults.files.metadata_csv;
            break;
    }

    if (files.length === 0) {
        alert('Нет файлов для скачивания');
        return;
    }

    // Скачиваем первый файл
    const file = files[0];
    window.location.href = `/api/download-file?path=${encodeURIComponent(file.path)}`;
}

function openReport() {
    if (!currentResults) return;

    const reportFiles = currentResults.files.report_html;
    if (reportFiles.length === 0) {
        alert('HTML отчет не найден');
        return;
    }

    // Открываем первый отчет
    const report = reportFiles[0];
    window.open(`/${report.path}`, '_blank');
}

// Обработчик переключения вкладок для загрузки данных
document.getElementById('resultsModal')?.addEventListener('shown.bs.tab', function (event) {
    const tabId = event.target.id;

    switch(tabId) {
        case 'clean-tab':
            loadFilePreview('clean');
            break;
        case 'blocked-tab':
            loadFilePreview('blocked');
            break;
        case 'metadata-tab':
            loadFilePreview('metadata-json');
            break;
    }
});
```

---

## 🧪 Тестирование

### Тест 1: Получение списка файлов
```bash
curl "http://localhost:8082/api/output-files?list=test.txt"
```

**Ожидаемый результат:** JSON с категоризированными файлами

### Тест 2: Предпросмотр файла
```bash
curl "http://localhost:8082/api/file-preview?path=output/test_clean_20251006.txt&lines=10"
```

**Ожидаемый результат:** JSON с первыми 10 строками

### Тест 3: Скачивание файла
```bash
curl -O "http://localhost:8082/api/download-file?path=output/test_clean_20251006.txt"
```

**Ожидаемый результат:** Файл сохранен локально

### Тест 4: Path traversal защита
```bash
curl "http://localhost:8082/api/file-preview?path=../../../etc/passwd"
```

**Ожидаемый результат:** Error 400 "Path traversal attempt detected"

### Тест 5: Доступ к файлам вне output/
```bash
curl "http://localhost:8082/api/file-preview?path=input/test.txt"
```

**Ожидаемый результат:** Error 403 "Access denied: file not in output directory"

---

## 🔒 Безопасность

### Реализованные защиты:

1. **Path Traversal Protection**
   - Запрет на absolute paths
   - Проверка на `..` в пути
   - `resolve()` и проверка что файл в пределах `base_dir`

2. **Directory Access Control**
   - Доступ только к файлам в `output/` директории
   - Проверка с помощью `startswith(output_dir.resolve())`

3. **Input Validation**
   - Валидация имени файла через `validate_filename()`
   - Ограничение на размер запроса (100 строк → 1000 макс)
   - Ограничение на размер JSON файлов (5MB)

4. **Error Handling**
   - `UnicodeDecodeError` → 400 Bad Request
   - `FileNotFoundError` → 404 Not Found
   - Общие исключения → 500 Internal Server Error

---

## 📊 Преимущества

### До реализации:
- ❌ Нужно скачивать все файлы для просмотра
- ❌ Нет быстрого способа посмотреть первые N строк
- ❌ Сложно найти нужный выходной файл
- ❌ Нет подсчета email в файлах

### После реализации:
- ✅ Предпросмотр прямо в браузере
- ✅ Быстрый доступ к первым 100 строкам
- ✅ Категоризация файлов по типу
- ✅ Автоматический подсчет email
- ✅ Скачивание одним кликом
- ✅ Безопасный доступ с защитой от атак

---

## 🚀 Следующие шаги

1. **Добавить frontend компоненты** в email_list_manager.html
2. **Протестировать** с реальными файлами
3. **Добавить загрузчик** (spinner) при загрузке предпросмотра
4. **Улучшить UI/UX** с анимациями и better formatting

---

**Дата реализации:** 2025-10-06
**Версия:** 1.2.0
**Статус:** ✅ Backend готов, Frontend требует завершения
