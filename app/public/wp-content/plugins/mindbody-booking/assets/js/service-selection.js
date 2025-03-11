/**
 * Service Selection Module
 * 
 * Handles service and staff selection
 */

const MBServiceSelection = {
    /**
     * State
     */
    state: {
        services: {},
        categories: {},
        selectedService: null,
        selectedStaff: null
    },
    
    /**
     * Initialize service selection
     * 
     * @param {Object} options Configuration options
     */
    init: function(options = {}) {
        // Set default options
        this.options = Object.assign({
            categoriesContainer: '.mb-categories',
            categoryTemplate: '#mb-category-template',
            serviceTemplate: '#mb-service-template',
            staffTemplate: '#mb-staff-option-template',
            noServicesTemplate: '#mb-no-services-template',
            filterContainer: '.mb-filters',
            categoryFilter: '#mb-category-filter',
            selectedCategoryFilter: '',
            selectedService: null,
            selectedStaff: null,
            services: {},
            onSelectService: null,
            onSelectStaff: null
        }, options);
        
        // Set initial state
        this.state.services = this.options.services || {};
        this.state.selectedService = this.options.selectedService || null;
        this.state.selectedStaff = this.options.selectedStaff || null;
        
        // Process categories
        this.processCategories();
        
        // Render services
        this.renderServices();
        
        // Set up event listeners
        this.setupEventListeners();
    },
    
    /**
     * Process service categories
     */
    processCategories: function() {
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
            
            // Add to category
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(serviceId);
        });
        
        this.state.categories = categories;
    },
    
    /**
     * Render services
     */
    renderServices: function() {
        // Get container
        const container = document.querySelector(this.options.categoriesContainer);
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Check if we have services
        if (Object.keys(this.state.services).length === 0) {
            this.renderNoServices();
            return;
        }
        
        // Set up filters if enabled
        this.setupFilters();
        
        // Get templates
        const categoryTemplate = document.querySelector(this.options.categoryTemplate);
        const serviceTemplate = document.querySelector(this.options.serviceTemplate);
        const staffTemplate = document.querySelector(this.options.staffTemplate);
        
        if (!categoryTemplate || !serviceTemplate) return;
        
        // Render each category
        Object.keys(this.state.categories).forEach(category => {
            // Skip empty categories
            if (this.state.categories[category].length === 0) return;
            
            // Handle filter
            if (this.options.selectedCategoryFilter && this.options.selectedCategoryFilter !== category) {
                return;
            }
            
            // Clone category template
            const categoryElement = categoryTemplate.content.cloneNode(true);
            
            // Set category title
            categoryElement.querySelector('.mb-category-title').textContent = category;
            
            // Get services container
            const servicesContainer = categoryElement.querySelector('.mb-services');
            
            // Add services to category
            this.state.categories[category].forEach(serviceId => {
                const service = this.state.services[serviceId];
                if (!service) return;
                
                // Clone service template
                const serviceElement = serviceTemplate.content.cloneNode(true);
                const serviceEl = serviceElement.querySelector('.mb-service');
                
                // Set service information
                serviceEl.dataset.serviceId = service.id;
                serviceElement.querySelector('.mb-service-name').textContent = service.name;
                serviceElement.querySelector('.mb-service-price').textContent = MBUtils.formatPrice(service.price);
                serviceElement.querySelector('.mb-service-duration').textContent = MBUtils.formatDuration(service.duration);
                
                // Add description if available
                if (service.description) {
                    const descriptionEl = serviceElement.querySelector('.mb-service-description');
                    descriptionEl.textContent = service.description;
                    descriptionEl.classList.remove('mb-hidden');
                }
                
                // Check if selected
                if (this.state.selectedService && this.state.selectedService.id === service.id) {
                    serviceEl.classList.add('mb-service-selected');
                    serviceElement.querySelector('.mb-service-select-btn').textContent = 'Selected';
                    serviceElement.querySelector('.mb-service-staff').classList.remove('mb-hidden');
                }
                
                // Add staff members if available
                const staffContainer = serviceElement.querySelector('.mb-staff-options');
                const hasStaff = service.staff && Object.keys(service.staff).length > 0;
                
                if (hasStaff) {
                    // Add staff members
                    Object.values(service.staff).forEach(staff => {
                        const staffElement = staffTemplate.content.cloneNode(true);
                        const staffEl = staffElement.querySelector('.mb-staff-option');
                        
                        staffEl.dataset.staffId = staff.id;
                        staffElement.querySelector('.mb-staff-name').textContent = staff.name;
                        
                        // Check if selected
                        if (this.state.selectedStaff && this.state.selectedStaff.id === staff.id) {
                            staffEl.classList.add('mb-staff-selected');
                        }
                        
                        staffContainer.appendChild(staffEl);
                    });
                } else {
                    // Hide Any Staff option if no staff available
                    serviceElement.querySelector('.mb-any-staff').classList.add('mb-hidden');
                }
                
                // Add service to container
                servicesContainer.appendChild(serviceElement);
            });
            
            // Add category to container
            container.appendChild(categoryElement);
        });
        
        // Add event listeners
        this.addServiceEventListeners();
    },
    
    /**
     * Set up filters
     */
    setupFilters: function() {
        // Get filter container
        const filterContainer = document.querySelector(this.options.filterContainer);
        if (!filterContainer) return;
        
        // Get category filter
        const categoryFilter = document.querySelector(this.options.categoryFilter);
        if (!categoryFilter) return;
        
        // Clear filter options
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        // Add categories to filter
        Object.keys(this.state.categories).forEach(category => {
            // Skip empty categories
            if (this.state.categories[category].length === 0) return;
            
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            
            // Set selected if matching filter
            if (this.options.selectedCategoryFilter === category) {
                option.selected = true;
            }
            
            categoryFilter.appendChild(option);
        });
        
        // Show filter container
        filterContainer.classList.remove('mb-hidden');
        filterContainer.dataset.showFilters = 'true';
    },
    
    /**
     * Render "no services available" message
     */
    renderNoServices: function() {
        // Get container
        const container = document.querySelector(this.options.categoriesContainer);
        if (!container) return;
        
        // Get template
        const template = document.querySelector(this.options.noServicesTemplate);
        if (!template) return;
        
        // Clone template and add to container
        container.appendChild(template.content.cloneNode(true));
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Category filter
        const categoryFilter = document.querySelector(this.options.categoryFilter);
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.options.selectedCategoryFilter = categoryFilter.value;
                this.renderServices();
            });
        }
    },
    
    /**
     * Add service event listeners
     */
    addServiceEventListeners: function() {
        // Get containers
        const categoriesContainer = document.querySelector(this.options.categoriesContainer);
        if (!categoriesContainer) return;
        
        // Service header clicks
        const serviceHeaders = categoriesContainer.querySelectorAll('.mb-service-header');
        serviceHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const serviceEl = header.closest('.mb-service');
                const serviceId = serviceEl.dataset.serviceId;
                
                // Toggle service selection
                if (this.state.selectedService && this.state.selectedService.id === serviceId) {
                    this.deselectService();
                } else {
                    this.selectService(this.state.services[serviceId]);
                }
                
                // Update UI
                this.updateServiceSelection();
            });
        });
        
        // Staff option clicks
        const staffOptions = categoriesContainer.querySelectorAll('.mb-staff-option');
        staffOptions.forEach(staffEl => {
            staffEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up to service header
                
                // Get service
                const serviceEl = staffEl.closest('.mb-service');
                const serviceId = serviceEl.dataset.serviceId;
                const service = this.state.services[serviceId];
                
                // Select service if not already selected
                if (!this.state.selectedService || this.state.selectedService.id !== serviceId) {
                    this.selectService(service);
                }
                
                // Get staff ID
                const staffId = staffEl.dataset.staffId;
                
                // Select staff
                if (staffId) {
                    // Specific staff
                    this.selectStaff(service.staff[staffId]);
                } else {
                    // Any staff
                    this.selectStaff(null);
                }
                
                // Update UI
                this.updateServiceSelection();
                
                // Trigger onSelectStaff callback
                if (typeof this.options.onSelectStaff === 'function') {
                    this.options.onSelectStaff(this.state.selectedService, this.state.selectedStaff);
                }
            });
        });
    },
    
    /**
     * Update service selection UI
     */
    updateServiceSelection: function() {
        // Get containers
        const categoriesContainer = document.querySelector(this.options.categoriesContainer);
        if (!categoriesContainer) return;
        
        // Update all service elements
        const serviceElements = categoriesContainer.querySelectorAll('.mb-service');
        serviceElements.forEach(serviceEl => {
            const serviceId = serviceEl.dataset.serviceId;
            const selectBtn = serviceEl.querySelector('.mb-service-select-btn');
            const staffContainer = serviceEl.querySelector('.mb-service-staff');
            
            if (this.state.selectedService && this.state.selectedService.id === serviceId) {
                serviceEl.classList.add('mb-service-selected');
                staffContainer.classList.remove('mb-hidden');
                selectBtn.textContent = 'Selected';
                
                // Update staff selection
                const staffOptions = serviceEl.querySelectorAll('.mb-staff-option');
                staffOptions.forEach(staffEl => {
                    const staffId = staffEl.dataset.staffId;
                    
                    if (this.state.selectedStaff && this.state.selectedStaff.id === staffId) {
                        staffEl.classList.add('mb-staff-selected');
                    } else if (!this.state.selectedStaff && !staffId) {
                        // "Any Staff" option
                        staffEl.classList.add('mb-staff-selected');
                    } else {
                        staffEl.classList.remove('mb-staff-selected');
                    }
                });
                
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
        // Update state
        this.state.selectedService = service;
        
        // Trigger onSelectService callback
        if (typeof this.options.onSelectService === 'function') {
            this.options.onSelectService(service);
        }
    },
    
    /**
     * Deselect current service
     */
    deselectService: function() {
        // Update state
        this.state.selectedService = null;
        this.state.selectedStaff = null;
        
        // Trigger onSelectService callback
        if (typeof this.options.onSelectService === 'function') {
            this.options.onSelectService(null);
        }
    },
    
    /**
     * Select staff member
     * 
     * @param {Object|null} staff Staff object or null for any staff
     */
    selectStaff: function(staff) {
        // Update state
        this.state.selectedStaff = staff;
    },
    
    /**
     * Set services data
     * 
     * @param {Object} services Services data
     */
    setServices: function(services) {
        this.state.services = services;
        this.processCategories();
        this.renderServices();
    }
};

// Export module globally
window.MBServiceSelection = MBServiceSelection;