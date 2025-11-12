/**
 * NavBar Component
 * Top navigation with theme toggle and user menu
 */

class NavBar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.innerHTML = `
            <!-- daisyUI Navbar -->
            <div class="navbar bg-base-100 border-b border-base-300 shadow-sm px-4">
                <!-- Mobile Menu Button + Logo -->
                <div class="navbar-start">
                    <label for="sidebar-drawer" class="btn btn-square btn-ghost lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </label>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <span class="text-primary-content font-bold text-lg">📧</span>
                        </div>
                        <div class="hidden sm:block">
                            <h1 class="text-xl font-bold">Email Checker</h1>
                            <p class="text-xs opacity-60">v${window.APP_CONFIG?.VERSION || '1.0.2'}</p>
                        </div>
                    </div>
                </div>

                <!-- Spacer (no center navigation) -->
                <div class="navbar-center"></div>

                <!-- Right Side Actions -->
                <div class="navbar-end gap-2">
                    <!-- WebSocket Status Indicator -->
                    <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200">
                        <div id="ws-indicator" class="w-2.5 h-2.5 bg-base-content opacity-40 rounded-full"></div>
                        <span id="ws-text" class="text-xs opacity-70 hidden sm:inline">Connecting...</span>
                    </div>

                    <!-- Classic Interface Link -->
                    <a href="/" class="btn btn-ghost btn-sm flex gap-1 items-center" title="Вернуться к классическому интерфейсу">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                        <span class="text-xs">Классический</span>
                    </a>

                    <!-- Theme Toggle (daisyUI swap) -->
                    <label class="swap swap-rotate btn btn-ghost btn-circle">
                        <input type="checkbox" id="theme-toggle" />
                        <!-- Sun icon -->
                        <svg class="swap-on fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
                        <!-- Moon icon -->
                        <svg class="swap-off fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
                    </label>

                    <!-- User Dropdown -->
                    <div class="dropdown dropdown-end">
                        <label tabindex="0" class="btn btn-ghost btn-circle avatar">
                            <div class="w-10 rounded-full bg-base-300 flex items-center justify-center">
                                <span class="text-2xl">👤</span>
                            </div>
                        </label>
                        <ul tabindex="0" class="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-300">
                            <li><a href="#settings">⚙️ Settings</a></li>
                            <li><a href="#" onclick="location.reload()">🔄 Refresh</a></li>
                            <li class="menu-title"><span>Help</span></li>
                            <li><a href="#" onclick="alert('Help')">❓ Help</a></li>
                            <li class="border-t border-base-300 mt-2 pt-2"><a class="text-error" onclick="alert('Logout')">🚪 Logout</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Theme toggle - daisyUI swap
        const themeToggle = this.querySelector('#theme-toggle');
        if (themeToggle) {
            // Set initial state
            themeToggle.checked = themeManager.isDark();

            themeToggle.addEventListener('change', () => {
                themeManager.toggle();
            });
        }

        // Subscribe to theme changes (external changes)
        themeManager.subscribe(() => {
            if (themeToggle) {
                themeToggle.checked = themeManager.isDark();
            }
        });

        // User dropdown - daisyUI handles this automatically via tabindex

        // Subscribe to WebSocket changes
        if (typeof ws !== 'undefined') {
            ws.on('connected', () => this.updateWSStatus(true));
            ws.on('disconnected', () => this.updateWSStatus(false));
        }
    }

    updateWSStatus(connected) {
        const indicator = this.querySelector('#ws-indicator');
        const text = this.querySelector('#ws-text');

        if (indicator && text) {
            if (connected) {
                indicator.className = 'w-3 h-3 bg-green-500 rounded-full animate-pulse';
                text.textContent = 'Connected';
            } else {
                indicator.className = 'w-3 h-3 bg-orange-500 rounded-full animate-pulse';
                text.textContent = 'Reconnecting...';
            }
        }
    }
}

// Register custom element
customElements.define('nav-bar', NavBar);

// Auto-render if element exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('navbar-container');
    if (container && !container.querySelector('nav-bar')) {
        const navbar = document.createElement('nav-bar');
        container.appendChild(navbar);
    }
});
