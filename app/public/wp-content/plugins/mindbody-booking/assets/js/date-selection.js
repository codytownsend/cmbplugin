/**
 * Enhanced Date Selection Module
 * 
 * Provides improved date and time selection functionality
 */

const MBDateSelection = {
    /**
     * Current calendar state
     */
    calendar: {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        selectedDate: null,
        availableDates: []
    },
    
    /**
     * Initialize date selection
     * 
     * @param {Object} options Configuration options
     */
    init: function(options = {}) {
        console.log('Initializing date selection module');
        
        // Set default options
        this.options = Object.assign({
            calendarContainer: '.mb-calendar-dates',
            monthDisplay: '.mb-current-month',
            prevMonthButton: '.mb-prev-month',
            nextMonthButton: '.mb-next-month',
            timeSlotsContainer: '.mb-time-slots',
            selectedDateDisplay: '.mb-selected-date',
            continueButton: '.mb-continue-btn',
            timeSlotButtonClass: 'mb-time-slot-btn',
            timeSelectedClass: 'mb-time-selected',
            dateCellClass: 'mb-calendar-date',
            dateAvailableClass: 'mb-date-available',
            dateSelectedClass: 'mb-date-selected',
            datePastClass: 'mb-date-past',
            dateTodayClass: 'mb-date-today',
            selectedDate: null,
            selectedTime: null,
            availableDates: [],
            debugMode: false,
            onDateSelected: null,
            onTimeSelected: null,
            onContinue: null,
            fetchTimeSlots: null
        }, options);
        
        // Set initial state
        this.calendar.selectedDate = this.options.selectedDate || null;
        this.calendar.availableDates = this.options.availableDates || [];
        this.selectedTime = this.options.selectedTime || null;
        
        // Render calendar
        this.renderCalendar();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // If date already selected, show time slots
        if (this.calendar.selectedDate) {
            this.loadTimeSlots(this.calendar.selectedDate);
        }
    },
    
    /**
     * Render calendar for current month/year
     */
    renderCalendar: function() {
        console.log('Rendering calendar for', this.calendar.year, this.calendar.month + 1);
        
        // Get calendar container
        const container = document.querySelector(this.options.calendarContainer);
        if (!container) {
            console.error('Calendar container not found:', this.options.calendarContainer);
            return;
        }
        
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
        
        // Format available dates for easy lookup
        const availableDatesMap = {};
        this.calendar.availableDates.forEach(date => {
            availableDatesMap[date] = true;
        });
        
        // Create days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.calendar.year, this.calendar.month, day);
            date.setHours(0, 0, 0, 0);
            
            const dateString = date.toISOString().split('T')[0];
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            
            // Check if date is available
            const isAvailable = availableDatesMap[dateString] || 
                                (this.options.debugMode && !isPast); // In debug mode, all future dates are available
            
            // Check if date is selected
            const isSelected = this.calendar.selectedDate === dateString;
            
            // Create date element
            const dateElement = document.createElement('div');
            dateElement.className = this.options.dateCellClass;
            dateElement.innerHTML = `<span class="mb-date-number">${day}</span>`;
            
            // Add appropriate classes
            if (isAvailable) {
                dateElement.classList.add(this.options.dateAvailableClass);
                dateElement.dataset.date = dateString;
                
                // Add click event
                dateElement.addEventListener('click', () => {
                    this.selectDate(dateString);
                });
            }
            
            if (isPast) {
                dateElement.classList.add(this.options.datePastClass);
            }
            
            if (isToday) {
                dateElement.classList.add(this.options.dateTodayClass);
            }
            
            if (isSelected) {
                dateElement.classList.add(this.options.dateSelectedClass);
            }
            
            // Add to container
            container.appendChild(dateElement);
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
        
        // Continue button
        const continueButton = document.querySelector(this.options.continueButton);
        if (continueButton) {
            continueButton.parentElement.addEventListener('click', () => {
                if (typeof this.options.onContinue === 'function') {
                    this.options.onContinue(this.calendar.selectedDate, this.selectedTime);
                }
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
        console.log('Selecting date:', dateString);
        
        // Update selected date
        this.calendar.selectedDate = dateString;
        
        // Update calendar UI
        const dateElements = document.querySelectorAll(`${this.options.calendarContainer} .${this.options.dateCellClass}`);
        dateElements.forEach(el => {
            if (el.dataset.date === dateString) {
                el.classList.add(this.options.dateSelectedClass);
            } else {
                el.classList.remove(this.options.dateSelectedClass);
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
            const formattedDate = new Date(dateString).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            selectedDateDisplay.textContent = formattedDate;
        }
        
        // Show loading state in time slots container
        const container = document.querySelector(this.options.timeSlotsContainer);
        if (!container) {
            console.error('Time slots container not found:', this.options.timeSlotsContainer);
            return;
        }
        
        container.innerHTML = `
            <div class="mb-loading">
                <div class="mb-spinner"></div>
                <div class="mb-loading-text">Loading available times...</div>
            </div>
        `;
        
        // Reset selected time
        this.selectedTime = null;
        
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
        
        // If in debug mode and no fetchTimeSlots provided, use mock data
        if (this.options.debugMode && !this.options.fetchTimeSlots) {
            const mockTimeSlots = this.generateMockTimeSlots();
            setTimeout(() => {
                this.renderTimeSlots(mockTimeSlots);
            }, 800);
            return;
        }
        
        // Make API request if available
        if (typeof this.options.fetchTimeSlots === 'function') {
            this.options.fetchTimeSlots(dateString)
                .then(timeSlots => {
                    console.log('Received time slots:', timeSlots);
                    this.renderTimeSlots(timeSlots);
                })
                .catch(error => {
                    console.error('Error loading time slots:', error);
                    this.renderNoTimeSlots();
                });
        } else {
            console.warn('No fetchTimeSlots function provided');
            this.renderNoTimeSlots();
        }
    },
    
    /**
     * Generate mock time slots for debugging
     * 
     * @return {Array} Array of time strings
     */
    generateMockTimeSlots: function() {
        const slots = [];
        // Morning slots
        for (let hour = 9; hour < 12; hour++) {
            slots.push(`${hour}:00`);
            slots.push(`${hour}:30`);
        }
        // Afternoon slots
        for (let hour = 13; hour < 17; hour++) {
            slots.push(`${hour}:00`);
            slots.push(`${hour}:30`);
        }
        // Evening slots
        for (let hour = 17; hour < 20; hour++) {
            slots.push(`${hour}:00`);
            slots.push(`${hour}:30`);
        }
        return slots;
    },
    
    /**
     * Render time slots
     * 
     * @param {Array} timeSlots Array of time strings (HH:MM)
     */
    renderTimeSlots: function(timeSlots) {
        // Get container
        const container = document.querySelector(this.options.timeSlotsContainer);
        if (!container) return;
        
        // If no time slots, show message
        if (!timeSlots || timeSlots.length === 0) {
            this.renderNoTimeSlots();
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Group time slots by period
        const groupedSlots = this.groupTimeSlots(timeSlots);
        
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
                button.className = this.options.timeSlotButtonClass;
                button.textContent = this.formatTime(time);
                button.dataset.time = time;
                
                // Check if this was previously selected
                if (this.selectedTime === time) {
                    button.classList.add(this.options.timeSelectedClass);
                }
                
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
        console.log('Selecting time:', time);
        
        // Update selected time
        this.selectedTime = time;
        
        // Update time slot UI
        const timeButtons = document.querySelectorAll(`.${this.options.timeSlotButtonClass}`);
        timeButtons.forEach(button => {
            if (button.dataset.time === time) {
                button.classList.add(this.options.timeSelectedClass);
            } else {
                button.classList.remove(this.options.timeSelectedClass);
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
     * Group time slots by period (morning, afternoon, evening)
     * 
     * @param {Array} timeSlots Array of time strings (HH:MM)
     * @return {Object} Grouped time slots
     */
    groupTimeSlots: function(timeSlots) {
        const grouped = {
            morning: [],
            afternoon: [],
            evening: []
        };
        
        timeSlots.forEach(time => {
            const hour = parseInt(time.split(':')[0]);
            
            if (hour < 12) {
                grouped.morning.push(time);
            } else if (hour < 17) {
                grouped.afternoon.push(time);
            } else {
                grouped.evening.push(time);
            }
        });
        
        return grouped;
    },
    
    /**
     * Format time
     * 
     * @param {string} timeString Time string (HH:MM)
     * @return {string} Formatted time
     */
    formatTime: function(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`;
    },
    
    /**
     * Set available dates
     * 
     * @param {Array} dates Array of date strings (YYYY-MM-DD)
     */
    setAvailableDates: function(dates) {
        console.log('Setting available dates:', dates);
        this.calendar.availableDates = dates;
        this.renderCalendar();
    },
    
    /**
     * Clear selection
     */
    clearSelection: function() {
        this.calendar.selectedDate = null;
        this.selectedTime = null;
        
        // Update UI
        this.renderCalendar();
        
        // Hide time slots
        const timeSlotsContainer = document.querySelector('.mb-time-slots-container');
        if (timeSlotsContainer) {
            timeSlotsContainer.classList.add('mb-hidden');
        }
        
        // Hide continue button
        const continueButton = document.querySelector(this.options.continueButton);
        if (continueButton) {
            continueButton.parentElement.classList.add('mb-hidden');
        }
    }
};

// Export the module globally
window.MBDateSelection = MBDateSelection;