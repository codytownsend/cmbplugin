document.addEventListener("DOMContentLoaded", function() {
    initializeBookingWidget();
});

// Global state
let selectedService = null;
let selectedStaff = null;
let selectedDate = new Date().toISOString();
let selectedDateTime = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isAuthenticated = false;
let cartId = null;

async function checkExistingAuth() {
    try {
        const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_verify_auth", {
            credentials: 'same-origin' // Ensure cookies are sent
        });
        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = true;
            // If no Mindbody client is found, fall back to wp_user info
            window.clientInfo = data.data.client ? data.data.client : data.data.wp_user;
            localStorage.setItem('mindbody_auth', 'true');
            localStorage.setItem('mindbody_client_info', JSON.stringify(window.clientInfo));
            return true;
        } else {
            isAuthenticated = false;
            window.clientInfo = null;
            localStorage.removeItem('mindbody_auth');
            localStorage.removeItem('mindbody_client_info');
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Check auth status and cart
async function checkAuthAndCart() {
    try {
        // First verify WordPress auth
        const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_verify_auth");
        const data = await response.json();
        
        if (data.success) {
            // User is logged into WordPress and we have their Mindbody info
            isAuthenticated = true;
            window.clientInfo = data.client;
            localStorage.setItem('mindbody_auth', 'true');
            localStorage.setItem('mindbody_client_info', JSON.stringify(data.client));
            
            // Check for stored cart
            const storedCart = localStorage.getItem('mindbody_cart');
            if (storedCart) {
                const cart = JSON.parse(storedCart);
                const isAvailable = await verifyCartAvailability(cart);
                
                if (isAvailable) {
                    // Restore the cart state
                    selectedService = cart.service;
                    selectedStaff = cart.staff;
                    selectedDate = cart.date;
                    selectedDateTime = cart.time;
                    
                    // Take them to checkout
                    goToCheckout();
                    return true;
                }
            }
        } else {
            // Clear any stored auth if WordPress session is invalid
            isAuthenticated = false;
            window.clientInfo = null;
            localStorage.removeItem('mindbody_auth');
            localStorage.removeItem('mindbody_client_info');
            localStorage.removeItem('mindbody_cart');
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        isAuthenticated = false;
        window.clientInfo = null;
    }
    return false;
}

// Verify cart availability
async function verifyCartAvailability(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
        return false;
    }
    
    try {
        // We'll only verify the first item for performance reasons
        const item = cart.items[0];
        
        if (!item.service || !item.service.Id || !item.date || !item.time) {
            console.warn('Cart item is missing required data:', item);
            return false;
        }
        
        const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_verify_availability", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                serviceId: item.service.Id,
                staffId: item.staff?.Id || '',
                date: item.date,
                time: item.time
            })
        });
        
        // Check for HTTP errors first
        if (!response.ok) {
            console.error('Availability verification HTTP error:', response.status, response.statusText);
            return false;
        }
        
        // Now try to parse JSON
        try {
            const data = await response.json();
            return data.success === true;
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            return false;
        }
    } catch (error) {
        console.error('Availability verification error:', error);
        return false;
    }
}

async function fetchSaleServices() {
    try {
        const response = await fetch(mindbody_booking.ajax_url + "?action=test_sale_services_by_session_types");
        const data = await response.json();
        if (data.success) {
            window.saleServices = data.data;
            console.log("Fetched sale services:", window.saleServices);
        } else {
            window.saleServices = [];
        }
    } catch (error) {
        console.error("Error fetching sale services:", error);
        window.saleServices = [];
    }
}

async function initializeBookingWidget() {
    const container = document.getElementById("mindbody-booking-widget");
    if (!container) return;
    
    container.classList.add("font-sans");
    
    // Fetch sale services for pricing
    await fetchSaleServices();
    
    // Check auth and then load bookable items
    const isAuthed = await checkExistingAuth();
    if (isAuthed) {
        const hasExistingCart = await checkAuthAndCart();
        if (!hasExistingCart) {
            fetchBookableItems();
        }
    } else {
        fetchBookableItems();
    }
}

function getServicePrice(selectedService) {
    // First check if the service has a Price property directly
    if (selectedService.Price && typeof selectedService.Price === 'number') {
        return selectedService.Price;
    }
    
    // Next, check if we have sale services data
    if (window.saleServices && window.saleServices.length > 0) {
        // First try to match by session type ID
        const matchById = window.saleServices.find(item => 
            item.ProgramId === parseInt(selectedService.Id) || 
            item.ProgramId === selectedService.Id
        );
        
        if (matchById && typeof matchById.Price !== 'undefined' && 
            matchById.Price !== null && matchById.Price > 0) {
            console.log(`Found price match by ID for ${selectedService.Name}: $${matchById.Price}`);
            return matchById.Price;
        }
        
        // Try matching by name (case-insensitive)
        const matchByName = window.saleServices.find(item =>
            item.Name.toLowerCase().includes(selectedService.Name.toLowerCase()) ||
            selectedService.Name.toLowerCase().includes(item.Name.toLowerCase())
        );
        
        if (matchByName && typeof matchByName.Price !== 'undefined' && 
            matchByName.Price !== null && matchByName.Price > 0) {
            console.log(`Found price match by name for ${selectedService.Name}: $${matchByName.Price}`);
            return matchByName.Price;
        }
        
        // Try matching by description or any other field if available
        if (selectedService.OnlineDescription) {
            const matchByDescription = window.saleServices.find(item =>
                item.Description && 
                (item.Description.toLowerCase().includes(selectedService.OnlineDescription.toLowerCase()) ||
                selectedService.OnlineDescription.toLowerCase().includes(item.Description.toLowerCase()))
            );
            
            if (matchByDescription && typeof matchByDescription.Price !== 'undefined' && 
                matchByDescription.Price !== null && matchByDescription.Price > 0) {
                console.log(`Found price match by description for ${selectedService.Name}: $${matchByDescription.Price}`);
                return matchByDescription.Price;
            }
        }
    }
    
    // Make an API call to get the price if all else fails
    fetchAndCacheServicePrice(selectedService.Id);
    
    // Return the default price while waiting for API response
    return 95; // Default price
}

