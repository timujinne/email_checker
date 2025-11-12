/**
 * Date Range Picker Component
 * Lightweight calendar-based date range selector with presets
 *
 * @module DateRangePicker
 */

class DateRangePicker {
    /**
     * Create DateRangePicker instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration options
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = {
            startDate: this.getDateXDaysAgo(30),
            endDate: new Date(),
            format: 'YYYY-MM-DD',
            presets: ['Today', '7 days', '30 days', '90 days', 'Custom'],
            ...options
        };

        this.currentStartDate = new Date(this.options.startDate);
        this.currentEndDate = new Date(this.options.endDate);
        this.selectedPreset = this.detectPreset();
        this.observers = [];
        this.calendarMode = 'start';  // 'start' or 'end'

        console.log('📅 DateRangePicker initialized');
        this.init();
    }

    /**
     * Initialize component
     */
    init() {
        this.render();
        this.setupEventListeners();
    }

    /**
     * Render component
     */
    render() {
        this.element.innerHTML = `
            <div class="date-range-picker">
                <!-- Presets -->
                <div class="picker-presets">
                    ${this.options.presets.map(preset => `
                        <button class="preset-btn ${this.selectedPreset === preset ? 'active' : ''}"
                                data-preset="${preset}">
                            ${preset}
                        </button>
                    `).join('')}
                </div>

                <!-- Date Inputs -->
                <div class="picker-inputs">
                    <div class="input-group">
                        <label>Start Date</label>
                        <input type="date" id="start-date-input" value="${this.formatDate(this.currentStartDate)}">
                    </div>
                    <div class="input-group">
                        <label>End Date</label>
                        <input type="date" id="end-date-input" value="${this.formatDate(this.currentEndDate)}">
                    </div>
                </div>

                <!-- Calendar -->
                <div class="picker-calendars" id="calendars-container">
                    <div class="calendar" id="calendar-start"></div>
                    <div class="calendar" id="calendar-end"></div>
                </div>

                <!-- Action Buttons -->
                <div class="picker-actions">
                    <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
                    <button class="btn btn-primary" id="btn-apply">Apply</button>
                </div>

                <!-- Selected Range Display -->
                <div class="picker-selected">
                    <span id="selected-range">
                        ${this.formatDate(this.currentStartDate)} to ${this.formatDate(this.currentEndDate)}
                    </span>
                </div>

                <!-- Days Count -->
                <div class="picker-days-count">
                    <span id="days-count">${this.getDaysDifference()} days</span>
                </div>
            </div>
        `;

        this.renderCalendars();
    }

    /**
     * Render calendars for both dates
     * @private
     */
    renderCalendars() {
        const startContainer = document.getElementById('calendar-start');
        const endContainer = document.getElementById('calendar-end');

        startContainer.innerHTML = this.renderCalendarMonth(this.currentStartDate, 'start');
        endContainer.innerHTML = this.renderCalendarMonth(this.currentEndDate, 'end');

        this.setupCalendarListeners();
    }

    /**
     * Render single calendar month
     * @private
     */
    renderCalendarMonth(date, type) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        let html = `
            <div class="calendar-header">
                <h3>${this.getMonthName(month)} ${year}</h3>
            </div>
            <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
                <div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-days">
        `;

        // Empty cells before first day
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += '<div class="empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const isSelected = this.isDateInRange(currentDate);
            const isStartDate = this.isDateEqual(currentDate, this.currentStartDate);
            const isEndDate = this.isDateEqual(currentDate, this.currentEndDate);

            let className = `day ${isSelected ? 'in-range' : ''}`;
            if (isStartDate) className += ' start-date';
            if (isEndDate) className += ' end-date';

