<?php
/**
 * Mindbody API integration functions
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Get session types - the source of truth for appointment types
 * 
 * @return array Array of session types
 */
function mindbody_get_session_types() {
    $credentials = mindbody_get_api_credentials();
    $url = "https://api.mindbodyonline.com/public/v6/site/sessiontypes";

    $args = [
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key'      => $credentials['api_key'],
            'SiteId'       => $credentials['site_id']
        ],
        'timeout' => 15
    ];

    $response = wp_remote_get($url, $args);
    
    if (is_wp_error($response)) {
        error_log("Error fetching session types: " . $response->get_error_message());
        return [];
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    return $body['SessionTypes'] ?? [];
}

/**
 * Get appointable services with pricing
 */
function mindbody_get_appointable_services() {
    // Get a valid staff token for authentication
    $auth_token = mindbody_get_staff_token();
    if (!$auth_token) {
        $auth_token = mindbody_get_valid_token();
    }
    
    if (!$auth_token) {
        wp_send_json_error(['message' => 'Authentication failed']);
        return;
    }
    
    // Step 1: Get Session Types - these are the appointment types
    $session_types = mindbody_get_session_types();
    
    if (empty($session_types)) {
        wp_send_json_error(['message' => 'No session types found']);
        return;
    }
    
    // Filter only appointment session types (Type = 'Service')
    $appointable_services = array_filter($session_types, function($type) {
        return isset($type['Type']) && $type['Type'] === 'Service';
    });
    
    if (empty($appointable_services)) {
        // If none are explicitly service types, use all session types
        $appointable_services = $session_types;
    }
    
    // Ensure the services have prices
    $default_prices = [
        '60 Min 1on1' => 65,
        'Personal Training' => 65,
        '60 min 2on1' => 40, 
        '2on1' => 40,
        '60 min 3on1' => 30,
        '3on1' => 30,
        'Nutrition' => 30,
        'Consult' => 0,
        'Tour' => 0,
        '90 min' => 100,
        '60 min' => 80,
        '120 min' => 120
    ];
    
    foreach ($appointable_services as &$service) {
        // If it has a price already, keep it
        if (isset($service['Price']) && $service['Price'] > 0) {
            continue;
        }
        
        // Otherwise, try to match by name
        foreach ($default_prices as $keyword => $price) {
            if (stripos($service['Name'], $keyword) !== false) {
                $service['Price'] = $price;
                break;
            }
        }
        
        // Default for any remaining services without prices
        if (!isset($service['Price']) || $service['Price'] <= 0) {
            $service['Price'] = 65; // Default personal training price
        }
    }
    
    wp_send_json_success(array_values($appointable_services));
}
add_action('wp_ajax_mindbody_get_appointable_services', 'mindbody_get_appointable_services');
add_action('wp_ajax_nopriv_mindbody_get_appointable_services', 'mindbody_get_appointable_services');

/**
 * Get bookable items based on session types
 */
function mindbody_get_bookable_items() {
    $auth_token = mindbody_get_valid_staff_token();
    if (!$auth_token) {
        wp_send_json_error(['message' => 'Authentication failed.']);
        return;
    }

    // Get session types to determine bookable services
    $session_types = mindbody_get_session_types();
    $session_type_ids = array_map(function($type) {
        return $type['Id'];
    }, $session_types);

    // Build query parameters - add the fixed location ID
    $params = [
        "request.locationId" => -99 // Fixed location ID
    ];
    
    // Add session type IDs
    foreach ($session_type_ids as $index => $id) {
        $params["request.sessionTypeIds[$index]"] = $id;
    }

    $url = "https://api.mindbodyonline.com/public/v6/appointment/bookableitems?" . http_build_query($params);
    $args = [
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => get_option('mindbody_api_key'),
            'SiteId' => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'timeout' => 15
    ];

    $response = wp_remote_get($url, $args);
    
    if (is_wp_error($response)) {
        error_log("Error fetching bookable items: " . $response->get_error_message());
        wp_send_json_error(['message' => 'Error fetching bookable items: ' . $response->get_error_message()]);
        return;
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);

    // Organize services and staff
    $services = [];

    if (!empty($body['Availabilities'])) {
        foreach ($body['Availabilities'] as $availability) {
            $service_id = $availability['SessionType']['Id'];
            $service_name = $availability['SessionType']['Name'];

            if (!isset($services[$service_id])) {
                $services[$service_id] = [
                    'Id' => $service_id,
                    'Name' => $service_name,
                    'OnlineDescription' => $availability['SessionType']['OnlineDescription'] ?? '',
                    'Staff' => []
                ];
            }

            $staff_id = $availability['Staff']['Id'];
            $staff_name = $availability['Staff']['Name'];

            if (!array_key_exists($staff_id, $services[$service_id]['Staff'])) {
                $services[$service_id]['Staff'][$staff_id] = [
                    'Id' => $staff_id,
                    'Name' => $staff_name
                ];
            }
        }
    }

    foreach ($services as &$service) {
        $service['Staff'] = array_values($service['Staff']);
    }

    wp_send_json_success(array_values($services));
}
add_action('wp_ajax_mindbody_get_bookable_items', 'mindbody_get_bookable_items');
add_action('wp_ajax_nopriv_mindbody_get_bookable_items', 'mindbody_get_bookable_items');

