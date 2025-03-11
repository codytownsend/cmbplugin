/**
 * Mindbody Booking Widget Debugger
 * 
 * Enhanced debugging tools for the Mindbody Booking Widget
 */

// Wait for DOM and MBBooking to be available
document.addEventListener('DOMContentLoaded', function () {
    const checkInterval = setInterval(function () {
        if (window.MBBooking) {
            clearInterval(checkInterval);
            patchBookingWidget();
        }
    }, 100);
});

function patchBookingWidget() {
    console.log('🔍 Enhanced Mindbody Booking Widget debugger initialized');

    // Store original functions
    const originalLoadBookableItems = MBBooking.loadBookableItems;
    const originalProcessBookableItems = MBBooking.processBookableItems;
    const originalShowServiceSelection = MBBooking.showServiceSelection;

    // Patch loadBookableItems to add enhanced logging
    MBBooking.loadBookableItems = function () {
        console.log('🔄 Loading bookable items...');

        // If session types exist, log them
        if (this.state.sessionTypes && this.state.sessionTypes.length) {
            console.log('📊 Session types found:', this.state.sessionTypes.length);
            console.log('📊 Session type IDs:', this.state.sessionTypes.map(type => type.Id).join(', '));
        }

        return originalLoadBookableItems.apply(this, arguments);
    };

    // Patch showServiceSelection to log rendered services
    MBBooking.showServiceSelection = function () {
        const result = originalShowServiceSelection.apply(this, arguments);
        
        // Add a delay to ensure DOM is updated
        setTimeout(() => {
            const serviceElements = document.querySelectorAll('.mb-service');
            console.log(`🎯 Service elements rendered in DOM: ${serviceElements.length}`);
            
            // Count services by category
            const categories = {};
            document.querySelectorAll('.mb-category').forEach(category => {
                const title = category.querySelector('.mb-category-title').textContent;
                const services = category.querySelectorAll('.mb-service').length;
                categories[title] = services;
            });
            console.log('📊 Services rendered by category:', categories);
        }, 1000);
        
        return result;
    };

    // Add global helper function to inspect services
    window.inspectServices = function() {
        if (!window.MBBooking || !window.MBBooking.state) {
            console.error('MBBooking state not available');
            return;
        }
        
        const services = window.MBBooking.state.services;
        const serviceCount = Object.keys(services).length;
        
        console.log(`🔍 Total services in state: ${serviceCount}`);
        
        // List all services
        console.table(Object.values(services).map(s => ({
            id: s.id,
            name: s.name,
            price: s.price,
            duration: s.duration,
            staffCount: Object.keys(s.staff).length,
            hasAvailability: s.availableTimes.length > 0
        })));
        
        console.log('💡 To see complete service details, use: console.log(MBBooking.state.services)');
    };
    
    // Log initialization completed and help message
    console.log('✅ Debugger attached to MBBooking widget');
    console.log('💡 Helper function available: inspectServices() - Call this in console to see service details');
}