/**
 * Modal Component
 * Dialog and confirmation windows
 */

class Modal {
    constructor(title, content, options = {}) {
        this.title = title;
        this.content = content;
        this.options = {
            size: 'medium', // small, medium, large
            buttons: [], // [{ label: 'OK', onClick: fn, type: 'primary' }]
            closable: true,
            ...options
        };

        this.element = null;
        this.isOpen = false;
    }

    /**
     * Open modal
     */
    open() {
        this.render();
        this.isOpen = true;

        // Fade in animation
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('opacity-0');
                this.element.querySelector('.modal-content')?.classList.remove('-translate-y-4');
            }
        }, 10);

        return this;
    }

    /**
     * Close modal
     */
    close() {
        if (this.element) {
            this.element.classList.add('opacity-0');
            this.element.querySelector('.modal-content')?.classList.add('-translate-y-4');

            setTimeout(() => {
                this.element?.remove();
                this.isOpen = false;
            }, 300);
        }

        return this;
    }

    /**
     * Render modal
     */
    render() {
        const container = document.getElementById('modal-container');
        if (!container) return;

        const sizeClass = {
            'small': 'max-w-md',
            'medium': 'max-w-2xl',
            'large': 'max-w-4xl'
        }[this.options.size] || 'max-w-2xl';

        // Build buttons HTML
        let buttonsHTML = '';
        if (this.options.buttons.length === 0) {
            // Default close button
            buttonsHTML = `
                <button class="px-6 py-2 btn btn-primary rounded-lg transition-colors"
                        onclick="this.closest('.modal').close?.()">
                    Закрыть
                </button>
            `;
        } else {
            buttonsHTML = this.options.buttons.map(btn => {
                const btnClass = btn.type === 'secondary'
                    ? 'btn btn-ghost'
                    : btn.type === 'danger'
                    ? 'btn btn-error'
                    : 'btn btn-primary';

                return `
                    <button class="px-6 py-2 ${btnClass} rounded-lg transition-colors"
                            onclick="this.parentElement.parentElement._onButtonClick('${btn.label}')">
                        ${btn.label}
                    </button>
                `;
            }).join('');
        }

        const html = `
            <div class="modal fixed inset-0 z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-300" style="background-color: transparent;">
                <div class="modal-content bg-base-100 rounded-lg shadow-2xl overflow-auto ${sizeClass} -translate-y-4 transition-transform duration-300" style="max-height: 90vh;">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-6 border-b border-base-300">
                        <h2 class="text-xl font-semibold text-base-content">${this.title}</h2>
                        ${this.options.closable ? `
                            <button onclick="this.closest('.modal').close()" class="text-base-content opacity-70 hover:opacity-100">
                                ✕
                            </button>
                        ` : ''}
                    </div>

                    <!-- Content -->
                    <div class="p-6">
                        ${typeof this.content === 'string' ? this.content : ''}
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-end gap-3 p-6 border-t border-base-300">
                        ${buttonsHTML}
                    </div>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        this.element = wrapper.firstElementChild;

        // Store reference to this modal on element
        this.element._onButtonClick = (label) => this.handleButtonClick(label);

        // Close on backdrop click (click outside modal-content)
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.close();
            }
        });

        // Close on Escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);

        container.appendChild(this.element);
    }

    /**
     * Handle button click
     */
    handleButtonClick(label) {
        const button = this.options.buttons.find(b => b.label === label);
        if (button && button.onClick) {
            button.onClick();
        }
        this.close();
    }

    /**
     * Destroy modal
     */
    destroy() {
        document.removeEventListener('keydown', this.escapeHandler);
        if (this.element) {
            this.element.remove();
        }
    }
}

/**
 * Modal Service
 * Convenient methods for common dialogs
 */
class ModalService {
    /**
     * Show alert dialog
     */
    static alert(title, message) {
        return new Modal(title, message, {
            buttons: [{ label: 'OK', type: 'primary' }],
            size: 'small'
        }).open();
    }

    /**
     * Show confirm dialog
     */
    static confirm(title, message, onConfirm = null) {
        return new Modal(title, message, {
            buttons: [
                {
                    label: 'Отмена',
                    type: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Подтвердить',
                    type: 'danger',
                    onClick: onConfirm || (() => {})
                }
            ],
            size: 'small'
        }).open();
    }

    /**
     * Show input dialog
     */
    static prompt(title, message, placeholder = '', onSubmit = null) {
        const content = `
            <p class="text-base-content opacity-70 mb-4">${message}</p>
            <input type="text" placeholder="${placeholder}"
                   class="w-full px-4 py-2 border border-base-300 rounded-lg bg-base-200 text-base-content"
                   id="prompt-input" autofocus>
        `;

        return new Modal(title, content, {
            buttons: [
                {
                    label: 'Отмена',
                    type: 'secondary'
                },
                {
                    label: 'OK',
                    type: 'primary',
                    onClick: () => {
                        const input = document.getElementById('prompt-input');
                        if (onSubmit) {
                            onSubmit(input.value);
                        }
                    }
                }
            ],
            size: 'small'
        }).open();
    }

    /**
     * Show custom dialog
     */
    static show(title, content, buttons = [], options = {}) {
        return new Modal(title, content, {
            buttons,
            ...options
        }).open();
    }
}

// Export to window for browser environment
window.modal = ModalService;
window.ModalService = ModalService;  // Экспортируем также как ModalService

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal, ModalService };
}
