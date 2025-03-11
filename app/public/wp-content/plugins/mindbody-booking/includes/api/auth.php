<?php
/**
 * Authentication Handler for Mindbody API
 * 
 * Handles token acquisition and management
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_API_Auth {
    /**
     * Get a valid staff user token
     * 
     * @return string|false Valid token or false on failure
     */
    public function get_valid_token() {
        // Try staff token first (preferred for admin operations)
        $staff_token = $this->get_staff_token();
        if ($staff_token) {
            return $staff_token;
        }
        
        // Fall back to user token if staff token fails
        $user_token = $this->get_user_token();
        if ($user_token) {
            return $user_token;
        }
        
        return false;
    }
    
    /**
     * Get a valid staff token
     * 
     * @return string|false Valid token or false on failure
     */
    public function get_staff_token() {
        // Check if a valid token exists
        $token = get_option('mindbody_staff_token');
        $expires = get_option('mindbody_staff_token_expires');
        
        // Return existing token if it's still valid (with 5 min buffer)
        if ($token && $expires && time() < ($expires - 300)) {
            return $token;
        }
        
        // Get API credentials
        $credentials = MB_API_Client::get_api_credentials();
        
        // Check if staff credentials are set
        if (empty($credentials['staff_username']) || empty($credentials['staff_password'])) {
            error_log('Mindbody API: Missing staff credentials');
            return false;
        }
        
        // Build request
        $url = 'https://api.mindbodyonline.com/public/v6/usertoken/issue';
        $args = array(
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
        
        // Make the request
        $response = wp_remote_post($url, $args);
        
        // Check for request error
        if (is_wp_error($response)) {
            error_log('Mindbody API Auth Error: ' . $response->get_error_message());
            return false;
        }
        
        // Get response code and body
        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        // Check for successful response
        if ($status_code === 200 && !empty($body['AccessToken'])) {
            // Calculate expiry time
            $expires = isset($body['Expires']) ? strtotime($body['Expires']) : (time() + 7200); // Default 2 hours
            
            // Store token and expiry
            update_option('mindbody_staff_token', $body['AccessToken']);
            update_option('mindbody_staff_token_expires', $expires);
            
            return $body['AccessToken'];
        }
        
        // Log error
        error_log('Mindbody API Auth Error: Failed to get staff token. Status: ' . $status_code);
        error_log('Response: ' . wp_remote_retrieve_body($response));
        
        return false;
    }
    
    /**
     * Get a valid user token
     * 
     * @return string|false Valid token or false on failure
     */
    public function get_user_token() {
        // This is a fallback if staff token fails
        // Implement if needed, following same pattern as staff token
        return false;
    }
    
    /**
     * Validate an existing token
     * 
     * @param string $token Token to validate
     * @return boolean Whether token is valid
     */
    public function validate_token($token) {
        if (empty($token)) {
            return false;
        }
        
        // Get API credentials
        $credentials = MB_API_Client::get_api_credentials();
        
        // Make a simple API request to validate token
        $url = 'https://api.mindbodyonline.com/public/v6/site/sites';
        $args = array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Api-Key' => $credentials['api_key'],
                'SiteId' => $credentials['site_id'],
                'Authorization' => "Bearer $token"
            ),
            'timeout' => 10
        );
        
        $response = wp_remote_get($url, $args);
        
        // Check response code
        if (is_wp_error($response)) {
            return false;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        return $status_code === 200;
    }
    
    /**
     * Clear invalid tokens
     */
    public function clear_tokens() {
        delete_option('mindbody_staff_token');
        delete_option('mindbody_staff_token_expires');
        delete_option('mindbody_user_token');
        delete_option('mindbody_user_token_expires');
        
        error_log('Mindbody API: Tokens cleared');
    }
}