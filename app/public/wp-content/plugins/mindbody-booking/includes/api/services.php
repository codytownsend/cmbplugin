<?php
/**
 * Services API Handler - Enhanced Version
 * 
 * Properly handles fetching service/session type data from Mindbody
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
     * @param boolean $include_pricing Whether to include default pricing 
     * @return array|WP_Error Array of services or WP_Error
     */
    public function get_session_types($online_only = true, $program_ids = array(), $include_pricing = true) {
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
            error_log('Error fetching session types: ' . $response->get_error_message());
            return $response;
        }
        
        // Check if session types exist in response
        if (!isset($response['SessionTypes']) || !is_array($response['SessionTypes'])) {
            error_log('Invalid response from API: SessionTypes not found');
            return new WP_Error('invalid_response', 'Invalid response from API: SessionTypes not found');
        }
        
        // Log the session types for debugging
        error_log('Fetched ' . count($response['SessionTypes']) . ' session types from API');
        
        // Process session types to ensure they have prices and descriptions
        if ($include_pricing) {
            $session_types = $this->process_session_types_pricing($response['SessionTypes']);
        } else {
            $session_types = $response['SessionTypes'];
        }
        
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
            error_log('Error getting bookable items: ' . $response->get_error_message());
            return $response;
        }
        
        // Check if availabilities exist in response
        if (!isset($response['Availabilities']) || !is_array($response['Availabilities']) || empty($response['Availabilities'])) {
            error_log('No availabilities found in bookable items response. Creating synthetic entries...');
            
            // If no availabilities, create synthetic entries from session types
            $session_types = $this->get_session_types(true, array(), true);
            
            $availabilities = array();
            
            // Convert session types to availabilities
            if (!is_wp_error($session_types)) {
                foreach ($session_types as $session_type) {
                    // Create a synthetic availability entry
                    $availabilities[] = array(
                        'SessionType' => $session_type,
                        'Staff' => null, // No staff assigned
                        'Price' => isset($session_type['Price']) ? array('Amount' => $session_type['Price']) : null
                    );
                }
                
                error_log('Created ' . count($availabilities) . ' synthetic availabilities');
            }
            
            return $availabilities;
        }
        
        // Enhance availabilities with full session type data
        $enhanced_availabilities = $this->enhance_availabilities($response['Availabilities']);
        
        return $enhanced_availabilities;
    }
    
    /**
     * Enhance availabilities with complete session type info
     * 
     * @param array $availabilities Availabilities from API
     * @return array Enhanced availabilities
     */
    private function enhance_availabilities($availabilities) {
        // Get all session types
        $session_types = $this->get_session_types(true, array(), true);
        
        // Create a map of session type by ID
        $session_type_map = array();
        if (!is_wp_error($session_types)) {
            foreach ($session_types as $session_type) {
                if (isset($session_type['Id'])) {
                    $session_type_map[$session_type['Id']] = $session_type;
                }
            }
        }
        
        // Enhance each availability with full session type info
        foreach ($availabilities as &$availability) {
            if (isset($availability['SessionType']) && isset($availability['SessionType']['Id'])) {
                $session_type_id = $availability['SessionType']['Id'];
                
                // Replace with full session type if available
                if (isset($session_type_map[$session_type_id])) {
                    // Preserve the original session type ID
                    $original_id = $availability['SessionType']['Id'];
                    
                    // Replace with full session type
                    $availability['SessionType'] = $session_type_map[$session_type_id];
                    
                    // Ensure ID is preserved
                    $availability['SessionType']['Id'] = $original_id;
                    
                    // Set price if not already set
                    if (!isset($availability['Price']) && isset($session_type_map[$session_type_id]['Price'])) {
                        $availability['Price'] = array(
                            'Amount' => $session_type_map[$session_type_id]['Price']
                        );
                    }
                }
            }
        }
        
        return $availabilities;
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
            error_log('Error getting available dates: ' . $response->get_error_message());
            return $response;
        }
        
        // Check if available dates exist in response
        if (!isset($response['AvailableDates']) || !is_array($response['AvailableDates'])) {
            error_log('Invalid response from API: AvailableDates not found');
            return new WP_Error('invalid_response', 'Invalid response from API: AvailableDates not found');
        }
        
        // If no available dates are returned, generate some synthetic ones for testing
        if (empty($response['AvailableDates']) && defined('WP_DEBUG') && WP_DEBUG) {
            error_log('No available dates found, generating synthetic dates for testing');
            $synthetic_dates = array();
            
            // Generate dates for the next 14 days
            for ($i = 0; $i < 14; $i++) {
                $date = date('Y-m-d', strtotime("+$i days"));
                $synthetic_dates[] = $date;
            }
            
            return $synthetic_dates;
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
            error_log('Error getting available times: ' . $response->get_error_message());
            return $response;
        }
        
        // Check if availabilities exist in response
        if (!isset($response['Availabilities']) || !is_array($response['Availabilities'])) {
            error_log('No time slots found for date: ' . $date);
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
        
        // If no time slots are found, generate synthetic ones for testing
        if (empty($time_slots) && defined('WP_DEBUG') && WP_DEBUG) {
            error_log('No time slots found, generating synthetic times for testing');
            
            // Generate times from 9 AM to 5 PM in 30-minute increments
            for ($hour = 9; $hour < 17; $hour++) {
                $time_slots[] = sprintf('%02d:00', $hour);
                $time_slots[] = sprintf('%02d:30', $hour);
            }
        }
        
        // Remove duplicates and sort
        $time_slots = array_unique($time_slots);
        sort($time_slots);
        
        return $time_slots;
    }
    
    /**
     * Process session types to ensure they have prices and descriptions
     * 
     * @param array $session_types Array of session types from API
     * @return array Processed session types with prices and descriptions
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
        
        // Default descriptions for service types
        $default_descriptions = array(
            'Personal Training' => 'One-on-one personal training session tailored to your fitness goals and needs.',
            'Training' => 'Personalized training session designed to help you reach your fitness goals.',
            'Massage' => 'Therapeutic massage to help with recovery and relaxation.',
            'Therapy' => 'Professional therapy session for recovery and rehabilitation.',
            'Consultation' => 'Initial consultation to discuss your fitness goals and create a plan.',
            'Nutrition' => 'Nutrition counseling to support your health and fitness objectives.'
        );
        
        // Process each session type
        foreach ($session_types as &$service) {
            // Skip if price is already set and valid
            if (!isset($service['Price']) || $service['Price'] <= 0) {
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
            
            // Add or enhance description if missing or minimal
            if (!isset($service['Description']) || empty($service['Description']) || strlen($service['Description']) < 20) {
                $found_description = false;
                
                // Try to match service name with default descriptions
                foreach ($default_descriptions as $keyword => $description) {
                    if (stripos($service['Name'], $keyword) !== false) {
                        $service['Description'] = $description;
                        $found_description = true;
                        break;
                    }
                }
                
                // Set generic description if still not set
                if (!$found_description) {
                    $duration = isset($service['Duration']) ? $service['Duration'] : 60;
                    $duration_text = $duration >= 60 ? floor($duration / 60) . ' hour' : $duration . ' minute';
                    if ($duration >= 60 && $duration % 60 > 0) {
                        $duration_text .= ' ' . ($duration % 60) . ' minute';
                    }
                    if ($duration >= 120 || ($duration >= 60 && $duration % 60 > 0)) {
                        $duration_text .= 's';
                    }
                    
                    $service['Description'] = "A {$duration_text} session with one of our professional staff members.";
                }
            }
        }
        
        return $session_types;
    }
}