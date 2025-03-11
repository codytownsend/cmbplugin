<?php
/**
 * Confirmation template
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="mb-confirmation">
    <div class="mb-confirmation-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z"/></svg>
    </div>
    
    <h2 class="mb-confirmation-title">Booking Confirmed!</h2>
    <p class="mb-confirmation-message">Your appointment has been successfully booked.</p>
    
    <div class="mb-confirmation-details">
        <h3>Appointment Details</h3>
        <div class="mb-confirmation-items">
            <!-- Confirmation items will be added dynamically -->
        </div>
    </div>
    
    <div class="mb-confirmation-info">
        <p>You will receive a confirmation email shortly.</p>
        <p class="mb-hidden mb-confirmation-calendar-info">You can also add this appointment to your calendar.</p>
    </div>
    
    <div class="mb-confirmation-actions">
        <button class="mb-btn mb-primary-btn mb-book-another">Book Another Appointment</button>
        <button class="mb-btn mb-secondary-btn mb-add-to-calendar mb-hidden">Add to Calendar</button>
    </div>
    
    <!-- Confirmation Item Template -->
    <template id="mb-confirmation-item-template">
        <div class="mb-confirmation-item">
            <div class="mb-confirmation-item-details">
                <h4 class="mb-confirmation-item-name"></h4>
                <div class="mb-confirmation-item-meta">
                    <div class="mb-meta-row">
                        <span class="mb-meta-label">Date:</span>
                        <span class="mb-meta-value mb-confirmation-date"></span>
                    </div>
                    <div class="mb-meta-row">
                        <span class="mb-meta-label">Time:</span>
                        <span class="mb-meta-value mb-confirmation-time"></span>
                    </div>
                    <div class="mb-meta-row mb-confirmation-staff-row mb-hidden">
                        <span class="mb-meta-label">Provider:</span>
                        <span class="mb-meta-value mb-confirmation-staff"></span>
                    </div>
                    <div class="mb-meta-row mb-confirmation-location-row mb-hidden">
                        <span class="mb-meta-label">Location:</span>
                        <span class="mb-meta-value mb-confirmation-location"></span>
                    </div>
                </div>
            </div>
            <div class="mb-confirmation-item-price"></div>
        </div>
    </template>
</div>