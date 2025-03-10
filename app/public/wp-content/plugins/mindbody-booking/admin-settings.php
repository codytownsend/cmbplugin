<?php
if (!defined('ABSPATH')) {
    exit;
}

// Register settings for API credentials & staff authentication
function mindbody_booking_register_settings() {
    add_option('mindbody_api_key', '');
    add_option('mindbody_site_id', '');
    add_option('mindbody_staff_username', ''); 
    add_option('mindbody_staff_password', ''); 

    register_setting('mindbody_booking_options_group', 'mindbody_api_key');
    register_setting('mindbody_booking_options_group', 'mindbody_site_id');
    register_setting('mindbody_booking_options_group', 'mindbody_staff_username'); 
    register_setting('mindbody_booking_options_group', 'mindbody_staff_password'); 
}
add_action('admin_init', 'mindbody_booking_register_settings');

// Test API Connection
function mindbody_test_api_connection() {
    if (isset($_POST['mindbody_test_api'])) {
        check_admin_referer('mindbody_booking_options_group-options'); // Security check

        $credentials = mindbody_get_api_credentials();
        $url = "https://api.mindbodyonline.com/public/v6/site/sites";

        $args = [
            'headers' => [
                'Content-Type' => 'application/json',
                'Api-Key' => $credentials['api_key'],
                'SiteId' => $credentials['site_id']
            ]
        ];

        $response = wp_remote_get($url, $args);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $http_code = wp_remote_retrieve_response_code($response);

        if ($http_code == 200 && isset($body['Sites'])) {
            set_transient('mindbody_api_test_result', '✅ API connection successful!', 30);
        } else {
            set_transient('mindbody_api_test_result', '❌ API connection failed! Check credentials.', 30);
        }

        wp_redirect(admin_url('admin.php?page=mindbody-booking-plugin'));
        exit;
    }
}
add_action('admin_init', 'mindbody_test_api_connection');

// Handle token clearing
function mindbody_booking_clear_tokens() {
    if (isset($_POST['mindbody_clear_tokens'])) {
        check_admin_referer('mindbody_booking_options_group-options'); // Security check
        
        if (mindbody_clear_tokens()) {
            set_transient('mindbody_api_test_result', '✅ API tokens cleared successfully.', 30);
        } else {
            set_transient('mindbody_api_test_result', '❌ Error clearing API tokens.', 30);
        }
        
        wp_redirect(admin_url('admin.php?page=mindbody-booking-plugin'));
        exit;
    }
}
add_action('admin_init', 'mindbody_booking_clear_tokens');

