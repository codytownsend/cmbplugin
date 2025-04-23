<?php
/**
 * Enhanced API Client for Mindbody API
 * 
 * Handles communication with the Mindbody API with improved error handling and debugging
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_API_Client {
    /**
     * Mindbody API base URL
     */
    const API_BASE_URL = 'https://api.mindbodyonline.com/public/v6';
    
    /**
     * Make an authenticated GET request to the Mindbody API
     *
     * @param string $endpoint API endpoint (without base URL)
     * @param array $params Query parameters
     * @param string $token Authentication token (optional, will get a new one if not provided)
     * @return array|WP_Error Response data or WP_Error
     */
    public static function get($endpoint, $params = array(), $token = null) {
        // Get API credentials
        $credentials = self::get_api_credentials();
        
        // If no token provided, get a valid token
        if (!$token) {
            $auth = new MB_API_Auth();
            $token = $auth->get_valid_token();
            
            if (!$token) {
                return new WP_Error('auth_failed', 'Failed to get valid authentication token');
            }
        }
        
        // Build URL with parameters
        $url = self::API_BASE_URL . $endpoint;
        if (!empty($params)) {
            $url .= (strpos($url, '?') !== false) ? '&' : '?';
            $url .= http_build_query($params);
        }
        
        // Set up request arguments
        $args = array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Api-Key' => $credentials['api_key'],
                'SiteId' => $credentials['site_id'],
                'Authorization' => "Bearer $token"
            ),
            'timeout' => 30 // Increased timeout for better reliability
        );
        
        // Log request if debugging is enabled
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("Mindbody API GET Request: $url");
            error_log("Request headers: " . json_encode($args['headers']));
        }
        
        // Make the request
        $response = wp_remote_get($url, $args);
        
        // Handle response
        return self::handle_response($response, $url);
    }
    
    /**
     * Make an authenticated POST request to the Mindbody API
     *
     * @param string $endpoint API endpoint (without base URL)
     * @param array $data Request body data
     * @param string $token Authentication token (optional, will get a new one if not provided)
     * @return array|WP_Error Response data or WP_Error
     */
    public static function post($endpoint, $data = array(), $token = null) {
        // Get API credentials
        $credentials = self::get_api_credentials();
        
        // If no token provided, get a valid token
        if (!$token) {
            $auth = new MB_API_Auth();
            $token = $auth->get_valid_token();
            
            if (!$token) {
                return new WP_Error('auth_failed', 'Failed to get valid authentication token');
            }
        }
        
        // Build URL
        $url = self::API_BASE_URL . $endpoint;
        
        // Set up request arguments
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'Api-Key' => $credentials['api_key'],
                'SiteId' => $credentials['site_id'],
                'Authorization' => "Bearer $token"
            ),
            'body' => json_encode($data),
            'timeout' => 30 // Increased timeout for better reliability
        );
        
        // Log request if debugging is enabled
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("Mindbody API POST Request: $url");
            error_log("Request body: " . json_encode($data));
        }
        
        // Make the request
        $response = wp_remote_post($url, $args);
        
        // Handle response
        return self::handle_response($response, $url);
    }
    
    /**
     * Handle API response
     *
     * @param array|WP_Error $response Response from wp_remote_get/post
     * @param string $url Requested URL for logging
     * @return array|WP_Error Processed response data or WP_Error
     */
    private static function handle_response($response, $url) {
        // Check for request error
        if (is_wp_error($response)) {
            error_log("Mindbody API Request Error: " . $response->get_error_message());
            return $response;
        }
        
        // Get response code and body
        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        // Log response if debugging is enabled
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("Mindbody API Response ($url): Status $status_code");
            $truncated_body = substr(json_encode($body), 0, 1000); // Truncate long responses
            error_log("Response body (truncated): " . $truncated_body . (strlen(json_encode($body)) > 1000 ? "..." : ""));
        }
        
        // Check for API error
        if ($status_code >= 400) {
            $error_message = isset($body['Message']) ? $body['Message'] : "API error: HTTP $status_code";
            error_log("Mindbody API Error: $error_message");
            
            // Special error handling for token issues
            if ($status_code === 401) {
                // Clear tokens and try to get a new token
                $auth = new MB_API_Auth();
                $auth->clear_tokens();
                
                return new WP_Error('auth_expired', 'Authentication token expired. Please try your request again.');
            }
            
            return new WP_Error('api_error', $error_message, array(
                'status' => $status_code,
                'body' => $body
            ));
        }
        
        // Handle empty response
        if (empty($body)) {
            error_log("Mindbody API Warning: Empty response from $url");
            return new WP_Error('empty_response', 'Empty response from API');
        }
        
        return $body;
    }
    
    /**
     * Get API credentials from settings
     *
     * @return array Array of API credentials
     */
    public static function get_api_credentials() {
        return array(
            'api_key' => get_option('mindbody_api_key', ''),
            'site_id' => get_option('mindbody_site_id', ''),
            'staff_username' => get_option('mindbody_staff_username', ''),
            'staff_password' => get_option('mindbody_staff_password', '')
        );
    }
    
    /**
     * Test API connection
     *
     * @return boolean|WP_Error True on success, WP_Error on failure
     */
    public static function test_connection() {
        // Get API credentials
        $credentials = self::get_api_credentials();
        
        // Check if credentials are set
        if (empty($credentials['api_key']) || empty($credentials['site_id'])) {
            return new WP_Error('missing_credentials', 'API Key and Site ID are required');
        }
        
        // Test API connection
        $url = self::API_BASE_URL . '/site/sites';
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
            return new WP_Error('connection_failed', 'Connection failed: ' . $response->get_error_message());
        }
        
        // Check response code
        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if ($status_code !== 200 || !isset($body['Sites'])) {
            return new WP_Error('api_error', 'API error: Status code ' . $status_code);
        }
        
        return true;
    }
}