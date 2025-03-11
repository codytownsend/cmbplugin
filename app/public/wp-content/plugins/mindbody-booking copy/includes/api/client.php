<?php
/**
 * Client API Handler
 * 
 * Handles client-related operations with Mindbody
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_API_Client_Manager {
    /**
     * Get client by email
     * 
     * @param string $email Client email address
     * @return array|WP_Error Client data or WP_Error
     */
    public function get_client_by_email($email) {
        if (empty($email)) {
            return new WP_Error('missing_email', 'Email is required');
        }
        
        // Build query parameters
        $params = array(
            'SearchText' => $email
        );
        
        // Make API request
        $response = MB_API_Client::get('/client/clients', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if clients exist in response
        if (!isset($response['Clients']) || !is_array($response['Clients'])) {
            return new WP_Error('client_not_found', 'No client found with this email');
        }
        
        // Return first client (should be only one for exact email match)
        if (count($response['Clients']) > 0) {
            return $response['Clients'][0];
        }
        
        return new WP_Error('client_not_found', 'No client found with this email');
    }
    
    /**
     * Create or update client
     * 
     * @param array $client_data Client data including first_name, last_name, email, etc.
     * @return array|WP_Error Client data or WP_Error
     */
    public function create_or_update_client($client_data) {
        // Validate required fields
        $required_fields = array('first_name', 'last_name');
        foreach ($required_fields as $field) {
            if (empty($client_data[$field])) {
                return new WP_Error('missing_required_field', "Missing required field: $field");
            }
        }
        
        // Check if client exists by email
        $existing_client = null;
        if (!empty($client_data['email'])) {
            $existing_client = $this->get_client_by_email($client_data['email']);
            
            // If client exists, return client ID
            if (!is_wp_error($existing_client) && isset($existing_client['Id'])) {
                return $existing_client;
            }
        }
        
        // Format client data for API
        $api_client_data = array(
            'Client' => array(
                'FirstName' => $client_data['first_name'],
                'LastName' => $client_data['last_name'],
                'Email' => isset($client_data['email']) ? $client_data['email'] : '',
                'MobilePhone' => isset($client_data['phone']) ? $client_data['phone'] : '',
                'SendAccountEmails' => true,
                'SendAccountTexts' => true,
                'SendPromotionalEmails' => false,
                'SendPromotionalTexts' => false,
                'State' => isset($client_data['state']) ? $client_data['state'] : '',
                'AddressLine1' => isset($client_data['address']) ? $client_data['address'] : '',
                'City' => isset($client_data['city']) ? $client_data['city'] : '',
                'PostalCode' => isset($client_data['zip']) ? $client_data['zip'] : ''
            )
        );
        
        // Make API request
        $response = MB_API_Client::post('/client/addclient', $api_client_data);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check for client in response
        if (!isset($response['Client'])) {
            return new WP_Error('client_creation_failed', 'Client creation failed: No client data in response');
        }
        
        return $response['Client'];
    }
    
    /**
     * Get client services (purchased pricing options)
     * 
     * @param string $client_id Client ID
     * @param string $session_type_id Optional session type ID to filter by
     * @return array|WP_Error Client services or WP_Error
     */
    public function get_client_services($client_id, $session_type_id = null) {
        if (empty($client_id)) {
            return new WP_Error('missing_client_id', 'Client ID is required');
        }
        
        // Build query parameters
        $params = array(
            'request.clientId' => $client_id
        );
        
        // Add session type ID if provided
        if ($session_type_id) {
            $params['request.sessionTypeId'] = $session_type_id;
        }
        
        // Make API request
        $response = MB_API_Client::get('/client/clientservices', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if client services exist in response
        if (!isset($response['ClientServices']) || !is_array($response['ClientServices'])) {
            return array(); // Return empty array instead of error for no services
        }
        
        return $response['ClientServices'];
    }
    
    /**
     * Get client saved payment methods
     * 
     * @param string $client_id Client ID
     * @return array|WP_Error Payment methods or WP_Error
     */
    public function get_client_payment_methods($client_id) {
        if (empty($client_id)) {
            return new WP_Error('missing_client_id', 'Client ID is required');
        }
        
        // Build query parameters
        $params = array(
            'request.clientId' => $client_id
        );
        
        // Make API request
        $response = MB_API_Client::get('/client/clientpaymentmethods', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if payment methods exist in response
        if (!isset($response['PaymentMethods']) || !is_array($response['PaymentMethods'])) {
            return array(); // Return empty array instead of error for no payment methods
        }
        
        return $response['PaymentMethods'];
    }
}