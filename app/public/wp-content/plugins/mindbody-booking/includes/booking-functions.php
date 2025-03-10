<?php
/**
 * Booking-related functions
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render the booking form container
 */
function mindbody_render_booking_form($atts = []) {
    // Check if credentials are set
    $credentials = mindbody_get_api_credentials();
    if (empty($credentials['api_key']) || empty($credentials['site_id'])) {
        return '<div class="error">Please configure Mindbody API credentials in the admin settings.</div>';
    }
    
    // Check if staff token is available
    $staff_token = mindbody_get_staff_token();
    if (!$staff_token) {
        return '<div class="error">Unable to authenticate with Mindbody. Please check your staff credentials.</div>';
    }
    
    // Generate a unique ID for the booking container
    $container_id = 'mindbody-booking-widget-' . uniqid();
    
    // Return the container div
    return '<div id="mindbody-booking-widget" class="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl border"></div>';
}

/**
 * Display the booking widget in a specified location
 */
function mindbody_display_booking_widget() {
    echo mindbody_render_booking_form();
}

/**
 * Validate a booking request
 * 
 * @param array $booking_data The booking data to validate
 * @return array|bool An array of errors or true if valid
 */
function mindbody_validate_booking($booking_data) {
    $errors = [];
    
    // Check required client fields
    if (empty($booking_data['client']['firstName'])) {
        $errors['firstName'] = 'First name is required';
    }
    
    if (empty($booking_data['client']['lastName'])) {
        $errors['lastName'] = 'Last name is required';
    }
    
    if (empty($booking_data['client']['email'])) {
        $errors['email'] = 'Email is required';
    } elseif (!is_email($booking_data['client']['email'])) {
        $errors['email'] = 'Please enter a valid email address';
    }
    
    if (empty($booking_data['client']['phone'])) {
        $errors['phone'] = 'Phone number is required';
    }
    
    // Check payment info
    if (empty($booking_data['payment'])) {
        $errors['payment'] = 'Payment information is required';
    } elseif ($booking_data['payment']['PaymentType'] === 'Credit Card') {
        // Validate credit card payment details
        if (empty($booking_data['payment']['CreditCardNumber'])) {
            $errors['cardNumber'] = 'Credit card number is required';
        }
        
        if (empty($booking_data['payment']['ExpirationDate'])) {
            $errors['expiry'] = 'Expiration date is required';
        }
        
        if (empty($booking_data['payment']['CVV'])) {
            $errors['cvv'] = 'CVV is required';
        }
    }
    
    // Check appointment data
    if (empty($booking_data['appointments']) || !is_array($booking_data['appointments'])) {
        $errors['appointments'] = 'No appointments selected';
    } else {
        foreach ($booking_data['appointments'] as $index => $appointment) {
            if (empty($appointment['serviceId'])) {
                $errors["appointment[$index][serviceId]"] = 'Service is required';
            }
            
            if (empty($appointment['date'])) {
                $errors["appointment[$index][date]"] = 'Date is required';
            }
            
            if (empty($appointment['time'])) {
                $errors["appointment[$index][time]"] = 'Time is required';
            }
        }
    }
    
    return empty($errors) ? true : $errors;
}

/**
 * Format a payment error response
 * 
 * @param string $message The error message
 * @param array $errors Additional error details
 * @return array Formatted error response
 */
function mindbody_payment_error($message, $errors = []) {
    return [
        'success' => false,
        'message' => $message,
        'errors' => $errors
    ];
}

/**
 * Get the booking total amount
 * 
 * @param array $appointment_data The appointment data
 * @return float The total booking amount
 */
function mindbody_get_booking_total($appointment_data) {
    $total = 0;
    
    // Get session types for pricing information
    $session_types = mindbody_get_session_types();
    $session_type_map = [];
    
    foreach ($session_types as $session_type) {
        $session_type_map[$session_type['Id']] = $session_type;
    }
    
    // Calculate total
    foreach ($appointment_data['appointments'] as $appointment) {
        $session_type_id = $appointment['serviceId'];
        
        if (isset($session_type_map[$session_type_id])) {
            $total += $session_type_map[$session_type_id]['Price'] ?? 65; // Default price if not set
        } else {
            // Default price for unknown service
            $total += 65;
        }
    }
    
    // Add tax (8% as default)
    $tax_rate = 0.08;
    $tax = $total * $tax_rate;
    
    return [
        'subtotal' => $total,
        'tax' => $tax,
        'total' => $total + $tax
    ];
}