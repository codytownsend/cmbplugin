<?php
/**
 * Shortcode definitions
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register shortcodes
 */
function mindbody_register_shortcodes() {
    add_shortcode('mindbody_booking', 'mindbody_booking_shortcode');
}
add_action('init', 'mindbody_register_shortcodes');

/**
 * Shortcode for the booking widget
 */
function mindbody_booking_shortcode($atts = [], $content = null) {
    // Parse shortcode attributes
    $atts = shortcode_atts([
        'title' => 'Book an Appointment',
        'default_view' => 'services', // 'services', 'staff', 'calendar'
        'show_prices' => 'yes',
        'location_id' => '-99' // Default location ID
    ], $atts);
    
    // Set up any necessary data
    wp_enqueue_script('mindbody-booking-js');
    wp_enqueue_style('mindbody-booking-css');
    
    // Pass shortcode attributes to JavaScript
    wp_localize_script('mindbody-booking-js', 'mindbody_booking_shortcode', $atts);
    
    // Return the booking widget HTML
    return mindbody_render_booking_form($atts);
}

/**
 * Shortcode for displaying a specific service booking
 */
function mindbody_service_booking_shortcode($atts = [], $content = null) {
    // Parse shortcode attributes
    $atts = shortcode_atts([
        'service_id' => '', // Required
        'service_name' => '',
        'staff_id' => '', // Optional, to pre-select a staff member
        'title' => 'Book an Appointment',
        'show_prices' => 'yes',
        'location_id' => '-99' // Default location ID
    ], $atts);
    
    // Require service_id
    if (empty($atts['service_id'])) {
        return '<div class="error">Service ID is required for this shortcode.</div>';
    }
    
    // Set up any necessary data
    wp_enqueue_script('mindbody-booking-js');
    wp_enqueue_style('mindbody-booking-css');
    
    // Pass shortcode attributes to JavaScript
    wp_localize_script('mindbody-booking-js', 'mindbody_service_booking', $atts);
    
    // Return the booking widget HTML with data attributes
    return '<div id="mindbody-booking-widget" 
                class="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl border"
                data-service-id="' . esc_attr($atts['service_id']) . '"
                data-staff-id="' . esc_attr($atts['staff_id']) . '"
                data-view="service">
            </div>';
}
add_shortcode('mindbody_service_booking', 'mindbody_service_booking_shortcode');