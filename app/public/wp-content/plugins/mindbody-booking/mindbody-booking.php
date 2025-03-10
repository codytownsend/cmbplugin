<?php
/**
 * Plugin Name: Mindbody Booking App
 * Plugin URI:  https://thetoxtechnique.com
 * Description: A custom WordPress booking tool using the Mindbody API.
 * Version:     1.0.0
 * Author:      Your Name
 * Author URI:  https://example.com
 * License:     GPL-2.0+
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('MINDBODY_BOOKING_VERSION', '1.0.0');
define('MINDBODY_BOOKING_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MINDBODY_BOOKING_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once MINDBODY_BOOKING_PLUGIN_DIR . 'auth.php';
require_once MINDBODY_BOOKING_PLUGIN_DIR . 'admin-settings.php';
require_once MINDBODY_BOOKING_PLUGIN_DIR . 'includes/api-functions.php';
require_once MINDBODY_BOOKING_PLUGIN_DIR . 'includes/booking-functions.php';
require_once MINDBODY_BOOKING_PLUGIN_DIR . 'includes/shortcodes.php';

// Fetch API credentials
function mindbody_get_api_credentials() {
    return [
        'username' => get_option('mindbody_staff_username', ''),
        'password' => get_option('mindbody_staff_password', ''),
        'api_key'  => get_option('mindbody_api_key', ''),
        'site_id'  => get_option('mindbody_site_id', '')
    ];
}

// Activation hook
register_activation_hook(__FILE__, 'mindbody_booking_activate');

function mindbody_booking_activate() {
    // Create any necessary database tables or settings
    add_option('mindbody_booking_version', MINDBODY_BOOKING_VERSION);
    
    // Add default options if they don't exist
    if (!get_option('mindbody_api_key')) {
        add_option('mindbody_api_key', '');
    }
    
    if (!get_option('mindbody_site_id')) {
        add_option('mindbody_site_id', '');
    }
    
    if (!get_option('mindbody_staff_username')) {
        add_option('mindbody_staff_username', '');
    }
    
    if (!get_option('mindbody_staff_password')) {
        add_option('mindbody_staff_password', '');
    }
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'mindbody_booking_deactivate');

function mindbody_booking_deactivate() {
    // Cleanup tasks (if any)
}

// Enqueue scripts and styles
function mindbody_booking_enqueue_scripts() {
    // Version for cache busting
    $version = defined('WP_DEBUG') && WP_DEBUG ? time() : MINDBODY_BOOKING_VERSION;
    
    // Tailwind CSS
    wp_enqueue_style('mindbody-tailwind', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css', [], $version);
    
    // Custom CSS
    wp_enqueue_style('mindbody-booking-css', MINDBODY_BOOKING_PLUGIN_URL . 'assets/css/mindbody-booking.css', ['mindbody-tailwind'], $version);
    
    // JavaScript
    wp_enqueue_script('mindbody-booking-js', MINDBODY_BOOKING_PLUGIN_URL . 'assets/js/mindbody-booking.js', ['jquery'], $version, true);
    
    // Localize script with necessary data
    wp_localize_script('mindbody-booking-js', 'mindbody_booking', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'plugin_url' => MINDBODY_BOOKING_PLUGIN_URL,
        'nonce' => wp_create_nonce('mindbody_booking_nonce'),
        'debug' => defined('WP_DEBUG') && WP_DEBUG,
        'version' => $version
    ]);
}
add_action('wp_enqueue_scripts', 'mindbody_booking_enqueue_scripts');

// Admin menu and settings
function mindbody_booking_admin_menu() {
    add_menu_page(
        'Mindbody Booking', 
        'Mindbody Booking', 
        'manage_options', 
        'mindbody-booking', 
        'mindbody_booking_settings_page', 
        'dashicons-calendar-alt'
    );
}
add_action('admin_menu', 'mindbody_booking_admin_menu');

// Check connection status
function mindbody_check_connection_status() {
    $credentials = mindbody_get_api_credentials();
    
    if (empty($credentials['api_key']) || empty($credentials['site_id'])) {
        return false;
    }
    
    // Basic check to see if we have token-generating capability
    $token = mindbody_get_staff_token();
    return !empty($token);
}

// Basic test function for debugging
function mindbody_test_api() {
    $credentials = mindbody_get_api_credentials();
    $url = "https://api.mindbodyonline.com/public/v6/site/sites";
    
    $args = [
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => $credentials['api_key'],
            'SiteId' => $credentials['site_id']
        ],
        'timeout' => 15
    ];
    
    $response = wp_remote_get($url, $args);
    
    if (is_wp_error($response)) {
        return [
            'success' => false,
            'message' => $response->get_error_message()
        ];
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    $http_code = wp_remote_retrieve_response_code($response);
    
    if ($http_code == 200 && isset($body['Sites'])) {
        return [
            'success' => true,
            'message' => 'API connection successful!',
            'data' => $body
        ];
    } else {
        return [
            'success' => false,
            'message' => 'API connection failed! Status: ' . $http_code,
            'data' => $body
        ];
    }
}