<?php
if (!defined('ABSPATH')) {
    exit;
}

// Fetch and store Mindbody Staff Authentication Token
function mindbody_get_staff_token() {
    $credentials = mindbody_get_api_credentials();
    
    // Check if credentials are set
    if (empty($credentials['api_key']) || empty(get_option('mindbody_staff_username')) || empty(get_option('mindbody_staff_password'))) {
        error_log('Mindbody API Token Error: Missing credentials.');
        return false;
    }

    // Check if a valid token exists
    $access_token = get_option('mindbody_access_token');
    $expires_at = get_option('mindbody_access_token_expires');

    if ($access_token && time() < $expires_at - 300) { // Refresh 5 mins before expiry
        // Token is still valid
        return $access_token;
    }
    
    error_log('Mindbody staff token expired or not found. Requesting new token...');

    // No valid token, request a new one
    $auth_url = "https://api.mindbodyonline.com/public/v6/usertoken/issue";

    $args = [
        'body' => json_encode([
            'Username' => get_option('mindbody_staff_username'),
            'Password' => get_option('mindbody_staff_password')
        ]),
        'headers' => [
            'Content-Type' => 'application/json',
            'Api-Key' => $credentials['api_key']
        ],
        'method' => 'POST',
        'timeout' => 15 // Increased timeout for reliability
    ];

    error_log('Requesting Mindbody staff token from: ' . $auth_url);
    $response = wp_remote_post($auth_url, $args);
    
    // Check for wp_remote_post errors
    if (is_wp_error($response)) {
        error_log('Mindbody API Token Error: ' . $response->get_error_message());
        return false;
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    $body_content = wp_remote_retrieve_body($response);
    $body = json_decode($body_content, true);

    // Log response details for debugging
    error_log('Mindbody API Token Response Code: ' . $status_code);
    
    if ($status_code !== 200) {
        error_log('Mindbody API Token Error: Non-200 status code');
        error_log('Response Body: ' . $body_content);
        return false;
    }

    if (!empty($body['AccessToken']) && !empty($body['Expires'])) {
        $access_token = $body['AccessToken'];
        $expires_at = strtotime($body['Expires']);

        // Store in WordPress options
        update_option('mindbody_access_token', $access_token);
        update_option('mindbody_access_token_expires', $expires_at);
        
        error_log('Mindbody staff token successfully obtained. Expires at: ' . date('Y-m-d H:i:s', $expires_at));
        return $access_token;
    }

    error_log('Mindbody API Token Error: Invalid response: ' . $body_content);
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

/**
 * Emergency function to clear invalid tokens
 */
function mindbody_clear_tokens() {
    delete_option('mindbody_access_token');
    delete_option('mindbody_access_token_expires');
    error_log('Mindbody tokens cleared');
}