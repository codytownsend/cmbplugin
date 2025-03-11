<?php
/**
 * Checkout template
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="mb-checkout">
    <!-- Back button -->
    <div class="mb-checkout-header">
        <button class="mb-back-btn mb-back-to-auth">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z"/></svg>
            Back
        </button>
        <button class="mb-continue-shopping">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/></svg>
            Add More
        </button>
    </div>

    <!-- Cart Items -->
    <div class="mb-cart">
        <h3>Your Appointments</h3>
        <div class="mb-cart-items">
            <!-- Cart items will be added dynamically -->
        </div>
    </div>

    <!-- Contact Details -->
    <div class="mb-contact-details">
        <h3>Contact Details</h3>
        <form id="mb-contact-form" class="mb-form">
            <div class="mb-form-row">
                <div class="mb-form-group">
                    <label for="mb-firstname">First Name</label>
                    <input type="text" id="mb-firstname" name="first_name" required>
                </div>
                <div class="mb-form-group">
                    <label for="mb-lastname">Last Name</label>
                    <input type="text" id="mb-lastname" name="last_name" required>
                </div>
            </div>
            <div class="mb-form-row">
                <div class="mb-form-group">
                    <label for="mb-email">Email</label>
                    <input type="email" id="mb-email" name="email" required>
                </div>
                <div class="mb-form-group">
                    <label for="mb-phone">Phone</label>
                    <input type="tel" id="mb-phone" name="phone" required>
                </div>
            </div>
            
            <!-- Optional notes -->
            <div class="mb-form-group">
                <label for="mb-notes">Notes (optional)</label>
                <textarea id="mb-notes" name="notes" rows="2"></textarea>
            </div>
        </form>
    </div>

    <!-- Payment Section -->
    <div class="mb-payment">
        <div class="mb-payment-header">
            <h3>Payment Details</h3>
            <button id="mb-show-promo" class="mb-text-btn">
                Have a promo code?
            </button>
        </div>

        <!-- Promo Code (hidden by default) -->
        <div id="mb-promo-section" class="mb-promo-code mb-hidden">
            <div class="mb-form-row">
                <div class="mb-form-group mb-promo-input">
                    <input type="text" id="mb-promo-code" name="promo_code" placeholder="Enter promo code">
                </div>
                <button class="mb-btn mb-apply-promo">Apply</button>
            </div>
        </div>

        <!-- Payment Options -->
        <div id="mb-payment-options" class="mb-payment-options">
            <!-- Saved payment methods will be rendered here -->
        </div>

        <!-- Credit Card Form -->
        <div id="mb-card-form" class="mb-card-form">
            <div class="mb-form-group">
                <label for="mb-card-number">Card Number</label>
                <div class="mb-card-input">
                    <input type="text" id="mb-card-number" name="card_number" placeholder="•••• •••• •••• ••••" required>
                    <div id="mb-card-type" class="mb-card-type"></div>
                </div>
            </div>
            <div class="mb-form-row">
                <div class="mb-form-group">
                    <label for="mb-card-expiry">Expiry Date</label>
                    <input type="text" id="mb-card-expiry" name="expiry" placeholder="MM/YY" required>
                </div>
                <div class="mb-form-group">
                    <label for="mb-card-cvv">CVV</label>
                    <input type="text" id="mb-card-cvv" name="cvv" placeholder="•••" required maxlength="4">
                </div>
            </div>
        </div>

        <!-- Order Summary -->
        <div class="mb-order-summary">
            <div class="mb-summary-row">
                <span>Subtotal</span>
                <span class="mb-subtotal"></span>
            </div>
            <div class="mb-summary-row">
                <span>Tax</span>
                <span class="mb-tax"></span>
            </div>
            <div class="mb-summary-row mb-discount mb-hidden">
                <span>Discount</span>
                <span class="mb-discount-amount"></span>
            </div>
            <div class="mb-summary-row mb-total">
                <span>Total</span>
                <span class="mb-total-amount"></span>
            </div>
        </div>

        <!-- Complete Booking Button -->
        <button id="mb-complete-booking" class="mb-btn mb-primary-btn mb-complete-btn">
            Complete Booking
        </button>
    </div>

    <!-- Cart Item Template -->
    <template id="mb-cart-item-template">
        <div class="mb-cart-item">
            <div class="mb-cart-item-details">
                <h4 class="mb-cart-item-name"></h4>
                <div class="mb-cart-item-meta">
                    <span class="mb-cart-item-date"></span>
                    <span class="mb-cart-item-time"></span>
                    <span class="mb-cart-item-staff mb-hidden"></span>
                </div>
            </div>
            <div class="mb-cart-item-actions">
                <span class="mb-cart-item-price"></span>
                <div class="mb-cart-item-buttons">
                    <button class="mb-cart-item-edit">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="none" d="M0 0h24v24H0z"/><path d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z"/></svg>
                    </button>
                    <button class="mb-cart-item-remove">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </template>

    <!-- Saved Payment Method Template -->
    <template id="mb-saved-payment-method-template">
        <div class="mb-saved-payment-method">
            <input type="radio" name="payment_method" class="mb-payment-radio">
            <div class="mb-payment-method-info">
                <span class="mb-payment-method-card"></span>
            </div>
        </div>
    </template>

    <!-- New Payment Method Option Template -->
    <template id="mb-new-payment-method-template">
        <div class="mb-saved-payment-method">
            <input type="radio" name="payment_method" value="new" id="mb-payment-new" class="mb-payment-radio" checked>
            <label for="mb-payment-new" class="mb-payment-method-info">
                <span class="mb-payment-method-card">Use a new payment method</span>
            </label>
        </div>
    </template>

    <!-- Error Message Template -->
    <template id="mb-error-message-template">
        <div class="mb-error-message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>
            <span class="mb-error-text"></span>
        </div>
    </template>
</div>