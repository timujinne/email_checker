# 🚀 План полного рефакторинга веб-интерфейса Email Checker

**Дата начала:** 25 октября 2025
**Статус:** 🔄 В начале (Planning)
**Версия плана:** 1.0

---

## 📋 Технологический стек

### Frontend
- ✅ **Vanilla JavaScript + Web Components** (модульная архитектура)
- ✅ **Tailwind CSS + daisyUI** (современный дизайн)
- ✅ **Chart.js** (продвинутая визуализация)
- ✅ **WebSocket** (real-time updates)

### Backend
- ✅ **Python 3 HTTP Server** (текущий, улучшенный)
- ✅ **WebSocket сервер** для live updates
- ✅ **Google Cloud Storage API** (новое - для архивации)

### Архитектура
- ✅ **Multi-page application** (8 страниц)
- ✅ **Модульные Web Components**
- ✅ **Shared state management**
- ✅ **Progressive enhancement**

---

## 🎨 Цветовая палитра (UPDATED)

| Элемент | Цвет | HEX | Использование |
|---------|------|-----|--------|
| Primary | Темно-синий | `#1e40af` | Основные кнопки, links, accents |
| Secondary | Темно-красный | `#991b1b` | Опасные операции, warnings |
| Success | Зеленый | `#10b981` | Успешные операции |
| Warning | Оранжевый | `#f59e0b` | Предупреждения |
| Error | Красный | `#ef4444` | Ошибки |
| Background (Dark) | `#0f172a` | Главный фон темной темы |
| Surface (Dark) | `#1e293b` | Карточки и контейнеры |
| Text (Dark) | `#e2e8f0` | Текст в темной теме |

**Tailwind классы:**
- Primary buttons: `bg-blue-900 hover:bg-blue-800`
- Secondary/Danger: `bg-red-900 hover:bg-red-800`
- Dark mode: `dark:bg-slate-900 dark:text-slate-100`

---

## 🗂️ Структура страниц (8 pages)

### 1. 🎯 **Dashboard** (`/index.html`)
**Статус:** ⏳ Not Started

- [ ] KPI метрики (обработано, заблокировано, чистые)
- [ ] Последние операции (лента активности)
- [ ] Статус системы (БД, кеш, очередь задач)
- [ ] Быстрый доступ к основным функциям
- [ ] Графики обработки за период (Chart.js)
- [ ] Темная тема поддержка

**Возможные коллизии:**
- ⚠️ Real-time обновление KPI может быть ресурсоёмко - нужна дебаунс логика
- ⚠️ Chart.js производительность с большим количеством данных

---

### 2. 📋 **Lists Manager** (`/lists.html`)
**Статус:** ⏳ Not Started

- [ ] Таблица всех списков (TXT/LVP) с пагинацией
- [ ] Метаданные (страна, категория, приоритет, дата)
- [ ] Drag & drop загрузка файлов
- [ ] Batch операции (обработка, редактирование, удаление)
- [ ] Фильтры и поиск (по названию, стране, категории)
- [ ] Live preview файлов (первые N строк)
- [ ] Быстрые действия (Edit, Process, Delete, Download)
- [ ] Сортировка по столбцам
- [ ] Bulk select/deselect

**Возможные коллизии:**
- ⚠️ Drag & drop + WebSocket может создать конфликты
- ⚠️ Большие таблицы (1000+ строк) - нужна виртуализация
- ⚠️ Синхронизация UI при обновлении файлов снаружи

---

### 3. 🎯 **Smart Filter Studio** (`/smart-filter.html`)
**Статус:** ⏳ Not Started

**Priority:** 🔴 ВЫСШИЙ

- [ ] Visual конфигуратор фильтров (drag & drop элементы)
- [ ] Создание/редактирование фильтров через UI
- [ ] JSON editor для продвинутых пользователей
- [ ] Workflow wizard (5 steps)
- [ ] Preview результатов фильтрации на sample данных
- [ ] Аналитика скоринга (распределение по приоритетам)
- [ ] Тестирование фильтров на текущих clean-листах
- [ ] Библиотека готовых шаблонов фильтров
- [ ] A/B тестирование конфигураций
- [ ] Сохранение истории версий фильтров

