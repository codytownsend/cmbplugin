/**
 * Time Selection Module
 * 
 * Handles time slot selection functionality
 */

const MBTimeSelection = {
    /**
     * State
     */
    state: {
        timeSlots: [],
        selectedTime: null,
        groupedSlots: null
    },
    
    /**
     * Initialize time selection
     * 
     * @param {Object} options Configuration options
     */
    init: function(options = {}) {
        // Set default options
        this.options = Object.assign({
            container: '.mb-time-slots',
            groupTemplate: '#mb-time-slot-group-template',
            buttonTemplate: '#mb-time-slot-button-template',
            noTimeSlotsTemplate: '#mb-no-time-slots-template',
            timeSlots: [],
            selectedTime: null,
            onSelectTime: null
        }, options);
        
        // Set initial state
        this.state.timeSlots = this.options.timeSlots || [];
        this.state.selectedTime = this.options.selectedTime || null;
        
        // Process time slots
        this.processTimeSlots();
        
        // Render time slots
        this.renderTimeSlots();
    },
    
    /**
     * Process time slots into groups
     */
    processTimeSlots: function() {
        // Group time slots by period (morning, afternoon, evening)
        this.state.groupedSlots = MBUtils.groupTimeSlots(this.state.timeSlots);
    },
    
    /**
     * Render time slots
     */
    renderTimeSlots: function() {
        // Get container
        const container = document.querySelector(this.options.container);
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Check if we have time slots
        if (!this.state.timeSlots || this.state.timeSlots.length === 0) {
            this.renderNoTimeSlots(container);
            return;
        }
        
        // Get templates
        const groupTemplate = document.querySelector(this.options.groupTemplate);
        const buttonTemplate = document.querySelector(this.options.buttonTemplate);
        
        if (!groupTemplate || !buttonTemplate) return;
        
        // Define period titles
        const periodTitles = {
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening'
        };
        
        // Render each time slot group
        Object.keys(this.state.groupedSlots).forEach(period => {
            // Skip empty periods
            if (this.state.groupedSlots[period].length === 0) return;
            
            // Clone group template
            const groupElement = groupTemplate.content.cloneNode(true);
            
            // Set group title
            groupElement.querySelector('.mb-time-group-title').textContent = periodTitles[period];
            
            // Get buttons container
            const buttonsContainer = groupElement.querySelector('.mb-time-slot-buttons');
            
            // Add time slot buttons
            this.state.groupedSlots[period].forEach(time => {
                // Clone button template
                const buttonElement = buttonTemplate.content.cloneNode(true);
                const button = buttonElement.querySelector('.mb-time-slot-btn');
                
                // Set button properties
                button.textContent = MBUtils.formatTime(time);
                button.dataset.time = time;
                
                // Check if selected
                if (this.state.selectedTime === time) {
                    button.classList.add('mb-time-selected');
                }
                
                // Add click event
                button.addEventListener('click', () => {
                    this.selectTime(time);
                });
                
                // Add to container
                buttonsContainer.appendChild(buttonElement);
            });
            
            // Add group to container
            container.appendChild(groupElement);
        });
    },
    
    /**
     * Render "no time slots" message
     * 
     * @param {HTMLElement} container Container element
     */
    renderNoTimeSlots: function(container) {
        // Get template
        const template = document.querySelector(this.options.noTimeSlotsTemplate);
        if (!template) return;
        
        // Clone template and add to container
        container.appendChild(template.content.cloneNode(true));
    },
    
    /**
     * Select a time slot
     * 
     * @param {string} time Time string (HH:MM)
     */
    selectTime: function(time) {
        // Update selected time
        this.state.selectedTime = time;
        
        // Update UI
        this.updateTimeSelection();
        
        // Trigger callback
        if (typeof this.options.onSelectTime === 'function') {
            this.options.onSelectTime(time);
        }
    },
    
    /**
     * Update time selection UI
     */
    updateTimeSelection: function() {
        // Get container
        const container = document.querySelector(this.options.container);
        if (!container) return;
        
        // Update all time buttons
        const timeButtons = container.querySelectorAll('.mb-time-slot-btn');
        timeButtons.forEach(button => {
            if (button.dataset.time === this.state.selectedTime) {
                button.classList.add('mb-time-selected');
            } else {
                button.classList.remove('mb-time-selected');
            }
        });
    },
    
    /**
     * Set time slots
     * 
     * @param {Array} timeSlots Array of time strings (HH:MM)
     */
    setTimeSlots: function(timeSlots) {
        this.state.timeSlots = timeSlots || [];
        this.processTimeSlots();
        this.renderTimeSlots();
    },
    
    /**
     * Get selected time
     * 
     * @return {string} Selected time or null
     */
    getSelectedTime: function() {
        return this.state.selectedTime;
    },
    
    /**
     * Clear selection
     */
    clearSelection: function() {
        this.state.selectedTime = null;
        this.updateTimeSelection();
    },
    
    /**
     * Check if a time is available
     * 
     * @param {string} time Time string (HH:MM)
     * @return {boolean} Whether time is available
     */
    isTimeAvailable: function(time) {
        return this.state.timeSlots.includes(time);
    },
    
    /**
     * Get available times for a period
     * 
     * @param {string} period Period (morning, afternoon, evening)
     * @return {Array} Array of time strings
     */
    getTimesForPeriod: function(period) {
        return this.state.groupedSlots?.[period] || [];
    },
    
    /**
     * Get earliest available time
     * 
     * @return {string} Earliest time or null
     */
    getEarliestTime: function() {
        if (!this.state.timeSlots || this.state.timeSlots.length === 0) {
            return null;
        }
        return this.state.timeSlots[0];
    },
    
    /**
     * Select earliest available time
     */
    selectEarliestTime: function() {
        const earliestTime = this.getEarliestTime();
        if (earliestTime) {
            this.selectTime(earliestTime);
        }
    },
    
    /**
     * Format and display time range
     * 
     * @param {string} startTime Start time (HH:MM)
     * @param {number} durationMinutes Duration in minutes
     * @return {string} Formatted time range
     */
    formatTimeRange: function(startTime, durationMinutes) {
        if (!startTime) return '';
        
        // Convert start time to date object
        const startDate = new Date();
        const [hours, minutes] = startTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Calculate end time
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + durationMinutes);
        
        // Format times
        const startFormatted = MBUtils.formatTime(startTime);
        const endFormatted = MBUtils.formatTime(
            `${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`
        );
        
        return `${startFormatted} - ${endFormatted}`;
    },
    
    /**
     * Disable specific times
     * 
     * @param {Array} timesToDisable Array of time strings to disable
     */
    disableTimes: function(timesToDisable) {
        if (!timesToDisable || !Array.isArray(timesToDisable)) return;
        
        // Filter out disabled times
        this.state.timeSlots = this.state.timeSlots.filter(time => !timesToDisable.includes(time));
        
        // Re-process and render
        this.processTimeSlots();
        this.renderTimeSlots();
    }
};

// Export module globally
window.MBTimeSelection = MBTimeSelection;