// Create the settings page
function mindbody_booking_settings_page() {
    ?>
    <div class="wrap">
        <h1>Mindbody API Settings</h1>

        <?php
        // Show API Test Results
        if ($api_test_result = get_transient('mindbody_api_test_result')) {
            echo '<div class="updated"><p>' . esc_html($api_test_result) . '</p></div>';
            delete_transient('mindbody_api_test_result'); // Remove after displaying
        }
        ?>

        <form method="post" action="options.php">
            <?php settings_fields('mindbody_booking_options_group'); ?>
            <?php do_settings_sections('mindbody_booking_options_group'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="mindbody_api_key">API Key</label></th>
                    <td><input type="text" id="mindbody_api_key" name="mindbody_api_key" value="<?php echo esc_attr(get_option('mindbody_api_key')); ?>" style="width: 400px;"></td>
                </tr>
                <tr>
                    <th><label for="mindbody_site_id">Site ID</label></th>
                    <td><input type="text" id="mindbody_site_id" name="mindbody_site_id" value="<?php echo esc_attr(get_option('mindbody_site_id')); ?>" style="width: 400px;"></td>
                </tr>
                <tr>
                    <th><label for="mindbody_staff_username">Staff Username</label></th>
                    <td><input type="text" id="mindbody_staff_username" name="mindbody_staff_username" value="<?php echo esc_attr(get_option('mindbody_staff_username')); ?>" style="width: 400px;"></td>
                </tr>
                <tr>
                    <th><label for="mindbody_staff_password">Staff Password</label></th>
                    <td><input type="password" id="mindbody_staff_password" name="mindbody_staff_password" value="<?php echo esc_attr(get_option('mindbody_staff_password')); ?>" style="width: 400px;"></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <h2>Test API Connection</h2>
        <p>Click the button below to test the Mindbody API connection.</p>
        <form method="post">
            <?php wp_nonce_field('mindbody_booking_options_group-options'); ?>
            <input type="submit" name="mindbody_test_api" value="Test API" class="button button-primary">
        </form>
        
        <h2>Clear API Tokens</h2>
        <p>If you're having authentication issues, try clearing the stored tokens.</p>
        <form method="post">
            <?php wp_nonce_field('mindbody_booking_options_group-options'); ?>
            <input type="submit" name="mindbody_clear_tokens" value="Clear API Tokens" class="button">
        </form>

        <h2>Authentication Test Utility</h2>
        <p>This tool will test token generation with your configured credentials and display detailed results.</p>

        <?php
        // Check if token test was requested
        if (isset($_POST['mindbody_test_token'])) {
            check_admin_referer('mindbody_booking_options_group-options');
            
            echo '<div class="card" style="padding:15px; background:#f8f9fa; border:1px solid #ddd; margin-bottom:20px;">';
            echo '<h3>Token Test Results:</h3>';
            
            // Clear any existing tokens
            delete_option('mindbody_access_token');
            delete_option('mindbody_access_token_expires');
            
            $credentials = mindbody_get_api_credentials();
            
            echo '<p><strong>Using Credentials:</strong><br>'; 
            echo 'API Key: ' . substr($credentials['api_key'], 0, 5) . '...<br>';
            echo 'Site ID: ' . $credentials['site_id'] . '<br>';
            echo 'Staff Username: ' . $credentials['staff_username'] . '<br>';
            echo 'Staff Password: ' . (empty($credentials['staff_password']) ? 'Not Set' : '[Password Set]') . '</p>';
            
            // Set up request parameters
            $auth_url = "https://api.mindbodyonline.com/public/v6/usertoken/issue";
            
            $args = [
                'method' => 'POST',
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Api-Key' => $credentials['api_key'],
                    'siteId' => $credentials['site_id'],
                    'Accept' => 'application/json'
                ],
                'body' => json_encode([
                    'Username' => $credentials['staff_username'],
                    'Password' => $credentials['staff_password']
                ]),
                'timeout' => 15
            ];
            
            echo '<p><strong>Request Details:</strong><br>';
            echo 'URL: ' . $auth_url . '<br>';
            echo 'Headers: <pre>' . json_encode($args['headers'], JSON_PRETTY_PRINT) . '</pre>';
            echo 'Body: <pre>' . json_encode(json_decode($args['body']), JSON_PRETTY_PRINT) . '</pre></p>';
            
            // Make the request
            $response = wp_remote_post($auth_url, $args);
            
            // Handle response
            if (is_wp_error($response)) {
                echo '<p style="color:red;"><strong>Error:</strong> ' . $response->get_error_message() . '</p>';
            } else {
                $status_code = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);
                
                echo '<p><strong>Response Status:</strong> ' . $status_code . '</p>';
                echo '<p><strong>Response Body:</strong> <pre>' . htmlspecialchars($body) . '</pre></p>';
                
                $data = json_decode($body, true);
                
                if ($status_code === 200 && !empty($data['AccessToken'])) {
                    echo '<div style="background-color:#d4edda; color:#155724; padding:15px; border-radius:4px;">';
                    echo '<strong>Success!</strong> Token obtained successfully.';
                    echo '<br>Token: ' . substr($data['AccessToken'], 0, 20) . '...';
                    echo '<br>Token Type: ' . $data['TokenType'];
                    echo '<br>Expires In: ' . $data['ExpiresIn'] . ' seconds';
                    echo '</div>';
                    
                    // Save the token
                    update_option('mindbody_access_token', $data['AccessToken']);
                    update_option('mindbody_access_token_expires', time() + $data['ExpiresIn']);
                } else {
                    echo '<div style="background-color:#f8d7da; color:#721c24; padding:15px; border-radius:4px;">';
                    echo '<strong>Token Generation Failed!</strong><br>';
                    
                    if (!empty($data['Error']) && !empty($data['Message'])) {
                        echo 'Error: ' . $data['Error'] . '<br>';
                        echo 'Message: ' . $data['Message'];
                    } else {
                        echo 'Unknown error. Check response for details.';
                    }
                    
                    echo '</div>';
                }
            }
            
            echo '</div>';
        }
        ?>

        <form method="post">
            <?php wp_nonce_field('mindbody_booking_options_group-options'); ?>
            <input type="submit" name="mindbody_test_token" value="Test Token Generation" class="button button-primary">
            <p class="description">This will show detailed information about token generation to help troubleshoot authentication issues.</p>
        </form>

        <h2>Shortcodes</h2>
        <p>Use these shortcodes to embed the Mindbody booking widget in your pages:</p>
        
        <div class="card" style="max-width: 800px; padding: 20px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; margin-top: 15px;">
            <h3>Basic Booking Widget</h3>
            <code>[mindbody_booking]</code>
            <p>Displays the complete booking widget with all available services.</p>
        </div>
        
        <div class="card" style="max-width: 800px; padding: 20px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; margin-top: 15px;">
            <h3>Specific Service Booking</h3>
            <code>[mindbody_service_booking service_id="123" service_name="Service Name"]</code>
            <p>Displays a booking widget for a specific service only.</p>
            <p><strong>Parameters:</strong></p>
            <ul>
                <li><code>service_id</code> - Required. The Mindbody ID of the service/session type.</li>
                <li><code>service_name</code> - Optional. The display name of the service.</li>
                <li><code>staff_id</code> - Optional. Pre-select a specific staff member.</li>
                <li><code>show_prices</code> - Optional. Set to "yes" or "no" to show or hide prices (default: "yes").</li>
            </ul>
        </div>

        <h2>Troubleshooting</h2>
        <p>If you experience issues with the booking widget, you can try the following:</p>
        
        <ol>
            <li>Verify your API credentials are correct</li>
            <li>Ensure your staff username and password are valid</li>
            <li>Check that services and staff members are properly configured in your Mindbody account</li>
            <li>Make sure your hosting environment allows outbound HTTP requests</li>
            <li>Check the WordPress error logs for detailed error messages</li>
        </ol>
        
        <p>For more support, please contact your developer or visit the <a href="https://developers.mindbodyonline.com/" target="_blank">Mindbody API Documentation</a>.</p>
    </div>
    <?php
}

// Add admin menu - with modified slug to prevent duplicates
function mindbody_booking_add_admin_menu() {
    add_menu_page(
        'Mindbody Booking', 
        'Mindbody Booking', 
        'manage_options', 
        'mindbody-booking-plugin', // Changed from 'mindbody-booking' to be unique
        'mindbody_booking_settings_page', 
        'dashicons-calendar-alt'
    );
}
add_action('admin_menu', 'mindbody_booking_add_admin_menu');