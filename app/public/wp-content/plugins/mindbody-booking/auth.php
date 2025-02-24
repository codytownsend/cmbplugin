<?php
if (!defined('ABSPATH')) {
    exit;
}

// Fetch and store Mindbody Staff Authentication Token
function mindbody_get_staff_token() {
    $credentials = mindbody_get_api_credentials();

    // Check if a valid token exists
    $access_token = get_option('mindbody_access_token');
    $expires_at = get_option('mindbody_access_token_expires');

    if ($access_token && time() < $expires_at - 300) { // Refresh 5 mins before expiry
        return $access_token;
    }

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
        'timeout' => 10
    ];

    $response = wp_remote_post($auth_url, $args);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (!empty($body['AccessToken']) && !empty($body['Expires'])) {
        $access_token = $body['AccessToken'];
        $expires_at = strtotime($body['Expires']);

        // Store in WordPress options
        update_option('mindbody_access_token', $access_token);
        update_option('mindbody_access_token_expires', $expires_at);

        return $access_token;
    }

    error_log('Mindbody API Token Error: Invalid response.');
    return false;
}