**Возможные коллизии:**
- ⚠️ Real-time preview скоринга может быть медленно (нужен debounce)
- ⚠️ JSON validation сложный для пользователя
- ⚠️ Sample data может быть устаревшим - нужна синхронизация
- ⚠️ Конфликт между UI визуальным и JSON редактором

**Нужна реализация:**
- Filter config builder с validation
- Scoring preview engine
- Template management

---

### 4. 🚫 **Blocklist Manager** (`/blocklists.html`)
**Статус:** ⏳ Not Started

**Priority:** 🔴 ВЫСШИЙ

- [ ] Управление email blocklist (22K+)
- [ ] Управление domain blocklist (700+)
- [ ] CSV import wizard с валидацией
- [ ] Проблемные домены (≥5 blocked) - авто-детекция
- [ ] Поиск и фильтрация в blocklist
- [ ] Статистика блокировок (по доменам, типам, датам)
- [ ] Экспорт blocklists (CSV, TXT)
- [ ] Bulk add/remove/edit операции
- [ ] Undo/Redo для операций
- [ ] История изменений blocklists

**Возможные коллизии:**
- ⚠️ 22K+ email в таблице - критичная производительность
- ⚠️ CSV import валидация может быть сложной
- ⚠️ Синхронизация с существующими blocklists на диске
- ⚠️ Блокировка пользователя при работе с большим файлом

**Нужна реализация:**
- Virtual list для 22K+ элементов
- CSV parser с error recovery
- Batch операции в фоне

---

### 5. ⏳ **Processing Queue** (`/processing.html`)
**Статус:** ⏳ Not Started

**Priority:** 🟠 ВЫСОКИЙ

- [ ] Live мониторинг задач с WebSocket
- [ ] Real-time обновления прогресса
- [ ] Прогресс-бары для каждой задачи
- [ ] Логи в реальном времени (автоскроллинг)
- [ ] История обработки (последние 100 операций)
- [ ] Управление очередью (pause/resume/cancel)
- [ ] ETA для длительных задач (расчет)
- [ ] Уведомления при завершении
- [ ] Экспорт логов обработки

**Возможные коллизии:**
- ⚠️ WebSocket disconnect обработка
- ⚠️ Большое количество логов может замедлить UI
- ⚠️ Синхронизация при долгом отключении
- ⚠️ Memory leak при хранении большой истории

**Нужна реализация:**
- WebSocket reconnection logic
- Log streaming с буферизацией
- Task state management

---

### 6. 📊 **Analytics & Reports** (`/analytics.html`)
**Статус:** ⏳ Not Started

**Priority:** 🟠 ВЫСОКИЙ

- [ ] Детальная статистика по периодам (День, Неделя, Месяц)
- [ ] Интерактивные графики (Chart.js):
  - [ ] Trends обработки (temporal)
  - [ ] Сравнение результатов (comparative)
  - [ ] Эффективность фильтров
  - [ ] Источники блокировок
  - [ ] Top countries/categories
- [ ] Кастомные отчеты (фильтры по дате, типу и т.д.)
- [ ] Экспорт в CSV/PDF
- [ ] Drill-down анализ (click on chart элементы)
- [ ] Сохранение favorite отчетов

**Возможные коллизии:**
- ⚠️ PDF export требует дополнительной библиотеки
- ⚠️ Большие периоды данных замедляют графики
- ⚠️ Интерактивность charts может конфликтовать с export

**Нужна реализация:**
- Advanced date range picker
- Chart.js интеграция с темной темой
- PDF export library

---

### 7. 📦 **Archive & Cloud Storage** (`/archive.html`)
**Статус:** ⏳ Not Started

**Priority:** 🟠 ВЫСОКИЙ

**Функциональность:**
- [ ] Систематизация обработанных списков
- [ ] Локальные теги и категории для архива
- [ ] Интеграция с Google Cloud Storage:
  - [ ] OAuth 2.0 аутентификация
  - [ ] Загрузка в облако
  - [ ] Скачивание из облака
  - [ ] Синхронизация
  - [ ] Версионирование