function renderProgressHeader(currentStep) {
    return `
        <style>
            .wp-block-group{padding-top:0!important;}
        </style>
        <div class="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 mb-6">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-black' : 'bg-gray-300'}"></div>
                    <div class="w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-black' : 'bg-gray-300'}"></div>
                    <div class="w-2 h-2 rounded-full ${currentStep >= 3 ? 'bg-black' : 'bg-gray-300'}"></div>
                </div>
                <div class="text-sm font-medium text-gray-500">Step ${currentStep} of 3</div>
            </div>
        </div>
    `;
}

async function fetchAndCacheServicePrice(serviceId) {
    try {
        const response = await fetch(mindbody_booking.ajax_url + 
            "?action=mindbody_get_service_price&serviceId=" + serviceId);
        const data = await response.json();
        
        if (data.success && data.data) {
            // Cache the price in the service object for future use
            const cachedService = window.cachedServices.find(s => s.Id === serviceId);
            if (cachedService) {
                cachedService.Price = data.data;
                console.log(`Updated cached price for ${cachedService.Name}: $${data.data}`);
            }
            
            // If this is the selected service, update the checkout
            if (selectedService && selectedService.Id === serviceId) {
                selectedService.Price = data.data;
                
                // Update price display in checkout if we're in checkout
                const checkoutContainer = document.getElementById("mindbody-booking-widget");
                if (checkoutContainer && checkoutContainer.innerHTML.includes("Complete Booking")) {
                    goToCheckout(); // Refresh checkout to show updated price
                }
            }
        }
    } catch (error) {
        console.error("Error fetching service price:", error);
    }
}

function fetchBookableItems() {
    const container = document.getElementById("mindbody-booking-widget");
    
    container.innerHTML = `
        <div class="animate-pulse space-y-4">
            ${Array(3).fill().map(() => `
                <div class="bg-white p-6 pt-0 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex space-x-4">
                        <div class="flex-1 space-y-4 py-1">
                            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                        <div class="w-24 h-8 bg-gray-200 rounded"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    fetch(mindbody_booking.ajax_url + "?action=mindbody_get_bookable_items")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.cachedServices = data.data; // Cache the services
                displayBookableItems(data.data);
            } else {
                showError("No available appointments at this time.");
            }
        })
        .catch(error => {
            console.error("Error fetching bookable items:", error);
            showError("Unable to load services. Please try again later.");
        });
}

