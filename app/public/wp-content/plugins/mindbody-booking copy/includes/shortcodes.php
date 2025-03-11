<?php
/**
 * Shortcodes
 * 
 * Defines shortcodes for the booking widget
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_Booking_Shortcodes {
    /**
     * Register shortcodes
     */
    public static function register_shortcodes() {
        add_shortcode('mindbody_booking', array('MB_Booking_Shortcodes', 'booking_widget_shortcode'));
    }
    
    /**
     * Booking widget shortcode
     * 
     * @param array $atts Shortcode attributes
     * @return string Shortcode output
     */
    public static function booking_widget_shortcode($atts) {
        // Parse attributes
        $atts = shortcode_atts(array(
            'categories' => '', // Comma-separated list of categories to show
            'show_filters' => 'true', // Whether to show filtering options
            'default_view' => 'services', // Default view: services, calendar, staff
            'staff_id' => '', // Optionally restrict to a specific staff ID
            'location_id' => '' // Optionally restrict to a specific location ID
        ), $atts, 'mindbody_booking');
        
        // Convert string boolean to actual boolean
        $show_filters = filter_var($atts['show_filters'], FILTER_VALIDATE_BOOLEAN);
        
        // Start output buffering
        ob_start();
        
        // Include the main template
        include MB_BOOKING_PLUGIN_DIR . 'templates/booking-widget.php';
        
        // Return the buffered content
        return ob_get_clean();
    }
}