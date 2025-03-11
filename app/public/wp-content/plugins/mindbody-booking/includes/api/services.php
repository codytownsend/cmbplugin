<?php
/**
 * Services API Handler
 * 
 * Handles fetching service/session type data from Mindbody
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_API_Services {
    /**
     * Get all session types (services) from Mindbody
     * 
     * @param boolean $online_only Whether to only return services bookable online
     * @param array $program_ids Optional array of program IDs to filter by
     * @return array|WP_Error Array of services or WP_Error
     */
    public function get_session_types($online_only = true, $program_ids = array()) {
        // Build query parameters
        $params = array();
        
        if ($online_only) {
            $params['request.onlineOnly'] = 'true';
        }
        
        // Add program IDs if provided
        if (!empty($program_ids)) {
            foreach ($program_ids as $index => $id) {
                $params["request.programIDs[$index]"] = $id;
            }
        }
        
        // Make API request
        $response = MB_API_Client::get('/site/sessiontypes', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if session types exist in response
        if (!isset($response['SessionTypes']) || !is_array($response['SessionTypes'])) {
            return new WP_Error('invalid_response', 'Invalid response from API: SessionTypes not found');
        }
        
        // ADD THIS FILTER: Filter session types to include only Appointment types
        $filtered_session_types = array();
        foreach ($response['SessionTypes'] as $session_type) {
            if (isset($session_type['Type']) && $session_type['Type'] === 'Appointment') {
                $filtered_session_types[] = $session_type;
            } else {
                error_log("⚠️ Skipping session type: " . print_r($session_type, true));
            }
        }
        
        // Replace original array with filtered array
        $response['SessionTypes'] = $filtered_session_types;
        
        // Process session types to ensure they have prices
        $session_types = $this->process_session_types_pricing($response['SessionTypes']);
        
        return $session_types;
    }
    
    /**
     * Get bookable items (services with availability info)
     * 
     * @param array $session_type_ids Array of session type IDs
     * @param string $start_date Start date in format YYYY-MM-DD
     * @param string $end_date End date in format YYYY-MM-DD
     * @param array $staff_ids Optional array of staff IDs to filter by
     * @param array $location_ids Optional array of location IDs to filter by
     * @return array|WP_Error Array of bookable items or WP_Error
     */
    public function get_bookable_items($session_type_ids, $start_date = null, $end_date = null, $staff_ids = array(), $location_ids = array()) {
        // Set default dates if not provided
        if (!$start_date) {
            $start_date = date('Y-m-d');
        }
        if (!$end_date) {
            $end_date = date('Y-m-d', strtotime('+7 days'));
        }
        
        // Format dates for API
        $start_date_formatted = $start_date . 'T00:00:00Z';
        $end_date_formatted = $end_date . 'T23:59:59Z';
        
        // Build query parameters
        $params = array(
            'request.startDate' => $start_date_formatted,
            'request.endDate' => $end_date_formatted,
            'request.locationId' => -99 // Default location ID
        );
        
        // Add session type IDs
        foreach ($session_type_ids as $index => $id) {
            $params["request.sessionTypeIds[$index]"] = $id;
        }
        
        // Add staff IDs if provided
        if (!empty($staff_ids)) {
            foreach ($staff_ids as $index => $id) {
                $params["request.staffIds[$index]"] = $id;
            }
        }
        
        // Add location IDs if provided
        if (!empty($location_ids)) {
            // Remove default location ID
            unset($params['request.locationId']);
            
            // Add specified location IDs
            foreach ($location_ids as $index => $id) {
                $params["request.locationIds[$index]"] = $id;
            }
        }
        
        // Make API request
        $response = MB_API_Client::get('/appointment/bookableitems', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if availabilities exist in response
        if (!isset($response['Availabilities']) || !is_array($response['Availabilities']) || empty($response['Availabilities'])) {
            // If no availabilities, create synthetic entries from session types
            $services_api = new MB_API_Services();
            $session_types = $services_api->get_session_types(true, array(), true); // Get only appointment types
            
            $availabilities = array();
            
            // Convert session types to availabilities
            if (!is_wp_error($session_types)) {
                foreach ($session_types as $session_type) {
                    if ($session_type['Type'] === 'Appointment') {
                        // Create a synthetic availability entry
                        $availabilities[] = array(
                            'SessionType' => $session_type,
                            'Staff' => null // No staff assigned
                        );
                    }
                }
            }
            
            return $availabilities;
        }
        
        return $response['Availabilities'];
    }
    
    /**
     * Get available dates for session types
     * 
     * @param string $session_type_id Session type ID
     * @param string $start_date Start date in format YYYY-MM-DD
     * @param string $end_date End date in format YYYY-MM-DD
     * @param string $staff_id Optional staff ID to filter by
     * @param string $location_id Optional location ID to filter by
     * @return array|WP_Error Array of available dates or WP_Error
     */
    public function get_available_dates($session_type_id, $start_date = null, $end_date = null, $staff_id = null, $location_id = '-99') {
        // Set default dates if not provided
        if (!$start_date) {
            $start_date = date('Y-m-d');
        }
        if (!$end_date) {
            $end_date = date('Y-m-d', strtotime('+30 days'));
        }
        
        // Format dates for API
        $start_date_formatted = $start_date . 'T00:00:00Z';
        $end_date_formatted = $end_date . 'T23:59:59Z';
        
        // Build query parameters
        $params = array(
            'request.sessionTypeId' => $session_type_id,
            'request.startDate' => $start_date_formatted,
            'request.endDate' => $end_date_formatted,
            'request.locationId' => $location_id
        );
        
        // Add staff ID if provided
        if ($staff_id) {
            $params['request.staffId'] = $staff_id;
        }
        
        // Make API request
        $response = MB_API_Client::get('/appointment/availabledates', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if available dates exist in response
        if (!isset($response['AvailableDates']) || !is_array($response['AvailableDates'])) {
            return new WP_Error('invalid_response', 'Invalid response from API: AvailableDates not found');
        }
        
        return $response['AvailableDates'];
    }
    
    /**
     * Get available time slots for a specific date
     * 
     * @param string $session_type_id Session type ID
     * @param string $date Date in format YYYY-MM-DD
     * @param string $staff_id Optional staff ID to filter by
     * @param string $location_id Optional location ID to filter by
     * @return array|WP_Error Array of available time slots or WP_Error
     */
    public function get_available_times($session_type_id, $date, $staff_id = null, $location_id = '-99') {
        // Format date for API
        $start_date_formatted = $date . 'T00:00:00Z';
        $end_date_formatted = $date . 'T23:59:59Z';
        
        // Build query parameters
        $params = array(
            'request.startDateTime' => $start_date_formatted,
            'request.endDateTime' => $end_date_formatted,
            'request.locationId' => $location_id
        );
        
        // Add session type ID
        $params["request.sessionTypeIds[0]"] = $session_type_id;
        
        // Add staff ID if provided
        if ($staff_id) {
            $params['request.staffId'] = $staff_id;
        }
        
        // Make API request
        $response = MB_API_Client::get('/appointment/bookableitems', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if availabilities exist in response
        if (!isset($response['Availabilities']) || !is_array($response['Availabilities'])) {
            return array(); // Return empty array instead of error for no availabilities
        }
        
        // Extract time slots from availabilities
        $time_slots = array();
        foreach ($response['Availabilities'] as $availability) {
            if (isset($availability['StartDateTime'])) {
                // Extract only the time portion (HH:MM)
                $time = date('H:i', strtotime($availability['StartDateTime']));
                $time_slots[] = $time;
            }
        }
        
        // Remove duplicates and sort
        $time_slots = array_unique($time_slots);
        sort($time_slots);
        
        return $time_slots;
    }
    
    /**
     * Process session types to ensure they have prices
     * 
     * @param array $session_types Array of session types from API
     * @return array Processed session types with prices
     */
    private function process_session_types_pricing($session_types) {
        // Default prices for different service types
        $default_prices = array(
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
        );
        
        // Process each session type
        foreach ($session_types as &$service) {
            // Skip if price is already set and valid
            if (isset($service['Price']) && $service['Price'] > 0) {
                continue;
            }
            
            // Try to match service name with default prices
            foreach ($default_prices as $keyword => $price) {
                if (stripos($service['Name'], $keyword) !== false) {
                    $service['Price'] = $price;
                    break;
                }
            }
            
            // Set default price if still not set
            if (!isset($service['Price']) || $service['Price'] <= 0) {
                $service['Price'] = 65; // Default price
            }
        }
        
        return $session_types;
    }
}