function displayBookableItems(items) {
    const container = document.getElementById("mindbody-booking-widget");
    
    if (!items || items.length === 0) {
        showError("No services available at this time.");
        return;
    }

    // Pre-fetch prices for all services if they don't have one already
    items.forEach(service => {
        if (!service.Price || service.Price <= 0) {
            fetchAndCacheServicePrice(service.Id);
        }
    });

    container.innerHTML = `
        <div class="space-y-6">
            ${renderProgressHeader(1)}
            <div class="space-y-4">
                ${items.map(service => {
                    const serviceData = encodeURIComponent(JSON.stringify(service));
                    const isSelected = selectedService?.Id === service.Id;
                    const price = getServicePrice(service);
                    
                    return `
                        <div class="bg-white rounded-lg border shadow-sm">
                            <div onclick="toggleServiceSelection('${service.Id}', '${serviceData}')" class="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-lg font-medium text-gray-900">${service.Name}</h3>
                                        <p class="text-sm text-gray-500">Price: $${price.toFixed(2)}</p>
                                        ${service.OnlineDescription ? `<p class="mt-1 text-sm text-gray-500">${service.OnlineDescription}</p>` : ''}
                                    </div>
                                    <div class="ml-4">
                                        <span class="inline-flex items-center px-4 py-2 text-sm font-medium ${isSelected ? 'bg-black text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'} rounded-md transition-colors">
                                            ${isSelected ? 'Selected' : 'Select'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            ${isSelected ? `
                                <div class="border-t border-gray-200">
                                    <div class="p-4">
                                        <h4 class="text-base font-medium text-gray-900 mb-3">Select Your Provider</h4>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button onclick="event.stopPropagation(); selectServiceAndStaff('${service.Id}', '${service.Name}', null)" class="flex flex-col text-left p-4 border rounded-lg hover:border-black transition-colors">
                                                <span class="text-base font-medium text-gray-900">Any Available Staff</span>
                                                <span class="mt-1 text-sm text-gray-500">Choose first available</span>
                                            </button>
                                            ${service.Staff.map(staff => {
                                                const staffData = encodeURIComponent(JSON.stringify(staff));
                                                return `
                                                    <button onclick="event.stopPropagation(); selectServiceAndStaff('${service.Id}', '${service.Name}', '${staffData}')" class="flex flex-col text-left p-4 border rounded-lg hover:border-black transition-colors">
                                                        <span class="text-base font-medium text-gray-900">${staff.Name}</span>
                                                        <span class="mt-1 text-sm text-gray-500">${staff.availability || 'Check availability'}</span>
                                                    </button>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Add price refresher to update prices as they come in
    setTimeout(refreshServicePrices, 1000, items);
}

// Function to refresh service prices after they've been fetched
function refreshServicePrices(items) {
    if (!window.cachedServices) return;
    
    const priceElements = document.querySelectorAll('.text-sm.text-gray-500');
    let needsRefresh = false;
    
    items.forEach(service => {
        // Check if price has been updated
        const cachedService = window.cachedServices.find(s => s.Id === service.Id);
        if (cachedService && cachedService.Price && (!service.Price || service.Price !== cachedService.Price)) {
            needsRefresh = true;
        }
    });
    
    if (needsRefresh) {
        // Only re-render if prices have changed
        displayBookableItems(window.cachedServices);
    } else {
        // Check again in a second
        setTimeout(refreshServicePrices, 1000, items);
    }
}

function selectServiceAndStaff(serviceId, serviceName, staffJson) {
    selectedService = {
        Id: serviceId,
        Name: serviceName
    };
    
    if (staffJson) {
        // Decode the URI-encoded JSON string
        selectedStaff = JSON.parse(decodeURIComponent(staffJson));
    } else {
        selectedStaff = null;
    }
    
    fetchAvailableDates();
}

function toggleServiceSelection(serviceId, encodedService) {
    const service = JSON.parse(decodeURIComponent(encodedService));
    
    if (selectedService?.Id === serviceId) {
        selectedService = null;
    } else {
        selectedService = service;
    }
    
    // Re-render without fetching
    displayBookableItems(window.cachedServices || []);
}

function fetchAvailableDates(monthOffset = 0) {
    const container = document.getElementById("mindbody-booking-widget");
    
    // Show loading state
    container.innerHTML = `
        <div class="animate-pulse space-y-4">
            <div class="h-8 bg-gray-200 rounded w-1/3"></div>
            <div class="grid grid-cols-7 gap-2">
                ${Array(35).fill().map(() => `
                    <div class="h-12 bg-gray-200 rounded"></div>
                `).join('')}
            </div>
        </div>
    `;

    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() + monthOffset);
    startDate.setDate(1);
    
    let daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    let searchDays = Math.min(daysInMonth, 30);
    let endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + searchDays - 1);

    let startDateISO = startDate.toISOString().split("T")[0];
    let endDateISO = endDate.toISOString().split("T")[0];

    let url = `${mindbody_booking.ajax_url}?action=mindbody_get_available_dates&sessionTypeId=${selectedService.Id}&startDate=${startDateISO}&endDate=${endDateISO}`;

    if (selectedStaff) {
        url += `&staffId=${selectedStaff.Id}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.data.length > 0) {
                    displayAvailableDates(data.data);
                } else {
                    displayAvailableDates([], "No available dates found for this selection.");
                }
            } else {
                displayAvailableDates([], "It looks like there are no available dates for your selection at the moment. Please try another month or check back later.");
            }
        })
        .catch(error => {
            console.error("Error fetching available dates:", error);
            displayAvailableDates([], "No available dates. Please try again.");
        });
}

function displayAvailableDates(dates, overlayMessage = '') {
    const container = document.getElementById("mindbody-booking-widget");
    const availableDates = dates.map(date => new Date(date));
    
    // Check if today is available
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isTodayAvailable = availableDates.some(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    if (!isTodayAvailable && availableDates.length > 0) {
        const futureAvailableDates = availableDates.filter(date => date > today);
        if (futureAvailableDates.length > 0) {
            selectedDate = futureAvailableDates[0].toISOString();
        }
    }
    
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Progress Steps -->
            ${renderProgressHeader(2)}

            <!-- Back Button -->
            <button 
                onclick="fetchBookableItems()"
                class="flex items-center text-sm text-gray-600 hover:text-black transition-colors mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Back to Service Selection
            </button>

            <!-- Service Summary -->
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 class="font-medium text-gray-900">Current Selection</h3>
                <div class="mt-2 space-y-1">
                    <p class="text-sm text-gray-500">Service: ${selectedService.Name}</p>
                    ${selectedStaff ? `<p class="text-sm text-gray-500">Provider: ${selectedStaff.Name}</p>` : ''}
                </div>
            </div>

            <!-- Calendar Section -->
            <div class="relative bg-white rounded-lg shadow">
                <div class="flex items-center justify-between px-6 py-4 border-b">
                    <h2 class="text-xl font-semibold text-gray-900">
                        ${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div class="flex space-x-2">
                        <button onclick="navigateMonth(-1)" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button onclick="navigateMonth(1)" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="p-6 relative">
                    <!-- Day Labels -->
                    <div class="grid grid-cols-7 gap-2 mb-4">
                    ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
                            <div class="text-center text-sm font-medium text-gray-500">${day}</div>
                        `).join('')}
                    </div>

                    <!-- Calendar Days -->
                    <div class="grid grid-cols-7 gap-2">
                        ${generateCalendarDays(currentYear, currentMonth, availableDates)}
                    </div>

                    ${overlayMessage ? `
                        <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                            <span class="text-gray-500 font-medium text-center px-4">
                                ${overlayMessage}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Time Slots Container -->
            <div id="timeSlotsContainer" class="mt-8"></div>
        </div>
    `;

    if (selectedDate && availableDates.length > 0) {
        fetchAvailableTimeSlots(selectedDate);
    } else {
        const timeSlotsContainer = document.getElementById("timeSlotsContainer");
        if(timeSlotsContainer) {
            timeSlotsContainer.innerHTML = '';
        }
    }
}

function navigateMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    const today = new Date();
    const targetDate = new Date(currentYear, currentMonth, 1);
    const monthOffset = (currentYear - today.getFullYear()) * 12 + (currentMonth - today.getMonth());

    fetchAvailableDates(monthOffset);
}

function generateCalendarDays(year, month, availableDates) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let calendarHtml = '';

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        calendarHtml += `<div></div>`;
    }

    // Generate calendar days
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        currentDate.setHours(0, 0, 0, 0);
        
        const isAvailable = availableDates.some(date => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === currentDate.getTime();
        });
        
        const isPast = currentDate < today;
        const isToday = currentDate.getTime() === today.getTime();
        const isSelected = selectedDate && currentDate.getTime() === new Date(selectedDate).getTime();

        calendarHtml += `
            <button 
                onclick="${isAvailable && !isPast ? `selectDate('${currentDate.toISOString()}')` : 'void(0)'}"
                class="relative h-12 rounded-lg ${
                    isPast ? 'text-gray-300 cursor-not-allowed' :
                    isAvailable ? 'hover:border-black cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                } ${
                    isSelected ? 'bg-black text-white border' :
                    isToday && !isSelected ? 'border-2 border-black' : 'border'
                } flex items-center justify-center transition-colors"
                ${isPast || !isAvailable ? 'disabled' : ''}
            >
                <span class="text-sm ${isAvailable && !isPast ? 'font-medium' : ''}">${day}</span>
                ${isAvailable && !isPast ? `
                    <span class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 ${
                        isSelected ? 'bg-white' : 'bg-black'
                    } rounded-full"></span>
                ` : ''}
            </button>
        `;
    }

    return calendarHtml;
}

function selectDate(date) {
    selectedDate = date;
    fetchAvailableTimeSlots(date);
}

