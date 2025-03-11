/**
 * Mindbody Booking Widget Utilities
 * 
 * Shared utility functions
 */

const MBUtils = {
    /**
     * Format price
     * 
     * @param {number} price Price
     * @param {boolean} includeCurrency Whether to include currency symbol
     * @return {string} Formatted price
     */
    formatPrice: function(price, includeCurrency = true) {
        // Format with 2 decimal places
        const formatted = parseFloat(price).toFixed(2);
        
        // Add currency symbol if requested
        if (includeCurrency) {
            return '$' + formatted;
        }
        
        return formatted;
    },
    
    /**
     * Format date
     * 
     * @param {string} dateString Date string (YYYY-MM-DD or ISO date)
     * @param {string} format Format string ('long', 'short', 'medium')
     * @return {string} Formatted date
     */
    formatDate: function(dateString, format = 'medium') {
        // Create date object
        const date = new Date(dateString);
        
        // Return formatted date based on format parameter
        switch(format) {
            case 'long':
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
            case 'short':
                return date.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric'
                });
            case 'month':
                return date.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                });
            default: // medium
                return date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric'
                });
        }
    },
    
    /**
     * Format time
     * 
     * @param {string} timeString Time string (HH:MM)
     * @param {boolean} includePeriod Whether to include AM/PM
     * @return {string} Formatted time
     */
    formatTime: function(timeString, includePeriod = true) {
        // Extract hours and minutes
        const parts = timeString.split(':');
        let hour = parseInt(parts[0]);
        const minute = parseInt(parts[1]);
        
        // Format based on 12-hour clock
        const period = (hour >= 12) ? ' PM' : ' AM';
        hour = (hour > 12) ? hour - 12 : hour;
        hour = (hour === 0) ? 12 : hour;
        
        // Format time
        const formattedTime = `${hour}:${minute.toString().padStart(2, '0')}`;
        
        // Add period if requested
        return includePeriod ? formattedTime + period : formattedTime;
    },
    
    /**
     * Format duration
     * 
     * @param {number} minutes Duration in minutes
     * @return {string} Formatted duration
     */
    formatDuration: function(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
        }
        return `${minutes} min`;
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
     * Format credit card number
     * 
     * @param {string} cardNumber Card number
     * @return {string} Formatted card number
     */
    formatCreditCard: function(cardNumber) {
        // Remove non-numeric characters
        const cleaned = cardNumber.replace(/\D/g, '');
        
        // Format with spaces every 4 digits
        const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
        
        return formatted;
    },
    
    /**
     * Format phone number (US)
     * 
     * @param {string} phoneNumber Phone number
     * @return {string} Formatted phone number
     */
    formatPhoneNumber: function(phoneNumber) {
        // Remove non-numeric characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Format based on length
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length === 11 && cleaned[0] === '1') {
            return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        
        // Return original if not a standard format
        return phoneNumber;
    },
    
    /**
     * Detect credit card type
     * 
     * @param {string} cardNumber Card number
     * @return {string|null} Card type or null
     */
    detectCardType: function(cardNumber) {
        // Remove spaces and non-numeric characters
        const cleaned = cardNumber.replace(/\D/g, '');
        
        // Basic pattern recognition
        if (/^4/.test(cleaned)) {
            return 'Visa';
        } else if (/^5[1-5]/.test(cleaned)) {
            return 'Mastercard';
        } else if (/^3[47]/.test(cleaned)) {
            return 'Amex';
        } else if (/^(6011|65|64[4-9])/.test(cleaned)) {
            return 'Discover';
        }
        
        return null;
    },
    
    /**
     * Validate email address
     * 
     * @param {string} email Email address
     * @return {boolean} Whether email is valid
     */
    validateEmail: function(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },
    
    /**
     * Generate a UUID (v4)
     * 
     * @return {string} UUID
     */
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * Get browser locale
     * 
     * @return {string} Locale code
     */
    getLocale: function() {
        return navigator.language || navigator.userLanguage || 'en-US';
    },
    
    /**
     * Debounce function
     * 
     * @param {Function} func Function to debounce
     * @param {number} wait Wait time in milliseconds
     * @return {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },
    
    /**
     * Create an element from HTML string
     * 
     * @param {string} html HTML string
     * @return {HTMLElement} Created element
     */
    createElementFromHTML: function(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    },
    
    /**
     * Get data from a template
     * 
     * @param {string} templateId Template ID
     * @return {DocumentFragment} Template content
     */
    getTemplate: function(templateId) {
        const template = document.getElementById(templateId);
        if (!template) {
            console.error(`Template not found: ${templateId}`);
            return null;
        }
        return template.content.cloneNode(true);
    },
    
    /**
     * Make an AJAX request
     * 
     * @param {Object} options Request options
     * @return {Promise} Request promise
     */
    ajax: function(options) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Set method and URL
            xhr.open(options.method || 'GET', options.url);
            
            // Set headers
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }
            
            // Set default headers for JSON
            if (options.json) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            
            // Handle load
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    let response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        response = xhr.responseText;
                    }
                    resolve(response);
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        response: xhr.responseText
                    });
                }
            };
            
            // Handle error
            xhr.onerror = function() {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                    response: xhr.responseText
                });
            };
            
            // Send request
            if (options.data) {
                const data = options.json ? JSON.stringify(options.data) : options.data;
                xhr.send(data);
            } else {
                xhr.send();
            }
        });
    },
    
    /**
     * Get URL parameter
     * 
     * @param {string} name Parameter name
     * @param {string} url URL (defaults to current URL)
     * @return {string|null} Parameter value or null
     */
    getUrlParameter: function(name, url) {
        url = url || window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        const results = regex.exec(url);
        
        if (!results) return null;
        if (!results[2]) return '';
        
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    },
    
    /**
     * Scroll to element
     * 
     * @param {HTMLElement} element Element to scroll to
     * @param {number} offset Offset in pixels
     * @param {string} behavior Scroll behavior
     */
    scrollTo: function(element, offset = 0, behavior = 'smooth') {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const top = rect.top + window.pageYOffset;
        
        window.scrollTo({
            top: top - offset,
            behavior: behavior
        });
    }
};

// Export utilities globally
window.MBUtils = MBUtils;