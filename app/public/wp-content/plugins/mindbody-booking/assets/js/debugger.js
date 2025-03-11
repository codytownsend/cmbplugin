/**
 * Mindbody Booking Widget Debugger
 * 
 * Logs the first get_bookable_items API response for debugging.
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
    console.log('🔍 Debugging MBBooking widget...');

    // Store original loadBookableItems function
    const originalLoadBookableItems = MBBooking.loadBookableItems;

    // Track if we've logged the first API call
    let firstCallLogged = false;

    // Patch loadBookableItems to log only the first response
    MBBooking.loadBookableItems = function () {
        console.log('🔄 Loading bookable items...');

        // If session types exist, log them
        if (this.state.sessionTypes && this.state.sessionTypes.length) {
            console.log('📊 Session type IDs:', this.state.sessionTypes.map(type => type.Id).join(', '));
        }

        const result = originalLoadBookableItems.apply(this, arguments);

        // Log only the first API response
        if (!firstCallLogged) {
            setTimeout(() => {
                console.log('📊 First get_bookable_items API Response:', this.state.bookableItems || '❌ No response received');
                firstCallLogged = true; // Prevent further logs
            }, 1500); // Delay to ensure API response is captured
        }

        return result;
    };

    console.log('✅ MBBooking debugger initialized: Logging first bookable items API response');
}