function fetchAvailableTimeSlots(date) {
    const container = document.getElementById("timeSlotsContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="animate-pulse space-y-3">
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                ${Array(8).fill().map(() => `
                    <div class="h-12 bg-gray-200 rounded"></div>
                `).join('')}
            </div>
        </div>
    `;

    const url = `${mindbody_booking.ajax_url}?action=mindbody_get_available_slots&sessionTypeId=${selectedService.Id}&date=${date}${selectedStaff ? `&staffId=${selectedStaff.Id}` : ''}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                displayTimeSlots(data.data);
            } else {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        No available time slots for this date.
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error("Error fetching time slots:", error);
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    Unable to load time slots. Please try again.
                </div>
            `;
        });
}

function displayTimeSlots(slots) {
    const container = document.getElementById("timeSlotsContainer");
    const groups = {
        morning: slots.filter(time => {
            const hour = parseInt(time.split(':')[0]);
            return hour < 12;
        }),
        afternoon: slots.filter(time => {
            const hour = parseInt(time.split(':')[0]);
            return hour >= 12 && hour < 17;
        }),
        evening: slots.filter(time => {
            const hour = parseInt(time.split(':')[0]);
            return hour >= 17;
        })
    };

    container.innerHTML = `
        <div class="space-y-6">
            <div class="space-y-2">
                <h3 class="text-lg font-semibold text-gray-900">
                    Available Times for ${new Date(selectedDate).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                    })}
                </h3>
            </div>

            ${Object.entries(groups).map(([period, timeSlots]) => 
                timeSlots.length ? `
                    <div class="space-y-3">
                        <h4 class="font-medium text-gray-900 capitalize">${period}</h4>
                        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            ${timeSlots.map(time => `
                                <button 
                                    onclick="selectTimeSlot('${time}')"
                                    class="py-3 px-4 border rounded-lg hover:border-black hover:bg-gray-50 transition-all text-center">
                                    <span class="text-sm font-medium">${formatTime(time)}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''
            ).join('')}
        </div>
    `;
}

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
}

function selectTimeSlot(time) {
    selectedDateTime = time;
    
    // Store the current selection in cart
    const cartItem = {
        service: selectedService,
        staff: selectedStaff,
        date: selectedDate,
        time: time
    };
    
    const cart = getCartItems();
    addToCart(cartItem);
    
    showAuthenticationOrContinue();
}

function showError(message) {
    const container = document.getElementById("mindbody-booking-widget");
    
    container.innerHTML = `
        <div class="text-center py-8">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="text-gray-500">${message}</div>
            <button 
                onclick="initializeBookingWidget()"
                class="mt-6 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
                Try Again
            </button>
        </div>
    `;
}

// Helper function to check authentication status and redirect accordingly
async function showAuthenticationOrContinue() {
    // Check WordPress auth status first
    const isAuthed = await checkExistingAuth();
    
    if (isAuthed) {
        goToCheckout();
    } else {
        showAuthenticationForm();
    }
}


// Step 3: Account Options – Either log in or continue as guest with minimal info
function showAuthenticationForm() {
    const container = document.getElementById("mindbody-booking-widget");
    container.innerHTML = `
        <div class="max-w-2xl mx-auto">
            ${renderProgressHeader(3)}

            <!-- Back Button -->
            <button 
                onclick="fetchAvailableDates()"
                class="flex items-center text-sm text-gray-600 hover:text-black transition-colors mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Back to Date & Time
            </button>

            <div class="mb-8">
                <h2 class="text-2xl font-medium mb-2">Sign In to Complete Booking</h2>
                <p class="text-gray-500">Please sign in or create an account to confirm your appointment</p>
            </div>

            <div id="authTabs" class="flex space-x-4 mb-6">
                <button 
                    id="loginTab" 
                    class="px-6 py-2 bg-black text-white rounded-lg transition-colors" 
                    onclick="showLoginForm()"
                >
                    Login
                </button>
                <button 
                    id="registerTab" 
                    class="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" 
                    onclick="showRegisterForm()"
                >
                    Register
                </button>
            </div>
            <div id="authFormContainer"></div>
        </div>
    `;
    // Default tab: Login
    showLoginForm();
}

function showLoginForm() {
    const formContainer = document.getElementById("authFormContainer");
    formContainer.innerHTML = `
        <form id="loginForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" required class="mt-1 block w-full border rounded-md p-2" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" name="password" required class="mt-1 block w-full border rounded-md p-2" />
            </div>
            <button type="submit" class="px-4 py-2 bg-black text-white rounded">Login</button>
        </form>
    `;
    document.getElementById("loginForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        try {
            const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_wp_client_login", {
                method: "POST",
                body: formData,
                credentials: 'same-origin'
            });
            
            const data = await response.json();
            
            if (data.success) {
                isAuthenticated = true;
                window.clientInfo = data.data.client;
                localStorage.setItem('mindbody_auth', 'true');
                localStorage.setItem('mindbody_client_info', JSON.stringify(data.data.client));
                goToCheckout();
            } else {
                alert(data.data.message || "Login failed. Please check your credentials.");
            }
        } catch (err) {
            console.error('Login error:', err);
            alert("An error occurred during login. Please try again.");
        }
    });
}

function showRegisterForm() {
    const formContainer = document.getElementById("authFormContainer");
    formContainer.innerHTML = `
        <form id="registerForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">First Name</label>
                <input type="text" name="firstName" required class="mt-1 block w-full border rounded-md p-2" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Last Name</label>
                <input type="text" name="lastName" required class="mt-1 block w-full border rounded-md p-2" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" required class="mt-1 block w-full border rounded-md p-2" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" name="password" required class="mt-1 block w-full border rounded-md p-2" />
            </div>
            <button type="submit" class="px-4 py-2 bg-black text-white rounded">Register</button>
        </form>
    `;
    document.getElementById("registerForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch(mindbody_booking.ajax_url + "?action=mindbody_wp_client_register", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Registration successful!");
                // After registration, look up the Mindbody client record by email.
                const email = this.email.value;
                fetch(mindbody_booking.ajax_url + "?action=mindbody_get_client_by_email&email=" + encodeURIComponent(email))
                    .then(res => res.json())
                    .then(lookup => {
                        if(lookup.success) {
                            window.clientInfo = lookup.data[0];
                        } else {
                            window.clientInfo = null;
                        }
                        goToCheckout(); // Proceed to checkout
                    });
            } else {
                alert(data.data.message || "Registration failed.");
            }
        })
        .catch(err => {
            console.error(err);
            alert("An error occurred during registration.");
        });
    });
}

async function fetchSavedPaymentMethods() {
    try {
        const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_get_saved_payment_methods", {
            credentials: 'same-origin'
        });
        const data = await response.json();
        if (data.success && data.data.length > 0) {
            return data.data; // an array of saved payment method objects
        }
        return [];
    } catch (err) {
        console.error("Error fetching saved payment methods:", err);
        return [];
    }
}

// Get current cart items
function getCartItems() {
    const cartData = localStorage.getItem('mindbody_cart');
    if (cartData) {
        try {
            const cart = JSON.parse(cartData);
            // Make sure cart has items array
            if (!cart.items) {
                cart.items = [{
                    service: cart.service,
                    staff: cart.staff,
                    date: cart.date,
                    time: cart.time
                }];
            }
            return cart;
        } catch (e) {
            console.error("Error parsing cart data", e);
        }
    }
    
    // Return empty cart if no data found
    return { 
        items: [],
        cartId: null
    };
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('mindbody_cart', JSON.stringify(cart));
}

// Add item to cart
function addToCart(item) {
    const cart = getCartItems();
    
    // Check if item already exists (by service id)
    const existingItemIndex = cart.items.findIndex(i => 
        i.service && item.service && i.service.Id === item.service.Id
    );
    
    if (existingItemIndex >= 0) {
        // Replace existing item
        cart.items[existingItemIndex] = item;
    } else {
        // Add new item
        cart.items.push(item);
    }
    
    saveCart(cart);
    return cart;
}

// Remove item from cart
function removeFromCart(serviceId) {
    const cart = getCartItems();
    
    // Filter out the item to remove
    cart.items = cart.items.filter(item => 
        !item.service || item.service.Id !== serviceId
    );
    
    saveCart(cart);
    
    // If cart is now empty, redirect to service selection
    if (cart.items.length === 0) {
        fetchBookableItems();
    } else {
        // Otherwise refresh the checkout
        goToCheckout();
    }
    
    return cart;
}

// Continue shopping - save current cart and go back to service selection
function continueShopping() {
    // Cart is already saved in localStorage
    fetchBookableItems();
}

// Format phone number as user types
function formatPhoneNumber(input) {
    // Store current cursor position
    const cursorPos = input.selectionStart;
    const oldLength = input.value.length;
    
    // Get input value and remove non-numeric characters
    let value = input.value.replace(/\D/g, '');
    
    // Format the phone number as (XXX) XXX-XXXX
    if (value.length > 0) {
        if (value.length <= 3) {
            value = `(${value}`;
        } else if (value.length <= 6) {
            value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else {
            value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
        }
    }
    
    // Only update if the value has changed
    if (input.value !== value) {
        // Update input value
        input.value = value;
        
        // Adjust cursor position based on added formatting characters
        const newLength = input.value.length;
        const lengthDiff = newLength - oldLength;
        input.setSelectionRange(cursorPos + lengthDiff, cursorPos + lengthDiff);
    }
}

// Format credit card number with spaces and detect card type
function formatCreditCard(input) {
    // Store current cursor position
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    
    // Remove non-numeric characters
    let value = input.value.replace(/\D/g, '');
    
    // Add spaces every 4 digits
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    // Only update if the value has changed
    if (oldValue !== formattedValue) {
        // Count how many extra chars were added before cursor
        let extraChars = 0;
        for (let i = 0; i < Math.min(cursorPos, formattedValue.length); i++) {
            if (formattedValue[i] === ' ' && (i >= oldValue.length || oldValue[i] !== ' ')) {
                extraChars++;
            }
        }
        
        // Update input value
        input.value = formattedValue;
        
        // Restore cursor position accounting for added spaces
        const newCursorPos = cursorPos + extraChars;
        input.setSelectionRange(newCursorPos, newCursorPos);
    }
    
    // Detect card type based on first digits
    const cardType = detectCardType(value);
    
    // Get the card number input element and update its classes
    if (cardType) {
        // Display card icon if desired
        const cardIconElement = document.getElementById('cardTypeIcon');
        if (cardIconElement) {
            cardIconElement.className = `card-icon ${cardType.toLowerCase()}`;
            cardIconElement.style.display = 'block';
        }
    }
}

// Detect credit card type based on first digits
function detectCardType(number) {
    const firstDigit = number.charAt(0);
    const firstTwoDigits = number.substr(0, 2);
    const firstFourDigits = number.substr(0, 4);
    
    if (firstDigit === '4') {
        return 'Visa';
    } else if (firstTwoDigits >= '51' && firstTwoDigits <= '55') {
        return 'Mastercard';
    } else if (firstTwoDigits === '34' || firstTwoDigits === '37') {
        return 'Amex';
    } else if (firstFourDigits === '6011' || 
               (firstTwoDigits === '65') || 
               (parseInt(firstTwoDigits) >= 64 && parseInt(firstTwoDigits) <= 65)) {
        return 'Discover';
    }
    return null;
}

// Format expiry date as MM/YY
function formatExpiryDate(input) {
    // Store current cursor position
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    
    // Remove non-numeric characters
    let value = input.value.replace(/\D/g, '');
    
    // Add slash after month (MM/YY)
    if (value.length > 2) {
        value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    
    // Only update if value changed
    if (oldValue !== value) {
        // Calculate added characters
        const addedSlash = (value.length > 2 && (oldValue.length <= 2 || oldValue[2] !== '/')) ? 1 : 0;
        
        // Update input value
        input.value = value;
        
        // Adjust cursor position if we added a slash
        const newCursorPos = cursorPos + addedSlash;
        setTimeout(() => input.setSelectionRange(newCursorPos, newCursorPos), 0);
    }
}

// Initialize input formatting
function initializeFormattingListeners() {
    // Phone number formatting
    const phoneInput = document.querySelector('input[type="tel"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Don't format if the change is due to our own formatting
            if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward') {
                formatPhoneNumber(this);
            }
        });
        // Initial formatting
        formatPhoneNumber(phoneInput);
    }
    
    // Credit card formatting
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            // Don't format if the change is due to our own formatting
            if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward') {
                formatCreditCard(this);
            }
        });
        // Initial formatting
        formatCreditCard(cardInput);
    }
    
    // Expiry date formatting
    const expiryInput = document.querySelector('input[name="expiry"]');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            // Don't format if the change is due to our own formatting
            if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward') {
                formatExpiryDate(this);
            }
        });
        // Initial formatting
        formatExpiryDate(expiryInput);
    }
}

function renderPaymentOptions(savedMethods) {
    let html = '';
    if (savedMethods.length > 0) {
        html += `<div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Saved Payment Methods</label>`;
        savedMethods.forEach((method, index) => {
            // Assume each method object contains an id and a masked card number (last4)
            html += `<div class="flex items-center mb-1">
                <input type="radio" name="paymentOption" value="${method.id}" id="saved_${index}" class="form-radio">
                <label for="saved_${index}" class="ml-2 text-sm">Card ending in ${method.last4}</label>
            </div>`;
        });
        html += `</div>
            <div class="flex items-center mb-4">
                <input type="radio" name="paymentOption" value="new" id="paymentOption_new">
                <label for="paymentOption_new" class="ml-2 text-sm">Use a new payment method</label>
            </div>`;
        // Default to "new" if desired:
        document.addEventListener("DOMContentLoaded", () => {
            document.getElementById("paymentOption_new").checked = true;
        });
    } else {
        // If no saved methods, force "new"
        html = `<input type="hidden" name="paymentOption" value="new" id="paymentOption_new">`;
    }
    return html;
}


function goToCheckout() {
    const container = document.getElementById("mindbody-booking-widget");
    const cart = getCartItems();
    
    if (cart.items.length === 0) {
        fetchBookableItems();
        return;
    }
    
    // Save existing form values if present
    const formValues = {
        firstName: document.querySelector('input[name="firstName"]')?.value || '',
        lastName: document.querySelector('input[name="lastName"]')?.value || '',
        phone: document.querySelector('input[name="phone"]')?.value || '',
        cardNumber: document.getElementById('cardNumber')?.value || '',
        expiry: document.querySelector('input[name="expiry"]')?.value || '',
        cvv: document.querySelector('input[name="cvv"]')?.value || ''
    };
    
    // Calculate cart total
    let subtotal = 0;
    let taxRate = 0.06; // 6% tax rate
    
    // Create HTML for cart items
    const cartItemsHtml = cart.items.map(item => {
        const service = item.service || {};
        const price = getServicePrice(service);
        subtotal += price;
        
        const appointmentDate = item.date ? new Date(item.date) : new Date();
        
        return `
            <div class="flex items-center justify-between py-3 border-b">
                <div class="flex-1">
                    <div class="flex items-center mb-1">
                        <h3 class="font-medium">${service.Name || 'Unknown Service'}</h3>
                        <button 
                            onclick="removeFromCart('${service.Id}')"
                            class="ml-3 text-sm text-red-500 hover:text-red-700 transition-colors flex items-center"
                        >
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                        </button>
                    </div>
                    <div class="text-sm text-gray-500">
                        ${item.staff ? `Provider: ${item.staff.Name}<br>` : ''}
                        ${item.date && item.time ? 
                            `${appointmentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTime(item.time)}` : 
                            'Time not selected'}
                    </div>
                </div>
                <span class="font-medium">$${price.toFixed(2)}</span>
            </div>
        `;
    }).join('');
    
    // Calculate tax and total
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // Get phone value if available
    let phoneValue = '';
    if (window.clientInfo && window.clientInfo.Phone) {
        phoneValue = window.clientInfo.Phone;
    } else if (window.clientInfo && window.clientInfo.phone) {
        phoneValue = window.clientInfo.phone;
    }
    
    // Also check localStorage for client info
    if (!phoneValue && localStorage.getItem('mindbody_client_info')) {
        try {
            const storedInfo = JSON.parse(localStorage.getItem('mindbody_client_info'));
            phoneValue = storedInfo.phone || storedInfo.Phone || '';
        } catch(e) {
            // Silent error
        }
    }
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto">
            ${renderProgressHeader(3)}

            <!-- Back and Continue Shopping Buttons -->
            <div class="flex justify-between items-center mb-6">
                <button 
                    onclick="fetchAvailableDates()"
                    class="flex items-center text-sm text-gray-600 hover:text-black transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                    </svg>
                    Back to Date & Time
                </button>
                <button 
                    onclick="continueShopping()"
                    class="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Continue Shopping
                </button>
            </div>

            <!-- Main Content -->
            <div class="mb-6">
                <h2 class="text-xl font-semibold mb-2">Checkout</h2>
                <p class="text-gray-500 text-sm">Confirm your appointment details and complete payment</p>
            </div>

            <!-- Cart Items Summary -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 class="text-lg font-medium mb-4">Your Appointments</h3>
                <div class="space-y-1">
                    ${cartItemsHtml}
                </div>
            </div>

            <!-- Contact Details -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h3 class="text-lg font-medium mb-4">Contact Details</h3>
                <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm text-gray-600 mb-1">First Name</label>
                            <input 
                                type="text" 
                                name="firstName"
                                value="${formValues.firstName || window.clientInfo?.first_name || window.clientInfo?.FirstName || ''}"
                                class="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all placeholder-gray-400"
                                required
                            />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-600 mb-1">Last Name</label>
                            <input 
                                type="text" 
                                name="lastName"
                                value="${window.clientInfo?.last_name || window.clientInfo?.LastName || ''}"
                                class="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all placeholder-gray-400"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Phone Number</label>
                        <div class="relative">
                            <input 
                                type="tel" 
                                name="phone"
                                class="w-full pl-10 pr-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all placeholder-gray-400"
                                placeholder="(XXX) XXX-XXXX"
                                value="${formValues.phone || phoneValue}"
                                required
                            />
                            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payment Section -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="text-lg font-medium">Payment Details</h3>
                    <button 
                        onclick="togglePromoCode()"
                        class="text-sm text-gray-500 hover:text-black transition-colors"
                    >
                        Have a promo code?
                    </button>
                </div>

                <!-- Hidden Promo Code Section -->
                <div id="promoCodeSection" class="hidden mb-5">
                    <div class="flex space-x-2">
                        <input 
                            type="text"
                            class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all"
                            placeholder="Enter code"
                        />
                        <button class="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-black transition-all duration-300">
                            Apply
                        </button>
                    </div>
                </div>

                <!-- Payment Options Container -->
                <div id="paymentOptionsContainer" class="mb-5">
                    <!-- Saved payment methods will be rendered here -->
                </div>

                <!-- New Payment Form (shown if user selects "new") -->
                <div id="newPaymentForm" class="space-y-4 mb-5">
                    <div class="relative">
                        <input 
                            type="text" 
                            id="cardNumber"
                            name="cardNumber" 
                            placeholder="Card Number" 
                            value="${formValues.cardNumber}"
                            class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            required
                        />
                        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div id="cardTypeIcon" class="absolute right-3 top-1/2 transform -translate-y-1/2 hidden">
                            <!-- Card type icon will be displayed here -->
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="relative">
                            <input 
                                type="text" 
                                name="expiry" 
                                placeholder="MM/YY"
                                value="${formValues.expiry}" 
                                class="w-full pl-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                required
                            />
                            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div class="relative">
                            <input 
                                type="text" 
                                name="cvv" 
                                placeholder="CVV"
                                value="${formValues.cvv}" 
                                class="w-full pl-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                required
                                maxlength="4"
                            />
                            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Order Total -->
                <div class="space-y-2 mb-5 text-sm">
                    <div class="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-gray-500">
                        <span>Tax (6%)</span>
                        <span>$${tax.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-base font-medium pt-2 border-t">
                        <span>Total</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>

                <button 
                    onclick="completeBooking()"
                    class="w-full py-3.5 bg-black text-white font-medium rounded-lg hover:bg-gray-900 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-black"
                >
                    Complete Booking • $${total.toFixed(2)}
                </button>
            </div>
        </div>
    `;

    // Fetch saved payment methods and render payment options
    fetchSavedPaymentMethods().then(savedMethods => {
        const container = document.getElementById("paymentOptionsContainer");
        if (container) {
            container.innerHTML = renderPaymentOptions(savedMethods);

            // Add event listeners to toggle new payment form visibility based on selection
            document.querySelectorAll('input[name="paymentOption"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === "new") {
                        document.getElementById("newPaymentForm").style.display = "block";
                    } else {
                        document.getElementById("newPaymentForm").style.display = "none";
                    }
                });
            });
        }
    });
    
    // Initialize input formatting
    setTimeout(initializeFormattingListeners, 500);
}

