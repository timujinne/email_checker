/**
 * NavBar Initialization
 * Renders navigation bar into navbar-container
 */

class NavBarRenderer {
    static init() {
        const container = document.getElementById('navbar-container');
        if (!container) {
            console.warn('⚠️ NavBar container not found');
            return;
        }

        container.innerHTML = `
            <nav class="bg-base-100 border-b border-base-300 shadow-sm">
                <div class="flex items-center justify-between px-8 py-4">
                    <!-- Logo & Title -->
                    <div class="flex items-center gap-3">
                        <!-- Sidebar Toggle Button -->
                        <label for="sidebar-drawer" class="btn btn-ghost btn-sm drawer-button">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </label>

                        <img src="assets/images/logo.webp" alt="Email Checker Logo" class="w-10 h-10 object-contain">
                        <div>
                            <h1 class="text-xl font-bold text-base-content">Email Checker</h1>
                            <p class="text-xs text-base-content opacity-60">v${window.APP_CONFIG?.VERSION || '1.0.2'}</p>
                        </div>
                    </div>

                    <!-- Navigation Links -->
                    <div class="flex items-center gap-6">
                        <a href="#dashboard" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Dashboard</a>
                        <a href="#lists" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Lists</a>
                        <a href="#email-list" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Email Manager</a>
                        <a href="#smart-filter" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Smart Filter</a>
                        <a href="#blocklists" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Blocklists</a>
                        <a href="#processing" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Processing</a>
                        <a href="#analytics" class="nav-link text-base-content opacity-80 hover:text-primary hover:opacity-100 font-medium transition-all">Analytics</a>
                    </div>

                    <!-- Right Side Actions -->
                    <div class="flex items-center gap-4">
                        <!-- WebSocket Status -->
                        <div class="flex items-center gap-2">
                            <div id="ws-indicator" class="w-3 h-3 bg-base-content opacity-40 rounded-full animate-pulse"></div>
                            <span id="ws-text" class="text-xs text-base-content opacity-70">Connecting...</span>
                        </div>

                        <!-- Classic Interface Link -->
                        <a href="/" class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-base-content opacity-60 hover:text-primary hover:opacity-100 hover:bg-base-200 rounded transition-all" title="Классический интерфейс">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                            <span class="font-mono">old V</span>
                        </a>

                        <!-- Theme Toggle -->
                        <button id="theme-toggle" class="p-2 rounded-lg hover:bg-base-200 transition-colors" title="Toggle theme">
                            <span id="theme-icon" class="text-xl">🌙</span>
                        </button>

                        <!-- User Menu -->
                        <div class="relative">
                            <button id="user-menu-btn" class="p-2 rounded-lg hover:bg-base-200 transition-colors">
                                <span class="text-xl">👤</span>
                            </button>
                            <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                                <a href="#settings" class="block px-4 py-2 text-base-content hover:bg-base-200">⚙️ Settings</a>
                                <a href="#" onclick="location.reload()" class="block px-4 py-2 text-base-content hover:bg-base-200">🔄 Refresh</a>
                                <hr class="my-2 border-base-300">
                                <button onclick="alert('Logout functionality')" class="w-full text-left px-4 py-2 text-error hover:bg-error/10">🚪 Logout</button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;

        this.attachEventListeners();
    }

    static attachEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (typeof themeManager !== 'undefined') {
                    themeManager.toggle();
                    this.updateThemeIcon();
                }
            });
        }

        // Update theme icon based on current theme
        this.updateThemeIcon();

        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenu = document.getElementById('user-menu');

        if (userMenuBtn && userMenu) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                // Check if target has closest method before calling it
                if (!e.target || typeof e.target.closest !== 'function') {
                    return;
                }
                if (!e.target.closest('#user-menu-btn') && !e.target.closest('#user-menu')) {
                    userMenu.classList.add('hidden');
                }
            });
        }

        // Update WebSocket indicator
        this.updateWSIndicator();

        // Subscribe to theme changes
        if (typeof themeManager !== 'undefined') {
            themeManager.subscribe(() => {
                this.updateThemeIcon();
            });
        }

        // Update active nav link based on route
        this.updateActiveNavLink();
        if (typeof router !== 'undefined') {
            router.subscribe(() => {
                this.updateActiveNavLink();
            });
        }

        // Subscribe to WebSocket changes
        if (typeof store !== 'undefined') {
            store.subscribe((state) => {
                this.updateWSIndicator();
            });
        }
    }

    static updateThemeIcon() {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon && typeof themeManager !== 'undefined') {
            themeIcon.textContent = themeManager.isDark() ? '☀️' : '🌙';
        }
    }

    static updateWSIndicator() {
        const indicator = document.getElementById('ws-indicator');
        const text = document.getElementById('ws-text');

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

    static updateActiveNavLink() {
        const currentRoute = typeof router !== 'undefined' ? router.getCurrentRoute() : 'dashboard';

        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.substring(1) === currentRoute) {
                // Add active state classes
                link.classList.remove('opacity-80');
                link.classList.add('text-primary', 'opacity-100', 'font-semibold', 'border-b-2', 'border-primary');
            } else {
                // Remove active state classes
                link.classList.remove('text-primary', 'opacity-100', 'font-semibold', 'border-b-2', 'border-primary');
                link.classList.add('opacity-80');
            }
        });
    }
}

// Export to window
window.NavBarRenderer = NavBarRenderer;
