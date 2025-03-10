<?php
if (!defined('ABSPATH')) {
    exit;
}

// Fetch and store Mindbody Staff Authentication Token
function mindbody_get_staff_token() {
    $credentials = mindbody_get_api_credentials();
    
    // Log credential information for debugging
    error_log('Debug - API Key: ' . (empty($credentials['api_key']) ? 'Missing' : 'Present'));
    error_log('Debug - Site ID: ' . $credentials['site_id']);
    error_log('Debug - Staff Username: ' . $credentials['staff_username']);
    error_log('Debug - Staff Password: ' . (empty($credentials['staff_password']) ? 'Missing' : 'Present'));
    
    // Check if credentials are set
    if (empty($credentials['api_key']) || empty($credentials['staff_username']) || empty($credentials['staff_password'])) {
        error_log('Mindbody API Token Error: Missing credentials.');
        return false;
    }

    // Check if a valid token exists
    $access_token = get_option('mindbody_access_token');
    $expires_at = get_option('mindbody_access_token_expires');

    if ($access_token && time() < $expires_at - 300) { // Refresh 5 mins before expiry
        // Token is still valid
        error_log('Debug - Using existing token, expires in: ' . ($expires_at - time()) . ' seconds');
        return $access_token;
    }

    // No valid token, request a new one
    $auth_url = "https://api.mindbodyonline.com/public/v6/usertoken/issue";

    $args = [
        'method' => 'POST',
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => $credentials['api_key'],
            'siteId' => $credentials['site_id'], // Important: siteId header is required
            'Accept' => 'application/json'
        ],
        'body' => json_encode([
            'Username' => $credentials['staff_username'],
            'Password' => $credentials['staff_password']
        ]),
        'timeout' => 15
    ];

    error_log('Debug - Requesting new token from: ' . $auth_url);
    $response = wp_remote_post($auth_url, $args);
    
    // Check for wp_remote_post errors
    if (is_wp_error($response)) {
        error_log('Mindbody API Token Error: ' . $response->get_error_message());
        return false;
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    error_log('Debug - Auth response code: ' . $status_code);
    error_log('Debug - Auth response body: ' . wp_remote_retrieve_body($response));
    
    if ($status_code !== 200) {
        error_log('Mindbody API Token Error: Non-200 status code ' . $status_code);
        error_log('Response Body: ' . wp_remote_retrieve_body($response));
        return false;
    }

    if (!empty($body['AccessToken'])) {
        $access_token = $body['AccessToken'];
        $expires_at = time() + ($body['ExpiresIn'] ?? 1800); // Default to 30 minutes if not provided

        // Store in WordPress options
        update_option('mindbody_access_token', $access_token);
        update_option('mindbody_access_token_expires', $expires_at);
        
        error_log('Debug - Successfully obtained new token, expires at: ' . date('Y-m-d H:i:s', $expires_at));
        return $access_token;
    }

    error_log('Mindbody API Token Error: Invalid response - missing AccessToken');
    return false;
}

/**
 * Helper function to validate a Mindbody token
 * 
 * @param string $token Token to validate
 * @return bool Whether the token is valid
 */
function mindbody_validate_token($token) {
    if (empty($token)) {
        return false;
    }
    
    $credentials = mindbody_get_api_credentials();
    $url = "https://api.mindbodyonline.com/public/v6/site/sites";
    
    $args = [
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => $credentials['api_key'],
            'SiteId' => $credentials['site_id'],
            'Authorization' => "Bearer " . $token
        ],
        'timeout' => 10
    ];
    
    $response = wp_remote_get($url, $args);
    
    if (is_wp_error($response)) {
        error_log('Mindbody token validation error: ' . $response->get_error_message());
        return false;
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    return $status_code === 200;
}

// Generate client authentication token
function mindbody_get_auth_token() {
    $credentials = mindbody_get_api_credentials();

    $url = 'https://api.mindbodyonline.com/public/v6/usertoken/issue';
    
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

    error_log("Requesting auth token with staff credentials");
    
    $response = wp_remote_post($url, $args);
    
    if (is_wp_error($response)) {
        error_log("Auth token error: " . $response->get_error_message());
        return false;
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if ($status_code !== 200 || empty($body['AccessToken'])) {
        error_log("Failed to obtain a valid Mindbody token. Status: " . $status_code);
        error_log("Response: " . wp_remote_retrieve_body($response));
        return false;
    }

    update_option('mindbody_auth_token', $body['AccessToken']);
    update_option('mindbody_auth_expiry', time() + ($body['ExpiresIn'] ?? 1800));

    return $body['AccessToken'];
}

// Ensure valid authentication token
function mindbody_get_valid_token() {
    $token = get_option('mindbody_auth_token');
    $expiry = get_option('mindbody_auth_expiry');

    if (!$token || time() >= $expiry - 300) { // Refresh 5 mins before expiry
        return mindbody_get_auth_token();
    }

    return $token;
}

// Get valid staff token - prefer this for admin operations
function mindbody_get_valid_staff_token() {
    // First try the dedicated staff token function
    $staff_token = mindbody_get_staff_token();
    if ($staff_token) {
        return $staff_token;
    }
    
    // Fall back to the regular token if staff token fails
    error_log("Staff token failed, falling back to regular token");
    return mindbody_get_valid_token();
}

/**
 * Emergency function to clear invalid tokens
 */
function mindbody_clear_tokens() {
    delete_option('mindbody_access_token');
    delete_option('mindbody_access_token_expires');
    delete_option('mindbody_auth_token');
    delete_option('mindbody_auth_expiry');
    error_log('Mindbody tokens cleared');
    return true;
}