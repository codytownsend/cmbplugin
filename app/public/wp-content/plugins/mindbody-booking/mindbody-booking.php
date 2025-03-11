<?php
/**
 * Plugin Name: Mindbody Booking System
 * Plugin URI:  https://thetoxtechnique.com
 * Description: A custom booking plugin for Mindbody services
 * Version:     1.0.0
 * Author:      DOE
 * License:     GPL-2.0+
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('MB_BOOKING_VERSION', '1.0.0');
define('MB_BOOKING_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MB_BOOKING_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MB_BOOKING_ASSETS_URL', MB_BOOKING_PLUGIN_URL . 'assets/');

// Include core files
require_once MB_BOOKING_PLUGIN_DIR . 'includes/helpers.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/shortcodes.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/ajax-handlers.php';

// Include API classes
require_once MB_BOOKING_PLUGIN_DIR . 'includes/api/api-client.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/api/auth.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/api/services.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/api/availability.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/api/booking.php';
require_once MB_BOOKING_PLUGIN_DIR . 'includes/api/client.php';

// Admin settings
if (is_admin()) {
    require_once MB_BOOKING_PLUGIN_DIR . 'admin/admin-settings.php';
}

/**
 * Main plugin class
 */
class Mindbody_Booking {
    /**
     * Instance of this class
     */
    private static $instance = null;

    /**
     * Return an instance of this class
     */
    public static function get_instance() {
        if (null == self::$instance) {
            self::$instance = new self;
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        // Initialize plugin
        add_action('init', array($this, 'init'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Register activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain for internationalization
        load_plugin_textdomain('mindbody-booking', false, dirname(plugin_basename(__FILE__)) . '/languages/');
        
        // Register shortcodes
        MB_Booking_Shortcodes::register_shortcodes();
    }

    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts() {
        // Only enqueue on pages with our shortcode
        global $post;
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'mindbody_booking')) {
            // Enqueue Tailwind CSS
            wp_enqueue_style('tailwindcss', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css', array(), MB_BOOKING_VERSION);
            
            // Main plugin styles
            wp_enqueue_style('mindbody-booking-style', MB_BOOKING_ASSETS_URL . 'css/mindbody-booking.css', array('tailwindcss'), MB_BOOKING_VERSION);
            
            // Plugin scripts
            wp_enqueue_script('mindbody-booking-utils', MB_BOOKING_ASSETS_URL . 'js/utils.js', array(), MB_BOOKING_VERSION, true);
            wp_enqueue_script('mindbody-booking-service', MB_BOOKING_ASSETS_URL . 'js/service-selection.js', array('mindbody-booking-utils'), MB_BOOKING_VERSION, true);
            wp_enqueue_script('mindbody-booking-date', MB_BOOKING_ASSETS_URL . 'js/date-selection.js', array('mindbody-booking-utils'), MB_BOOKING_VERSION, true);
            wp_enqueue_script('mindbody-booking-time', MB_BOOKING_ASSETS_URL . 'js/time-selection.js', array('mindbody-booking-utils'), MB_BOOKING_VERSION, true);
            wp_enqueue_script('mindbody-booking-checkout', MB_BOOKING_ASSETS_URL . 'js/checkout.js', array('mindbody-booking-utils'), MB_BOOKING_VERSION, true);
            wp_enqueue_script('mindbody-booking-widget', MB_BOOKING_ASSETS_URL . 'js/booking-widget.js', array('mindbody-booking-utils', 'mindbody-booking-service', 'mindbody-booking-date', 'mindbody-booking-time', 'mindbody-booking-checkout'), MB_BOOKING_VERSION, true);
            
            // Localize script with AJAX URL and nonce
            wp_localize_script('mindbody-booking-widget', 'mb_booking_data', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('mb_booking_nonce'),
                'plugin_url' => MB_BOOKING_PLUGIN_URL,
                'debug' => defined('WP_DEBUG') && WP_DEBUG,
                'version' => MB_BOOKING_VERSION
            ));
        }
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Create default options
        add_option('mindbody_api_key', '');
        add_option('mindbody_site_id', '');
        add_option('mindbody_staff_username', '');
        add_option('mindbody_staff_password', '');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Initialize the plugin
Mindbody_Booking::get_instance();