/**
 * Fetch available dates for the selected service
 */
function mindbody_get_available_dates() {
    $auth_token = mindbody_get_valid_token();
    if (!$auth_token) {
        wp_send_json_error(['message' => 'Authentication failed.']);
    }

    $sessionTypeId = isset($_GET['sessionTypeId']) ? sanitize_text_field($_GET['sessionTypeId']) : '';
    $staffId = isset($_GET['staffId']) ? sanitize_text_field($_GET['staffId']) : '';
    $locationId = isset($_GET['locationId']) ? sanitize_text_field($_GET['locationId']) : '-99'; // Default to -99

    $startDate = isset($_GET['startDate']) ? sanitize_text_field($_GET['startDate']) : date('Y-m-d') . 'T00:00:00Z';
    $endDate = isset($_GET['endDate']) ? sanitize_text_field($_GET['endDate']) : date('Y-m-d', strtotime('+30 days')) . 'T23:59:59Z';

    $url = "https://api.mindbodyonline.com/public/v6/appointment/availabledates?"
         . http_build_query([
            'request.sessionTypeId' => $sessionTypeId,
            'request.startDate' => $startDate,
            'request.endDate' => $endDate,
            'request.locationId' => $locationId
         ]);

    if (!empty($staffId)) {
        $url .= "&request.staffId={$staffId}";
    }

    $args = [
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => get_option('mindbody_api_key'),
            'SiteId' => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'timeout' => 15
    ];

    $response = wp_remote_get($url, $args);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (is_wp_error($response) || empty($body['AvailableDates'])) {
        wp_send_json_error(['message' => 'No available dates.']);
    }

    wp_send_json_success($body['AvailableDates']);
}
add_action('wp_ajax_mindbody_get_available_dates', 'mindbody_get_available_dates');
add_action('wp_ajax_nopriv_mindbody_get_available_dates', 'mindbody_get_available_dates');

/**
 * Fetch available time slots for a selected date
 */
