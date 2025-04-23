/**
 * Mindbody Booking Widget - Enhanced Version
 * 
 * A modern, streamlined implementation of the booking widget with improved UI/UX
 */

// Global state
const MBBooking = {
    state: {
        currentStep: 1,
        sessionTypes: [],
        services: {},
        selectedService: null,
        selectedStaff: null,
        selectedDate: null,
        selectedTime: null,
        availableDates: [],
        availableTimes: [],
        cart: {
            items: [],
            tax: 0.06, // 6% tax rate
            subtotal: 0,
            total: 0,
        },
        user: null,
        isAuthenticated: false
    },
    
    /**
     * Initialize the booking widget
     */
    init: function() {
        console.log('Initializing MBBooking widget');
        
        // Get the widget container
        this.container = document.getElementById('mb-booking-widget');
        if (!this.container) {
            console.error('Booking widget container not found');
            return;
        }
        
        // Load state from localStorage (if available)
        this.loadState();
        
        // Check authentication status
        this.checkAuth();
        
        // Get widget settings from data attributes
        this.settings = {
            categories: this.container.dataset.categories || '',
            showFilters: this.container.dataset.showFilters === 'true',
            defaultView: this.container.dataset.defaultView || 'services',
            staffId: this.container.dataset.staffId || '',
            locationId: this.container.dataset.locationId || ''
        };
        
        // Initialize the UI
        this.initUI();
        
        // Load session types (services)
        this.loadSessionTypes();
    },
    
    /**
     * Initialize UI elements
     */
    initUI: function() {
        // Get content container
        this.contentContainer = this.container.querySelector('.mb-content');
        
        // Set up progress indicators
        const stepIndicators = this.container.querySelectorAll('.mb-step');
        stepIndicators.forEach((indicator, index) => {
            const step = index + 1;
            if (step < this.state.currentStep) {
                indicator.classList.add('mb-step-completed');
                indicator.classList.remove('mb-step-active');
            } else if (step === this.state.currentStep) {
                indicator.classList.add('mb-step-active');
                indicator.classList.remove('mb-step-completed');
            } else {
                indicator.classList.remove('mb-step-active', 'mb-step-completed');
            }
        });
    },
    
    /**
     * Load session types from API
     */
    loadSessionTypes: function() {
        // Show loading state
        this.showLoading('Loading services...');
        
        // Build query parameters
        const params = new URLSearchParams({
            action: 'mb_get_session_types',
            nonce: mb_booking_data.nonce,
            online_only: true
        });
        
        // Make API request
        fetch(`${mb_booking_data.ajax_url}?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('✅ Received session types:', data.data);
                    this.state.sessionTypes = data.data;
                    this.loadBookableItems();
                } else {
                    console.error('❌ Failed to load session types:', data);
                    this.showError('Failed to load services', data.data?.message);
                }
            })
            .catch(error => {
                console.error('Error loading session types:', error);
                this.showError('Failed to load services', 'Please try again later');
            });
    },
    
    /**
     * Load bookable items from API
     */
    loadBookableItems: function() {
        // Show loading state
        this.showLoading('Loading available services...');
        
        // Get session type IDs
        const sessionTypeIds = this.state.sessionTypes.map(type => type.Id).join(',');

        console.log('📊 Fetching bookable items for sessionTypeIds:', sessionTypeIds);

        if (!sessionTypeIds) {
            console.error('❌ No sessionTypeIds found, skipping fetch.');
            return;
        }
        
        // Build query parameters
        const params = new URLSearchParams({
            action: 'mb_get_bookable_items',
            nonce: mb_booking_data.nonce,
            session_type_ids: sessionTypeIds
        });
        
        // Add optional staff ID
        if (this.settings.staffId) {
            params.append('staff_ids', this.settings.staffId);
        }
        
        // Add optional location ID
        if (this.settings.locationId) {
            params.append('location_ids', this.settings.locationId);
        }
        
        // Make API request
        fetch(`${mb_booking_data.ajax_url}?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                console.log('📊 Bookable items API response:', data);

                if (data.success) {
                    this.processBookableItems(data.data);
                    this.showServiceSelection();
                } else {
                    console.error('❌ API returned failure:', data);
                    this.showError('Failed to load available services', data.data?.message);
                }
            })
            .catch(error => {
                console.error('❌ Error loading bookable items:', error);
                this.showError('Failed to load available services', 'Please try again later');
            });
    },
    
    /**
     * Process bookable items data
     * 
     * @param {Array} items Bookable items data
     */
    processBookableItems: function(items) {
        console.log('📊 Processing bookable items:', items);
        const services = {};

        // Also look for session types in the data
        if (this.state.sessionTypes && this.state.sessionTypes.length > 0) {
            // First populate services from session types to ensure we have all services
            this.state.sessionTypes.forEach(sessionType => {
                const serviceId = sessionType.Id;
                
                if (!services[serviceId]) {
                    services[serviceId] = {
                        id: serviceId,
                        name: sessionType.Name,
                        description: sessionType.Description || 'No description available',
                        price: sessionType.Price || 0,
                        duration: sessionType.Duration || 60,
                        availableTimes: [],
                        staff: {}
                    };
                    console.log('✅ Added service from session types:', services[serviceId]);
                }
            });
        }

        // Process bookable items (availabilities)
        if (items && items.length > 0) {
            items.forEach(item => {
                if (!item.SessionType || !item.SessionType.Id) {
                    console.warn('⚠️ Skipping invalid item:', item);
                    return;
                }

                const serviceId = item.SessionType.Id;
                
                // If service doesn't exist yet, create it
                if (!services[serviceId]) {
                    services[serviceId] = {
                        id: serviceId,
                        name: item.SessionType.Name || 'Unknown Service',
                        description: item.SessionType.Description || 'No description available',
                        price: item.Price?.Amount || 65,
                        duration: item.SessionType.Duration || 60,
                        availableTimes: [],
                        staff: {}
                    };
                    console.log('✅ Added new service from bookable item:', services[serviceId]);
                }

                // Ensure price is set (use item price if available)
                if (item.Price?.Amount && item.Price.Amount > 0) {
                    services[serviceId].price = item.Price.Amount;
                }

                // Add StartDateTime to availableTimes if present
                if (item.StartDateTime) {
                    services[serviceId].availableTimes.push(item.StartDateTime);
                }

                // Add staff member if provided
                if (item.Staff && item.Staff.Id) {
                    const staffId = item.Staff.Id;
                    const staffName = item.Staff.Name || 'Unknown Staff';

                    if (!services[serviceId].staff[staffId]) {
                        services[serviceId].staff[staffId] = {
                            id: staffId,
                            name: staffName
                        };
                    }
                }
            });
        }

        // Store processed services
        this.state.services = services;
        console.log('📊 Processed services:', services);
        
        // Restore cart state if needed
        if (this.state.cart?.items?.length > 0) {
            const firstItem = this.state.cart.items[0];

            if (firstItem.serviceId && services[firstItem.serviceId]) {
                this.state.selectedService = services[firstItem.serviceId] || null;
                this.state.selectedStaff = firstItem.staffId ? 
                    (this.state.selectedService?.staff[firstItem.staffId] || null) : null;
                this.state.selectedDate = firstItem.date || null;
                this.state.selectedTime = firstItem.time || null;

                // If we have all booking details, go to checkout
                if (this.state.selectedService && this.state.selectedDate && this.state.selectedTime) {
                    this.goToCheckout();
                    return;
                }
            }
        }
    },
    
    /**
     * Show service selection view
     */
    showServiceSelection: function() {
        // Get service selection template
        const template = document.getElementById('mb-service-selection-template');
        if (!template) {
            console.error('Service selection template not found');
            return;
        }
        
        // Clone template content
        const content = template.content.cloneNode(true);
        
        // Clear content container and add new content
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(content);
        
        // Update progress step
        this.updateProgressStep(1);
        
        // Get service categories
        const categories = this.getServiceCategories();
        
        // Check if we have services
        if (Object.keys(categories).length === 0) {
            this.showNoServices();
            return;
        }
        
        // Populate category filter if enabled
        if (this.settings.showFilters) {
            const filterContainer = this.contentContainer.querySelector('.mb-filters');
            filterContainer.dataset.showFilters = 'true';
            filterContainer.classList.remove('mb-hidden');
            
            const categoryFilter = filterContainer.querySelector('#mb-category-filter');
            Object.keys(categories).forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
            
            // Set up event listener for category filter
            categoryFilter.addEventListener('change', () => {
                this.filterServicesByCategory(categoryFilter.value);
            });
        }
        
        // Populate service categories
        const categoriesContainer = this.contentContainer.querySelector('.mb-categories');
        const categoryTemplate = document.getElementById('mb-category-template');
        const serviceTemplate = document.getElementById('mb-service-template');
        const staffTemplate = document.getElementById('mb-staff-option-template');
        
        Object.keys(categories).forEach(category => {
            // Skip empty categories
            if (categories[category].length === 0) {
                return;
            }
            
            // Clone category template
            const categoryEl = categoryTemplate.content.cloneNode(true);
            const categoryTitle = categoryEl.querySelector('.mb-category-title');
            categoryTitle.textContent = category;
            
            // Get services container
            const servicesContainer = categoryEl.querySelector('.mb-services');
            
            // Add services to category
            categories[category].forEach(serviceId => {
                const service = this.state.services[serviceId];
                if (!service) return;
                
                // Clone service template
                const serviceEl = serviceTemplate.content.cloneNode(true);
                
                // Set service information
                serviceEl.querySelector('.mb-service').dataset.serviceId = service.id;
                serviceEl.querySelector('.mb-service-name').textContent = service.name;
                serviceEl.querySelector('.mb-service-price').textContent = this.formatPrice(service.price);
                serviceEl.querySelector('.mb-service-duration').textContent = this.formatDuration(service.duration);
                
                // Show description if available
                if (service.description) {
                    const descriptionEl = serviceEl.querySelector('.mb-service-description');
                    descriptionEl.textContent = service.description;
                    descriptionEl.classList.remove('mb-hidden');
                }
                
                // Add staff members if available
                const staffContainer = serviceEl.querySelector('.mb-staff-options');
                const hasStaff = service.staff && Object.keys(service.staff).length > 0;
                
                if (hasStaff) {
                    // Add staff members
                    Object.values(service.staff).forEach(staff => {
                        const staffEl = staffTemplate.content.cloneNode(true);
                        staffEl.querySelector('.mb-staff-option').dataset.staffId = staff.id;
                        staffEl.querySelector('.mb-staff-name').textContent = staff.name;
                        staffContainer.appendChild(staffEl);
                    });
                } else {
                    // Hide Any Staff option if no staff available
                    serviceEl.querySelector('.mb-any-staff').classList.add('mb-hidden');
                }
                
                // Add service to container
                servicesContainer.appendChild(serviceEl);
            });
            
            // Add category to container
            categoriesContainer.appendChild(categoryEl);
        });
        
        // Add event listeners for service selection
        this.setupServiceSelectionEvents();

        setTimeout(() => {
            console.log('📊 Services rendered:', document.querySelectorAll('.mb-service').length);
        }, 500);
    },
    
    /**
     * Set up event listeners for service selection
     */
    setupServiceSelectionEvents: function() {
        // Service selection
        const serviceElements = this.contentContainer.querySelectorAll('.mb-service');
        serviceElements.forEach(serviceEl => {
            const serviceId = serviceEl.dataset.serviceId;
            const service = this.state.services[serviceId];
            const selectBtn = serviceEl.querySelector('.mb-service-select-btn');
            
            // Mark selected service
            if (this.state.selectedService?.id === serviceId) {
                serviceEl.classList.add('mb-service-selected');
                serviceEl.querySelector('.mb-service-staff').classList.remove('mb-hidden');
                selectBtn.textContent = 'Selected';
                
                // Mark selected staff if any
                if (this.state.selectedStaff) {
                    const staffOption = serviceEl.querySelector(`.mb-staff-option[data-staff-id="${this.state.selectedStaff.id}"]`);
                    if (staffOption) {
                        staffOption.classList.add('mb-staff-selected');
                    }
                } else {
                    // Mark "Any Staff" as selected
                    serviceEl.querySelector('.mb-any-staff').classList.add('mb-staff-selected');
                }
            }
            
            // Service header click to toggle selection
            const serviceHeader = serviceEl.querySelector('.mb-service-header');
            serviceHeader.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Toggle service selection
                if (this.state.selectedService?.id === serviceId) {
                    // Deselect service
                    this.deselectService();
                } else {
                    // Select service
                    this.selectService(service);
                }
                
                // Update UI
                this.updateServiceSelection();
            });
            
            // Staff selection
            const staffOptions = serviceEl.querySelectorAll('.mb-staff-option');
            staffOptions.forEach(staffEl => {
                staffEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Select service if not already selected
                    if (this.state.selectedService?.id !== serviceId) {
                        this.selectService(service);
                    }
                    
                    // Select staff
                    const staffId = staffEl.dataset.staffId;
                    if (staffId) {
                        // Select specific staff
                        this.selectStaff(service.staff[staffId]);
                    } else {
                        // Select "Any Staff"
                        this.selectStaff(null);
                    }
                    
                    // Proceed to date selection
                    this.loadAvailableDates();
                });
            });
        });
    },
    
    /**
     * Update service selection UI
     */
    updateServiceSelection: function() {
        // Update all service elements
        const serviceElements = this.contentContainer.querySelectorAll('.mb-service');
        serviceElements.forEach(serviceEl => {
            const serviceId = serviceEl.dataset.serviceId;
            const selectBtn = serviceEl.querySelector('.mb-service-select-btn');
            const staffContainer = serviceEl.querySelector('.mb-service-staff');
            
            if (this.state.selectedService?.id === serviceId) {
                serviceEl.classList.add('mb-service-selected');
                staffContainer.classList.remove('mb-hidden');
                selectBtn.textContent = 'Selected';
            } else {
                serviceEl.classList.remove('mb-service-selected');
                staffContainer.classList.add('mb-hidden');
                selectBtn.textContent = 'Select';
            }
        });
    },
    
    /**
     * Select a service
     * 
     * @param {Object} service Service object
     */
    selectService: function(service) {
        // Deselect any previously selected service
        this.deselectService();
        
        // Select new service
        this.state.selectedService = service;
        
        // Save state
        this.saveState();
    },
    
    /**
     * Deselect current service
     */
    deselectService: function() {
        this.state.selectedService = null;
        this.state.selectedStaff = null;
        this.state.selectedDate = null;
        this.state.selectedTime = null;
        
        // Save state
        this.saveState();
    },
    
    /**
     * Select staff member
     * 
     * @param {Object|null} staff Staff object or null for any staff
     */
    selectStaff: function(staff) {
        this.state.selectedStaff = staff;
        
        // Save state
        this.saveState();
    },
    
    /**
     * Load available dates for selected service and staff
     */
    loadAvailableDates: function() {
        // Show loading state
        this.showLoading('Loading available dates...');
        
        // Build query parameters
        const params = new URLSearchParams({
            action: 'mb_get_available_dates',
            nonce: mb_booking_data.nonce,
            session_type_id: this.state.selectedService.id
        });
        
        // Add staff ID if selected
        if (this.state.selectedStaff) {
            params.append('staff_id', this.state.selectedStaff.id);
        }
        
        // Add location ID if set
        if (this.settings.locationId) {
            params.append('location_id', this.settings.locationId);
        }
        
        // Make API request
        fetch(`${mb_booking_data.ajax_url}?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.state.availableDates = data.data;
                    
                    // Show date selection
                    this.showDateSelection();
                } else {
                    this.showError('Failed to load available dates', data.data?.message);
                }
            })
            .catch(error => {
                console.error('Error loading available dates:', error);
                this.showError('Failed to load available dates', 'Please try again later');
            });
    },
    
    /**
     * Show date selection view
     */
    showDateSelection: function() {
        // Get date selection template
        const template = document.getElementById('mb-date-selection-template');
        if (!template) {
            console.error('Date selection template not found');
            return;
        }
        
        // Clone template content
        const content = template.content.cloneNode(true);
        
        // Clear content container and add new content
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(content);
        
        // Update progress step
        this.updateProgressStep(2);
        
        // Fill in service summary
        const serviceName = content.querySelector('.mb-service-name');
        const serviceDuration = content.querySelector('.mb-service-duration');
        const servicePrice = content.querySelector('.mb-service-price');
        const staffContainer = content.querySelector('.mb-summary-staff');
        const staffName = content.querySelector('.mb-staff-name');
        
        serviceName.textContent = this.state.selectedService.name;
        serviceDuration.textContent = this.formatDuration(this.state.selectedService.duration);
        servicePrice.textContent = this.formatPrice(this.state.selectedService.price);
        
        // Show staff name if selected
        if (this.state.selectedStaff) {
            staffName.textContent = this.state.selectedStaff.name;
            staffContainer.classList.remove('mb-hidden');
        } else {
            staffContainer.classList.add('mb-hidden');
        }
        
        // Setup date selection
        this.setupDateSelection();
        
        // Add event listeners
        this.setupDateSelectionEvents();
    },
    
    /**
     * Set up date selection calendar
     */
    setupDateSelection: function() {
        // Get current date
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Store current calendar month/year
        this.calendarMonth = currentMonth;
        this.calendarYear = currentYear;
        
        // Render calendar
        this.renderCalendar(currentYear, currentMonth);
    },
    
    /**
     * Render calendar for a specific month
     * 
     * @param {number} year Year
     * @param {number} month Month (0-11)
     */
    renderCalendar: function(year, month) {
        // Update calendar month title
        const monthTitle = this.contentContainer.querySelector('.mb-current-month');
        monthTitle.textContent = new Date(year, month, 1).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        // Get calendar dates container
        const datesContainer = this.contentContainer.querySelector('.mb-calendar-dates');
        datesContainer.innerHTML = '';
        
        // Get calendar date template
        const dateTemplate = document.getElementById('mb-calendar-date-template');
        
        // Get first day of month
        const firstDay = new Date(year, month, 1).getDay();
        
        // Get total days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Create empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'mb-calendar-empty';
            datesContainer.appendChild(emptyCell);
        }
        
        // Format available dates for easy lookup
        const availableDatesMap = {};
        this.state.availableDates.forEach(date => {
            const dateObj = new Date(date);
            const dateString = dateObj.toISOString().split('T')[0];
            availableDatesMap[dateString] = true;
        });
        
        // Create cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            // Clone date template
            const dateCell = dateTemplate.content.cloneNode(true);
            const dateElement = dateCell.querySelector('.mb-calendar-date');
            const dateNumber = dateCell.querySelector('.mb-date-number');
            
            // Set date number
            dateNumber.textContent = day;
            
            // Create date string for comparison
            const dateObj = new Date(year, month, day);
            const dateString = dateObj.toISOString().split('T')[0];
            
            // Check if date is available
            const isAvailable = availableDatesMap[dateString] || false;
            
            // Check if date is in the past
            const isPast = dateObj < new Date().setHours(0, 0, 0, 0);
            
            // Check if date is today
            const isToday = dateString === new Date().toISOString().split('T')[0];
            
            // Check if date is selected
            const isSelected = this.state.selectedDate === dateString;
            
            // Add appropriate classes
            if (isAvailable && !isPast) {
                dateElement.classList.add('mb-date-available');
                dateElement.dataset.date = dateString;
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
            
            // Append date to calendar
            datesContainer.appendChild(dateCell);
        }
        
        // Load time slots if date is selected
        if (this.state.selectedDate) {
            this.loadTimeSlots(this.state.selectedDate);
        } else {
            // Hide time slots container
            const timeSlotsContainer = this.contentContainer.querySelector('.mb-time-slots-container');
            timeSlotsContainer.classList.add('mb-hidden');
            
            // Hide continue button
            const continueContainer = this.contentContainer.querySelector('.mb-continue-container');
            continueContainer.classList.add('mb-hidden');
        }
    },
    
    /**
     * Set up date selection events
     */
    setupDateSelectionEvents: function() {
        // Back button
        const backBtn = this.contentContainer.querySelector('.mb-back-btn');
        backBtn.addEventListener('click', () => {
            this.showServiceSelection();
        });
        
        // Previous month button
        const prevMonthBtn = this.contentContainer.querySelector('.mb-prev-month');
        prevMonthBtn.addEventListener('click', () => {
            this.navigateMonth(-1);
        });
        
        // Next month button
        const nextMonthBtn = this.contentContainer.querySelector('.mb-next-month');
        nextMonthBtn.addEventListener('click', () => {
            this.navigateMonth(1);
        });
        
        // Date selection
        this.contentContainer.addEventListener('click', (e) => {
            // Check if clicked element is a date
            let dateElement = e.target.closest('.mb-date-available');
            if (dateElement) {
                const date = dateElement.dataset.date;
                this.selectDate(date);
            }
        });
        
        // Continue to checkout button
        const continueBtn = this.contentContainer.querySelector('.mb-continue-btn');
        continueBtn.addEventListener('click', () => {
            this.addToCart();
            
            // Check if user is authenticated
            if (this.state.isAuthenticated) {
                this.goToCheckout();
            } else {
                this.showAuthForm();
            }
        });
    },
    
    /**
     * Navigate to previous/next month
     * 
     * @param {number} direction Direction (-1 for previous, 1 for next)
     */
    navigateMonth: function(direction) {
        // Update month and year
        this.calendarMonth += direction;
        
        // Handle year change
        if (this.calendarMonth > 11) {
            this.calendarMonth = 0;
            this.calendarYear++;
        } else if (this.calendarMonth < 0) {
            this.calendarMonth = 11;
            this.calendarYear--;
        }
        
        // Render calendar
        this.renderCalendar(this.calendarYear, this.calendarMonth);
    },
    
    /**
     * Select a date
     * 
     * @param {string} date Date string (YYYY-MM-DD)
     */
    selectDate: function(date) {
        // Update selected date
        this.state.selectedDate = date;
        
        // Update date selection UI
        const dateElements = this.contentContainer.querySelectorAll('.mb-calendar-date');
        dateElements.forEach(el => {
            if (el.dataset.date === date) {
                el.classList.add('mb-date-selected');
            } else {
                el.classList.remove('mb-date-selected');
            }
        });
        
        // Load time slots for selected date
        this.loadTimeSlots(date);
        
        // Save state
        this.saveState();
    },
    
    /**
     * Load time slots for selected date
     * 
     * @param {string} date Date string (YYYY-MM-DD)
     */
    loadTimeSlots: function(date) {
        // Show loading state inside time slots container
        const timeSlotsContainer = this.contentContainer.querySelector('.mb-time-slots-container');
        timeSlotsContainer.classList.remove('mb-hidden');
        
        const timeSlotsElement = timeSlotsContainer.querySelector('.mb-time-slots');
        timeSlotsElement.innerHTML = '<div class="mb-loading"><div class="mb-spinner"></div><div class="mb-loading-text">Loading available time slots...</div></div>';
        
        // Update selected date display
        const selectedDateElement = timeSlotsContainer.querySelector('.mb-selected-date');
        selectedDateElement.textContent = this.formatDate(date);
        
        // Build query parameters
        const params = new URLSearchParams({
            action: 'mb_get_available_times',
            nonce: mb_booking_data.nonce,
            session_type_id: this.state.selectedService.id,
            date: date
        });
        
        // Add staff ID if selected
        if (this.state.selectedStaff) {
            params.append('staff_id', this.state.selectedStaff.id);
        }
        
        // Add location ID if set
        if (this.settings.locationId) {
            params.append('location_id', this.settings.locationId);
        }
        
        // Make API request
        fetch(`${mb_booking_data.ajax_url}?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.state.availableTimes = data.data;
                    this.renderTimeSlots(data.data);
                } else {
                    this.renderNoTimeSlots();
                }
            })
            .catch(error => {
                console.error('Error loading time slots:', error);
                this.renderNoTimeSlots();
            });
    },
    
    /**
     * Render time slots
     * 
     * @param {Array} timeSlots Array of time strings (HH:MM)
     */
    renderTimeSlots: function(timeSlots) {
        // Get time slots container
        const timeSlotsContainer = this.contentContainer.querySelector('.mb-time-slots');
        timeSlotsContainer.innerHTML = '';
        
        // Check if any time slots
        if (!timeSlots || timeSlots.length === 0) {
            this.renderNoTimeSlots();
            return;
        }
        
        // Group time slots by period (morning, afternoon, evening)
        const groupedSlots = this.groupTimeSlots(timeSlots);
        
        // Get templates
        const groupTemplate = document.getElementById('mb-time-slot-group-template');
        const buttonTemplate = document.getElementById('mb-time-slot-button-template');
        
        // Define period titles
        const periodTitles = {
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening'
        };
        
        // Create time slot groups
        Object.keys(groupedSlots).forEach(period => {
            // Skip empty periods
            if (groupedSlots[period].length === 0) {
                return;
            }
            
            // Clone group template
            const groupEl = groupTemplate.content.cloneNode(true);
            
            // Set group title
            const titleEl = groupEl.querySelector('.mb-time-group-title');
            titleEl.textContent = periodTitles[period];
            
            // Get buttons container
            const buttonsContainer = groupEl.querySelector('.mb-time-slot-buttons');
            
            // Add time slot buttons
            groupedSlots[period].forEach(time => {
                // Clone button template
                const buttonEl = buttonTemplate.content.cloneNode(true);
                
                // Set button properties
                const button = buttonEl.querySelector('.mb-time-slot-btn');
                button.textContent = this.formatTime(time);
                button.dataset.time = time;
                
                // Mark as selected if this is the selected time
                if (this.state.selectedTime === time) {
                    button.classList.add('mb-time-selected');
                }
                
                // Add button to container
                buttonsContainer.appendChild(buttonEl);
            });
            
            // Add group to container
            timeSlotsContainer.appendChild(groupEl);
        });
        
        // Add event listeners for time selection
        const timeButtons = timeSlotsContainer.querySelectorAll('.mb-time-slot-btn');
        timeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const time = button.dataset.time;
                this.selectTime(time);
            });
        });
    },
    
    /**
     * Render "no time slots" message
     */
    renderNoTimeSlots: function() {
        // Get time slots container
        const timeSlotsContainer = this.contentContainer.querySelector('.mb-time-slots');
        
        // Get template
        const template = document.getElementById('mb-no-time-slots-template');
        
        // Clone template
        const content = template.content.cloneNode(true);
        
        // Clear and append to container
        timeSlotsContainer.innerHTML = '';
        timeSlotsContainer.appendChild(content);
        
        // Hide continue button
        const continueContainer = this.contentContainer.querySelector('.mb-continue-container');
        continueContainer.classList.add('mb-hidden');
    },
    
    /**
     * Select a time slot
     * 
     * @param {string} time Time string (HH:MM)
     */
    selectTime: function(time) {
        // Update selected time
        this.state.selectedTime = time;
        
        // Update time selection UI
        const timeButtons = this.contentContainer.querySelectorAll('.mb-time-slot-btn');
        timeButtons.forEach(button => {
            if (button.dataset.time === time) {
                button.classList.add('mb-time-selected');
            } else {
                button.classList.remove('mb-time-selected');
            }
        });
        
        // Show continue button
        const continueContainer = this.contentContainer.querySelector('.mb-continue-container');
        continueContainer.classList.remove('mb-hidden');
        
        // Save state
        this.saveState();
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
     * Add current selection to cart
     */
    addToCart: function() {
        // Create cart item
        const cartItem = {
            serviceId: this.state.selectedService.id,
            serviceName: this.state.selectedService.name,
            servicePrice: this.state.selectedService.price,
            serviceDuration: this.state.selectedService.duration,
            staffId: this.state.selectedStaff?.id || null,
            staffName: this.state.selectedStaff?.name || null,
            date: this.state.selectedDate,
            time: this.state.selectedTime,
            id: Date.now() // Unique ID for cart item
        };
        
        // Add to cart
        this.state.cart.items.push(cartItem);
        
        // Update cart totals
        this.updateCartTotals();
        
        // Save state
        this.saveState();
    },
    
    /**
     * Show authentication form
     */
    showAuthForm: function() {
        // Get auth form template
        const template = document.getElementById('mb-auth-template');
        if (!template) {
            console.error('Auth form template not found');
            return;
        }
        
        // Clone template content
        const content = template.content.cloneNode(true);
        
        // Clear content container and add new content
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(content);
        
        // Update progress step
        this.updateProgressStep(3);
        
        // Add event listeners
        this.setupAuthFormEvents();
    },
    
    /**
     * Set up authentication form events
     */
    setupAuthFormEvents: function() {
        // Tab switching
        const tabs = this.contentContainer.querySelectorAll('.mb-auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Get tab target
                const target = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('mb-tab-active'));
                tab.classList.add('mb-tab-active');
                
                // Update visible panel
                const panels = this.contentContainer.querySelectorAll('.mb-auth-panel');
                panels.forEach(panel => {
                    if (panel.classList.contains(`mb-${target}-panel`)) {
                        panel.classList.add('mb-panel-active');
                    } else {
                        panel.classList.remove('mb-panel-active');
                    }
                });
            });
        });
        
        // Login form submission
        const loginForm = this.contentContainer.querySelector('#mb-login-form');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Registration form submission
        const registerForm = this.contentContainer.querySelector('#mb-register-form');
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration();
        });
        
        // Back button
        const backBtn = this.contentContainer.querySelector('.mb-back-btn');
        backBtn.addEventListener('click', () => {
            this.showDateSelection();
        });
    },
    
    /**
     * Handle login form submission
     */
    handleLogin: function() {
        // Get form data
        const form = this.contentContainer.querySelector('#mb-login-form');
        const email = form.querySelector('input[name="email"]').value;
        const password = form.querySelector('input[name="password"]').value;
        const errorDiv = form.querySelector('.mb-form-error');
        
        // Validate form
        if (!email || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            errorDiv.classList.remove('mb-hidden');
            return;
        }
        
        // Show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        // Create form data
        const formData = new FormData();
        formData.append('action', 'mb_client_login');
        formData.append('nonce', mb_booking_data.nonce);
        formData.append('email', email);
        formData.append('password', password);
        
        // Make API request
        fetch(mb_booking_data.ajax_url, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (data.success) {
                // Store user info
                this.state.user = data.data;
                this.state.isAuthenticated = true;
                
                // Save state
                this.saveState();
                
                // Go to checkout
                this.goToCheckout();
            } else {
                // Show error
                errorDiv.textContent = data.data?.message || 'Login failed';
                errorDiv.classList.remove('mb-hidden');
            }
        })
        .catch(error => {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            // Show error
            console.error('Login error:', error);
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.classList.remove('mb-hidden');
        });
    },
    
    /**
     * Handle registration form submission
     */
    handleRegistration: function() {
        // Get form data
        const form = this.contentContainer.querySelector('#mb-register-form');
        const firstName = form.querySelector('input[name="first_name"]').value;
        const lastName = form.querySelector('input[name="last_name"]').value;
        const email = form.querySelector('input[name="email"]').value;
        const phone = form.querySelector('input[name="phone"]').value;
        const password = form.querySelector('input[name="password"]').value;
        const errorDiv = form.querySelector('.mb-form-error');
        
        // Validate form
        if (!firstName || !lastName || !email || !phone || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            errorDiv.classList.remove('mb-hidden');
            return;
        }
        
        // Show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        
        // Create form data
        const formData = new FormData();
        formData.append('action', 'mb_client_register');
        formData.append('nonce', mb_booking_data.nonce);
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('password', password);
        
        // Make API request
        fetch(mb_booking_data.ajax_url, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (data.success) {
                // Store user info
                this.state.user = data.data;
                this.state.isAuthenticated = true;
                
                // Save state
                this.saveState();
                
                // Go to checkout
                this.goToCheckout();
            } else {
                // Show error
                errorDiv.textContent = data.data?.message || 'Registration failed';
                errorDiv.classList.remove('mb-hidden');
            }
        })
        .catch(error => {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            // Show error
            console.error('Registration error:', error);
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.classList.remove('mb-hidden');
        });
    },
    
    /**
     * Go to checkout
     */
    goToCheckout: function() {
        // Get checkout template
        const template = document.getElementById('mb-checkout-template');
        if (!template) {
            console.error('Checkout template not found');
            return;
        }
        
        // Clone template content
        const content = template.content.cloneNode(true);
        
        // Clear content container and add new content
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(content);
        
        // Update progress step
        this.updateProgressStep(3);
        
        // Render cart items
        this.renderCartItems();
        
        // Fill in contact details if user is authenticated
        if (this.state.user) {
            const contactForm = this.contentContainer.querySelector('#mb-contact-form');
            
            // Set user information
            if (this.state.user.wp_user) {
                contactForm.querySelector('input[name="first_name"]').value = this.state.user.wp_user.first_name || '';
                contactForm.querySelector('input[name="last_name"]').value = this.state.user.wp_user.last_name || '';
                contactForm.querySelector('input[name="email"]').value = this.state.user.wp_user.email || '';
                contactForm.querySelector('input[name="phone"]').value = this.state.user.wp_user.phone || '';
            }
            
            // Override with Mindbody client info if available
            if (this.state.user.client) {
                contactForm.querySelector('input[name="first_name"]').value = this.state.user.client.FirstName || '';
                contactForm.querySelector('input[name="last_name"]').value = this.state.user.client.LastName || '';
                contactForm.querySelector('input[name="email"]').value = this.state.user.client.Email || '';
                contactForm.querySelector('input[name="phone"]').value = this.state.user.client.MobilePhone || '';
            }
        }
        
        // Calculate order summary
        this.updateOrderSummary();
        
        // Set up event listeners
        this.setupCheckoutEvents();
    },
    
    /**
     * Render cart items
     */
    renderCartItems: function() {
        // Get cart items container
        const cartContainer = this.contentContainer.querySelector('.mb-cart-items');
        cartContainer.innerHTML = '';
        
        // Get template
        const itemTemplate = document.getElementById('mb-cart-item-template');
        
        // Render each cart item
        this.state.cart.items.forEach(item => {
            // Clone template
            const itemEl = itemTemplate.content.cloneNode(true);
            
            // Fill in item details
            itemEl.querySelector('.mb-cart-item').dataset.itemId = item.id;
            itemEl.querySelector('.mb-cart-item-name').textContent = item.serviceName;
            itemEl.querySelector('.mb-cart-item-date').textContent = this.formatDate(item.date);
            itemEl.querySelector('.mb-cart-item-time').textContent = this.formatTime(item.time);
            itemEl.querySelector('.mb-cart-item-price').textContent = this.formatPrice(item.servicePrice);
            
            // Show staff name if available
            const staffEl = itemEl.querySelector('.mb-cart-item-staff');
            if (item.staffName) {
                staffEl.textContent = item.staffName;
                staffEl.classList.remove('mb-hidden');
            }
            
            // Add to container
            cartContainer.appendChild(itemEl);
        });
    },
    
    /**
     * Update order summary
     */
    updateOrderSummary: function() {
        // Get summary elements
        const subtotalEl = this.contentContainer.querySelector('.mb-subtotal');
        const taxEl = this.contentContainer.querySelector('.mb-tax');
        const discountEl = this.contentContainer.querySelector('.mb-discount');
        const discountAmountEl = this.contentContainer.querySelector('.mb-discount-amount');
        const totalEl = this.contentContainer.querySelector('.mb-total-amount');
        
        // Update amounts
        subtotalEl.textContent = this.formatPrice(this.state.cart.subtotal);
        taxEl.textContent = this.formatPrice(this.state.cart.tax * this.state.cart.subtotal);
        totalEl.textContent = this.formatPrice(this.state.cart.total);
        
        // Show discount if any
        if (this.state.cart.discount > 0) {
            discountAmountEl.textContent = `-${this.formatPrice(this.state.cart.discount)}`;
            discountEl.classList.remove('mb-hidden');
        } else {
            discountEl.classList.add('mb-hidden');
        }
    },
    
    /**
     * Set up checkout events
     */
    setupCheckoutEvents: function() {
        // Show promo code section
        const showPromoBtn = this.contentContainer.querySelector('#mb-show-promo');
        showPromoBtn.addEventListener('click', () => {
            const promoSection = this.contentContainer.querySelector('#mb-promo-section');
            promoSection.classList.toggle('mb-hidden');
        });
        
        // Apply promo code
        const applyPromoBtn = this.contentContainer.querySelector('.mb-apply-promo');
        applyPromoBtn.addEventListener('click', () => {
            const promoInput = this.contentContainer.querySelector('#mb-promo-code');
            const promoCode = promoInput.value.trim();
            
            if (promoCode) {
                this.applyPromoCode(promoCode);
            }
        });
        
        // Back button (to auth form or date selection)
        const backBtn = this.contentContainer.querySelector('.mb-back-to-auth');
        backBtn.addEventListener('click', () => {
            if (this.state.isAuthenticated) {
                this.showDateSelection();
            } else {
                this.showAuthForm();
            }
        });
        
        // Continue shopping button
        const continueShoppingBtn = this.contentContainer.querySelector('.mb-continue-shopping');
        continueShoppingBtn.addEventListener('click', () => {
            this.showServiceSelection();
        });
        
        // Edit cart item
        this.contentContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.mb-cart-item-edit');
            if (editBtn) {
                const cartItem = editBtn.closest('.mb-cart-item');
                const itemId = cartItem.dataset.itemId;
                this.editCartItem(itemId);
            }
        });
        
        // Remove cart item
        this.contentContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.mb-cart-item-remove');
            if (removeBtn) {
                const cartItem = removeBtn.closest('.mb-cart-item');
                const itemId = cartItem.dataset.itemId;
                this.removeCartItem(itemId);
            }
        });
        
        // Credit card input formatting
        const cardNumberInput = this.contentContainer.querySelector('#mb-card-number');
        cardNumberInput.addEventListener('input', () => {
            this.formatCardNumber(cardNumberInput);
        });
        
        // Expiry date formatting
        const expiryInput = this.contentContainer.querySelector('#mb-card-expiry');
        expiryInput.addEventListener('input', () => {
            this.formatExpiryDate(expiryInput);
        });
        
        // CVV formatting
        const cvvInput = this.contentContainer.querySelector('#mb-card-cvv');
        cvvInput.addEventListener('input', () => {
            this.formatCVV(cvvInput);
        });
        
        // Complete booking button
        const completeBtn = this.contentContainer.querySelector('#mb-complete-booking');
        completeBtn.addEventListener('click', () => {
            this.completeBooking();
        });
    },
    
    /**
     * Apply promo code
     * 
     * @param {string} code Promo code
     */
    applyPromoCode: function(code) {
        // TODO: Implement promo code validation with API
        console.log('Applying promo code:', code);
        
        // For now, just apply a fixed discount
        this.state.cart.discount = this.state.cart.subtotal * 0.1; // 10% discount
        this.updateCartTotals();
        this.updateOrderSummary();
    },
    
    /**
     * Edit cart item
     * 
     * @param {string} itemId Cart item ID
     */
    editCartItem: function(itemId) {
        // Find cart item
        const item = this.state.cart.items.find(item => item.id.toString() === itemId);
        if (!item) return;
        
        // Set selected service and staff
        this.state.selectedService = this.state.services[item.serviceId];
        this.state.selectedStaff = item.staffId ? { id: item.staffId, name: item.staffName } : null;
        this.state.selectedDate = item.date;
        this.state.selectedTime = item.time;
        
        // Remove item from cart
        this.removeCartItem(itemId);
        
        // Go to date selection
        this.showDateSelection();
    },
    
    /**
     * Remove cart item
     * 
     * @param {string} itemId Cart item ID
     */
    removeCartItem: function(itemId) {
        // Remove cart item
        this.state.cart.items = this.state.cart.items.filter(item => item.id.toString() !== itemId);
        
        // Update cart totals
        this.updateCartTotals();
        
        // Save state
        this.saveState();
        
        // Update UI
        this.renderCartItems();
        this.updateOrderSummary();
        
        // If cart is empty, go back to service selection
        if (this.state.cart.items.length === 0) {
            this.showServiceSelection();
        }
    },
    
    /**
     * Update cart totals
     */
    updateCartTotals: function() {
        // Calculate subtotal
        this.state.cart.subtotal = this.state.cart.items.reduce((total, item) => total + item.servicePrice, 0);
        
        // Calculate total
        this.state.cart.total = this.state.cart.subtotal + (this.state.cart.subtotal * this.state.cart.tax) - (this.state.cart.discount || 0);
    },
    
    /**
     * Complete booking
     */
    completeBooking: function() {
        // Validate form
        const contactForm = this.contentContainer.querySelector('#mb-contact-form');
        const firstName = contactForm.querySelector('input[name="first_name"]').value;
        const lastName = contactForm.querySelector('input[name="last_name"]').value;
        const email = contactForm.querySelector('input[name="email"]').value;
        const phone = contactForm.querySelector('input[name="phone"]').value;
        const notes = contactForm.querySelector('textarea[name="notes"]').value;
        
        // Validate form
        if (!firstName || !lastName || !email || !phone) {
            this.showCheckoutError('Please fill in all required fields');
            return;
        }
        
        // Get payment details
        const cardNumber = this.contentContainer.querySelector('#mb-card-number').value;
        const expiry = this.contentContainer.querySelector('#mb-card-expiry').value;
        const cvv = this.contentContainer.querySelector('#mb-card-cvv').value;
        
        // Validate payment
        if (!cardNumber || !expiry || !cvv) {
            this.showCheckoutError('Please fill in all payment details');
            return;
        }
        
        // Show loading
        const completeBtn = this.contentContainer.querySelector('#mb-complete-booking');
        const originalText = completeBtn.textContent;
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<span class="mb-spinner"></span> Processing...';
        
        // Prepare appointments
        const appointments = this.state.cart.items.map(item => ({
            session_type_id: item.serviceId,
            staff_id: item.staffId,
            date: item.date,
            time: item.time
        }));
        
        // Prepare client data
        const clientData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone.replace(/\D/g, '')
        };
        
        // Prepare payment data
        const [expMonth, expYear] = expiry.split('/');
        const paymentData = {
            PaymentType: 'Credit Card',
            CreditCardNumber: cardNumber.replace(/\s/g, ''),
            ExpirationDate: `20${expYear}-${expMonth.padStart(2, '0')}`,
            CVV: cvv
        };
        
        // Prepare request data
        const requestData = {
            appointments: appointments,
            client: clientData,
            payment: paymentData,
            notes: notes
        };
        
        // Make API request
        fetch(mb_booking_data.ajax_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'mb_book_appointment',
                nonce: mb_booking_data.nonce,
                data: requestData
            })
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            completeBtn.disabled = false;
            completeBtn.textContent = originalText;
            
            if (data.success) {
                // Clear cart
                this.clearCart();
                
                // Show confirmation
                this.showConfirmation(data.data);
            } else {
                // Show error
                this.showCheckoutError(data.data?.message || 'Booking failed');
            }
        })
        .catch(error => {
            // Reset button
            completeBtn.disabled = false;
            completeBtn.textContent = originalText;
            
            // Show error
            console.error('Booking error:', error);
            this.showCheckoutError('An error occurred. Please try again.');
        });
    },
    
    /**
     * Show checkout error
     * 
     * @param {string} errorMessage Error message
     */
    showCheckoutError: function(errorMessage) {
        // Get error template
        const template = document.getElementById('mb-error-message-template');
        if (!template) {
            // Fallback to alert
            alert(errorMessage);
            return;
        }
        
        // Clone template
        const errorEl = template.content.cloneNode(true);
        
        // Set error message
        errorEl.querySelector('.mb-error-text').textContent = errorMessage;
        
        // Find existing error or add to complete button
        const existingError = this.contentContainer.querySelector('.mb-error-message');
        if (existingError) {
            existingError.querySelector('.mb-error-text').textContent = errorMessage;
        } else {
            const completeBtn = this.contentContainer.querySelector('#mb-complete-booking');
            completeBtn.insertAdjacentElement('beforebegin', errorEl.querySelector('.mb-error-message'));
        }
        
        // Scroll to error
        this.contentContainer.querySelector('.mb-error-message').scrollIntoView({ behavior: 'smooth' });
    },
    
    /**
     * Show confirmation screen
     * 
     * @param {Object} bookingData Booking data
     */
    showConfirmation: function(bookingData) {
        // Get confirmation template
        const template = document.getElementById('mb-confirmation-template');
        if (!template) {
            console.error('Confirmation template not found');
            return;
        }
        
        // Clone template content
        const content = template.content.cloneNode(true);
        
        // Clear content container and add new content
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(content);
        
        // Render confirmation items
        this.renderConfirmationItems(bookingData);
        
        // Set up event listeners
        const bookAnotherBtn = this.contentContainer.querySelector('.mb-book-another');
        bookAnotherBtn.addEventListener('click', () => {
            this.showServiceSelection();
        });
    },
    
    /**
     * Render confirmation items
     * 
     * @param {Object} bookingData Booking data
     */
    renderConfirmationItems: function(bookingData) {
        // Get confirmation items container
        const itemsContainer = this.contentContainer.querySelector('.mb-confirmation-items');
        
        // Get template
        const itemTemplate = document.getElementById('mb-confirmation-item-template');
        
        // Process appointments
        const appointments = bookingData.appointments || [];
        
        appointments.forEach(appointment => {
            // Clone template
            const itemEl = itemTemplate.content.cloneNode(true);
            
            // Set appointment details
            itemEl.querySelector('.mb-confirmation-item-name').textContent = appointment.SessionTypeName || 'Booked Service';
            
            // Format and set date/time
            const startDateTime = new Date(appointment.StartDateTime);
            itemEl.querySelector('.mb-confirmation-date').textContent = startDateTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            itemEl.querySelector('.mb-confirmation-time').textContent = startDateTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            
            // Show staff name if available
            const staffRow = itemEl.querySelector('.mb-confirmation-staff-row');
            const staffName = itemEl.querySelector('.mb-confirmation-staff');
            if (appointment.Staff?.Name) {
                staffName.textContent = appointment.Staff.Name;
                staffRow.classList.remove('mb-hidden');
            }
            
            // Show location if available
            const locationRow = itemEl.querySelector('.mb-confirmation-location-row');
            const locationName = itemEl.querySelector('.mb-confirmation-location');
            if (appointment.Location?.Name) {
                locationName.textContent = appointment.Location.Name;
                locationRow.classList.remove('mb-hidden');
            }
            
            // Add price if available
            const priceEl = itemEl.querySelector('.mb-confirmation-item-price');
            if (appointment.Price) {
                priceEl.textContent = this.formatPrice(appointment.Price);
            } else {
                priceEl.classList.add('mb-hidden');
            }
            
            // Add to container
            itemsContainer.appendChild(itemEl);
        });
    },
    
    /**
     * Clear cart
     */
    clearCart: function() {
        this.state.cart.items = [];
        this.state.cart.subtotal = 0;
        this.state.cart.discount = 0;
        this.state.cart.total = 0;
        
        // Save state
        this.saveState();
    },
    
    /**
     * Check authentication status
     */
    checkAuth: function() {
        // TODO: Implement proper auth check with API
        // For now, just check localStorage
        const isAuth = localStorage.getItem('mb_auth') === 'true';
        this.state.isAuthenticated = isAuth;
        
        if (isAuth) {
            try {
                this.state.user = JSON.parse(localStorage.getItem('mb_user'));
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.state.user = null;
                this.state.isAuthenticated = false;
            }
        }
    },
    
    /**
     * Save state to localStorage
     */
    saveState: function() {
        // Save selected service and staff
        localStorage.setItem('mb_selected_service', this.state.selectedService ? JSON.stringify({
            id: this.state.selectedService.id,
            name: this.state.selectedService.name,
            price: this.state.selectedService.price,
            duration: this.state.selectedService.duration
        }) : '');
        
        localStorage.setItem('mb_selected_staff', this.state.selectedStaff ? JSON.stringify(this.state.selectedStaff) : '');
        localStorage.setItem('mb_selected_date', this.state.selectedDate || '');
        localStorage.setItem('mb_selected_time', this.state.selectedTime || '');
        
        // Save cart
        localStorage.setItem('mb_cart', JSON.stringify(this.state.cart));
        
        // Save auth status
        localStorage.setItem('mb_auth', this.state.isAuthenticated);
        localStorage.setItem('mb_user', this.state.user ? JSON.stringify(this.state.user) : '');
    },
    
    /**
     * Load state from localStorage
     */
    loadState: function() {
        // Load selected service and staff
        try {
            const selectedService = localStorage.getItem('mb_selected_service');
            if (selectedService) {
                const service = JSON.parse(selectedService);
                this.state.selectedService = service;
            }
            
            const selectedStaff = localStorage.getItem('mb_selected_staff');
            if (selectedStaff) {
                this.state.selectedStaff = JSON.parse(selectedStaff);
            }
            
            this.state.selectedDate = localStorage.getItem('mb_selected_date') || null;
            this.state.selectedTime = localStorage.getItem('mb_selected_time') || null;
            
            // Load cart
            const cart = localStorage.getItem('mb_cart');
            if (cart) {
                this.state.cart = JSON.parse(cart);
            }
            
            // Load auth status
            this.state.isAuthenticated = localStorage.getItem('mb_auth') === 'true';
            
            const user = localStorage.getItem('mb_user');
            if (user) {
                this.state.user = JSON.parse(user);
            }
        } catch (error) {
            console.error('Error loading state:', error);
            
            // Reset state
            this.state.selectedService = null;
            this.state.selectedStaff = null;
            this.state.selectedDate = null;
            this.state.selectedTime = null;
            this.state.cart = {
                items: [],
                tax: 0.06,
                subtotal: 0,
                total: 0
            };
            this.state.isAuthenticated = false;
            this.state.user = null;
        }
    },
    
    /**
     * Update progress step
     * 
     * @param {number} step Step number
     */
    updateProgressStep: function(step) {
        // Update current step
        this.state.currentStep = step;
        
        // Update step indicators
        const stepIndicators = this.container.querySelectorAll('.mb-step');
        stepIndicators.forEach((indicator, index) => {
            const indicatorStep = index + 1;
            
            if (indicatorStep < step) {
                indicator.classList.add('mb-step-completed');
                indicator.classList.remove('mb-step-active');
            } else if (indicatorStep === step) {
                indicator.classList.add('mb-step-active');
                indicator.classList.remove('mb-step-completed');
            } else {
                indicator.classList.remove('mb-step-active', 'mb-step-completed');
            }
        });
    },
    
    /**
     * Get service categories
     * 
     * @return {Object} Object with category names as keys and arrays of service IDs as values
     */
    getServiceCategories: function() {
        const categories = {};
        
        // Process services
        Object.keys(this.state.services).forEach(serviceId => {
            const service = this.state.services[serviceId];
            let category = 'Other';
            
            // Determine category from service name
            if (service.name.includes('Consultation') || service.name.includes('Consult') || service.name.includes('Tour')) {
                category = 'Consultation';
            } else if (service.name.includes('Training') || service.name.includes('1on1') || 
                       service.name.includes('2on1') || service.name.includes('3on1')) {
                category = 'Training';
            } else if (service.name.includes('Massage') || service.name.includes('Therapy')) {
                category = 'Massage & Therapy';
            } else if (service.name.includes('Nutrition') || service.name.includes('Diet')) {
                category = 'Nutrition';
            }
            
            // Filter by settings categories if provided
            if (this.settings.categories) {
                const allowedCategories = this.settings.categories.split(',').map(c => c.trim());
                if (!allowedCategories.includes(category)) {
                    return;
                }
            }
            
            // Add to category
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(serviceId);
        });
        
        return categories;
    },
    
    /**
     * Filter services by category
     * 
     * @param {string} category Category name or empty for all categories
     */
    filterServicesByCategory: function(category) {
        // Get all category containers
        const categoryContainers = this.contentContainer.querySelectorAll('.mb-category');
        
        if (!category) {
            // Show all categories
            categoryContainers.forEach(container => {
                container.classList.remove('mb-hidden');
            });
        } else {
            // Show only selected category
            categoryContainers.forEach(container => {
                const categoryTitle = container.querySelector('.mb-category-title').textContent;
                if (categoryTitle === category) {
                    container.classList.remove('mb-hidden');
                } else {
                    container.classList.add('mb-hidden');
                }
            });
        }
    },
    
    /**
     * Show loading indicator
     * 
     * @param {string} message Loading message
     */
    showLoading: function(message) {
        this.contentContainer.innerHTML = `
            <div class="mb-loading">
                <div class="mb-spinner"></div>
                <div class="mb-loading-text">${message || 'Loading...'}</div>
            </div>
        `;
    },
    
    /**
     * Show error message
     * 
     * @param {string} title Error title
     * @param {string} message Error message
     */
    showError: function(title, message) {
        this.contentContainer.innerHTML = `
            <div class="mb-error">
                <div class="mb-error-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>
                </div>
                <h3 class="mb-error-title">${title}</h3>
                ${message ? `<p class="mb-error-message">${message}</p>` : ''}
                <button class="mb-btn mb-primary-btn mb-retry-btn" onclick="MBBooking.init()">Try Again</button>
            </div>
        `;
    },
    
    /**
     * Show "no services available" message
     */
    showNoServices: function() {
        // Get template
        const template = document.getElementById('mb-no-services-template');
        
        // Clear categories container
        const categoriesContainer = this.contentContainer.querySelector('.mb-categories');
        categoriesContainer.innerHTML = '';
        
        // Clone and add template
        categoriesContainer.appendChild(template.content.cloneNode(true));
    },
    
    /**
     * Format price
     * 
     * @param {number} price Price
     * @return {string} Formatted price
     */
    formatPrice: function(price) {
        return `$${parseFloat(price).toFixed(2)}`;
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
     * Format date
     * 
     * @param {string} dateString Date string (YYYY-MM-DD)
     * @return {string} Formatted date
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
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
        return `${hour12}:${minutes} ${ampm}`;
    },
    
    /**
     * Format credit card number
     * 
     * @param {HTMLInputElement} input Card number input element
     */
    formatCardNumber: function(input) {
        let value = input.value.replace(/\D/g, '');
        
        // Get card type based on first digits
        const cardType = this.detectCardType(value);
        
        // Update card type icon
        const cardTypeElement = this.contentContainer.querySelector('#mb-card-type');
        cardTypeElement.className = 'mb-card-type';
        if (cardType) {
            cardTypeElement.classList.add(`mb-card-${cardType.toLowerCase()}`);
        }
        
        // Format with spaces
        if (value.length > 0) {
            value = value.match(/.{1,4}/g).join(' ');
        }
        
        // Update input value
        input.value = value;
    },
    
    /**
     * Format expiry date
     * 
     * @param {HTMLInputElement} input Expiry date input element
     */
    formatExpiryDate: function(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        
        input.value = value;
    },
    
    /**
     * Format CVV
     * 
     * @param {HTMLInputElement} input CVV input element
     */
    formatCVV: function(input) {
        input.value = input.value.replace(/\D/g, '');
    },
    
    /**
     * Detect credit card type
     * 
     * @param {string} number Card number
     * @return {string|null} Card type or null
     */
    detectCardType: function(number) {
        // Basic card type detection
        const patterns = {
            Visa: /^4/,
            Mastercard: /^5[1-5]/,
            Amex: /^3[47]/,
            Discover: /^6(?:011|5)/
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(number)) {
                return type;
            }
        }
        
        return null;
    }
};

// Initialize booking widget on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    MBBooking.init();
});