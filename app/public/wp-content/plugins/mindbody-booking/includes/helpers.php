<?php
/**
 * Helper functions
 * 
 * Utility functions for the booking widget
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Format phone number
 * 
 * @param string $phone_number Raw phone number
 * @return string Formatted phone number
 */
function mb_format_phone($phone_number) {
    // Remove all non-numeric characters
    $phone_number = preg_replace('/[^0-9]/', '', $phone_number);
    
    // Format based on length
    if (strlen($phone_number) === 10) {
        return '(' . substr($phone_number, 0, 3) . ') ' . substr($phone_number, 3, 3) . '-' . substr($phone_number, 6);
    } elseif (strlen($phone_number) === 11 && $phone_number[0] === '1') {
        return '(' . substr($phone_number, 1, 3) . ') ' . substr($phone_number, 4, 3) . '-' . substr($phone_number, 7);
    }
    
    // Return original if not a standard format
    return $phone_number;
}

/**
 * Format price
 * 
 * @param float $price Raw price
 * @param boolean $include_currency Whether to include currency symbol
 * @return string Formatted price
 */
function mb_format_price($price, $include_currency = true) {
    // Format with 2 decimal places
    $formatted = number_format((float) $price, 2, '.', ',');
    
    // Add currency symbol if requested
    if ($include_currency) {
        $formatted = '$' . $formatted;
    }
    
    return $formatted;
}

/**
 * Format date
 * 
 * @param string $date Date string
 * @param string $format Format string (default: Y-m-d)
 * @return string Formatted date
 */
function mb_format_date($date, $format = 'Y-m-d') {
    // Parse date
    $timestamp = strtotime($date);
    
    // Return formatted date
    return date($format, $timestamp);
}

/**
 * Format time
 * 
 * @param string $time Time string (HH:MM:SS or HH:MM)
 * @param boolean $include_period Whether to include AM/PM
 * @return string Formatted time
 */
function mb_format_time($time, $include_period = true) {
    // Extract hours and minutes
    $parts = explode(':', $time);
    $hour = (int) $parts[0];
    $minute = isset($parts[1]) ? (int) $parts[1] : 0;
    
    // Format based on 12-hour clock
    $period = '';
    if ($include_period) {
        $period = ($hour >= 12) ? ' PM' : ' AM';
        $hour = ($hour > 12) ? $hour - 12 : $hour;
        $hour = ($hour === 0) ? 12 : $hour;
    }
    
    // Format with leading zeros
    return sprintf('%d:%02d%s', $hour, $minute, $period);
}

/**
 * Get service categories
 * 
 * Group services into categories based on their names
 * 
 * @param array $services Array of service objects
 * @return array Associative array of category => services
 */
function mb_get_service_categories($services) {
    $categories = array();
    
    foreach ($services as $service) {
        $category = 'Other';
        
        // Try to determine category from service name
        $name = $service['Name'];
        
        if (stripos($name, 'Consultation') !== false || stripos($name, 'Consult') !== false || stripos($name, 'Tour') !== false) {
            $category = 'Consultation';
        } elseif (stripos($name, 'Training') !== false || stripos($name, '1on1') !== false || 
                 stripos($name, '2on1') !== false || stripos($name, '3on1') !== false) {
            $category = 'Training';
        } elseif (stripos($name, 'Massage') !== false || stripos($name, 'Therapy') !== false) {
            $category = 'Massage & Therapy';
        } elseif (stripos($name, 'Nutrition') !== false || stripos($name, 'Diet') !== false) {
            $category = 'Nutrition';
        }
        
        // Initialize category if not exist
        if (!isset($categories[$category])) {
            $categories[$category] = array();
        }
        
        // Add service to category
        $categories[$category][] = $service;
    }
    
    return $categories;
}

/**
 * Get default price for a service based on name
 * 
 * @param string $service_name Service name
 * @return float Default price
 */
function mb_get_default_price($service_name) {
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
    
    // Try to match name with price
    foreach ($default_prices as $keyword => $price) {
        if (stripos($service_name, $keyword) !== false) {
            return $price;
        }
    }
    
    // Default price
    return 65;
}

/**
 * Check if a date is in the past
 * 
 * @param string $date Date string
 * @return boolean Whether the date is in the past
 */
function mb_is_date_past($date) {
    $date_timestamp = strtotime($date);
    $today_timestamp = strtotime(date('Y-m-d'));
    
    return $date_timestamp < $today_timestamp;
}

/**
 * Group time slots by period (morning, afternoon, evening)
 * 
 * @param array $time_slots Array of time strings (HH:MM)
 * @return array Associative array of period => time slots
 */
function mb_group_time_slots($time_slots) {
    $grouped = array(
        'morning' => array(),
        'afternoon' => array(),
        'evening' => array()
    );
    
    foreach ($time_slots as $time) {
        $hour = (int) explode(':', $time)[0];
        
        if ($hour < 12) {
            $grouped['morning'][] = $time;
        } elseif ($hour < 17) {
            $grouped['afternoon'][] = $time;
        } else {
            $grouped['evening'][] = $time;
        }
    }
    
    return $grouped;
}

/**
 * Check if user is logged in to WordPress
 * 
 * @return boolean Whether user is logged in
 */
function mb_is_user_logged_in() {
    return is_user_logged_in();
}

/**
 * Get current user data
 * 
 * @return array|null User data or null if not logged in
 */
function mb_get_current_user_data() {
    if (!is_user_logged_in()) {
        return null;
    }
    
    $user = wp_get_current_user();
    
    return array(
        'id' => $user->ID,
        'email' => $user->user_email,
        'first_name' => $user->first_name,
        'last_name' => $user->last_name,
        'display_name' => $user->display_name
    );
}

/**
 * Generate calendar days for a month
 * 
 * @param int $year Year
 * @param int $month Month (1-12)
 * @param array $available_dates Array of available dates
 * @return array Array of day data for the calendar
 */
function mb_generate_calendar_days($year, $month, $available_dates = array()) {
    $days = array();
    
    // Convert available dates to Y-m-d format for comparison
    $formatted_available_dates = array();
    foreach ($available_dates as $date) {
        $formatted_available_dates[] = date('Y-m-d', strtotime($date));
    }
    
    // Get first day of the month
    $first_day = date('N', strtotime("$year-$month-01"));
    
    // Get number of days in the month
    $days_in_month = date('t', strtotime("$year-$month-01"));
    
    // Get today's date
    $today = date('Y-m-d');
    
    // Add empty days for days before the first day of the month
    for ($i = 1; $i < $first_day; $i++) {
        $days[] = array(
            'day' => null,
            'date' => null,
            'available' => false,
            'past' => false,
            'today' => false
        );
    }
    
    // Add days of the month
    for ($day = 1; $day <= $days_in_month; $day++) {
        $date = date('Y-m-d', strtotime("$year-$month-$day"));
        $is_available = in_array($date, $formatted_available_dates);
        $is_past = $date < $today;
        $is_today = $date === $today;
        
        $days[] = array(
            'day' => $day,
            'date' => $date,
            'available' => $is_available,
            'past' => $is_past,
            'today' => $is_today
        );
    }
    
    return $days;
}