<?php
/**
 * Authentication form template
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="mb-auth-form">
    <div class="mb-auth-header">
        <h2>Sign In to Complete Booking</h2>
        <p>Please sign in or create an account to confirm your appointment</p>
    </div>

    <div class="mb-auth-tabs">
        <button class="mb-auth-tab mb-tab-active" data-tab="login">Login</button>
        <button class="mb-auth-tab" data-tab="register">Register</button>
    </div>

    <div class="mb-auth-content">
        <!-- Login Form -->
        <div class="mb-auth-panel mb-login-panel mb-panel-active">
            <form id="mb-login-form" class="mb-form">
                <div class="mb-form-group">
                    <label for="mb-login-email">Email</label>
                    <input type="email" id="mb-login-email" name="email" required>
                </div>
                <div class="mb-form-group">
                    <label for="mb-login-password">Password</label>
                    <input type="password" id="mb-login-password" name="password" required>
                </div>
                <div class="mb-form-error mb-hidden"></div>
                <button type="submit" class="mb-btn mb-primary-btn mb-login-btn">Login</button>
            </form>
        </div>

        <!-- Registration Form -->
        <div class="mb-auth-panel mb-register-panel">
            <form id="mb-register-form" class="mb-form">
                <div class="mb-form-row">
                    <div class="mb-form-group">
                        <label for="mb-register-first-name">First Name</label>
                        <input type="text" id="mb-register-first-name" name="first_name" required>
                    </div>
                    <div class="mb-form-group">
                        <label for="mb-register-last-name">Last Name</label>
                        <input type="text" id="mb-register-last-name" name="last_name" required>
                    </div>
                </div>
                <div class="mb-form-group">
                    <label for="mb-register-email">Email</label>
                    <input type="email" id="mb-register-email" name="email" required>
                </div>
                <div class="mb-form-group">
                    <label for="mb-register-phone">Phone</label>
                    <input type="tel" id="mb-register-phone" name="phone" required>
                </div>
                <div class="mb-form-group">
                    <label for="mb-register-password">Password</label>
                    <input type="password" id="mb-register-password" name="password" required>
                </div>
                <div class="mb-form-error mb-hidden"></div>
                <button type="submit" class="mb-btn mb-primary-btn mb-register-btn">Register</button>
            </form>
        </div>
    </div>

    <!-- Back button -->
    <div class="mb-auth-footer">
        <button class="mb-back-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z"/></svg>
            Back to Date & Time
        </button>
    </div>
</div>