<?php
/**
 * Availability API Handler
 * 
 * Handles availability related API interactions with Mindbody
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_API_Availability {
    /**
     * Get available dates for a session type
     * 
     * @param string $session_type_id Session type ID
     * @param string $start_date Start date (YYYY-MM-DD)
     * @param string $end_date End date (YYYY-MM-DD)
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
     * Verify availability for a specific appointment time
     * 
     * @param string $session_type_id Session type ID
     * @param string $date_time Date and time in format YYYY-MM-DDTHH:MM:SS
     * @param string $staff_id Optional staff ID to filter by
     * @param string $location_id Optional location ID to filter by
     * @return boolean Whether the appointment time is available
     */
    public function verify_availability($session_type_id, $date_time, $staff_id = null, $location_id = '-99') {
        // Parse date and time
        $date = date('Y-m-d', strtotime($date_time));
        $time = date('H:i', strtotime($date_time));
        
        // Get available times for the date
        $available_times = $this->get_available_times($session_type_id, $date, $staff_id, $location_id);
        
        if (is_wp_error($available_times)) {
            return false;
        }
        
        // Check if time is in available times
        return in_array($time, $available_times);
    }
    
    /**
     * Get active session times for a site
     * 
     * @param string $location_id Optional location ID to filter by
     * @return array|WP_Error Array of active session times or WP_Error
     */
    public function get_active_session_times($location_id = '-99') {
        // Build query parameters
        $params = array();
        
        if ($location_id) {
            $params['request.locationId'] = $location_id;
        }
        
        // Make API request
        $response = MB_API_Client::get('/appointment/activesessiontimes', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if times exist in response
        if (!isset($response['Times']) || !is_array($response['Times'])) {
            return array(); // Return empty array instead of error for no times
        }
        
        return $response['Times'];
    }
    
    /**
     * Get unavailabilities (when appointments cannot be booked)
     * 
     * @param string $start_date Start date (YYYY-MM-DD)
     * @param string $end_date End date (YYYY-MM-DD)
     * @param string $location_id Optional location ID to filter by
     * @return array|WP_Error Array of unavailabilities or WP_Error
     */
    public function get_unavailabilities($start_date = null, $end_date = null, $location_id = '-99') {
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
            'request.startDate' => $start_date_formatted,
            'request.endDate' => $end_date_formatted
        );
        
        if ($location_id) {
            $params['request.locationId'] = $location_id;
        }
        
        // Make API request
        $response = MB_API_Client::get('/appointment/unavailabilities', $params);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check if unavailabilities exist in response
        if (!isset($response['Unavailabilities']) || !is_array($response['Unavailabilities'])) {
            return array(); // Return empty array instead of error for no unavailabilities
        }
        
        return $response['Unavailabilities'];
    }
    
    /**
     * Get resource availabilities for a session type
     * 
     * @param string $session_type_id Session type ID
     * @param string $start_date Start date (YYYY-MM-DD)
     * @param string $end_date End date (YYYY-MM-DD)
     * @param string $location_id Optional location ID to filter by
     * @return array|WP_Error Array of resource availabilities or WP_Error
     */
    public function get_resource_availabilities($session_type_id, $start_date = null, $end_date = null, $location_id = '-99') {
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
            'request.sessionTypeId' => $session_type_id,
            'request.startDate' => $start_date_formatted,
            'request.endDate' => $end_date_formatted,
            'request.locationId' => $location_id,
            'request.includeResourceAvailability' => true
        );
        
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
        
        // Extract resource availabilities
        $resource_availabilities = array();
        foreach ($response['Availabilities'] as $availability) {
            if (isset($availability['Resources']) && is_array($availability['Resources'])) {
                foreach ($availability['Resources'] as $resource) {
                    $resource_availabilities[] = array(
                        'id' => $resource['Id'],
                        'name' => $resource['Name'],
                        'availability' => $availability
                    );
                }
            }
        }
        
        return $resource_availabilities;
    }
}