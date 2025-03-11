/**
 * Date Selection Module
 * 
 * Handles calendar and time slot selection
 */

const MBDateSelection = {
    /**
     * Current calendar state
     */
    calendar: {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        selectedDate: null
    },
    
    /**
     * Initialize date selection
     * 
     * @param {Object} options Configuration options
     */
    init: function(options = {}) {
        // Set default options
        this.options = Object.assign({
            calendarContainer: '.mb-calendar-dates',
            monthDisplay: '.mb-current-month',
            prevMonthButton: '.mb-prev-month',
            nextMonthButton: '.mb-next-month',
            timeSlotsContainer: '.mb-time-slots',
            selectedDateDisplay: '.mb-selected-date',
            continueButton: '.mb-continue-btn',
            onDateSelected: null,
            onTimeSelected: null
        }, options);
        
        // Initial date setup
        this.calendar.selectedDate = options.selectedDate || null;
        
        // Render calendar
        this.renderCalendar();
        
        // Set up event listeners
        this.setupEventListeners();
    },
    
    /**
     * Render calendar for current month/year
     */
    renderCalendar: function() {
        // Get calendar container
        const container = document.querySelector(this.options.calendarContainer);
        if (!container) return;
        
        // Update month display
        const monthDisplay = document.querySelector(this.options.monthDisplay);
        if (monthDisplay) {
            monthDisplay.textContent = new Date(this.calendar.year, this.calendar.month, 1)
                .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Get first day and days in month
        const firstDay = new Date(this.calendar.year, this.calendar.month, 1).getDay();
        const daysInMonth = new Date(this.calendar.year, this.calendar.month + 1, 0).getDate();
        
        // Create empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'mb-calendar-empty';
            container.appendChild(emptyCell);
        }
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Create days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.calendar.year, this.calendar.month, day);
            date.setHours(0, 0, 0, 0);
            
            const dateString = date.toISOString().split('T')[0];
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            const isSelected = this.calendar.selectedDate === dateString;
            
            // Check if date is available
            const isAvailable = this.options.availableDates && 
                               this.options.availableDates.includes(dateString);
            
            // Create date element
            const dateElement = document.createElement('div');
            dateElement.className = 'mb-calendar-date';
            dateElement.innerHTML = `<span class="mb-date-number">${day}</span>`;
            
            // Add appropriate classes
            if (isAvailable && !isPast) {
                dateElement.classList.add('mb-date-available');
                dateElement.dataset.date = dateString;
                
                // Add click event
                dateElement.addEventListener('click', () => {
                    this.selectDate(dateString);
                });
            }
            
            if (isPast) {
                dateElement.classList.add('mb-date-past');
            }
            
            if (isToday) {
                dateElement.classList.add('mb-date-today');
            }
            
            if (isSelected) {
                dateElement.classList.add('mb-date-selected');
            }
            
            // Add to container
            container.appendChild(dateElement);
        }
        
        // Load time slots if date is selected
        if (this.calendar.selectedDate) {
            this.loadTimeSlots(this.calendar.selectedDate);
        }
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Previous month button
        const prevButton = document.querySelector(this.options.prevMonthButton);
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
        }
        
        // Next month button
        const nextButton = document.querySelector(this.options.nextMonthButton);
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.navigateMonth(1);
            });
        }
    },
    
    /**
     * Navigate to previous/next month
     * 
     * @param {number} direction Direction (-1 for previous, 1 for next)
     */
    navigateMonth: function(direction) {
        // Update month
        this.calendar.month += direction;
        
        // Handle year change
        if (this.calendar.month > 11) {
            this.calendar.month = 0;
            this.calendar.year++;
        } else if (this.calendar.month < 0) {
            this.calendar.month = 11;
            this.calendar.year--;
        }
        
        // Re-render calendar
        this.renderCalendar();
    },
    
    /**
     * Select a date
     * 
     * @param {string} dateString Date string (YYYY-MM-DD)
     */
    selectDate: function(dateString) {
        // Update selected date
        this.calendar.selectedDate = dateString;
        
        // Update calendar UI
        const dateElements = document.querySelectorAll(`${this.options.calendarContainer} .mb-calendar-date`);
        dateElements.forEach(el => {
            if (el.dataset.date === dateString) {
                el.classList.add('mb-date-selected');
            } else {
                el.classList.remove('mb-date-selected');
            }
        });
        
        // Call onDateSelected callback if provided
        if (typeof this.options.onDateSelected === 'function') {
            this.options.onDateSelected(dateString);
        }
        
        // Load time slots
        this.loadTimeSlots(dateString);
    },
    
    /**
     * Load time slots for a specific date
     * 
     * @param {string} dateString Date string (YYYY-MM-DD)
     */
    loadTimeSlots: function(dateString) {
        // Show selected date
        const selectedDateDisplay = document.querySelector(this.options.selectedDateDisplay);
        if (selectedDateDisplay) {
            selectedDateDisplay.textContent = MBUtils.formatDate(dateString, 'long');
        }
        
        // Show loading state in time slots container
        const container = document.querySelector(this.options.timeSlotsContainer);
        if (!container) return;
        
        container.innerHTML = `
            <div class="mb-loading">
                <div class="mb-spinner"></div>
                <div class="mb-loading-text">Loading available times...</div>
            </div>
        `;
        
        // Trigger onTimeSelected with null to indicate no time selected
        if (typeof this.options.onTimeSelected === 'function') {
            this.options.onTimeSelected(null);
        }
        
        // Show time slots container
        const timeSlotsContainer = document.querySelector('.mb-time-slots-container');
        if (timeSlotsContainer) {
            timeSlotsContainer.classList.remove('mb-hidden');
        }
        
        // Hide continue button
        const continueButton = document.querySelector(this.options.continueButton);
        if (continueButton) {
            continueButton.parentElement.classList.add('mb-hidden');
        }
        
        // If mock data provided, use it
        if (this.options.mockTimeSlots) {
            setTimeout(() => {
                this.renderTimeSlots(this.options.mockTimeSlots);
            }, 500);
            return;
        }
        
        // Make API request if available
        if (this.options.fetchTimeSlots) {
            this.options.fetchTimeSlots(dateString)
                .then(timeSlots => {
                    this.renderTimeSlots(timeSlots);
                })
                .catch(error => {
                    console.error('Error loading time slots:', error);
                    this.renderNoTimeSlots();
                });
        } else {
            // Fallback for testing
            setTimeout(() => {
                this.renderNoTimeSlots();
            }, 500);
        }
    },
    
    /**
     * Render time slots
     * 
     * @param {Array} timeSlots Array of time strings (HH:MM)
     */
    renderTimeSlots: function(timeSlots) {
        // If no time slots, show message
        if (!timeSlots || timeSlots.length === 0) {
            this.renderNoTimeSlots();
            return;
        }
        
        // Get container
        const container = document.querySelector(this.options.timeSlotsContainer);
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Group time slots by period
        const groupedSlots = MBUtils.groupTimeSlots(timeSlots);
        
        // Define period titles
        const periodTitles = {
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening'
        };
        
        // Create time slot groups
        Object.keys(groupedSlots).forEach(period => {
            // Skip empty periods
            if (groupedSlots[period].length === 0) return;
            
            // Create group element
            const groupElement = document.createElement('div');
            groupElement.className = 'mb-time-slot-group';
            
            // Add group title
            const titleElement = document.createElement('h4');
            titleElement.className = 'mb-time-group-title';
            titleElement.textContent = periodTitles[period];
            groupElement.appendChild(titleElement);
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'mb-time-slot-buttons';
            
            // Add time slot buttons
            groupedSlots[period].forEach(time => {
                const button = document.createElement('button');
                button.className = 'mb-time-slot-btn';
                button.textContent = MBUtils.formatTime(time);
                button.dataset.time = time;
                
                // Add click event
                button.addEventListener('click', () => {
                    this.selectTime(time);
                });
                
                // Add to container
                buttonsContainer.appendChild(button);
            });
            
            // Add buttons to group
            groupElement.appendChild(buttonsContainer);
            
            // Add group to container
            container.appendChild(groupElement);
        });
    },
    
    /**
     * Render "no time slots" message
     */
    renderNoTimeSlots: function() {
        // Get container
        const container = document.querySelector(this.options.timeSlotsContainer);
        if (!container) return;
        
        // Add message
        container.innerHTML = `
            <div class="mb-no-time-slots">
                <p>No available time slots for this date. Please select another date.</p>
            </div>
        `;
        
        // Hide continue button
        const continueButton = document.querySelector(this.options.continueButton);
        if (continueButton) {
            continueButton.parentElement.classList.add('mb-hidden');
        }
    },
    
    /**
     * Select a time slot
     * 
     * @param {string} time Time string (HH:MM)
     */
    selectTime: function(time) {
        // Update time slot UI
        const timeButtons = document.querySelectorAll(`${this.options.timeSlotsContainer} .mb-time-slot-btn`);
        timeButtons.forEach(button => {
            if (button.dataset.time === time) {
                button.classList.add('mb-time-selected');
            } else {
                button.classList.remove('mb-time-selected');
            }
        });
        
        // Show continue button
        const continueButton = document.querySelector(this.options.continueButton);
        if (continueButton) {
            continueButton.parentElement.classList.remove('mb-hidden');
        }
        
        // Call onTimeSelected callback if provided
        if (typeof this.options.onTimeSelected === 'function') {
            this.options.onTimeSelected(time);
        }
    },
    
    /**
     * Set available dates
     * 
     * @param {Array} dates Array of date strings (YYYY-MM-DD)
     */
    setAvailableDates: function(dates) {
        this.options.availableDates = dates;
        this.renderCalendar();
    }
};

// Export module globally
window.MBDateSelection = MBDateSelection;