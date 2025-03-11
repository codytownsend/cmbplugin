<?php
/**
 * Booking API Handler
 * 
 * Handles appointment booking with Mindbody
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MB_API_Booking {
    /**
     * Book an appointment
     * 
     * @param array $booking_data Booking data including client, service, staff, date/time
     * @return array|WP_Error Booking result or WP_Error
     */
    public function book_appointment($booking_data) {
        // Validate required fields
        $required_fields = array('client_id', 'session_type_id', 'start_date_time');
        foreach ($required_fields as $field) {
            if (empty($booking_data[$field])) {
                return new WP_Error('missing_required_field', "Missing required field: $field");
            }
        }
        
        // Format request data
        $request_data = array(
            'ClientId' => $booking_data['client_id'],
            'SessionTypeId' => $booking_data['session_type_id'],
            'LocationId' => isset($booking_data['location_id']) ? $booking_data['location_id'] : -99,
            'StartDateTime' => $booking_data['start_date_time'],
            'ApplyPayment' => isset($booking_data['apply_payment']) ? $booking_data['apply_payment'] : true,
            'SendEmail' => isset($booking_data['send_email']) ? $booking_data['send_email'] : true,
            'Test' => isset($booking_data['test']) ? $booking_data['test'] : false
        );
        
        // Add staff ID if provided
        if (!empty($booking_data['staff_id'])) {
            $request_data['StaffId'] = $booking_data['staff_id'];
        }
        
        // Add client service ID if provided
        if (!empty($booking_data['client_service_id'])) {
            $request_data['ClientServiceId'] = $booking_data['client_service_id'];
        }
        
        // Add payment info if provided
        if (!empty($booking_data['payment_info'])) {
            $request_data['PaymentInfo'] = $booking_data['payment_info'];
        }
        
        // Make API request
        $response = MB_API_Client::post('/appointment/addappointment', $request_data);
        
        // Check for API error
        if (is_wp_error($response)) {
            return $response;
        }
        
        // Check for appointment in response
        if (!isset($response['Appointment'])) {
            return new WP_Error('booking_failed', 'Booking failed: No appointment data in response', $response);
        }
        
        return $response;
    }
    
    /**
     * Book multiple appointments
     * 
     * @param array $appointments Array of appointment data
     * @param array $client_data Client data
     * @param array $payment_info Payment information
     * @return array|WP_Error Booking results or WP_Error
     */
    public function book_multiple_appointments($appointments, $client_data, $payment_info = null) {
        // Validate client data
        if (empty($client_data['id'])) {
            return new WP_Error('missing_client_id', 'Missing client ID');
        }
        
        // Process each appointment
        $successful_bookings = array();
        $failed_bookings = array();
        
        foreach ($appointments as $appointment) {
            // Prepare booking data
            $booking_data = array(
                'client_id' => $client_data['id'],
                'session_type_id' => $appointment['session_type_id'],
                'start_date_time' => $appointment['start_date_time'],
                'staff_id' => !empty($appointment['staff_id']) ? $appointment['staff_id'] : null,
                'location_id' => !empty($appointment['location_id']) ? $appointment['location_id'] : -99,
                'apply_payment' => true,
                'send_email' => true,
                'test' => false
            );
            
            // Add payment info to first appointment only (if provided)
            if ($payment_info && count($successful_bookings) === 0) {
                $booking_data['payment_info'] = $payment_info;
            }
            
            // Book the appointment
            $result = $this->book_appointment($booking_data);
            
            if (is_wp_error($result)) {
                $failed_bookings[] = array(
                    'appointment_data' => $appointment,
                    'error' => $result->get_error_message()
                );
            } else {
                $successful_bookings[] = $result['Appointment'];
            }
        }
        
        // Return results
        return array(
            'successful' => $successful_bookings,
            'failed' => $failed_bookings
        );
    }
    
    /**
     * Verify appointment availability
     * 
     * @param string $session_type_id Session type ID
     * @param string $date_time Date and time in format YYYY-MM-DDTHH:MM:SS
     * @param string $staff_id Optional staff ID
     * @param string $location_id Optional location ID
     * @return boolean Whether the appointment time is available
     */
    public function verify_availability($session_type_id, $date_time, $staff_id = null, $location_id = '-99') {
        // Parse date and time
        $date = date('Y-m-d', strtotime($date_time));
        
        // Get services API
        $services_api = new MB_API_Services();
        
        // Get available times for the date
        $available_times = $services_api->get_available_times($session_type_id, $date, $staff_id, $location_id);
        
        if (is_wp_error($available_times)) {
            return false;
        }
        
        // Extract time from date_time (HH:MM)
        $time = date('H:i', strtotime($date_time));
        
        // Check if time is in available times
        return in_array($time, $available_times);
    }
}