            html += `
                <button class="${className}" data-date="${this.formatDate(currentDate)}" data-type="${type}">
                    ${day}
                </button>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Setup calendar day click listeners
     * @private
     */
    setupCalendarListeners() {
        document.querySelectorAll('.calendar-days .day').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dateStr = btn.dataset.date;
                const type = btn.dataset.type;
                const date = this.parseDate(dateStr);

                if (type === 'start') {
                    this.currentStartDate = date;
                } else {
                    this.currentEndDate = date;
                }

                // Validate: start should be before end
                if (this.currentStartDate > this.currentEndDate) {
                    [this.currentStartDate, this.currentEndDate] = [this.currentEndDate, this.currentStartDate];
                }

                this.selectedPreset = 'Custom';
                this.updateDisplay();
            });
        });
    }

    /**
     * Update display after date change
     * @private
     */
    updateDisplay() {
        // Update input fields
        document.getElementById('start-date-input').value = this.formatDate(this.currentStartDate);
        document.getElementById('end-date-input').value = this.formatDate(this.currentEndDate);

        // Update selected range display
        document.getElementById('selected-range').textContent =
            `${this.formatDate(this.currentStartDate)} to ${this.formatDate(this.currentEndDate)}`;

        // Update days count
        document.getElementById('days-count').textContent = `${this.getDaysDifference()} days`;

        // Update calendars
        this.renderCalendars();

        // Update preset buttons
        this.updatePresetButtons();
    }

    /**
     * Update preset button states
     * @private
     */
    updatePresetButtons() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-preset="${this.selectedPreset}"]`)?.classList.add('active');
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyPreset(e.target.dataset.preset);
            });
        });

        // Date input fields
        document.getElementById('start-date-input').addEventListener('change', (e) => {
            const date = this.parseDate(e.target.value);
            if (this.isValidDate(date)) {
                this.currentStartDate = date;
                if (this.currentStartDate > this.currentEndDate) {
                    this.currentEndDate = new Date(this.currentStartDate);
                }
                this.selectedPreset = 'Custom';
                this.updateDisplay();
            }
        });

        document.getElementById('end-date-input').addEventListener('change', (e) => {
            const date = this.parseDate(e.target.value);
            if (this.isValidDate(date)) {
                this.currentEndDate = date;
                if (this.currentEndDate < this.currentStartDate) {
                    this.currentStartDate = new Date(this.currentEndDate);
                }
                this.selectedPreset = 'Custom';
                this.updateDisplay();
            }
        });

        // Action buttons
        document.getElementById('btn-apply').addEventListener('click', () => {
            this.apply();
        });

        document.getElementById('btn-cancel').addEventListener('click', () => {
            this.render();
        });
    }

    /**
     * Apply preset
     * @private
     */
    applyPreset(preset) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (preset) {
            case 'Today':
                this.currentStartDate = new Date(today);
                this.currentEndDate = new Date(today);
                break;
            case '7 days':
                this.currentEndDate = new Date(today);
                this.currentStartDate = this.getDateXDaysAgo(7);
                break;
            case '30 days':
                this.currentEndDate = new Date(today);
                this.currentStartDate = this.getDateXDaysAgo(30);
                break;
            case '90 days':
                this.currentEndDate = new Date(today);
                this.currentStartDate = this.getDateXDaysAgo(90);
                break;
            case 'Custom':
                // Keep current dates
                break;
        }

        this.selectedPreset = preset;
        this.updateDisplay();
    }

    /**
     * Apply date range changes
     */
    apply() {
        this.notifyObservers('range-changed', {
            startDate: this.currentStartDate,
            endDate: this.currentEndDate,
            preset: this.selectedPreset
        });

        console.log(`✅ Date range applied: ${this.formatDate(this.currentStartDate)} to ${this.formatDate(this.currentEndDate)}`);
    }

    /**
     * Get date range
     * @returns {Object} {startDate, endDate}
     */
    getDateRange() {
        return {
            startDate: this.currentStartDate,
            endDate: this.currentEndDate,
            preset: this.selectedPreset
        };
    }

    /**
     * Set date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     */
    setDateRange(startDate, endDate) {
        this.currentStartDate = new Date(startDate);
        this.currentEndDate = new Date(endDate);
        this.selectedPreset = this.detectPreset();
        this.updateDisplay();
    }

    /**
     * Detect which preset matches current dates
     * @private
     */
    detectPreset() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((this.currentEndDate - this.currentStartDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0 && this.isDateEqual(this.currentEndDate, today)) {
            return 'Today';
        } else if (diffDays === 7) {
            return '7 days';
        } else if (diffDays === 30) {
            return '30 days';
        } else if (diffDays === 90) {
            return '90 days';
        }

        return 'Custom';
    }

    /**
     * Helper: Get date X days ago
     * @private
     */
    getDateXDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    /**
     * Helper: Format date as YYYY-MM-DD
     * @private
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Helper: Parse date from YYYY-MM-DD
     * @private
     */
    parseDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    /**
     * Helper: Check if dates are equal
     * @private
     */
    isDateEqual(date1, date2) {
        return this.formatDate(date1) === this.formatDate(date2);
    }

    /**
     * Helper: Check if date is in range
     * @private
     */
    isDateInRange(date) {
        return date >= this.currentStartDate && date <= this.currentEndDate;
    }

    /**
     * Helper: Validate date
     * @private
     */
    isValidDate(date) {
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Helper: Get month name
     * @private
     */
    getMonthName(month) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month];
    }

    /**
     * Helper: Get days difference
     * @private
     */
    getDaysDifference() {
        const diffTime = Math.abs(this.currentEndDate - this.currentStartDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Subscribe to changes
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notify observers
     * @private
     */
    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    /**
     * Get currently selected preset
     */
    getSelectedPreset() {
        return this.selectedPreset;
    }

    /**
     * Reset to default
     */
    reset() {
        this.currentStartDate = this.getDateXDaysAgo(30);
        this.currentEndDate = new Date();
        this.selectedPreset = this.detectPreset();
        this.updateDisplay();
    }

    /**
     * Export state
     */
    getState() {
        return {
            startDate: this.currentStartDate,
            endDate: this.currentEndDate,
            preset: this.selectedPreset,
            daysDifference: this.getDaysDifference()
        };
    }
}
