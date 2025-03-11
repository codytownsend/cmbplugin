<?php
/**
 * Date selection template
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="mb-date-selection">
    <!-- Back button -->
    <button class="mb-back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z"/></svg>
        Back to Services
    </button>

    <!-- Selected service summary -->
    <div class="mb-service-summary">
        <h3>Selected Service</h3>
        <div class="mb-summary-details">
            <div class="mb-summary-service">
                <span class="mb-label">Service:</span>
                <span class="mb-value mb-service-name"></span>
            </div>
            <div class="mb-summary-duration">
                <span class="mb-label">Duration:</span>
                <span class="mb-value mb-service-duration"></span>
            </div>
            <div class="mb-summary-price">
                <span class="mb-label">Price:</span>
                <span class="mb-value mb-service-price"></span>
            </div>
            <div class="mb-summary-staff mb-hidden">
                <span class="mb-label">Provider:</span>
                <span class="mb-value mb-staff-name"></span>
            </div>
        </div>
    </div>

    <!-- Calendar and time selection -->
    <div class="mb-date-time-selection">
        <div class="mb-calendar-container">
            <div class="mb-calendar-header">
                <h3>Select Date</h3>
                <div class="mb-calendar-nav">
                    <button class="mb-prev-month">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M10.828 12l4.95 4.95-1.414 1.414L8 12l6.364-6.364 1.414 1.414z"/></svg>
                    </button>
                    <div class="mb-current-month"></div>
                    <button class="mb-next-month">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"/></svg>
                    </button>
                </div>
            </div>
            
            <div class="mb-calendar">
                <div class="mb-calendar-days">
                    <div class="mb-day-name">Sun</div>
                    <div class="mb-day-name">Mon</div>
                    <div class="mb-day-name">Tue</div>
                    <div class="mb-day-name">Wed</div>
                    <div class="mb-day-name">Thu</div>
                    <div class="mb-day-name">Fri</div>
                    <div class="mb-day-name">Sat</div>
                </div>
                <div class="mb-calendar-dates">
                    <!-- Calendar dates will be added dynamically -->
                </div>
            </div>
        </div>

        <!-- Time slots -->
        <div class="mb-time-slots-container mb-hidden">
            <h3>Select Time</h3>
            <div class="mb-selected-date"></div>
            <div class="mb-time-slots">
                <!-- Time slots will be populated dynamically -->
            </div>
        </div>
    </div>

    <!-- Time slot group template -->
    <template id="mb-time-slot-group-template">
        <div class="mb-time-slot-group">
            <h4 class="mb-time-group-title"></h4>
            <div class="mb-time-slot-buttons">
                <!-- Time slot buttons will be added dynamically -->
            </div>
        </div>
    </template>

    <!-- Time slot button template -->
    <template id="mb-time-slot-button-template">
        <button class="mb-time-slot-btn"></button>
    </template>

    <!-- No time slots template -->
    <template id="mb-no-time-slots-template">
        <div class="mb-no-time-slots">
            <p>No available time slots for this date. Please select another date.</p>
        </div>
    </template>

    <!-- Calendar date template -->
    <template id="mb-calendar-date-template">
        <div class="mb-calendar-date">
            <span class="mb-date-number"></span>
        </div>
    </template>

    <!-- Continue button (only shown when a time slot is selected) -->
    <div class="mb-continue-container mb-hidden">
        <button class="mb-continue-btn">Continue to Checkout</button>
    </div>
</div>