- [ ] Поиск по архиву (по тегам, дате, имени)
- [ ] Metadata сохранение (LVP, scores, comments)
- [ ] Быстрое повторное использование списков
- [ ] Auto-архивация после обработки (опционально)
- [ ] Облачное хранилище статистика (размер, стоимость)

**Возможные коллизии:**
- ⚠️ OAuth требует секьюрного хранения токенов
- ⚠️ Большие файлы в GCS - timeout риск
- ⚠️ Синхронизация конфликты при offline режиме
- ⚠️ Cost tracking для GCS

**Нужна реализация:**
- OAuth 2.0 flow (backend)
- GCS SDK интеграция
- Conflict resolution strategy
- Local cache для offline доступа

---

### 8. ⚙️ **Settings** (`/settings.html`)
**Статус:** ⏳ Not Started

**Priority:** 🟢 СРЕДНИЙ

- [ ] Общие настройки системы
- [ ] Dark/Light mode переключатель
- [ ] Конфигурация путей (input/output/cache) - опционально
- [ ] Параметры обработки по умолчанию
- [ ] Управление БД (optimize, clear cache, vacuum)
- [ ] Export/Import конфигурации системы
- [ ] Keyboard shortcuts настройка и просмотр
- [ ] Language выбор (en/ru)
- [ ] Session timeout настройка
- [ ] Log level настройка
- [ ] Уведомления preferences

**Возможные коллизии:**
- ⚠️ Некоторые настройки могут требовать перезагрузки
- ⚠️ Export/Import конфигурации валидация
- ⚠️ DB операции могут требовать confirmation

**Нужна реализация:**
- Settings persistence (localStorage)
- Theme switcher с system preference detection

---

## 📂 Структура файлов

```
email_checker/
├── web/
│   ├── index.html                      # Dashboard
│   ├── lists.html                      # Lists Manager
│   ├── smart-filter.html               # Smart Filter Studio
│   ├── blocklists.html                 # Blocklist Manager
│   ├── processing.html                 # Processing Queue
│   ├── analytics.html                  # Analytics & Reports
│   ├── archive.html                    # Archive & Cloud
│   ├── settings.html                   # Settings
│   │
│   ├── assets/
│   │   ├── css/
│   │   │   ├── tailwind.min.css       # Tailwind CDN
│   │   │   └── custom.css             # Кастомные стили + темная тема
│   │   ├── js/
│   │   │   ├── components/            # Web Components
│   │   │   │   ├── navbar.js
│   │   │   │   ├── sidebar.js
│   │   │   │   ├── table.js
│   │   │   │   ├── modal.js
│   │   │   │   ├── chart-widget.js
│   │   │   │   ├── file-uploader.js
│   │   │   │   ├── progress-bar.js
│   │   │   │   ├── toast-notification.js
│   │   │   │   ├── filter-builder.js
│   │   │   │   └── ...
│   │   │   ├── services/              # API & Service Layer
│   │   │   │   ├── api.js             # HTTP API calls
│   │   │   │   ├── websocket.js       # WebSocket connection
│   │   │   │   ├── gcloud.js          # Google Cloud Integration
│   │   │   │   └── storage.js         # LocalStorage wrapper
│   │   │   ├── utils/                 # Utilities
│   │   │   │   ├── state.js           # Global state management
│   │   │   │   ├── router.js          # Client-side routing
│   │   │   │   ├── helpers.js         # Helper functions
│   │   │   │   ├── theme.js           # Dark/Light theme switcher
│   │   │   │   └── keyboard.js        # Keyboard shortcuts
│   │   │   └── main.js                # Entry point
│   │   └── icons/                     # SVG icons
│   │
│   └── shared/
│       ├── header.html                # Shared navigation header
│       ├── sidebar.html               # Shared sidebar
│       └── footer.html                # Shared footer
│
├── web_server.py                       # Backend HTTP Server (updated)
├── web_server_websocket.py            # NEW: WebSocket Server
├── gcloud_integration.py               # NEW: GCS integration
│
└── WEB_REFACTORING_PLAN.md            # THIS FILE

```

