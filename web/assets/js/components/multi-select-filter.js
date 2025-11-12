/**
 * Multi-Select Filter Component
 * Provides a dropdown with checkboxes for multi-select filtering
 * Used primarily for status filtering in email list view
 */
class MultiSelectFilter {
    constructor(elementId, options = []) {
        this.elementId = elementId;
        this.element = document.getElementById(elementId);
        this.options = options; // [{value: 'Valid', label: 'Valid', color: 'success'}]
        this.selected = new Set();
        this.onChange = null; // Callback function when selection changes
        this.dropdownOpen = false;
    }

    init() {
        if (!this.element) {
            console.error(`Element with id '${this.elementId}' not found`);
            return;
        }

        this.render();
        this.attachEvents();
    }

    render() {
        const html = `
            <div class="dropdown dropdown-bottom">
                <label tabindex="0" class="btn btn-sm btn-outline gap-2" id="${this.elementId}-toggle">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Статус</span>
                    <span class="badge badge-primary badge-sm" id="${this.elementId}-count" style="display: none;">0</span>
                </label>
                <div tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-64 max-h-96 overflow-y-auto z-50" id="${this.elementId}-menu">
                    <div class="form-control p-2">
                        <h4 class="font-semibold text-sm mb-2">Фильтр по статусу</h4>
                        ${this.options.map(opt => this.renderOption(opt)).join('')}
                    </div>
                    <div class="divider my-1"></div>
                    <div class="flex justify-between px-2">
                        <button class="btn btn-xs btn-ghost" id="${this.elementId}-clear">
                            Очистить все
                        </button>
                        <button class="btn btn-xs btn-primary" id="${this.elementId}-apply">
                            Применить
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.element.innerHTML = html;
    }

    renderOption(opt) {
        const badgeColor = this.getBadgeColor(opt.color);
        const emoji = this.getStatusEmoji(opt.value);

        return `
            <label class="label cursor-pointer justify-start gap-2 hover:bg-base-200 rounded px-2">
                <input type="checkbox"
                       value="${opt.value}"
                       class="checkbox checkbox-sm checkbox-${opt.color || 'primary'}"
                       id="${this.elementId}-option-${opt.value}">
                <span class="label-text flex items-center gap-2">
                    <span class="badge ${badgeColor} badge-sm">${emoji} ${opt.label}</span>
                    <span class="text-xs text-gray-500" id="${this.elementId}-count-${opt.value}"></span>
                </span>
            </label>
        `;
    }

    getBadgeColor(color) {
        const colorMap = {
            'success': 'badge-success',
            'error': 'badge-error',
            'warning': 'badge-warning',
            'info': 'badge-info',
            'primary': 'badge-primary',
            'secondary': 'badge-secondary'
        };
        return colorMap[color] || 'badge-ghost';
    }

    getStatusEmoji(value) {
        const emojiMap = {
            'Valid': '✅',
            'Invalid': '❌',
            'NotSure': '❓',
            'Temp': '⏳'
        };
        return emojiMap[value] || '';
    }

    attachEvents() {
        // Toggle dropdown
        const toggle = document.getElementById(`${this.elementId}-toggle`);
        const menu = document.getElementById(`${this.elementId}-menu`);

        // Handle dropdown toggle
        toggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dropdownOpen = !this.dropdownOpen;
            if (this.dropdownOpen) {
                menu.classList.add('dropdown-open');
            } else {
                menu.classList.remove('dropdown-open');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.dropdownOpen = false;
                menu?.classList.remove('dropdown-open');
            }
        });

        // Prevent dropdown from closing when clicking inside menu
        menu?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Handle checkbox changes
        const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selected.add(e.target.value);
                } else {
                    this.selected.delete(e.target.value);
                }
                this.updateBadge();
            });
        });

        // Clear all button
        document.getElementById(`${this.elementId}-clear`)?.addEventListener('click', () => {
            this.clearAll();
        });

        // Apply button
        document.getElementById(`${this.elementId}-apply`)?.addEventListener('click', () => {
            this.applyFilter();
            this.dropdownOpen = false;
            menu?.classList.remove('dropdown-open');
        });
    }

    updateBadge() {
        const badge = document.getElementById(`${this.elementId}-count`);
        if (badge) {
            const count = this.selected.size;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    clearAll() {
        this.selected.clear();
        const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        this.updateBadge();
    }

    applyFilter() {
        if (this.onChange) {
            this.onChange(Array.from(this.selected));
        }
    }

    getSelected() {
        return Array.from(this.selected);
    }

    setSelected(values) {
        this.selected.clear();
        values.forEach(value => {
            this.selected.add(value);
            const checkbox = document.getElementById(`${this.elementId}-option-${value}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        this.updateBadge();
    }

    /**
     * Update option counts based on current data
     * @param {Object} counts - Object with value as key and count as value
     */
    updateCounts(counts) {
        this.options.forEach(opt => {
            const countElement = document.getElementById(`${this.elementId}-count-${opt.value}`);
            if (countElement && counts[opt.value]) {
                countElement.textContent = `(${counts[opt.value]})`;
            }
        });
    }

    /**
     * Enable or disable specific options
     * @param {Array} values - Values to enable/disable
     * @param {boolean} enabled - True to enable, false to disable
     */
    setOptionsEnabled(values, enabled) {
        values.forEach(value => {
            const checkbox = document.getElementById(`${this.elementId}-option-${value}`);
            if (checkbox) {
                checkbox.disabled = !enabled;
                const label = checkbox.closest('label');
                if (label) {
                    if (enabled) {
                        label.classList.remove('opacity-50', 'cursor-not-allowed');
                        label.classList.add('cursor-pointer');
                    } else {
                        label.classList.add('opacity-50', 'cursor-not-allowed');
                        label.classList.remove('cursor-pointer');
                    }
                }
            }
        });
    }

    /**
     * Reset the filter to its initial state
     */
    reset() {
        this.clearAll();
        this.applyFilter();
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        // Remove event listeners
        const toggle = document.getElementById(`${this.elementId}-toggle`);
        const clearBtn = document.getElementById(`${this.elementId}-clear`);
        const applyBtn = document.getElementById(`${this.elementId}-apply`);

        // Clone and replace to remove all event listeners
        if (toggle) {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
        }
        if (clearBtn) {
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        }
        if (applyBtn) {
            const newApplyBtn = applyBtn.cloneNode(true);
            applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        }

        // Clear the element
        if (this.element) {
            this.element.innerHTML = '';
        }

        // Clear internal state
        this.selected.clear();
        this.onChange = null;
    }
}

// Export for use in other modules
window.MultiSelectFilter = MultiSelectFilter;