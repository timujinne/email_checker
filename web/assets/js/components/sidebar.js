/**
 * Sidebar Component
 * Main navigation sidebar
 */

class Sidebar extends HTMLElement {
    constructor() {
        super();
        this.menuItems = [
            { path: 'dashboard', label: '🎯 Dashboard', icon: '📊' },
            { path: 'lists', label: '📋 Lists Manager', icon: '📁' },
            { path: 'email-list', label: '📧 Email Manager', icon: '✉️', badge: 'NEW' },
            { path: 'smart-filter', label: '🎯 Smart Filter', icon: '⚙️', badge: 'PRIORITY' },
            { path: 'blocklists', label: '🚫 Blocklists', icon: '🔒', badge: 'PRIORITY' },
            { path: 'processing', label: '⏳ Processing', icon: '⚡' },
            { path: 'analytics', label: '📊 Analytics', icon: '📈' },
            { path: 'archive', label: '📦 Archive', icon: '☁️' },
            { path: 'settings', label: '⚙️ Settings', icon: '🔧' }
        ];
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        const menuHTML = this.menuItems.map(item => {
            // Choose badge color based on type
            let badgeClass = 'badge-sm';
            if (item.badge === 'PRIORITY') {
                badgeClass += ' badge-error';
            } else if (item.badge === 'NEW') {
                badgeClass += ' badge-success';
            } else if (item.badge) {
                badgeClass += ' badge-primary';
            }

            return `
                <li>
                    <a href="#${item.path}" class="nav-item" data-path="${item.path}">
                        <span class="text-lg">${item.icon}</span>
                        <span>${item.label.replace(/^[^\s]+\s/, '')}</span>
                        ${item.badge ? `<span class="badge ${badgeClass} whitespace-nowrap text-[10px] font-bold">${item.badge}</span>` : ''}
                    </a>
                </li>
            `;
        }).join('');

        this.innerHTML = `
            <div class="h-full flex flex-col bg-base-200">
                <!-- Menu Title -->
                <div class="px-4 py-6 bg-base-100 border-b border-base-300">
                    <h2 class="text-sm font-bold uppercase tracking-wider opacity-70">Навигация</h2>
                </div>

                <!-- Menu Items (daisyUI menu) -->
                <ul class="menu flex-1 overflow-y-auto p-2 gap-1">
                    ${menuHTML}
                </ul>

                <!-- Footer: User Info + Theme Toggle -->
                <div class="border-t border-base-300 bg-base-100">
                    <!-- Theme Toggle -->
                    <div class="p-3 border-b border-base-300">
                        <label class="swap swap-rotate btn btn-ghost btn-block justify-start gap-3">
                            <input type="checkbox" id="sidebar-theme-toggle" />
                            <svg class="swap-on fill-current w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
                            <svg class="swap-off fill-current w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
                            <span class="text-sm opacity-80">Тема</span>
                        </label>
                    </div>

                    <!-- User Menu -->
                    <div class="p-3 border-b border-base-300">
                        <div class="dropdown dropdown-top dropdown-end w-full">
                            <label tabindex="0" class="btn btn-ghost btn-block justify-start gap-3">
                                <div class="avatar">
                                    <div class="w-8 rounded-full bg-base-300 flex items-center justify-center">
                                        <span class="text-lg">👤</span>
                                    </div>
                                </div>
                                <span class="text-sm opacity-80">Профиль</span>
                            </label>
                            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mb-2 border border-base-300">
                                <li><a href="#settings">⚙️ Settings</a></li>
                                <li><a href="#" onclick="location.reload()">🔄 Refresh</a></li>
                                <li class="menu-title"><span>Help</span></li>
                                <li><a href="#" onclick="alert('Help')">❓ Help</a></li>
                                <li class="border-t border-base-300 mt-2 pt-2"><a class="text-error" onclick="alert('Logout')">🚪 Logout</a></li>
                            </ul>
                        </div>
                    </div>

                    <!-- Version Info -->
                    <div class="p-3 text-center text-xs opacity-60">
                        <p class="font-semibold">v1.0.1</p>
                        <p>Фаза 1: Foundation</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Highlight active route with daisyUI active class (only if router exists)
        const updateActive = () => {
            // Use router if available, otherwise check hash or pathname
            let currentPath;
            if (typeof router !== 'undefined') {
                currentPath = router.getCurrentRoute();
            } else {
                // Fallback: check hash or pathname
                currentPath = window.location.hash.slice(1) || window.location.pathname.split('/').pop().replace('.html', '');
            }

            this.querySelectorAll('.nav-item').forEach(item => {
                const path = item.getAttribute('data-path');
                if (path === currentPath) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        };

        // Initial update
        updateActive();

        // Subscribe to route changes (only if router exists)
        if (typeof router !== 'undefined') {
            router.subscribe(() => updateActive());
        }

        // Close drawer on mobile when nav item clicked
        this.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const drawer = document.getElementById('sidebar-drawer');
                if (drawer && window.innerWidth < 1024) { // lg breakpoint
                    drawer.checked = false;
                }
            });
        });

        // Sidebar theme toggle
        const sidebarThemeToggle = this.querySelector('#sidebar-theme-toggle');
        if (sidebarThemeToggle) {
            // Set initial state
            sidebarThemeToggle.checked = themeManager.isDark();

            sidebarThemeToggle.addEventListener('change', () => {
                themeManager.toggle();
            });
        }

        // Subscribe to theme changes (sync with navbar toggle)
        themeManager.subscribe(() => {
            if (sidebarThemeToggle) {
                sidebarThemeToggle.checked = themeManager.isDark();
            }
        });
    }
}

// Register custom element
customElements.define('side-bar', Sidebar);

// Auto-render if element exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sidebar-container');
    if (container && !container.querySelector('side-bar')) {
        const sidebar = document.createElement('side-bar');
        container.appendChild(sidebar);
    }
});
