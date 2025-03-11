<?php
/**
 * AJAX Handlers
 * 
 * Handles AJAX requests for the booking widget
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_Booking_AJAX {
    /**
     * Constructor
     */
    public function __construct() {
        // Register AJAX handlers
        $this->register_ajax_handlers();
    }
    
    /**
     * Register AJAX handlers
     */
    private function register_ajax_handlers() {
        // Services endpoints
        add_action('wp_ajax_mb_get_session_types', array($this, 'get_session_types'));
        add_action('wp_ajax_nopriv_mb_get_session_types', array($this, 'get_session_types'));
        
        add_action('wp_ajax_mb_get_bookable_items', array($this, 'get_bookable_items'));
        add_action('wp_ajax_nopriv_mb_get_bookable_items', array($this, 'get_bookable_items'));
        
        add_action('wp_ajax_mb_get_available_dates', array($this, 'get_available_dates'));
        add_action('wp_ajax_nopriv_mb_get_available_dates', array($this, 'get_available_dates'));
        
        add_action('wp_ajax_mb_get_available_times', array($this, 'get_available_times'));
        add_action('wp_ajax_nopriv_mb_get_available_times', array($this, 'get_available_times'));
        
        // Client endpoints
        add_action('wp_ajax_mb_get_client', array($this, 'get_client'));
        add_action('wp_ajax_nopriv_mb_get_client', array($this, 'get_client'));
        
        add_action('wp_ajax_mb_create_client', array($this, 'create_client'));
        add_action('wp_ajax_nopriv_mb_create_client', array($this, 'create_client'));
        
        add_action('wp_ajax_mb_client_login', array($this, 'client_login'));
        add_action('wp_ajax_nopriv_mb_client_login', array($this, 'client_login'));
        
        add_action('wp_ajax_mb_client_register', array($this, 'client_register'));
        add_action('wp_ajax_nopriv_mb_client_register', array($this, 'client_register'));
        
        // Booking endpoints
        add_action('wp_ajax_mb_verify_availability', array($this, 'verify_availability'));
        add_action('wp_ajax_nopriv_mb_verify_availability', array($this, 'verify_availability'));
        
        add_action('wp_ajax_mb_book_appointment', array($this, 'book_appointment'));
        add_action('wp_ajax_nopriv_mb_book_appointment', array($this, 'book_appointment'));
        
        // Payment endpoints
        add_action('wp_ajax_mb_get_payment_methods', array($this, 'get_payment_methods'));
        add_action('wp_ajax_nopriv_mb_get_payment_methods', array($this, 'get_payment_methods'));
    }
    
    /**
     * Get session types
     */
    public function get_session_types() {
        // Check nonce
        $this->verify_nonce();
        
        // Get services API
        $services_api = new MB_API_Services();
        
        // Get online only parameter (default true)
        $online_only = isset($_GET['online_only']) ? filter_var($_GET['online_only'], FILTER_VALIDATE_BOOLEAN) : true;
        
        // Get program IDs (if provided)
        $program_ids = array();
        if (!empty($_GET['program_ids'])) {
            $program_ids = explode(',', sanitize_text_field($_GET['program_ids']));
        }
        
        // Get session types
        $session_types = $services_api->get_session_types($online_only, $program_ids);
        
        // Check for error
        if (is_wp_error($session_types)) {
            $this->send_error_response($session_types->get_error_message());
        }
        
        // Return success response
        $this->send_success_response($session_types);
    }
    
    /**
     * Get bookable items
     */
    public function get_bookable_items() {
        // Check nonce
        $this->verify_nonce();
        
        // Get session type IDs (required)
        if (empty($_GET['session_type_ids'])) {
            $this->send_error_response('Session type IDs are required');
        }
        
        $session_type_ids = explode(',', sanitize_text_field($_GET['session_type_ids']));
        
        // Log session type IDs for debugging
        error_log('Getting bookable items for session type IDs: ' . implode(', ', $session_type_ids));
        
        // Get optional parameters
        $start_date = !empty($_GET['start_date']) ? sanitize_text_field($_GET['start_date']) : null;
        $end_date = !empty($_GET['end_date']) ? sanitize_text_field($_GET['end_date']) : null;
        
        $staff_ids = array();
        if (!empty($_GET['staff_ids'])) {
            $staff_ids = explode(',', sanitize_text_field($_GET['staff_ids']));
        }
        
        $location_ids = array();
        if (!empty($_GET['location_ids'])) {
            $location_ids = explode(',', sanitize_text_field($_GET['location_ids']));
        }
        
        // Set longer timeout for API request
        set_time_limit(60); // Extend PHP execution time for larger requests
        
        // Get services API
        $services_api = new MB_API_Services();
        
        // Get bookable items
        $bookable_items = $services_api->get_bookable_items($session_type_ids, $start_date, $end_date, $staff_ids, $location_ids);
        
        // Check for error
        if (is_wp_error($bookable_items)) {
            $this->send_error_response($bookable_items->get_error_message());
        }
        
        // Log the response size
        error_log('Returning ' . count($bookable_items) . ' bookable items');
        
        // Return success response
        $this->send_success_response($bookable_items);
    }
    
    /**
     * Get available dates
     */
    public function get_available_dates() {
        // Check nonce
        $this->verify_nonce();
        
        // Get session type ID (required)
        if (empty($_GET['session_type_id'])) {
            $this->send_error_response('Session type ID is required');
        }
        
        $session_type_id = sanitize_text_field($_GET['session_type_id']);
        
        // Get optional parameters
        $start_date = !empty($_GET['start_date']) ? sanitize_text_field($_GET['start_date']) : null;
        $end_date = !empty($_GET['end_date']) ? sanitize_text_field($_GET['end_date']) : null;
        $staff_id = !empty($_GET['staff_id']) ? sanitize_text_field($_GET['staff_id']) : null;
        $location_id = !empty($_GET['location_id']) ? sanitize_text_field($_GET['location_id']) : '-99';
        
        // Get services API
        $services_api = new MB_API_Services();
        
        // Get available dates
        $available_dates = $services_api->get_available_dates($session_type_id, $start_date, $end_date, $staff_id, $location_id);
        
        // Check for error
        if (is_wp_error($available_dates)) {
            $this->send_error_response($available_dates->get_error_message());
        }
        
        // Return success response
        $this->send_success_response($available_dates);
    }
    
    /**
     * Get available times
     */
    public function get_available_times() {
        // Check nonce
        $this->verify_nonce();
        
        // Get required parameters
        if (empty($_GET['session_type_id']) || empty($_GET['date'])) {
            $this->send_error_response('Session type ID and date are required');
        }
        
        $session_type_id = sanitize_text_field($_GET['session_type_id']);
        $date = sanitize_text_field($_GET['date']);
        
        // Get optional parameters
        $staff_id = !empty($_GET['staff_id']) ? sanitize_text_field($_GET['staff_id']) : null;
        $location_id = !empty($_GET['location_id']) ? sanitize_text_field($_GET['location_id']) : '-99';
        
        // Get services API
        $services_api = new MB_API_Services();
        
        // Get available times
        $available_times = $services_api->get_available_times($session_type_id, $date, $staff_id, $location_id);
        
        // Check for error
        if (is_wp_error($available_times)) {
            $this->send_error_response($available_times->get_error_message());
        }
        
        // Return success response
        $this->send_success_response($available_times);
    }
    
    /**
     * Get client by email
     */
    public function get_client() {
        // Check nonce
        $this->verify_nonce();
        
        // Get email (required)
        if (empty($_GET['email'])) {
            $this->send_error_response('Email is required');
        }
        
        $email = sanitize_email($_GET['email']);
        
        // Get client API
        $client_api = new MB_API_Client_Manager();
        
        // Get client
        $client = $client_api->get_client_by_email($email);
        
        // Check for error
        if (is_wp_error($client)) {
            $this->send_error_response($client->get_error_message());
        }
        
        // Return success response
        $this->send_success_response($client);
    }
    
    /**
     * Create or update client
     */
    public function create_client() {
        // Check nonce
        $this->verify_nonce();
        
        // Get request body
        $request_body = file_get_contents('php://input');
        $client_data = json_decode($request_body, true);
        
        // Check for valid JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send_error_response('Invalid JSON in request');
        }
        
        // Validate required fields
        if (empty($client_data['first_name']) || empty($client_data['last_name'])) {
            $this->send_error_response('First name and last name are required');
        }
        
        // Get client API
        $client_api = new MB_API_Client_Manager();
        
        // Create or update client
        $client = $client_api->create_or_update_client($client_data);
        
        // Check for error
        if (is_wp_error($client)) {
            $this->send_error_response($client->get_error_message());
        }
        
        // Return success response
        $this->send_success_response($client);
    }
    
    /**
     * Client login
     */
    public function client_login() {
        // Check nonce
        $this->verify_nonce();
        
        // Handle login logic with WordPress
        $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
        $password = isset($_POST['password']) ? $_POST['password'] : '';
        
        if (empty($email) || empty($password)) {
            $this->send_error_response('Email and password are required');
        }
        
        // Attempt WordPress login
        $creds = array(
            'user_login' => $email,
            'user_password' => $password,
            'remember' => true
        );
        
        $user = wp_signon($creds, false);
        
        if (is_wp_error($user)) {
            $this->send_error_response('Invalid credentials');
        }
        
        // Set auth cookie
        wp_set_auth_cookie($user->ID, true);
        
        // Try to get Mindbody client info
        $client_api = new MB_API_Client_Manager();
        $client_info = $client_api->get_client_by_email($email);
        
        // Return user and client info
        $response = array(
            'wp_user' => array(
                'id' => $user->ID,
                'email' => $user->user_email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name
            ),
            'client' => !is_wp_error($client_info) ? $client_info : null
        );
        
        $this->send_success_response($response);
    }
    
    /**
     * Client registration
     */
    public function client_register() {
        // Check nonce
        $this->verify_nonce();
        
        // Get registration data
        $first_name = isset($_POST['first_name']) ? sanitize_text_field($_POST['first_name']) : '';
        $last_name = isset($_POST['last_name']) ? sanitize_text_field($_POST['last_name']) : '';
        $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
        $password = isset($_POST['password']) ? $_POST['password'] : '';
        
        // Validate required fields
        if (empty($first_name) || empty($last_name) || empty($email) || empty($password)) {
            $this->send_error_response('All fields are required');
        }
        
        // Check if email already exists
        if (email_exists($email)) {
            $this->send_error_response('Email is already registered');
        }
        
        // Create WordPress user
        $user_id = wp_create_user($email, $password, $email);
        
        if (is_wp_error($user_id)) {
            $this->send_error_response('Registration failed: ' . $user_id->get_error_message());
        }
        
        // Update user meta
        wp_update_user(array(
            'ID' => $user_id,
            'first_name' => $first_name,
            'last_name' => $last_name
        ));
        
        // Create Mindbody client
        $client_api = new MB_API_Client_Manager();
        $client_data = array(
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email
        );
        
        $client = $client_api->create_or_update_client($client_data);
        
        // Login the user
        wp_set_auth_cookie($user_id, true);
        
        // Return response
        $response = array(
            'wp_user' => array(
                'id' => $user_id,
                'email' => $email,
                'first_name' => $first_name,
                'last_name' => $last_name
            ),
            'client' => !is_wp_error($client) ? $client : null
        );
        
        $this->send_success_response($response);
    }
    
    /**
     * Verify appointment availability
     */
    public function verify_availability() {
        // Check nonce
        $this->verify_nonce();
        
        // Get request body
        $request_body = file_get_contents('php://input');
        $data = json_decode($request_body, true);
        
        // Check for valid JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send_error_response('Invalid JSON in request');
        }
        
        // Validate required fields
        if (empty($data['session_type_id']) || empty($data['date_time'])) {
            $this->send_error_response('Session type ID and date/time are required');
        }
        
        $session_type_id = sanitize_text_field($data['session_type_id']);
        $date_time = sanitize_text_field($data['date_time']);
        $staff_id = !empty($data['staff_id']) ? sanitize_text_field($data['staff_id']) : null;
        $location_id = !empty($data['location_id']) ? sanitize_text_field($data['location_id']) : '-99';
        
        // Get booking API
        $booking_api = new MB_API_Booking();
        
        // Verify availability
        $is_available = $booking_api->verify_availability($session_type_id, $date_time, $staff_id, $location_id);
        
        // Return response
        $this->send_success_response(array(
            'available' => $is_available
        ));
    }
    
    /**
     * Book appointment
     */
    public function book_appointment() {
        // Check nonce
        $this->verify_nonce();
        
        // Get request body
        $request_body = file_get_contents('php://input');
        $data = json_decode($request_body, true);
        
        // Check for valid JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send_error_response('Invalid JSON in request');
        }
        
        // Validate required data
        if (empty($data['appointments']) || empty($data['client'])) {
            $this->send_error_response('Appointments and client data are required');
        }
        
        // Create or update client
        $client_api = new MB_API_Client_Manager();
        $client = $client_api->create_or_update_client($data['client']);
        
        if (is_wp_error($client)) {
            $this->send_error_response('Client creation failed: ' . $client->get_error_message());
        }
        
        // Prepare appointments array
        $appointments = array();
        foreach ($data['appointments'] as $appointment) {
            if (empty($appointment['session_type_id']) || empty($appointment['date']) || empty($appointment['time'])) {
                continue; // Skip invalid appointments
            }
            
            // Format date and time
            $date_time = $appointment['date'] . ' ' . $appointment['time'];
            $formatted_date_time = date('Y-m-d\TH:i:s', strtotime($date_time));
            
            $appointments[] = array(
                'session_type_id' => $appointment['session_type_id'],
                'start_date_time' => $formatted_date_time,
                'staff_id' => !empty($appointment['staff_id']) ? $appointment['staff_id'] : null,
                'location_id' => !empty($appointment['location_id']) ? $appointment['location_id'] : '-99'
            );
        }
        
        if (empty($appointments)) {
            $this->send_error_response('No valid appointments to book');
        }
        
        // Prepare payment info
        $payment_info = null;
        if (!empty($data['payment'])) {
            $payment_info = $data['payment'];
        }
        
        // Book appointments
        $booking_api = new MB_API_Booking();
        $result = $booking_api->book_multiple_appointments($appointments, $client, $payment_info);
        
        // Check for complete failure
        if (empty($result['successful']) && !empty($result['failed'])) {
            $error_message = 'All bookings failed';
            if (!empty($result['failed'][0]['error'])) {
                $error_message .= ': ' . $result['failed'][0]['error'];
            }
            $this->send_error_response($error_message);
        }
        
        // Return mixed success/failure or complete success
        $this->send_success_response($result);
    }
    
    /**
     * Get client payment methods
     */
    public function get_payment_methods() {
        // Check nonce
        $this->verify_nonce();
        
        // Get client ID
        if (empty($_GET['client_id'])) {
            $this->send_error_response('Client ID is required');
        }
        
        $client_id = sanitize_text_field($_GET['client_id']);
        
        // Get client API
        $client_api = new MB_API_Client_Manager();
        
        // Get payment methods
        $payment_methods = $client_api->get_client_payment_methods($client_id);
        
        // Check for error
        if (is_wp_error($payment_methods)) {
            $this->send_error_response($payment_methods->get_error_message());
        }
        
        // Return success response
        $this->send_success_response($payment_methods);
    }
    
    /**
     * Verify nonce
     */
    private function verify_nonce() {
        // Check nonce if not in debug mode
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            check_ajax_referer('mb_booking_nonce', 'nonce');
        }
    }
    
    /**
     * Send success response
     * 
     * @param mixed $data Response data
     */
    private function send_success_response($data) {
        wp_send_json_success($data);
    }
    
    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param mixed $data Optional additional data
     */
    private function send_error_response($message, $data = null) {
        wp_send_json_error(array(
            'message' => $message,
            'data' => $data
        ));
    }
}

// Initialize AJAX handlers
new MB_Booking_AJAX();