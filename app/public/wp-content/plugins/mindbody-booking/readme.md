# Mindbody Booking System

A modern WordPress plugin for booking Mindbody services directly on your website.

## Features

- 🎨 Clean, modern UI for service booking
- 📅 Intuitive date and time selection 
- 💳 Streamlined checkout process
- 👥 Client registration and login
- 🔄 Integration with Mindbody API
- 📱 Fully responsive design
- ⚙️ Easy to configure and customize

## Installation

1. Download the plugin zip file
2. In your WordPress admin, go to Plugins > Add New > Upload Plugin
3. Upload the zip file and activate the plugin
4. Go to Mindbody Settings to configure your API credentials

## Configuration

### API Credentials

1. Go to Mindbody Settings in your WordPress admin
2. Enter your Mindbody API Key, Site ID, and Staff credentials
3. Click "Test API Connection" to verify your settings

### Adding the Booking Widget

Add the booking widget to any page using the shortcode:

```
[mindbody_booking]
```

### Shortcode Options

The booking widget can be customized with these attributes:

- `categories` - Comma-separated list of service categories to show (e.g. "Training,Massage")
- `show_filters` - Whether to show filtering options (default: true)
- `default_view` - Default view: services, calendar, or staff (default: services)
- `staff_id` - Restrict to a specific staff ID
- `location_id` - Restrict to a specific location ID

Example:
```
[mindbody_booking categories="Training,Massage" show_filters="false" default_view="calendar"]
```

## How It Works

### 1. Service Selection
Clients browse and select from your available services. Each service displays its name, duration, and price.

### 2. Date & Time Selection
After selecting a service, clients choose from available dates and times.

### 3. Authentication
New clients can create an account or existing clients can sign in to continue.

### 4. Checkout
Clients review their appointments, enter payment information, and complete the booking.

### 5. Confirmation
After successful booking, a confirmation screen shows appointment details.

## Requirements

- WordPress 5.6 or higher
- PHP 7.4 or higher
- Active Mindbody API credentials
- SSL certificate (recommended for secure payments)

## Troubleshooting

### API Connection Issues

- Verify your API credentials are correct
- Ensure your Mindbody site is active
- Check if your staff credentials have the necessary permissions
- Increase PHP timeout limits if experiencing timeouts

### Booking Problems

- Verify the service exists in your Mindbody account
- Check if you have correct staff assigned to the service
- Verify appointment availability in Mindbody

## Technical Details

This plugin uses a modern, modular JavaScript architecture with PHP for server-side API interactions. All communication with the Mindbody API is authenticated and secure.

### Security

- All API communications are secured with authentication tokens
- Payment information is sent directly through the Mindbody API
- WordPress nonce verification for all AJAX requests
- Input sanitization and validation

## Support

For support, please contact us at dev@doe.com.

## Changelog

### 1.0.0
- Initial release