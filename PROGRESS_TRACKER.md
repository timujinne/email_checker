Skills для создания (в порядке приоритета)
1. frontend-build-specialist (Приоритет 1, Фаза 1.1)
Экспертиза: Webpack 5, Tailwind CLI, PostCSS, npm scripts Содержание:
SKILL.md: ~2500 слов (конфигурация build pipeline, оптимизация)
References: 5 файлов (webpack patterns, tailwind setup, npm scripts, optimization, troubleshooting)
Assets: 5 шаблонов (webpack.config, tailwind.config, postcss.config, package.json scripts, .gitignore) Время создания: 8-11 часов
2. daisyui-component-expert (Приоритет 2, Фазы 1.2-1.4, 2.2-2.4)
Экспертиза: daisyUI компоненты, responsive design, темы, accessibility Содержание:
SKILL.md: ~3000 слов (компоненты, responsive patterns, темизация, a11y)
References: 6 файлов (components reference, responsive guide, themes, accessibility, forms, email-checker patterns)
Assets: 5 шаблонов (table, modal, form validation, theme switcher, responsive layout) Время создания: 11-14 часов
3. api-integration-specialist (Приоритет 3, Фазы 2.1, 3-7)
Экспертиза: REST API, WebSocket, state management, error handling Содержание:
SKILL.md: ~3600 слов (Fetch API, WebSocket, state patterns, error handling, optimization)
References: 6 файлов (fetch patterns, websocket, state management, error strategies, API reference, optimization)
Assets: 5 шаблонов (API client, WebSocket manager, state container, error handler, request queue) Время создания: 11-14 часов
4. testing-infrastructure-builder (Приоритет 4, Фаза 8)
Экспертиза: Jest unit tests, Cypress E2E, fixtures, mocking, coverage Содержание:
SKILL.md: ~2800 слов (Jest setup, Cypress, fixtures, coverage, test strategy)
References: 6 файлов (Jest setup, unit patterns, Cypress setup, E2E patterns, fixtures, test plan)
Assets: 5 шаблонов (jest.config, cypress.config, unit test, E2E test, fixtures) Время создания: 9-12 часов
5. performance-optimizer (Приоритет 5, Фаза 8)
Экспертиза: Bundle optimization, virtual scrolling, lazy loading, Lighthouse Содержание:
SKILL.md: ~3900 слов (bundle optimization, virtual scroll, lazy loading, runtime perf, Lighthouse)
References: 6 файлов (bundle optimization, virtual scroll, lazy loading, runtime perf, Lighthouse checklist, email-checker plan)
Assets: 5 шаблонов (virtual scroll, lazy image, performance monitoring, webpack optimization, lighthouse CI) Время создания: 12-15 часов
Процесс создания
Для каждого Skill:
Инициализация: python3 .claude/skill-creator/scripts/init_skill.py <skill-name>
Написание SKILL.md: Frontmatter + 7-9 разделов с экспертизой
Создание References: 4-6 markdown файлов с паттернами и примерами
Создание Assets: 3-5 шаблонов кода (configs, примеры)
Валидация: python3 .claude/skill-creator/scripts/quick_validate.py <skill-name>
Тестирование: Вызов Task agent с этим skill для реальной задачи из фазы
Валидация эффективности:
Task agent успешно загружает skill
Task agent использует references и templates
Задача выполняется с первой попытки
Код соответствует best practices из skill
Порядок реализации
Неделя 1: Skills 1-2 (frontend-build-specialist + daisyui-component-expert) → Позволяет выполнить Фазы 1.1-1.4 Неделя 2: Skill 3 (api-integration-specialist) → Позволяет выполнить Фазы 2.1, 3-7 Неделя 3: Skills 4-5 (testing-infrastructure-builder + performance-optimizer) → Позволяет выполнить Фазу 8
Общая оценка
Время: 51-66 часов (2-3 недели part-time или 1-1.5 недели full-time) Результат: 5 Skills готовых к использованию с Task agents для выполнения всех 8 фаз проекта
Первый шаг после утверждения
Создать frontend-build-specialist (самый критичный для Фазы 1.1):
python3 .claude/skill-creator/scripts/init_skill.py frontend-build-specialist
Затем наполнить содержимым согласно детальному плану.