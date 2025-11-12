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
        console.log('🔵 Modal.open() called');
        console.log('   this.title:', this.title);
        console.log('   this.options:', this.options);
        console.log('   this.options.buttons:', this.options.buttons);
        console.log('   typeof this.options.buttons:', typeof this.options.buttons);
        console.log('   Array.isArray(this.options.buttons):', Array.isArray(this.options.buttons));

        this.render();
        this.isOpen = true;

        // Fade in animation
        setTimeout(() => {
            if (this.element) {
                console.log('🎨 Applying animation classes to modal');
                console.log('   Before remove - classList:', this.element.classList.toString());
                console.log('   Before remove - style:', this.element.style.cssText);

                this.element.classList.remove('opacity-0');
                this.element.querySelector('.modal-content')?.classList.remove('-translate-y-4');

                console.log('   After remove - classList:', this.element.classList.toString());
                console.log('   After remove - computed opacity:', window.getComputedStyle(this.element).opacity);
                console.log('   After remove - computed display:', window.getComputedStyle(this.element).display);
                console.log('   After remove - computed z-index:', window.getComputedStyle(this.element).zIndex);

                // Check bounding rect and viewport position
                const rect = this.element.getBoundingClientRect();
                console.log('   Bounding rect:', {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right
                });
                console.log('   Viewport:', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
                console.log('   Is in viewport:',
                    rect.top < window.innerHeight &&
                    rect.bottom > 0 &&
                    rect.left < window.innerWidth &&
                    rect.right > 0
                );

                // Check modal-content visibility
                const modalContent = this.element.querySelector('.modal-content');
                if (modalContent) {
                    const contentStyles = window.getComputedStyle(modalContent);
                    const contentRect = modalContent.getBoundingClientRect();
                    console.log('   Modal-content display:', contentStyles.display);
                    console.log('   Modal-content visibility:', contentStyles.visibility);
                    console.log('   Modal-content opacity:', contentStyles.opacity);
                    console.log('   Modal-content rect:', {
                        top: contentRect.top,
                        left: contentRect.left,
                        width: contentRect.width,
                        height: contentRect.height
                    });
                }

                // Check for elements with higher z-index
                console.log('   Checking for z-index conflicts...');
                const allElements = document.querySelectorAll('*');
                const highZIndexElements = Array.from(allElements)
                    .map(el => ({
                        element: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                        zIndex: parseInt(window.getComputedStyle(el).zIndex) || 0
                    }))
                    .filter(item => item.zIndex >= 1000)
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .slice(0, 10);
                console.log('   Top 10 z-index elements:', highZIndexElements);
            } else {
                console.error('❌ Modal element is null in animation timeout!');
            }
        }, 10);

        return this;
    }

    /**
     * Close modal
     */
    close() {
        console.log('🔴 Modal.close() called');

        if (!this.element) {
            console.warn('⚠️ Modal.close() called but element is null');
            return this;
        }

        // Mark as closed immediately
        this.isOpen = false;

        // Remove escape key listener
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            console.log('   Removed escape handler');
        }

        // Fade out animation
        this.element.classList.add('opacity-0');
        this.element.querySelector('.modal-content')?.classList.add('-translate-y-4');

        // Remove from DOM after animation
        setTimeout(() => {
            if (this.element) {
                this.element.remove();
                console.log('✅ Modal removed from DOM');
            }
        }, 300);

        return this;
    }

    /**
     * Render modal
     */
    render() {
        console.log('🎨 Modal.render() called');

        const container = document.getElementById('modal-container');
        console.log('   modal-container found:', !!container);

        if (!container) {
            console.error('❌ modal-container not found in DOM!');
            return;
        }

        const sizeClass = {
            'small': 'max-w-md',
            'medium': 'max-w-2xl',
            'large': 'max-w-4xl'
        }[this.options.size] || 'max-w-2xl';

        console.log('   sizeClass:', sizeClass);

        // Build buttons HTML
        console.log('   Building buttons HTML...');
        console.log('   this.options.buttons:', this.options.buttons);
        console.log('   this.options.buttons.length:', this.options.buttons.length);

        let buttonsHTML = '';
        if (this.options.buttons.length === 0) {
            // Default close button
            buttonsHTML = `
                <button class="px-6 py-2 btn btn-primary rounded-lg transition-colors"
                        data-close-button
                        style="cursor: pointer; pointer-events: auto;">
                    Закрыть
                </button>
            `;
        } else {
            buttonsHTML = this.options.buttons.map((btn, index) => {
                const btnClass = btn.type === 'secondary'
                    ? 'btn btn-ghost'
                    : btn.type === 'danger'
                    ? 'btn btn-error'
                    : 'btn btn-primary';

                return `
                    <button class="px-6 py-2 ${btnClass} rounded-lg transition-colors"
                            data-button-index="${index}"
                            style="cursor: pointer; pointer-events: auto;">
                        ${btn.label}
                    </button>
                `;
            }).join('');
        }

        const html = `
            <div class="modal fixed inset-0 z-[9999] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300" style="background-color: rgba(0, 0, 0, 0.85); display: flex !important;">
                <div class="modal-content bg-base-100 rounded-lg shadow-2xl overflow-auto ${sizeClass} -translate-y-4 transition-transform duration-300" style="max-height: 90vh; visibility: visible !important; position: relative; z-index: 10000;">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-6 border-b border-base-300">
                        <h2 class="text-xl font-semibold text-base-content">${this.title}</h2>
                        ${this.options.closable ? `
                            <button data-close-button class="text-base-content opacity-70 hover:opacity-100" style="cursor: pointer; pointer-events: auto;">
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

        console.log('   Modal element created:', !!this.element);
        console.log('   Modal element classes:', this.element?.classList.toString());

        // Store reference to this modal instance on DOM element
        this.element._modalInstance = this;

        // Attach button click handlers using event delegation
        this.element.addEventListener('click', (e) => {
            // Handle backdrop click (click outside modal-content)
            if (e.target === this.element) {
                console.log('🖱️ Backdrop clicked - closing modal');
                this.close();
                return;
            }

            // Handle close button (✕)
            const closeButton = e.target.closest('button[data-close-button]');
            if (closeButton) {
                console.log('🖱️ Close button (✕) clicked');
                this.close();
                return;
            }

            // Handle action buttons
            const actionButton = e.target.closest('button[data-button-index]');
            if (actionButton) {
                const index = parseInt(actionButton.getAttribute('data-button-index'));
                console.log('🖱️ Action button clicked, index:', index);

                if (this.options.buttons[index]) {
                    const btn = this.options.buttons[index];
                    console.log('   Executing onClick for button:', btn.label);

                    // Execute onClick handler if exists
                    if (btn.onClick) {
                        btn.onClick();
                    }

                    // Close modal after button action
                    this.close();
                }
            }
        });

        // Close on Escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);

        console.log('   Appending modal to container...');
        container.appendChild(this.element);
        console.log('✅ Modal appended to DOM');
        console.log('   Container children count:', container.children.length);
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
     * Supports both signatures:
     * - show(title, content, buttons, options) - traditional 4-param
     * - show(title, content, options) - 3-param with options only
     */
    static show(title, content, buttonsOrOptions = [], options = {}) {
        console.log('🟢 ModalService.show() called with:');
        console.log('   title:', title);
        console.log('   content length:', typeof content === 'string' ? content.length : 'not string');
        console.log('   3rd param:', buttonsOrOptions);
        console.log('   typeof 3rd param:', typeof buttonsOrOptions);
        console.log('   Array.isArray(3rd param):', Array.isArray(buttonsOrOptions));
        console.log('   4th param (options):', options);

        // Close all existing modals before opening new one
        console.log('🧹 Closing all existing modals before opening new one...');
        ModalService.closeAll();

        // Smart detection: if 3rd param is an object (not array), treat it as options
        let buttons = [];
        let finalOptions = {};

        if (Array.isArray(buttonsOrOptions)) {
            // Traditional 4-param signature: show(title, content, buttons, options)
            console.log('   ✅ Detected 4-param signature (buttons array)');
            buttons = buttonsOrOptions;
            finalOptions = options;
        } else if (typeof buttonsOrOptions === 'object' && buttonsOrOptions !== null) {
            // 3-param signature: show(title, content, options)
            console.log('   ✅ Detected 3-param signature (options object)');
            buttons = [];
            finalOptions = buttonsOrOptions;
        } else {
            // Fallback
            console.warn('   ⚠️ Unexpected 3rd param type, using defaults');
            buttons = [];
            finalOptions = {};
        }

        console.log('   → Final buttons:', buttons);
        console.log('   → Final options:', finalOptions);

        return new Modal(title, content, {
            buttons,
            ...finalOptions
        }).open();
    }

    /**
     * Close all open modals
     */
    static closeAll() {
        console.log('🧹 ModalService.closeAll() called');
        const modals = document.querySelectorAll('.modal');
        console.log(`   Found ${modals.length} modal(s) to close`);

        modals.forEach((modal, index) => {
            console.log(`   Closing modal ${index + 1}/${modals.length}`);

            // Use modal instance close() if available (proper cleanup)
            if (modal._modalInstance) {
                console.log('   → Using _modalInstance.close()');
                modal._modalInstance.close();
            } else {
                // Fallback: direct removal
                console.log('   → Direct removal (no instance)');
                modal.remove();
            }
        });

        console.log('✅ All modals closed');
    }
}

// Export to window for browser environment
window.modal = ModalService;
window.ModalService = ModalService;  // Экспортируем также как ModalService

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal, ModalService };
}
