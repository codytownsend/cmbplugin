<?php
/**
 * Admin Settings
 * 
 * Handles the admin settings page for the plugin
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_Admin_Settings {
    /**
     * Constructor
     */
    public function __construct() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // Add AJAX handler for testing API connection
        add_action('wp_ajax_mb_test_api_connection', array($this, 'test_api_connection'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            'Mindbody Booking Settings',
            'Mindbody Booking',
            'manage_options',
            'mindbody-booking',
            array($this, 'render_settings_page'),
            'dashicons-calendar-alt',
            30
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        // General settings
        register_setting('mb_booking_settings', 'mindbody_api_key');
        register_setting('mb_booking_settings', 'mindbody_site_id');
        register_setting('mb_booking_settings', 'mindbody_staff_username');
        register_setting('mb_booking_settings', 'mindbody_staff_password');
        
        // Add settings sections
        add_settings_section(
            'mb_booking_api_settings',
            'API Settings',
            array($this, 'render_api_settings_section'),
            'mb_booking_settings'
        );
        
        // Add settings fields
        add_settings_field(
            'mindbody_api_key',
            'API Key',
            array($this, 'render_api_key_field'),
            'mb_booking_settings',
            'mb_booking_api_settings'
        );
        
        add_settings_field(
            'mindbody_site_id',
            'Site ID',
            array($this, 'render_site_id_field'),
            'mb_booking_settings',
            'mb_booking_api_settings'
        );
        
        add_settings_field(
            'mindbody_staff_username',
            'Staff Username',
            array($this, 'render_staff_username_field'),
            'mb_booking_settings',
            'mb_booking_api_settings'
        );
        
        add_settings_field(
            'mindbody_staff_password',
            'Staff Password',
            array($this, 'render_staff_password_field'),
            'mb_booking_settings',
            'mb_booking_api_settings'
        );
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Mindbody Booking Settings</h1>
            
            <?php
            // Display API test results if present
            if ($api_test_result = get_transient('mb_api_test_result')) {
                $result_class = strpos($api_test_result, 'success') !== false ? 'updated' : 'error';
                echo '<div class="' . esc_attr($result_class) . '"><p>' . esc_html($api_test_result) . '</p></div>';
                delete_transient('mb_api_test_result');
            }
            ?>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('mb_booking_settings');
                do_settings_sections('mb_booking_settings');
                submit_button();
                ?>
            </form>
            
            <h2>Test API Connection</h2>
            <p>Click the button below to test the Mindbody API connection with your credentials.</p>
            <button id="mb-test-api" class="button button-primary">Test API Connection</button>
            <div id="mb-test-api-result" style="margin-top: 10px;"></div>
            
            <h2>Shortcode Usage</h2>
            <p>Use the following shortcode to display the booking widget on your site:</p>
            <code>[mindbody_booking]</code>
            
            <p>You can customize the widget with these attributes:</p>
            <ul>
                <li><code>categories</code> - Comma-separated list of service categories to show (e.g. "Training,Massage")</li>
                <li><code>show_filters</code> - Whether to show filtering options (default: true)</li>
                <li><code>default_view</code> - Default view: services, calendar, or staff (default: services)</li>
                <li><code>staff_id</code> - Restrict to a specific staff ID</li>
                <li><code>location_id</code> - Restrict to a specific location ID</li>
            </ul>
            
            <h3>Example:</h3>
            <code>[mindbody_booking categories="Training,Massage" show_filters="false" default_view="calendar"]</code>
            
            <script>
                jQuery(document).ready(function($) {
                    $('#mb-test-api').on('click', function(e) {
                        e.preventDefault();
                        
                        var $button = $(this);
                        var $result = $('#mb-test-api-result');
                        
                        $button.prop('disabled', true).text('Testing...');
                        $result.html('');
                        
                        $.ajax({
                            url: ajaxurl,
                            type: 'POST',
                            data: {
                                action: 'mb_test_api_connection',
                                nonce: '<?php echo wp_create_nonce('mb_test_api_nonce'); ?>'
                            },
                            success: function(response) {
                                $button.prop('disabled', false).text('Test API Connection');
                                
                                if (response.success) {
                                    $result.html('<div class="notice notice-success"><p>' + response.data.message + '</p></div>');
                                } else {
                                    $result.html('<div class="notice notice-error"><p>' + response.data.message + '</p></div>');
                                }
                            },
                            error: function() {
                                $button.prop('disabled', false).text('Test API Connection');
                                $result.html('<div class="notice notice-error"><p>An error occurred while testing the API connection.</p></div>');
                            }
                        });
                    });
                });
            </script>
        </div>
        <?php
    }
    
    /**
     * Render API settings section
     */
    public function render_api_settings_section() {
        echo '<p>Enter your Mindbody API credentials below. These are required for the booking widget to function.</p>';
    }
    
    /**
     * Render API key field
     */
    public function render_api_key_field() {
        $api_key = get_option('mindbody_api_key', '');
        echo '<input type="text" name="mindbody_api_key" value="' . esc_attr($api_key) . '" class="regular-text" />';
        echo '<p class="description">Your Mindbody API key</p>';
    }
    
    /**
     * Render Site ID field
     */
    public function render_site_id_field() {
        $site_id = get_option('mindbody_site_id', '');
        echo '<input type="text" name="mindbody_site_id" value="' . esc_attr($site_id) . '" class="regular-text" />';
        echo '<p class="description">Your Mindbody site ID</p>';
    }
    
    /**
     * Render staff username field
     */
    public function render_staff_username_field() {
        $staff_username = get_option('mindbody_staff_username', '');
        echo '<input type="text" name="mindbody_staff_username" value="' . esc_attr($staff_username) . '" class="regular-text" />';
        echo '<p class="description">Username of a staff member with API permissions</p>';
    }
    
    /**
     * Render staff password field
     */
    public function render_staff_password_field() {
        $staff_password = get_option('mindbody_staff_password', '');
        echo '<input type="password" name="mindbody_staff_password" value="' . esc_attr($staff_password) . '" class="regular-text" />';
        echo '<p class="description">Password for the staff member</p>';
    }
    
    /**
     * Test API connection
     */
    public function test_api_connection() {
        // Check nonce
        check_ajax_referer('mb_test_api_nonce', 'nonce');
        
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'You do not have permission to perform this action.'));
        }
        
        // Get API credentials
        $credentials = array(
            'api_key' => get_option('mindbody_api_key', ''),
            'site_id' => get_option('mindbody_site_id', ''),
            'staff_username' => get_option('mindbody_staff_username', ''),
            'staff_password' => get_option('mindbody_staff_password', '')
        );
        
        // Check if credentials are set
        if (empty($credentials['api_key']) || empty($credentials['site_id'])) {
            wp_send_json_error(array('message' => 'API Key and Site ID are required.'));
        }
        
        // Test API connection
        $url = 'https://api.mindbodyonline.com/public/v6/site/sites';
        $args = array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Api-Key' => $credentials['api_key'],
                'SiteId' => $credentials['site_id']
            ),
            'timeout' => 15
        );
        
        $response = wp_remote_get($url, $args);
        
        // Check for WP error
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => 'API connection failed: ' . $response->get_error_message()));
        }
        
        // Check response code
        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if ($status_code === 200 && isset($body['Sites'])) {
            // Try staff token if staff credentials are provided
            if (!empty($credentials['staff_username']) && !empty($credentials['staff_password'])) {
                $auth_url = 'https://api.mindbodyonline.com/public/v6/usertoken/issue';
                $auth_args = array(
                    'method' => 'POST',
                    'headers' => array(
                        'Content-Type' => 'application/json',
                        'Api-Key' => $credentials['api_key'],
                        'SiteId' => $credentials['site_id']
                    ),
                    'body' => json_encode(array(
                        'Username' => $credentials['staff_username'],
                        'Password' => $credentials['staff_password']
                    )),
                    'timeout' => 15
                );
                
                $auth_response = wp_remote_post($auth_url, $auth_args);
                
                if (is_wp_error($auth_response)) {
                    wp_send_json_success(array(
                        'message' => 'API connection successful, but staff authentication failed: ' . $auth_response->get_error_message()
                    ));
                }
                
                $auth_status = wp_remote_retrieve_response_code($auth_response);
                $auth_body = json_decode(wp_remote_retrieve_body($auth_response), true);
                
                if ($auth_status !== 200 || empty($auth_body['AccessToken'])) {
                    wp_send_json_success(array(
                        'message' => 'API connection successful, but staff authentication failed. Please check staff credentials.'
                    ));
                }
                
                wp_send_json_success(array(
                    'message' => 'API connection and staff authentication successful!'
                ));
            } else {
                wp_send_json_success(array(
                    'message' => 'API connection successful! Staff credentials not tested.'
                ));
            }
        } else {
            wp_send_json_error(array(
                'message' => 'API connection failed with status code ' . $status_code . '. Please check your credentials.'
            ));
        }
    }
}

// Initialize admin settings
new MB_Admin_Settings();