function mindbody_get_available_slots() {
    $auth_token = mindbody_get_valid_token();
    if (!$auth_token) {
        wp_send_json_error(['message' => 'Authentication failed.']);
    }
    
    $sessionTypeId = isset($_GET['sessionTypeId']) ? sanitize_text_field($_GET['sessionTypeId']) : '';
    $date          = isset($_GET['date']) ? sanitize_text_field($_GET['date']) : '';
    $staffId       = isset($_GET['staffId']) ? sanitize_text_field($_GET['staffId']) : '';
    
    if (empty($sessionTypeId) || empty($date)) {
        wp_send_json_error(['message' => 'Missing required parameters.']);
    }
    
    // Extract only the date portion (YYYY-MM-DD)
    $dateOnly = explode('T', $date)[0];
    
    // Build start and end times for the selected date (UTC)
    $startDateTime = $dateOnly . "T00:00:00Z";
    $endDateTime   = $dateOnly . "T23:59:59Z";
    
    // Build query parameters for the API request
    $params = [
        "request.sessionTypeIds[0]" => $sessionTypeId,
        "request.startDateTime"     => $startDateTime,
        "request.endDateTime"       => $endDateTime,
        "request.locationId"        => -99 // Fixed location ID
    ];
    
    if (!empty($staffId)) {
        $params["request.staffId"] = $staffId;
    }
    
    $url = "https://api.mindbodyonline.com/public/v6/appointment/bookableitems?" . http_build_query($params);
    
    $args = [
        'headers' => [
            'Content-Type'  => 'application/json',
            'Api-Key'       => get_option('mindbody_api_key'),
            'SiteId'        => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'timeout' => 15
    ];
    
    $response = wp_remote_get($url, $args);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if (is_wp_error($response) || empty($body['Availabilities'])) {
        wp_send_json_error(['message' => 'No available time slots for this date.']);
    }
    
    // Collect available times using the StartDateTime field
    $timeSlots = [];
    foreach ($body['Availabilities'] as $availability) {
        if (!empty($availability['StartDateTime'])) {
            $formattedTime = date("H:i", strtotime($availability['StartDateTime']));
            $timeSlots[] = $formattedTime;
        }
    }
    
    // Remove duplicates and sort the times
    $timeSlots = array_unique($timeSlots);
    sort($timeSlots);
    
    if (empty($timeSlots)) {
        wp_send_json_error(['message' => 'No available time slots for this date.']);
    }
    
    wp_send_json_success($timeSlots);
}
add_action('wp_ajax_mindbody_get_available_slots', 'mindbody_get_available_slots');
add_action('wp_ajax_nopriv_mindbody_get_available_slots', 'mindbody_get_available_slots');

/**
 * Verify client authentication status
 */
function mindbody_verify_auth() {
    // Start session if not already started
    if (!session_id()) {
        session_start();
    }

    // Check if user is logged in to WordPress
    if (!is_user_logged_in()) {
        wp_send_json_error([
            'message' => 'Not authenticated',
            'code' => 'not_logged_in'
        ]);
        return;
    }

    // Get current user and (optionally) a phone from user meta
    $current_user = wp_get_current_user();
    $user_phone = get_user_meta($current_user->ID, 'phone', true);

    try {
        // Try to get Mindbody client info using the user's email
        $client_info = get_mindbody_client_by_email($current_user->user_email);
        
        // Instead of erroring if no client is found, return success with client set to null.
        wp_send_json_success([
            'client' => $client_info, // may be null if not yet created in Mindbody
            'wp_user' => [
                'id'         => $current_user->ID,
                'email'      => $current_user->user_email,
                'first_name' => $current_user->first_name,
                'last_name'  => $current_user->last_name,
                'phone'      => $user_phone
            ]
        ]);
    } catch (Exception $e) {
        wp_send_json_error([
            'message' => 'Error fetching client info: ' . $e->getMessage(),
            'code' => 'fetch_error'
        ]);
    }
}
add_action('wp_ajax_mindbody_verify_auth', 'mindbody_verify_auth');
add_action('wp_ajax_nopriv_mindbody_verify_auth', 'mindbody_verify_auth');

/**
 * Get Mindbody client by email
 */
function get_mindbody_client_by_email($email) {
    $auth_token = mindbody_get_valid_token();
    if (!$auth_token) {
        throw new Exception('Failed to get valid auth token');
    }

    $url = "https://api.mindbodyonline.com/public/v6/client/clients";
    $params = http_build_query(['SearchText' => $email]);
    
    $args = [
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => get_option('mindbody_api_key'),
            'SiteId' => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'timeout' => 15
    ];

    $response = wp_remote_get("$url?$params", $args);
    
    if (is_wp_error($response)) {
        throw new Exception($response->get_error_message());
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if (!empty($body['Clients'][0])) {
        return $body['Clients'][0];
    }
    
    return null;
}

/**
 * Handle client login
 */
function mindbody_wp_client_login() {
    // Start session if not already started
    if (!session_id()) {
        session_start();
    }

    $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    if (empty($email) || empty($password)) {
        wp_send_json_error([
            'message' => 'Email and password are required.',
            'code' => 'missing_credentials'
        ]);
        return;
    }

    // Attempt WordPress login
    $creds = [
        'user_login'    => $email,
        'user_password' => $password,
        'remember'      => true
    ];

    $user = wp_signon($creds, false);

    if (is_wp_error($user)) {
        wp_send_json_error([
            'message' => 'Invalid credentials.',
            'code' => 'invalid_credentials'
        ]);
        return;
    }

    // Set auth cookie
    wp_set_auth_cookie($user->ID, true);

    // Get Mindbody client info
    try {
        $client_info = get_mindbody_client_by_email($email);
        
        wp_send_json_success([
            'client' => $client_info,
            'wp_user' => [
                'id' => $user->ID,
                'email' => $user->user_email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name
            ]
        ]);
    } catch (Exception $e) {
        wp_send_json_error([
            'message' => 'Login successful but failed to fetch Mindbody info: ' . $e->getMessage(),
            'code' => 'mindbody_fetch_error'
        ]);
    }
}
add_action('wp_ajax_mindbody_wp_client_login', 'mindbody_wp_client_login');
add_action('wp_ajax_nopriv_mindbody_wp_client_login', 'mindbody_wp_client_login');

/**
 * User Registration
 */
function mindbody_wp_client_register() {
    $first_name = isset($_POST['firstName']) ? sanitize_text_field($_POST['firstName']) : '';
    $last_name  = isset($_POST['lastName']) ? sanitize_text_field($_POST['lastName']) : '';
    $email      = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
    $password   = isset($_POST['password']) ? sanitize_text_field($_POST['password']) : '';

    if (empty($first_name) || empty($last_name) || empty($email) || empty($password)) {
        wp_send_json_error(['message' => 'All fields are required.']);
    }
    
    if (email_exists($email)) {
        wp_send_json_error(['message' => 'Email is already registered.']);
    }
    
    $user_id = wp_create_user($email, $password, $email);
    if (is_wp_error($user_id)) {
        wp_send_json_error(['message' => 'Registration failed.']);
    }
    
    // Update first and last names.
    wp_update_user([
        'ID'         => $user_id,
        'first_name' => $first_name,
        'last_name'  => $last_name,
    ]);
    
    // Automatically log in the newly registered user.
    $creds = [
        'user_login'    => $email,
        'user_password' => $password,
        'remember'      => true
    ];
    $user = wp_signon($creds, false);
    if (is_wp_error($user)) {
        wp_send_json_error(['message' => 'Login after registration failed.']);
    }
    
    wp_send_json_success($user);
}
add_action('wp_ajax_mindbody_wp_client_register', 'mindbody_wp_client_register');
add_action('wp_ajax_nopriv_mindbody_wp_client_register', 'mindbody_wp_client_register');

/**
 * Book appointment
 */
function mindbody_book_appointment() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['appointments']) || empty($data['client']) || empty($data['payment'])) {
        wp_send_json_error(['message' => 'Missing required booking information.']);
        return;
    }
    
    $auth_token = mindbody_get_valid_token();
    if (!$auth_token) {
        wp_send_json_error(['message' => 'Authentication failed.']);
        return;
    }
    
    // Check if client exists or create new client
    $client_id = ensure_client_exists($data['client']);
    if (!$client_id) {
        wp_send_json_error(['message' => 'Failed to create or verify client.']);
        return;
    }
    
    // Process each appointment
    $successful_bookings = [];
    $failed_bookings = [];
    
    foreach ($data['appointments'] as $appointment) {
        // Skip appointments missing required data
        if (empty($appointment['serviceId']) || empty($appointment['date']) || empty($appointment['time'])) {
            $failed_bookings[] = [
                'serviceId' => $appointment['serviceId'] ?? 'unknown',
                'error' => 'Missing required appointment data'
            ];
            continue;
        }
        
        // Build the booking request
        $bookingRequest = [
            "ClientId" => $client_id,
            "SessionTypeId" => $appointment['serviceId'],
            "StaffId" => !empty($appointment['staffId']) ? $appointment['staffId'] : null,
            "LocationId" => -99, // Fixed location ID 
            "StartDateTime" => $appointment['date'] . "T" . $appointment['time'] . ":00Z",
            "ApplyPayment" => true,
            "SendEmail" => true,
            "Test" => false,
            "PaymentInfo" => $data['payment']
        ];
        
        // Make the API request
        $response = book_single_appointment($bookingRequest, $auth_token);
        
        if ($response && !empty($response['Appointment'])) {
            $successful_bookings[] = $response['Appointment'];
        } else {
            $failed_bookings[] = [
                'serviceId' => $appointment['serviceId'],
                'error' => isset($response['Message']) ? $response['Message'] : 'Unknown booking error'
            ];
        }
    }
    
    // All appointments failed
    if (count($successful_bookings) === 0 && count($failed_bookings) > 0) {
        wp_send_json_error([
            'message' => 'All bookings failed.',
            'errors' => $failed_bookings
        ]);
        return;
    }
    
    // Some appointments succeeded, some failed
    if (count($failed_bookings) > 0) {
        wp_send_json_success([
            'message' => 'Some bookings succeeded, but others failed.',
            'appointments' => $successful_bookings,
            'errors' => $failed_bookings
        ]);
        return;
    }
    
    // All appointments succeeded
    wp_send_json_success([
        'message' => 'All bookings successful!',
        'appointments' => $successful_bookings
    ]);
}
add_action('wp_ajax_mindbody_book_appointment', 'mindbody_book_appointment');
add_action('wp_ajax_nopriv_mindbody_book_appointment', 'mindbody_book_appointment');

