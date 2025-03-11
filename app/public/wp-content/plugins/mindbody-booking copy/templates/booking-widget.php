<?php
/**
 * Main booking widget template
 * 
 * @var array $atts Shortcode attributes
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div id="mb-booking-widget" class="mb-booking-widget" 
    data-categories="<?php echo esc_attr($atts['categories']); ?>"
    data-show-filters="<?php echo esc_attr($atts['show_filters']); ?>"
    data-default-view="<?php echo esc_attr($atts['default_view']); ?>"
    data-staff-id="<?php echo esc_attr($atts['staff_id']); ?>"
    data-location-id="<?php echo esc_attr($atts['location_id']); ?>">
    
    <!-- Widget Header -->
    <div class="mb-header">
        <div class="mb-progress-steps">
            <div class="mb-step" data-step="1">
                <div class="mb-step-indicator mb-step-active"></div>
                <div class="mb-step-label">Select Service</div>
            </div>
            <div class="mb-step" data-step="2">
                <div class="mb-step-indicator"></div>
                <div class="mb-step-label">Choose Date & Time</div>
            </div>
            <div class="mb-step" data-step="3">
                <div class="mb-step-indicator"></div>
                <div class="mb-step-label">Complete Booking</div>
            </div>
        </div>
    </div>
    
    <!-- Widget Content - Will be populated by JavaScript -->
    <div class="mb-content">
        <div class="mb-loading">
            <div class="mb-spinner"></div>
            <div class="mb-loading-text">Loading services...</div>
        </div>
    </div>
    
    <!-- Service Selection Template -->
    <template id="mb-service-selection-template">
        <?php include MB_BOOKING_PLUGIN_DIR . 'templates/service-selection.php'; ?>
    </template>
    
    <!-- Date Selection Template -->
    <template id="mb-date-selection-template">
        <?php include MB_BOOKING_PLUGIN_DIR . 'templates/date-selection.php'; ?>
    </template>
    
    <!-- Checkout Template -->
    <template id="mb-checkout-template">
        <?php include MB_BOOKING_PLUGIN_DIR . 'templates/checkout.php'; ?>
    </template>
    
    <!-- Authentication Template -->
    <template id="mb-auth-template">
        <?php include MB_BOOKING_PLUGIN_DIR . 'templates/auth-form.php'; ?>
    </template>
    
    <!-- Confirmation Template -->
    <template id="mb-confirmation-template">
        <?php include MB_BOOKING_PLUGIN_DIR . 'templates/confirmation.php'; ?>
    </template>
</div>