---

## 🔌 Backend изменения

### ✅ Новые API endpoints:

#### Google Cloud Storage
```
POST   /api/archive/authenticate       # OAuth callback
POST   /api/archive/upload              # Загрузка в GCS
GET    /api/archive/list                # Список файлов в облаке
GET    /api/archive/download            # Скачивание из GCS
DELETE /api/archive/delete              # Удаление из GCS
GET    /api/archive/stats               # Статистика облака
```

#### History & Audit
```
GET    /api/history                     # История операций (с пагинацией)
GET    /api/history/:id                 # Детали операции
POST   /api/history/replay              # Повтор операции
DELETE /api/history/:id                 # Удаление записи истории
GET    /api/history/export              # Экспорт истории
```

#### WebSocket (Real-time)
```
ws://localhost:8082/ws                  # Main WebSocket connection

Events (Server -> Client):
- connection.established               # Соединение установлено
- task.started { id, name, total }    # Задача начата
- task.progress { id, processed, current_message }  # Прогресс
- task.completed { id, status, results }  # Завершено
- notification { type, message }       # Уведомление
- system.status { db_size, cache_size, queue_length }  # Статус системы
```

#### Smart Filter Extended
```
POST   /api/smart-filter/create         # Создание фильтра через UI
PUT    /api/smart-filter/:id/update     # Обновление фильтра
POST   /api/smart-filter/:id/test       # Тестирование на sample
GET    /api/smart-filter/templates      # Шаблоны фильтров
GET    /api/smart-filter/:id/versions   # История версий
POST   /api/smart-filter/:id/revert     # Откат на версию
```

#### Blocklist Extended
```
POST   /api/blocklists/import           # CSV import с валидацией
GET    /api/blocklists/stats            # Детальная статистика
GET    /api/blocklists/problematic      # Проблемные домены
POST   /api/blocklists/bulk-add         # Bulk add с валидацией
DELETE /api/blocklists/bulk-delete      # Bulk delete
POST   /api/blocklists/export           # Экспорт в формате
```

---

## 🎯 Этапы реализации

### **Фаза 1: Foundation** (Week 1-2)
**Статус:** ✅ COMPLETE (25 October 2025)

- [x] **1.1** Настройка Tailwind CSS + daisyUI (CDN + custom config)
- [x] **1.2** Создание базовых Web Components:
  - [x] NavBar / Sidebar компоненты
  - [x] Button компоненты (primary, secondary, danger)
  - [x] Table компонент (с сортировкой, фильтрацией)
  - [x] Modal компонент
  - [x] Toast notification компонент
- [x] **1.3** Client-side routing система (hash-based)
- [x] **1.4** Global state management (простой object-based)
- [x] **1.5** API service layer (fetch wrapper с error handling)
- [x] **1.6** WebSocket infrastructure (connection, reconnection logic)
- [x] **1.7** Theme switcher (dark/light mode) с localStorage
- [x] **1.8** Keyboard shortcuts system

**Deliverables:**
- [x] Базовый layout со всеми страницами (пустыми)
- [x] Навигация и routing работают
- [x] WebSocket подключение устанавливается
- [x] Dark mode переключается
- [x] API базовые вызовы работают

**✅ Все коллизии разрешены:**
- ✅ Web Components архитектура работает отлично
- ✅ State management система стабильна и масштабируется

---

### **Фаза 2: Core Pages** (Week 3-4)
**Статус:** ✅ COMPLETE (25 October 2025)

#### Dashboard реализация
- [x] **2.1** KPI cards компонент (4 карточки с метриками)
- [x] **2.2** Activity feed компонент (последние 20 операций)
- [x] **2.3** System status widget (База данных, WebSocket, Версия)
- [x] **2.4** Chart.js интеграция (Line chart trends + Doughnut distribution)
- [x] **2.5** Real-time обновление KPI через WebSocket listeners
- [x] **2.6** Quick actions section (быстрый доступ)