/**
 * Ensure client exists or create a new one
 */
function ensure_client_exists($client_data) {
    $auth_token = mindbody_get_valid_token();
    if (!$auth_token) {
        return false;
    }
    
    // First check if client exists by email
    if (!empty($client_data['email'])) {
        $client = get_mindbody_client_by_email($client_data['email']);
        if ($client && !empty($client['Id'])) {
            return $client['Id'];
        }
    }
    
    // If not found or no email, create new client
    $new_client = [
        'FirstName' => $client_data['firstName'],
        'LastName' => $client_data['lastName'],
        'Email' => $client_data['email'] ?? '',
        'MobilePhone' => $client_data['phone'] ?? '',
        'SendAccountEmails' => true,
        'SendAccountTexts' => true,
        'SendPromotionalEmails' => false,
        'SendPromotionalTexts' => false,
    ];
    
    $url = "https://api.mindbodyonline.com/public/v6/client/addclient";
    $args = [
        'method' => 'POST',
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => get_option('mindbody_api_key'),
            'SiteId' => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'body' => json_encode(['Client' => $new_client]),
        'timeout' => 15
    ];
    
    $response = wp_remote_post($url, $args);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if (!is_wp_error($response) && !empty($body['Client']['Id'])) {
        return $body['Client']['Id'];
    }
    
    return false;
}

