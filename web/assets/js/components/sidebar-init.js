/**
 * Sidebar Initialization
 * Renders sidebar into sidebar-container
 */

class SidebarRenderer {
    static init() {
        const container = document.getElementById('sidebar-container');
        if (!container) {
            console.warn('⚠️ Sidebar container not found');
            return;
        }

        container.innerHTML = `
            <div class="h-screen overflow-y-auto flex flex-col bg-base-100">
                <!-- Sidebar Header with Logo -->
                <div class="px-4 py-6 border-b border-base-300">
                    <div class="flex items-center gap-3">
                        <img src="assets/images/logo.webp" alt="Email Checker Logo" class="w-12 h-12 object-contain">
                        <div>
                            <h2 class="text-lg font-bold text-base-content">Email Checker</h2>
                            <p class="text-xs text-base-content opacity-60">v${window.APP_CONFIG?.VERSION || '1.0.2'}</p>
                        </div>
                    </div>
                </div>

                <!-- Menu Items -->
                <nav class="flex-1 px-4 py-6 space-y-2">
                    <!-- Dashboard -->
                    <a href="#dashboard" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors active" data-route="dashboard">
                        <span class="text-xl">📊</span>
                        <span class="font-medium">Dashboard</span>
                    </a>

                    <!-- Lists Manager -->
                    <a href="#lists" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="lists">
                        <span class="text-xl">📋</span>
                        <span class="font-medium">Lists Manager</span>
                    </a>

                    <!-- Email Manager -->
                    <a href="#email-list" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="email-list">
                        <span class="text-xl">📧</span>
                        <span class="font-medium">Email Manager</span>
                        <span class="badge badge-success badge-xs ml-auto">NEW</span>
                    </a>

                    <!-- Smart Filter -->
                    <a href="#smart-filter" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="smart-filter">
                        <span class="text-xl">🎯</span>
                        <span class="font-medium">Smart Filter</span>
                    </a>

                    <!-- Blocklists -->
                    <a href="#blocklists" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="blocklists">
                        <span class="text-xl">🚫</span>
                        <span class="font-medium">Blocklists</span>
                    </a>

                    <!-- Processing Queue -->
                    <a href="#processing" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="processing">
                        <span class="text-xl">⏳</span>
                        <span class="font-medium">Processing</span>
                    </a>

                    <!-- Analytics -->
                    <a href="#analytics" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="analytics">
                        <span class="text-xl">📈</span>
                        <span class="font-medium">Analytics</span>
                    </a>

                    <!-- Archive -->
                    <a href="#archive" class="sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg bg-base-200 text-base-content hover:bg-primary/10 transition-colors" data-route="archive">
                        <span class="text-xl">📦</span>
                        <span class="font-medium">Archive</span>
                    </a>
                </nav>

                <!-- Footer Section -->
                <div class="border-t border-base-300 px-4 py-4 space-y-3">
                    <!-- WebSocket Status -->
                    <div class="px-4 py-3 bg-base-200 rounded-lg">
                        <div class="flex items-center gap-2 mb-1">
                            <div id="sidebar-ws-indicator" class="w-3 h-3 bg-base-content opacity-40 rounded-full animate-pulse"></div>
                            <span class="text-xs font-semibold uppercase tracking-wider text-base-content opacity-70">WebSocket</span>
                        </div>
                        <span id="sidebar-ws-text" class="text-xs text-base-content opacity-70">Connecting...</span>
                    </div>

                    <!-- Classic Interface Link -->
                    <a href="/" class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/10 border-2 border-primary text-primary hover:bg-primary/20 font-medium transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                        <span class="text-sm">Классический интерфейс</span>
                    </a>

                    <!-- Theme Toggle -->
                    <button id="sidebar-theme-toggle" class="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors">
                        <div class="flex items-center gap-3">
                            <span id="sidebar-theme-icon" class="text-xl">🌙</span>
                            <span class="font-medium text-sm text-base-content">Theme</span>
                        </div>
                        <span id="sidebar-theme-label" class="text-xs text-base-content opacity-70">Light</span>
                    </button>

                    <!-- User Menu -->
                    <div class="px-4 py-3 bg-base-200 rounded-lg space-y-2">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xl">👤</span>
                            <span class="font-medium text-sm text-base-content">User Menu</span>
                        </div>
                        <a href="#settings" class="sidebar-item block px-3 py-2 text-sm text-base-content hover:bg-base-300 rounded transition-colors" data-route="settings">
                            ⚙️ Settings
                        </a>
                        <button onclick="alert('Help documentation')" class="w-full text-left px-3 py-2 text-sm text-base-content hover:bg-base-300 rounded transition-colors">
                            ❓ Help
                        </button>
                        <a href="#" onclick="location.reload()" class="block px-3 py-2 text-sm text-base-content hover:bg-base-300 rounded transition-colors">
                            🔄 Refresh
                        </a>
                        <hr class="my-2 border-base-300">
                        <button onclick="alert('Logout functionality')" class="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/10 rounded transition-colors">
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    static attachEventListeners() {
        // Mark active menu item based on current route
        const updateActiveItem = () => {
            const currentRoute = typeof router !== 'undefined' ? router.getCurrentRoute() : 'dashboard';

            document.querySelectorAll('.sidebar-item').forEach(item => {
                const route = item.getAttribute('data-route');
                if (route === currentRoute) {
                    item.classList.remove('bg-base-200', 'text-base-content');
                    item.classList.add('bg-primary', 'text-primary-content', 'font-semibold', 'border-l-4', 'border-primary-focus');
                } else {
                    item.classList.remove('bg-primary', 'text-primary-content', 'font-semibold', 'border-l-4', 'border-primary-focus');
                    item.classList.add('bg-base-200', 'text-base-content');
                }
            });
        };

        // Update on route change
        if (typeof router !== 'undefined') {
            router.subscribe((route) => {
                updateActiveItem();
            });
        }

        // Initial update
        updateActiveItem();

        // Sidebar theme toggle
        const sidebarThemeToggle = document.getElementById('sidebar-theme-toggle');
        if (sidebarThemeToggle) {
            sidebarThemeToggle.addEventListener('click', () => {
                if (typeof themeManager !== 'undefined') {
                    themeManager.toggle();
                    this.updateSidebarTheme();
                }
            });
        }

        // Update sidebar theme on init
        this.updateSidebarTheme();

        // Subscribe to theme changes
        if (typeof themeManager !== 'undefined') {
            themeManager.subscribe(() => {
                this.updateSidebarTheme();
            });
        }

        // Update sidebar WebSocket indicator
        this.updateSidebarWSIndicator();

        // Subscribe to WebSocket changes
        if (typeof store !== 'undefined') {
            store.subscribe(() => {
                this.updateSidebarWSIndicator();
            });
        }
    }

    static updateSidebarTheme() {
        const themeIcon = document.getElementById('sidebar-theme-icon');
        const themeLabel = document.getElementById('sidebar-theme-label');

        if (themeIcon && themeLabel && typeof themeManager !== 'undefined') {
            const isDark = themeManager.isDark();
            themeIcon.textContent = isDark ? '☀️' : '🌙';
            themeLabel.textContent = isDark ? 'Dark' : 'Light';
        }
    }

    static updateSidebarWSIndicator() {
        const indicator = document.getElementById('sidebar-ws-indicator');
        const text = document.getElementById('sidebar-ws-text');

        if (indicator && text) {
            const isConnected = typeof store !== 'undefined' && store.get('wsConnected');
            const wsEnabled = typeof ws !== 'undefined' && ws.enabled;

            if (isConnected) {
                indicator.className = 'w-3 h-3 bg-success rounded-full';
                text.textContent = 'Connected';
                text.className = 'text-xs text-success';
            } else if (!wsEnabled) {
                indicator.className = 'w-3 h-3 bg-base-content opacity-50 rounded-full';
                text.textContent = 'Offline mode';
                text.className = 'text-xs text-base-content opacity-60';
            } else {
                indicator.className = 'w-3 h-3 bg-warning rounded-full animate-pulse';
                text.textContent = 'Connecting...';
                text.className = 'text-xs text-warning';
            }
        }
    }
}

// Export to window
window.SidebarRenderer = SidebarRenderer;