#### Lists Manager реализация
- [x] **2.7** Table с сортировкой и поиском (6 столбцов, 4 фильтра)
- [x] **2.8** Drag & drop file uploader (с модальным диалогом)
- [x] **2.9** Batch operations (select all, toggle row, processSelected)
- [x] **2.10** File preview modal (детали списка в модальном окне)
- [x] **2.11** Metadata editing inline (отображение и редактирование)
- [x] **2.12** Action buttons (Process, Details, Delete с confirmations)

#### Settings страница
- [x] **2.13** Dark/Light mode toggle (две кнопки с состояниями)
- [x] **2.14** General settings form (6 параметров настройки)
- [x] **2.15** Export/Import конфигурации (JSON-based)
- [x] **2.16** Keyboard shortcuts table (read-only с иконками)
- [x] **2.17** DB maintenance actions (clear cache, optimize, export, import)

**Deliverables:**
- [x] Dashboard с live KPI и графиками Chart.js
- [x] Lists Manager с полным функционалом и таблицей
- [x] Settings страница работает с localStorage persistence
- [x] Файлы загружаются через UI (file input)

**✅ Все коллизии разрешены:**
- ✅ Chart.js работает стабильно с WebSocket обновлениями
- ✅ Table selection и drag&drop не конфликтуют (разные обработчики)

---

### **Фаза 3: Smart Filter Studio** (Week 5-6)
**Статус:** ⏳ Ready to Start

**Priority:** 🔴 ВЫСШИЙ - эта фаза критична!

- [ ] **3.1** Filter config schema definition (JSON validation)
- [ ] **3.2** Visual filter builder компонент:
  - [ ] Industry keywords builder
  - [ ] Geographic priority selector
  - [ ] Exclusion rules builder
  - [ ] Weight sliders
- [ ] **3.3** JSON editor компонент (syntax highlighting)
- [ ] **3.4** Step 1: File selection
- [ ] **3.5** Step 2: Config selection / creation
- [ ] **3.6** Step 3: Parameter configuration
- [ ] **3.7** Step 4: Sample data preview & scoring
- [ ] **3.8** Step 5: Results & export
- [ ] **3.9** Template library:
  - [ ] Load templates
  - [ ] Save as template
  - [ ] Manage templates
- [ ] **3.10** Testing playground:
  - [ ] Upload sample data
  - [ ] Run filter
  - [ ] See scoring breakdown

**Deliverables:**
- [ ] Smart Filter Studio работает end-to-end
- [ ] Можно создавать новые фильтры через UI
- [ ] Preview скоринга работает
- [ ] Шаблоны сохраняются и загружаются

**Возможные коллизии:**
- ⚠️ Real-time preview скоринга МОЖЕТ БЫТЬ МЕДЛЕННЫМ - нужен debounce!
- ⚠️ JSON validation сложный для обычного пользователя - нужен UI помощник
- ⚠️ Backend не готов для новых фильтров - нужна backend реализация!
- ⚠️ Sample data синхронизация

**ВАЖНО:** Нужна backend реализация:
- Filter create API
- Filter validation API
- Sample scoring API
- Template management

---

### **Фаза 4: Advanced Features** (Week 7-8)
**Статус:** ⏳ Planned

#### Blocklist Manager реализация
- [ ] **4.1** Virtual scrolling для 22K+ элементов
- [ ] **4.2** Email & Domain search (indexed)
- [ ] **4.3** CSV import wizard:
  - [ ] File upload
  - [ ] Format detection
  - [ ] Preview
  - [ ] Validation
  - [ ] Commit
- [ ] **4.4** Statistics dashboard:
  - [ ] Top blocked domains
  - [ ] Blocking trends
  - [ ] Domain risk indicators
- [ ] **4.5** Bulk operations (add/remove/update)
- [ ] **4.6** Undo/Redo implementation
- [ ] **4.7** Export functionality

