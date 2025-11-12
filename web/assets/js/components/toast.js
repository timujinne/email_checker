/**
 * Toast Notification Component
 * Shows temporary notifications at bottom-right
 */

class ToastNotification extends HTMLElement {
    constructor(message, type = 'info', duration = 3000) {
        super();
        this.message = message;
        this.type = type; // 'success', 'error', 'warning', 'info'
        this.duration = duration;
    }

    connectedCallback() {
        this.render();
        if (this.duration > 0) {
            setTimeout(() => this.dismiss(), this.duration);
        }
    }

    render() {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const colors = {
            success: 'alert alert-success',
            error: 'alert alert-error',
            warning: 'alert alert-warning',
            info: 'alert alert-info'
        };

        this.className = `animate-slide-in ${colors[this.type]} flex items-center gap-3 min-w-[300px] shadow-lg`;

        this.innerHTML = `
            <span class="text-lg">${icons[this.type]}</span>
            <span class="flex-1">${this.message}</span>
            <button class="ml-2 text-lg hover:opacity-70" onclick="this.closest('toast-notification').dismiss()">×</button>
        `;
    }

    dismiss() {
        this.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => this.remove(), 300);
    }
}

customElements.define('toast-notification', ToastNotification);

/**
 * Toast Service
 * Centralized service for showing notifications
 */
class ToastService {
    constructor(containerId = 'toast-container') {
        this.container = document.getElementById(containerId);
    }

    show(message, type = 'info', duration = 3000) {
        const toast = new ToastNotification(message, type, duration);
        if (this.container) {
            this.container.appendChild(toast);
        }
        return toast;
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    // Persistent notification (no auto-dismiss)
    persistent(message, type = 'info') {
        return this.show(message, type, 0);
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Global instance
const toast = new ToastService();

// Export to window for browser environment
window.toast = toast;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastNotification, ToastService, toast };
}
