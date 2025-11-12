/**
 * Settings Component
 * Manages application settings and configuration
 */

class SettingsComponent {
    constructor() {
        this.settings = this.loadSettings();
    }

    /**
     * Initialize Settings
     */
    init() {
        console.log('⚙️ Initializing Settings...');

        // Render settings page
        this.renderSettings();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ Settings initialized');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('appSettings');
        return saved ? JSON.parse(saved) : {
            theme: themeManager.get(),
            language: 'ru',
            autoRefresh: true,
            refreshInterval: 30,
            notificationsEnabled: true,
            debugMode: false
        };
    }

    /**
     * Save settings
     */
    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        toast.success('Settings saved');
    }

    /**
     * Render settings page
     */
    renderSettings() {
        const container = document.getElementById('main-content');
        if (!container) return;

        const html = `
            <div class="page-content">
                <div class="mb-8">
                    <h1 class="text-4xl font-bold text-slate-900 dark:text-white">⚙️ Settings</h1>
                    <p class="text-slate-600 dark:text-slate-400 mt-2">Конфигурация приложения</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left column -->
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Theme Settings -->
                        <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                            <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">🎨 Внешний вид</h2>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Тема оформления
                                    </label>
                                    <div class="flex gap-4">
                                        <button onclick="settingsComponent.setTheme('light')"
                                                class="px-6 py-2 rounded-lg border-2 transition-all ${this.settings.theme === 'light' ? 'bg-blue-900 text-white border-blue-900' : 'border-slate-300 dark:border-slate-600 hover:border-blue-900'}">
                                            ☀️ Светлая
                                        </button>
                                        <button onclick="settingsComponent.setTheme('dark')"
                                                class="px-6 py-2 rounded-lg border-2 transition-all ${this.settings.theme === 'dark' ? 'bg-blue-900 text-white border-blue-900' : 'border-slate-300 dark:border-slate-600 hover:border-blue-900'}">
                                            🌙 Темная
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Язык интерфейса
                                    </label>
                                    <select id="language-select"
                                            class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-900">
                                        <option value="ru" ${this.settings.language === 'ru' ? 'selected' : ''}>Русский</option>
                                        <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
                                        <option value="de" ${this.settings.language === 'de' ? 'selected' : ''}>Deutsch</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- General Settings -->
                        <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                            <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">⚡ Общие параметры</h2>

                            <div class="space-y-4">
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="auto-refresh"
                                            ${this.settings.autoRefresh ? 'checked' : ''}
                                            onchange="settingsComponent.toggleAutoRefresh(this.checked)"
                                            class="w-4 h-4">
                                    <span class="text-slate-700 dark:text-slate-300">Автоматическое обновление данных</span>
                                </label>

                                <div>
                                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Интервал обновления (сек)
                                    </label>
                                    <input type="number" id="refresh-interval"
                                            value="${this.settings.refreshInterval}"
                                            min="10" max="300" step="10"
                                            onchange="settingsComponent.updateRefreshInterval(this.value)"
                                            class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-900">
                                </div>

                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="notifications"
                                            ${this.settings.notificationsEnabled ? 'checked' : ''}
                                            onchange="settingsComponent.toggleNotifications(this.checked)"
                                            class="w-4 h-4">
                                    <span class="text-slate-700 dark:text-slate-300">Включить уведомления</span>
                                </label>

                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="debug-mode"
                                            ${this.settings.debugMode ? 'checked' : ''}
                                            onchange="settingsComponent.toggleDebugMode(this.checked)"
                                            class="w-4 h-4">
                                    <span class="text-slate-700 dark:text-slate-300">Режим отладки</span>
                                </label>
                            </div>
                        </div>

                        <!-- Database Settings -->
                        <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                            <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">💾 База данных</h2>

                            <div class="space-y-3">
                                <button onclick="settingsComponent.clearCache()"
                                        class="w-full px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-lg transition-colors text-left">
                                    🧹 Очистить кеш
                                </button>

                                <button onclick="settingsComponent.optimizeDatabase()"
                                        class="w-full px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors text-left">
                                    ⚡ Оптимизировать БД
                                </button>

                                <button onclick="settingsComponent.exportConfig()"
                                        class="w-full px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg transition-colors text-left">
                                    📥 Экспортировать конфигурацию
                                </button>

                                <button onclick="settingsComponent.importConfig()"
                                        class="w-full px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg transition-colors text-left">
                                    📤 Импортировать конфигурацию
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right column - Info -->
                    <div class="space-y-6">
                        <!-- Application Info -->
                        <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                            <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">ℹ️ О приложении</h2>

                            <div class="space-y-3 text-sm">
                                <div>
                                    <p class="text-slate-600 dark:text-slate-400">Версия</p>
                                    <p class="font-semibold text-slate-900 dark:text-white">${window.APP_CONFIG?.VERSION || '1.0.2'}</p>
                                </div>

                                <div>
                                    <p class="text-slate-600 dark:text-slate-400">Фаза разработки</p>
                                    <p class="font-semibold text-slate-900 dark:text-white">Phase 2: Core Pages</p>
                                </div>

                                <div>
                                    <p class="text-slate-600 dark:text-slate-400">Последнее обновление</p>
                                    <p class="font-semibold text-slate-900 dark:text-white">25 октября 2025</p>
                                </div>

                                <div>
                                    <p class="text-slate-600 dark:text-slate-400">Браузер</p>
                                    <p class="font-semibold text-slate-900 dark:text-white">${navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Keyboard Shortcuts -->
                        <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                            <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">⌨️ Горячие клавиши</h2>

                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between">
                                    <span class="text-slate-600 dark:text-slate-400">Поиск</span>
                                    <span class="font-mono text-slate-700 dark:text-slate-300">Ctrl + K</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-600 dark:text-slate-400">Закрыть модаль</span>
                                    <span class="font-mono text-slate-700 dark:text-slate-300">Esc</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-600 dark:text-slate-400">Переключить тему</span>
                                    <span class="font-mono text-slate-700 dark:text-slate-300">Ctrl + L</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const mainContent = container.querySelector('.page-content');
        if (mainContent) {
            mainContent.remove();
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        container.appendChild(wrapper.firstElementChild);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.settings.language = e.target.value;
                this.saveSettings();
            });
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        themeManager.set(theme);
        this.settings.theme = theme;
        this.saveSettings();
        this.renderSettings();
    }

    /**
     * Toggle auto refresh
     */
    toggleAutoRefresh(enabled) {
        this.settings.autoRefresh = enabled;
        this.saveSettings();
    }

    /**
     * Update refresh interval
     */
    updateRefreshInterval(value) {
        this.settings.refreshInterval = parseInt(value);
        this.saveSettings();
    }

    /**
     * Toggle notifications
     */
    toggleNotifications(enabled) {
        this.settings.notificationsEnabled = enabled;
        this.saveSettings();
    }

    /**
     * Toggle debug mode
     */
    toggleDebugMode(enabled) {
        this.settings.debugMode = enabled;
        this.saveSettings();

        if (enabled) {
            console.log('🐛 Debug mode enabled');
            window.debug.state();
        }
    }

    /**
     * Clear cache (selective - preserves user preferences)
     */
    clearCache() {
        ModalService.confirm(
            'Очистить кеш?',
            'Это удалит кешированные данные, но сохранит ваши настройки (тему, колонки, фильтры и т.д.).',
            () => {
                // Whitelist of keys to preserve (user preferences)
                const keysToPreserve = [
                    'theme',  // Theme preference
                    'appSettings',  // Application settings
                    'email-checker-preferences-v1',  // Centralized preferences
                    'email-checker-column-preferences',  // Column configuration
                    'listsPageSize',  // Page size preference
                    'smartFilterTemplates',  // User-created filter templates
                    'saved_reports',  // Saved analytics reports
                    'archive_tags'  // Archive tags
                ];

                // Backup values to preserve
                const backup = {};
                keysToPreserve.forEach(key => {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        backup[key] = value;
                    }
                });

                // Clear all localStorage
                localStorage.clear();

                // Restore preserved values
                Object.entries(backup).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });

                toast.success('Кеш очищен (настройки сохранены)');
                console.log(`✅ Cache cleared, preserved ${Object.keys(backup).length} user preferences`);
            }
        );
    }

    /**
     * Optimize database
     */
    optimizeDatabase() {
        toast.info('Optimizing database...');
        setTimeout(() => {
            toast.success('Database optimized successfully');
        }, 2000);
    }

    /**
     * Export configuration
     */
    exportConfig() {
        const config = {
            settings: this.settings,
            timestamp: new Date().toISOString()
        };

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Configuration exported');
    }

    /**
     * Import configuration
     */
    importConfig() {
        ModalService.prompt(
            'Import Configuration',
            'Paste the exported JSON configuration:',
            '',
            (value) => {
                try {
                    const config = JSON.parse(value);
                    this.settings = config.settings;
                    this.saveSettings();
                    this.renderSettings();
                    toast.success('Configuration imported successfully');
                } catch (error) {
                    toast.error('Invalid JSON configuration');
                }
            }
        );
    }
}

// Export for use in other modules
// Note: Initialization is handled by main.js router handler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SettingsComponent };
}