#### Processing Queue реализация
- [ ] **4.8** Real-time task list с WebSocket
- [ ] **4.9** Progress bars with ETA
- [ ] **4.10** Log streaming (autoscroll)
- [ ] **4.11** Task controls (pause/resume/cancel)
- [ ] **4.12** Notification system
- [ ] **4.13** History pagination (last 100 tasks)

**Deliverables:**
- [ ] Blocklist Manager работает с 22K+ элементами
- [ ] CSV import работает с валидацией
- [ ] Processing Queue показывает live обновления
- [ ] Undo/Redo функционирует

**Возможные коллизии:**
- ⚠️ Virtual scrolling может конфликтовать с search
- ⚠️ 22K+ элементы в таблице может требовать индексирования
- ⚠️ WebSocket disconnect при долгой обработке - нужна переподписка

---

### **Фаза 5: Analytics & Cloud Integration** (Week 9-10)
**Статус:** ⏳ Planned

#### Analytics реализация
- [ ] **5.1** Date range picker компонент
- [ ] **5.2** Chart.js интеграция для 4 типов:
  - [ ] Line chart (trends)
  - [ ] Bar chart (comparisons)
  - [ ] Pie chart (distribution)
  - [ ] Heatmap (temporal patterns)
- [ ] **5.3** Drill-down функциональность
- [ ] **5.4** Custom report builder
- [ ] **5.5** Export to CSV/PDF
- [ ] **5.6** Saved reports management

#### Archive & Cloud Storage реализация
- [ ] **5.7** OAuth 2.0 integration (backend part)
- [ ] **5.8** Local archive view (таблица):
  - [ ] All processed files
  - [ ] Tags
  - [ ] Metadata
  - [ ] Quick download
- [ ] **5.9** Google Cloud Storage:
  - [ ] List bucket contents
  - [ ] Upload files
  - [ ] Download files
  - [ ] Sync status
  - [ ] Version history
- [ ] **5.10** Tagging system (add/remove tags)
- [ ] **5.11** Archive search (по тегам, дате, имени)
- [ ] **5.12** Re-use workflow (download and process)

**Deliverables:**
- [ ] Analytics страница с интерактивными графиками
- [ ] Можно создавать кастомные отчеты
- [ ] Archive работает с Google Cloud
- [ ] Файлы синхронизируются в облако

**Возможные коллизии:**
- ⚠️ OAuth requires secure token storage
- ⚠️ Large file uploads могут timeout'ить
- ⚠️ Offline mode синхронизация коллизии
- ⚠️ GCS API costs - нужен monitoring

---

### **Фаза 6: Polish & Optimization** (Week 11-12)
**Статус:** ⏳ Planned

- [ ] **6.1** Performance optimization:
  - [ ] Chart.js lazy loading
  - [ ] Component code splitting
  - [ ] Image optimization
  - [ ] CSS minification
- [ ] **6.2** Error handling & recovery:
  - [ ] API error messages (user-friendly)
  - [ ] WebSocket reconnection
  - [ ] Offline mode support (partial)
  - [ ] Retry logic
- [ ] **6.3** Accessibility:
  - [ ] ARIA labels
  - [ ] Keyboard navigation testing
  - [ ] Color contrast check
  - [ ] Screen reader testing
- [ ] **6.4** Testing:
  - [ ] Component unit tests
  - [ ] Integration tests (core flows)
  - [ ] E2E tests (critical paths)
- [ ] **6.5** Documentation:
  - [ ] User guide (basic)
  - [ ] Keyboard shortcuts guide
  - [ ] Cloud storage setup
  - [ ] Troubleshooting guide
- [ ] **6.6** Deployment:
  - [ ] Build pipeline setup
  - [ ] Production configuration
  - [ ] Security audit
  - [ ] Performance audit

**Deliverables:**
- [ ] Production-ready UI
- [ ] Документация полная
- [ ] No console errors/warnings
- [ ] Performance metrics:
  - [ ] Page load < 2s
  - [ ] Chart render < 500ms
  - [ ] WebSocket latency < 100ms

---

## 🎨 Design System & Theme