function togglePromoCode() {
    const promoSection = document.getElementById('promoCodeSection');
    promoSection.classList.toggle('hidden');
}

function completeBooking() {
    // Gather all form values first
    const formValues = {
        firstName: document.querySelector('input[name="firstName"]')?.value || '',
        lastName: document.querySelector('input[name="lastName"]')?.value || '',
        phone: document.querySelector('input[name="phone"]')?.value || '',
        cardNumber: document.getElementById('cardNumber')?.value || '',
        expiry: document.querySelector('input[name="expiry"]')?.value || '',
        cvv: document.querySelector('input[name="cvv"]')?.value || ''
    };
    
    // Continue with existing logic...
    const paymentOption = document.querySelector('input[name="paymentOption"]:checked')?.value || 'new';
    let paymentData = {};

    if (paymentOption === "new") {
        // Get new card details from our saved values
        const cardNumber = formValues.cardNumber.replace(/\s/g, '');
        const expiry = formValues.expiry; // Expected MM/YY
        const cvv = formValues.cvv;
        
        if (!cardNumber || !expiry || !cvv) {
            alert("Please fill in all credit card details.");
            return;
        }
        
        const [expMonth, expYear] = expiry.split('/');
        if (!expMonth || !expYear) {
            alert("Invalid expiry date format.");
            return;
        }
        
        paymentData = {
            PaymentType: "Credit Card",
            CreditCardNumber: cardNumber,
            ExpirationDate: `20${expYear}-${expMonth.padStart(2, '0')}`, // Format as YYYY-MM
            CVV: cvv
        };
    } else {
        // Use saved payment method
        paymentData = {
            PaymentType: "SavedCard",
            PaymentMethodId: paymentOption
        };
    }
    
    // Get cart items
    const cart = getCartItems();
    
    if (cart.items.length === 0) {
        alert("Your cart is empty. Please add at least one service.");
        fetchBookableItems();
        return;
    }
    
    // Use our saved form values
    if (!formValues.firstName || !formValues.lastName || !formValues.phone) {
        alert("Please fill in all contact details.");
        return;
    }
    
    // Build booking data object - handling multiple appointments
    const bookingData = {
        appointments: cart.items.map(item => ({
            serviceId: item.service.Id,
            staffId: item.staff ? item.staff.Id : null,
            date: item.date,
            time: item.time
        })),
        client: {
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            phone: formValues.phone.replace(/\D/g, ''),
            email: window.clientInfo?.email || ''
        },
        payment: paymentData
    };

    // Show loading state
    const bookButton = document.querySelector('button[onclick="completeBooking()"]');
    if (!bookButton) return;
    
    const originalText = bookButton.innerHTML;
    bookButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
    `;
    bookButton.disabled = true;

    fetch(mindbody_booking.ajax_url + "?action=mindbody_book_appointment", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear cart after successful booking
            localStorage.removeItem('mindbody_cart');
            
            // Show success message
            showBookingConfirmation(data.data);
        } else {
            // Restore button state
            bookButton.innerHTML = originalText;
            bookButton.disabled = false;
            
            // Show error message
            alert("Booking failed: " + (data.data.message || "Unknown error"));
        }
    })
    .catch(err => {
        // Restore button state
        bookButton.innerHTML = originalText;
        bookButton.disabled = false;
        
        console.error("Booking error:", err);
        alert("An error occurred during booking. Please try again.");
    });
}

function showBookingConfirmation(bookingData) {
    const container = document.getElementById("mindbody-booking-widget");
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto text-center py-8">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h2 class="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p class="text-gray-600 mb-6">Your appointment has been successfully booked.</p>
            
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 text-left">
                <h3 class="font-medium mb-4">Appointment Details</h3>
                <div class="space-y-2 text-gray-600">
                    ${bookingData.appointment ? `
                        <p><span class="font-medium">Service:</span> ${bookingData.appointment.SessionTypeName || 'Booked Service'}</p>
                        <p><span class="font-medium">Date:</span> ${new Date(bookingData.appointment.StartDateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <p><span class="font-medium">Time:</span> ${new Date(bookingData.appointment.StartDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                        <p><span class="font-medium">Location:</span> ${bookingData.appointment.Location?.Name || 'Our Location'}</p>
                    ` : ''}
                </div>
            </div>
            
            <div class="space-y-3">
                <p class="text-gray-600">You will receive a confirmation email shortly.</p>
                <button 
                    onclick="initializeBookingWidget()"
                    class="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    Book Another Appointment
                </button>
            </div>
        </div>
    `;
}