/**
 * Book a single appointment
 */
function book_single_appointment($booking_request, $auth_token) {
    $url = "https://api.mindbodyonline.com/public/v6/appointment/addappointment";
    $args = [
        'method' => 'POST',
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => get_option('mindbody_api_key'),
            'SiteId' => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'body' => json_encode($booking_request),
        'timeout' => 15
    ];
    
    $response = wp_remote_post($url, $args);
    
    if (is_wp_error($response)) {
        error_log('Booking error: ' . $response->get_error_message());
        return null;
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    // Log the response for debugging
    error_log('Mindbody Booking Response: ' . print_r($body, true));
    
    return $body;
}

/**
 * Get saved payment methods
 */
function mindbody_get_saved_payment_methods() {
    // Verify that the user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'Not authenticated.']);
        return;
    }
    
    $current_user = wp_get_current_user();
    // Use a staff token for accessing client data
    $auth_token = mindbody_get_valid_token();
    if (!$auth_token) {
        wp_send_json_error(['message' => 'Authentication failed.']);
    }
    
    $url = "https://api.mindbodyonline.com/public/v6/client/paymentmethods";
    $params = http_build_query(['Email' => $current_user->user_email]);
    $args = [
        'headers' => [
            'Content-Type'  => 'application/json',
            'Api-Key'       => get_option('mindbody_api_key'),
            'SiteId'        => get_option('mindbody_site_id'),
            'Authorization' => "Bearer $auth_token"
        ],
        'timeout' => 15
    ];
    
    $response = wp_remote_get("$url?$params", $args);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if (is_wp_error($response) || empty($body['PaymentMethods'])) {
        wp_send_json_success([]); // Return empty array if none found
    } else {
        wp_send_json_success($body['PaymentMethods']);
    }
}
add_action('wp_ajax_mindbody_get_saved_payment_methods', 'mindbody_get_saved_payment_methods');
add_action('wp_ajax_nopriv_mindbody_get_saved_payment_methods', 'mindbody_get_saved_payment_methods');

