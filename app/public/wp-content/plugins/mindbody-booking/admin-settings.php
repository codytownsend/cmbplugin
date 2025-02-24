<?php
if (!defined('ABSPATH')) {
    exit;
}

// Register settings for API credentials & staff authentication
function mindbody_booking_register_settings() {
    add_option('mindbody_api_key', '');
    add_option('mindbody_site_id', '');
    add_option('mindbody_staff_username', ''); // New
    add_option('mindbody_staff_password', ''); // New

    register_setting('mindbody_booking_options_group', 'mindbody_api_key');
    register_setting('mindbody_booking_options_group', 'mindbody_site_id');
    register_setting('mindbody_booking_options_group', 'mindbody_staff_username'); // New
    register_setting('mindbody_booking_options_group', 'mindbody_staff_password'); // New
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

        wp_redirect(admin_url('admin.php?page=mindbody-booking'));
        exit;
    }
}
add_action('admin_init', 'mindbody_test_api_connection');

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
    </div>
    <?php
}

// Add admin menu
function mindbody_booking_add_admin_menu() {
    add_menu_page('Mindbody API Settings', 'Mindbody Settings', 'manage_options', 'mindbody-booking', 'mindbody_booking_settings_page', 'dashicons-admin-generic');
}
add_action('admin_menu', 'mindbody_booking_add_admin_menu');