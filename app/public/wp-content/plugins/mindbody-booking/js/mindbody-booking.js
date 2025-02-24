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
    try {
        const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_verify_availability", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                serviceId: cart.service.Id,
                staffId: cart.staff?.Id,
                date: cart.date,
                time: cart.time
            })
        });
        
        const data = await response.json();
        return data.success;
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
    if (window.saleServices && window.saleServices.length > 0) {
        // Attempt to match by session type id or by name (you may adjust this logic)
        // For example, if the sale service record has a ProgramId that equals the session type ID:
        const matchById = window.saleServices.find(item => item.ProgramId == selectedService.Id);
        if (matchById && typeof matchById.Price !== 'undefined' && matchById.Price !== null && matchById.Price > 0) {
            return matchById.Price;
        }
        // Alternatively, try matching by name (case-insensitive)
        const matchByName = window.saleServices.find(item =>
            item.Name.toLowerCase().includes(selectedService.Name.toLowerCase())
        );
        if (matchByName && typeof matchByName.Price !== 'undefined' && matchByName.Price !== null && matchByName.Price > 0) {
            return matchByName.Price;
        }
    }
    return 304; // Fallback price if no match is found
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
                                        <p class="text-sm text-gray-500">Price: $${price}</p>
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
    const appointmentDate = new Date(selectedDate);
    const price = selectedService.Price || 95;
    const tax = price * 0.06;
    const total = price + tax;

    let phoneValue = '';
    if (window.clientInfo && window.clientInfo.Phone) {
        phoneValue = window.clientInfo.Phone;
    } else if (window.clientInfo && window.clientInfo.phone) {
        phoneValue = window.clientInfo.phone;
    }
    
    // Also check if localStorage holds client info from verify_auth.
    if (!phoneValue && localStorage.getItem('mindbody_client_info')) {
        try {
            const storedInfo = JSON.parse(localStorage.getItem('mindbody_client_info'));
            phoneValue = storedInfo.phone || storedInfo.Phone || '';
        } catch(e) {
        }
    }
    
    if (isAuthenticated) {
        // Store cart info for later use
        const cartInfo = {
            service: selectedService,
            staff: selectedStaff,
            date: selectedDate,
            time: selectedDateTime,
            cartId: cartId
        };
        localStorage.setItem('mindbody_cart', JSON.stringify(cartInfo));
    }
    
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

            <!-- Main Content -->
            <div class="mb-6">
                <p class="text-gray-500 text-sm">Confirm your appointment details and complete payment</p>
            </div>

            <!-- Compact Order Summary -->
            <div class="bg-gray-50 rounded-xl p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="flex items-center mb-1">
                            <h3 class="font-medium">${selectedService.Name}</h3>
                            <button 
                                onclick="fetchBookableItems()"
                                class="ml-3 text-sm text-gray-500 hover:text-black transition-colors flex items-center"
                            >
                                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                            </button>
                        </div>
                        <div class="text-sm text-gray-500">
                            ${appointmentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTime(selectedDateTime)}
                        </div>
                    </div>
                    <span class="font-medium">$${price.toFixed(2)}</span>
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
                                value="${window.clientInfo?.first_name || window.clientInfo?.FirstName || ''}"
                                class="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all placeholder-gray-400"
                                required
                            />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-600 mb-1">Last Name</label>
                            <input 
                                type="text" 
                                value="${window.clientInfo?.last_name || window.clientInfo?.LastName || ''}"
                                class="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all placeholder-gray-400"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Phone Number</label>
                        <input 
                            type="tel" 
                            class="w-full px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20 focus:border-black transition-all placeholder-gray-400"
                            placeholder="Required for appointment reminders"
                            value="${phoneValue}"
                            required
                        />
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
                    <input 
                        type="text" 
                        name="cardNumber" 
                        placeholder="Card Number" 
                        class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                    />
                    <div class="grid grid-cols-2 gap-3">
                        <input 
                            type="text" 
                            name="expiry" 
                            placeholder="MM/YY" 
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            required
                        />
                        <input 
                            type="text" 
                            name="cvv" 
                            placeholder="CVV" 
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            required
                        />
                    </div>
                </div>

                <!-- Order Total (same as before) -->
                <div class="space-y-2 mb-5 text-sm">
                    <div class="flex justify-between text-gray-500">
                        <span>Service Fee</span>
                        <span>$${price.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-gray-500">
                        <span>Tax</span>
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
    });
}

function togglePromoCode() {
    const promoSection = document.getElementById('promoCodeSection');
    promoSection.classList.toggle('hidden');
}

async function completeBooking() {
    const paymentOption = document.querySelector('input[name="paymentOption"]:checked').value;
    let paymentData = {};

    if (paymentOption === "new") {
        // Get new card details
        const cardNumber = document.querySelector('input[name="cardNumber"]').value;
        const expiry = document.querySelector('input[name="expiry"]').value; // Expected MM/YY
        const cvv = document.querySelector('input[name="cvv"]').value;
        
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
    
    // Build booking data object
    const bookingData = {
        serviceId: selectedService.Id,
        staffId: selectedStaff ? selectedStaff.Id : null,
        date: selectedDate,
        time: selectedDateTime,
        client: {
            firstName: document.querySelector('input[name="firstName"]').value,
            lastName: document.querySelector('input[name="lastName"]').value,
            phone: document.querySelector('input[name="phone"]').value,
            email: window.clientInfo?.email || ''
        },
        payment: paymentData
    };

    try {
        const response = await fetch(mindbody_booking.ajax_url + "?action=mindbody_book_appointment", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        const data = await response.json();
        if (data.success) {
            alert("Booking complete!");
            // Optionally, redirect to a confirmation page.
        } else {
            alert("Booking failed: " + (data.data.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Booking error:", err);
        alert("An error occurred during booking. Please try again.");
    }
}