### Цветовая палитра (ТЕМНО-СИНИЙ + ТЕМНО-КРАСНЫЙ)

**Primary Actions (Темно-синий):**
```css
.btn-primary {
  background-color: #1e40af;  /* Tailwind blue-900 */
  color: #f8fafc;
}
.btn-primary:hover {
  background-color: #1e3a8a;  /* blue-800 */
}
```

**Danger/Warning (Темно-красный):**
```css
.btn-danger {
  background-color: #991b1b;  /* Tailwind red-900 */
  color: #fef2f2;
}
.btn-danger:hover {
  background-color: #7f1d1d;  /* red-800 */
}
```

**Success (Зеленый):**
```css
.btn-success {
  background-color: #065f46;  /* Tailwind emerald-900 */
}
```

**Dark Theme:**
```css
:root[data-theme="dark"] {
  --bg-primary: #0f172a;      /* Slate-950 */
  --bg-secondary: #1e293b;    /* Slate-900 */
  --bg-tertiary: #334155;     /* Slate-700 */
  --text-primary: #f1f5f9;    /* Slate-100 */
  --text-secondary: #cbd5e1;  /* Slate-300 */
}
```

### Typography
- **Font family:** -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif
- **Base size:** 16px (1rem)
- **Scale:** 12px → 14px → 16px → 18px → 20px → 24px → 28px → 32px → 36px → 40px

### Component Sizing
- **Small:** h-8, px-3, py-1 (compact)
- **Medium:** h-10, px-4, py-2 (default)
- **Large:** h-12, px-6, py-3 (prominent)

### Spacing
- Using Tailwind's spacing scale (4px base unit)
- Consistent gaps: 1rem (16px) between major sections
- Padding: 20px-32px for page sections

---

## 📋 Tracking & Quality Gates

### Definition of Done для каждого пункта:
1. ✅ Функциональность реализована
2. ✅ Web Components работают и переиспользуемые
3. ✅ Темная тема поддерживается
4. ✅ Responsive design (если требуется)
5. ✅ Error handling реализован
6. ✅ WebSocket обновления работают (если требуется)
7. ✅ Код документирован
8. ✅ No console errors/warnings

### Testing Checklist
- [ ] Manual testing в Chrome, Firefox, Safari
- [ ] Dark/Light mode toggle работает
- [ ] WebSocket reconnection работает
- [ ] Error messages отображаются правильно
- [ ] Keyboard navigation работает
- [ ] Performance в пределах норм

---

## 🚨 Known Issues & Collisions

### Critical
1. **WebSocket reconnection** - нужна robust logic для разрывов соединения
2. **Large file handling** - 22K+ elements нужна virtual scrolling
3. **Real-time preview** - debounce необходим для скоринга
4. **GCS OAuth tokens** - secure storage требуется

### High Priority
5. **Theme persistence** - localStorage + system preference detection
6. **API error handling** - user-friendly messages
7. **Offline mode** - partial functionality support
8. **Memory leaks** - долгие polling sessions

### Medium Priority
9. **Chart performance** - оптимизация для больших датасетов
10. **Component reusability** - модульная структура
11. **State synchronization** - multiple tabs/windows
12. **File conflict resolution** - concurrent uploads

---

## 📊 Progress Tracking

### Completed Phases
- [ ] Phase 1 (Foundation) - % complete
- [ ] Phase 2 (Core Pages) - % complete
- [ ] Phase 3 (Smart Filter) - % complete
- [ ] Phase 4 (Advanced) - % complete
- [ ] Phase 5 (Analytics/Cloud) - % complete
- [ ] Phase 6 (Polish) - % complete

### Overall Progress
**Estimate:** 12 weeks (3 months)
**Current:** Week 0 (Planning complete)
**Next:** Phase 1 Foundation starts

---

## 🔧 Обновления плана

**История изменений:**
- **25.10.2025:** Версия 1.0 - Начальный план с цветовой палитрой (синий + красный), 8 страниц, 6 фаз

---

**Генерировано:** Claude Code AI Assistant
**Последний обновление:** 25 октября 2025