/**
 * Verify appointment availability
 */
function mindbody_verify_availability() {
    // Ensure we're getting JSON input
    $content_type = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    
    if (strpos($content_type, 'application/json') !== false) {
        $json_data = json_decode(file_get_contents('php://input'), true);
    } else {
        // Fallback to POST/GET params if not JSON
        $json_data = [
            'serviceId' => isset($_REQUEST['serviceId']) ? sanitize_text_field($_REQUEST['serviceId']) : '',
            'staffId' => isset($_REQUEST['staffId']) ? sanitize_text_field($_REQUEST['staffId']) : '',
            'date' => isset($_REQUEST['date']) ? sanitize_text_field($_REQUEST['date']) : '',
            'time' => isset($_REQUEST['time']) ? sanitize_text_field($_REQUEST['time']) : ''
        ];
    }
    
    // Validate required parameters
    if (empty($json_data['serviceId']) || empty($json_data['date']) || empty($json_data['time'])) {
        wp_send_json_error(['message' => 'Missing required parameters']);
        return;
    }
    
    try {
        // Get valid auth token
        $auth_token = mindbody_get_valid_token();
        if (!$auth_token) {
            wp_send_json_error(['message' => 'Authentication failed']);
            return;
        }
        
        // Extract date & time
        $date = explode('T', $json_data['date'])[0]; // Get only the date part
        $time = $json_data['time'];
        
        // Format datetime for API
        $datetime = $date . 'T' . $time . ':00Z';
        
        // Build parameters for API call
        $params = [
            "request.sessionTypeId" => $json_data['serviceId'],
            "request.startDateTime" => $datetime,
            "request.endDateTime" => $datetime,
            "request.locationId" => -99 // Fixed location ID
        ];
        
        if (!empty($json_data['staffId'])) {
            $params["request.staffId"] = $json_data['staffId'];
        }
        
        $url = "https://api.mindbodyonline.com/public/v6/appointment/bookableitems?" . http_build_query($params);
        
        $args = [
            'headers' => [
                'Content-Type' => 'application/json',
                'Api-Key' => get_option('mindbody_api_key'),
                'SiteId' => get_option('mindbody_site_id'),
                'Authorization' => "Bearer {$auth_token}"
            ],
            'timeout' => 15
        ];
        
        $response = wp_remote_get($url, $args);
        
        if (is_wp_error($response)) {
            error_log("Verify availability error: " . $response->get_error_message());
            wp_send_json_error(['message' => 'API error: ' . $response->get_error_message()]);
            return;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            error_log("Verify availability API error. Status: {$status_code}, Response: " . wp_remote_retrieve_body($response));
            wp_send_json_error(['message' => "API returned status {$status_code}"]);
            return;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        // Check if the slot is available
        $is_available = false;
        if (!empty($body['Availabilities'])) {
            foreach ($body['Availabilities'] as $availability) {
                $start_time = new DateTime($availability['StartDateTime']);
                $requested_time = new DateTime($datetime);
                
                // Compare the timestamp (ignore seconds)
                if ($start_time->format('Y-m-d H:i') === $requested_time->format('Y-m-d H:i')) {
                    $is_available = true;
                    break;
                }
            }
        }
        
        if ($is_available) {
            wp_send_json_success(['message' => 'Time slot is available']);
        } else {
            wp_send_json_error(['message' => 'Time slot is not available']);
        }
    } catch (Exception $e) {
        error_log("Verify availability exception: " . $e->getMessage());
        wp_send_json_error(['message' => 'Error: ' . $e->getMessage()]);
    }
}
add_action('wp_ajax_mindbody_verify_availability', 'mindbody_verify_availability');
add_action('wp_ajax_nopriv_mindbody_verify_availability', 'mindbody_verify_availability');