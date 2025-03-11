/**
 * Checkout Module
 * 
 * Handles checkout form and payment processing
 */

const MBCheckout = {
    /**
     * Cart state
     */
    cart: {
        items: [],
        subtotal: 0,
        tax: 0.06, // 6% tax rate
        discount: 0,
        total: 0
    },
    
    /**
     * Initialize checkout
     * 
     * @param {Object} options Configuration options
     */
    init: function(options = {}) {
        // Set default options
        this.options = Object.assign({
            cartItemsContainer: '.mb-cart-items',
            cartItemTemplate: '#mb-cart-item-template',
            promoCodeButton: '#mb-show-promo',
            promoCodeSection: '#mb-promo-section',
            applyPromoButton: '.mb-apply-promo',
            promoCodeInput: '#mb-promo-code',
            continueShoppingButton: '.mb-continue-shopping',
            subtotalElement: '.mb-subtotal',
            taxElement: '.mb-tax',
            discountContainer: '.mb-discount',
            discountElement: '.mb-discount-amount',
            totalElement: '.mb-total-amount',
            cardNumberInput: '#mb-card-number',
            cardTypeElement: '#mb-card-type',
            expiryInput: '#mb-card-expiry',
            cvvInput: '#mb-card-cvv',
            completeButton: '#mb-complete-booking',
            contactForm: '#mb-contact-form',
            onEditItem: null,
            onRemoveItem: null,
            onCompletePurchase: null,
            onContinueShopping: null
        }, options);
        
        // Initialize cart
        if (options.cart) {
            this.cart = Object.assign(this.cart, options.cart);
        }
        
        // Update cart totals
        this.updateTotals();
        
        // Render cart items
        this.renderCartItems();
        
        // Update order summary
        this.updateOrderSummary();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up form formatters
        this.setupFormFormatters();
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Promo code button
        const promoCodeButton = document.querySelector(this.options.promoCodeButton);
        if (promoCodeButton) {
            promoCodeButton.addEventListener('click', () => {
                const promoSection = document.querySelector(this.options.promoCodeSection);
                if (promoSection) {
                    promoSection.classList.toggle('mb-hidden');
                }
            });
        }
        
        // Apply promo code button
        const applyPromoButton = document.querySelector(this.options.applyPromoButton);
        if (applyPromoButton) {
            applyPromoButton.addEventListener('click', () => {
                const promoInput = document.querySelector(this.options.promoCodeInput);
                if (promoInput) {
                    const code = promoInput.value.trim();
                    if (code) {
                        this.applyPromoCode(code);
                    }
                }
            });
        }
        
        // Continue shopping button
        const continueShoppingButton = document.querySelector(this.options.continueShoppingButton);
        if (continueShoppingButton) {
            continueShoppingButton.addEventListener('click', () => {
                if (typeof this.options.onContinueShopping === 'function') {
                    this.options.onContinueShopping();
                }
            });
        }
        
        // Cart item edit buttons
        const cartContainer = document.querySelector(this.options.cartItemsContainer);
        if (cartContainer) {
            cartContainer.addEventListener('click', (e) => {
                const editButton = e.target.closest('.mb-cart-item-edit');
                if (editButton) {
                    const cartItem = editButton.closest('.mb-cart-item');
                    const itemId = cartItem.dataset.itemId;
                    
                    if (typeof this.options.onEditItem === 'function') {
                        this.options.onEditItem(itemId);
                    }
                }
            });
        }
        
        // Cart item remove buttons
        if (cartContainer) {
            cartContainer.addEventListener('click', (e) => {
                const removeButton = e.target.closest('.mb-cart-item-remove');
                if (removeButton) {
                    const cartItem = removeButton.closest('.mb-cart-item');
                    const itemId = cartItem.dataset.itemId;
                    
                    this.removeItem(itemId);
                    
                    if (typeof this.options.onRemoveItem === 'function') {
                        this.options.onRemoveItem(itemId);
                    }
                }
            });
        }
        
        // Complete purchase button
        const completeButton = document.querySelector(this.options.completeButton);
        if (completeButton) {
            completeButton.addEventListener('click', () => {
                this.completePurchase();
            });
        }
    },
    
    /**
     * Set up form formatters
     */
    setupFormFormatters: function() {
        // Credit card formatter
        const cardNumberInput = document.querySelector(this.options.cardNumberInput);
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', () => {
                this.formatCardNumber(cardNumberInput);
            });
            
            // Initial format
            this.formatCardNumber(cardNumberInput);
        }
        
        // Expiry date formatter
        const expiryInput = document.querySelector(this.options.expiryInput);
        if (expiryInput) {
            expiryInput.addEventListener('input', () => {
                this.formatExpiryDate(expiryInput);
            });
            
            // Initial format
            this.formatExpiryDate(expiryInput);
        }
        
        // CVV formatter
        const cvvInput = document.querySelector(this.options.cvvInput);
        if (cvvInput) {
            cvvInput.addEventListener('input', () => {
                this.formatCVV(cvvInput);
            });
            
            // Initial format
            this.formatCVV(cvvInput);
        }
    },
    
    /**
     * Render cart items
     */
    renderCartItems: function() {
        // Get container
        const container = document.querySelector(this.options.cartItemsContainer);
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Get template
        const template = document.getElementById(this.options.cartItemTemplate.substring(1));
        if (!template) return;
        
        // Render each item
        this.cart.items.forEach(item => {
            // Clone template
            const itemElement = template.content.cloneNode(true);
            
            // Set item details
            const cartItem = itemElement.querySelector('.mb-cart-item');
            cartItem.dataset.itemId = item.id;
            
            // Set item properties
            itemElement.querySelector('.mb-cart-item-name').textContent = item.serviceName;
            itemElement.querySelector('.mb-cart-item-date').textContent = MBUtils.formatDate(item.date);
            itemElement.querySelector('.mb-cart-item-time').textContent = MBUtils.formatTime(item.time);
            itemElement.querySelector('.mb-cart-item-price').textContent = MBUtils.formatPrice(item.servicePrice);
            
            // Show staff name if available
            const staffElement = itemElement.querySelector('.mb-cart-item-staff');
            if (item.staffName) {
                staffElement.textContent = item.staffName;
                staffElement.classList.remove('mb-hidden');
            } else {
                staffElement.classList.add('mb-hidden');
            }
            
            // Add to container
            container.appendChild(itemElement);
        });
    },
    
    /**
     * Update cart totals
     */
    updateTotals: function() {
        // Calculate subtotal
        this.cart.subtotal = this.cart.items.reduce((total, item) => total + item.servicePrice, 0);
        
        // Calculate total
        this.cart.total = this.cart.subtotal + (this.cart.subtotal * this.cart.tax) - (this.cart.discount || 0);
    },
    
    /**
     * Update order summary
     */
    updateOrderSummary: function() {
        // Get elements
        const subtotalElement = document.querySelector(this.options.subtotalElement);
        const taxElement = document.querySelector(this.options.taxElement);
        const discountContainer = document.querySelector(this.options.discountContainer);
        const discountElement = document.querySelector(this.options.discountElement);
        const totalElement = document.querySelector(this.options.totalElement);
        
        // Update values
        if (subtotalElement) {
            subtotalElement.textContent = MBUtils.formatPrice(this.cart.subtotal);
        }
        
        if (taxElement) {
            taxElement.textContent = MBUtils.formatPrice(this.cart.subtotal * this.cart.tax);
        }
        
        if (discountElement) {
            discountElement.textContent = `-${MBUtils.formatPrice(this.cart.discount)}`;
        }
        
        if (discountContainer) {
            if (this.cart.discount > 0) {
                discountContainer.classList.remove('mb-hidden');
            } else {
                discountContainer.classList.add('mb-hidden');
            }
        }
        
        if (totalElement) {
            totalElement.textContent = MBUtils.formatPrice(this.cart.total);
        }
    },
    
    /**
     * Apply promo code
     * 
     * @param {string} code Promo code
     */
    applyPromoCode: function(code) {
        // TODO: Implement API call to validate promo code
        // For now, just apply a 10% discount
        this.cart.discount = this.cart.subtotal * 0.1;
        
        // Update totals
        this.updateTotals();
        
        // Update order summary
        this.updateOrderSummary();
        
        // Show success message
        alert(`Promo code "${code}" applied!`);
    },
    
    /**
     * Remove item from cart
     * 
     * @param {string} itemId Item ID
     */
    removeItem: function(itemId) {
        // Remove item from cart
        this.cart.items = this.cart.items.filter(item => item.id.toString() !== itemId);
        
        // Update totals
        this.updateTotals();
        
        // Render cart items
        this.renderCartItems();
        
        // Update order summary
        this.updateOrderSummary();
    },
    
    /**
     * Format credit card number
     * 
     * @param {HTMLInputElement} input Card number input
     */
    formatCardNumber: function(input) {
        // Get input value
        let value = input.value.replace(/\D/g, '');
        
        // Detect card type
        const cardType = MBUtils.detectCardType(value);
        
        // Update card type indicator
        const cardTypeElement = document.querySelector(this.options.cardTypeElement);
        if (cardTypeElement) {
            cardTypeElement.className = 'mb-card-type';
            if (cardType) {
                cardTypeElement.classList.add(`mb-card-${cardType.toLowerCase()}`);
            }
        }
        
        // Format with spaces
        if (value.length > 0) {
            value = value.match(/.{1,4}/g).join(' ');
        }
        
        // Update input value
        input.value = value;
    },
    
    /**
     * Format expiry date
     * 
     * @param {HTMLInputElement} input Expiry date input
     */
    formatExpiryDate: function(input) {
        // Get input value
        let value = input.value.replace(/\D/g, '');
        
        // Format MM/YY
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        
        // Update input value
        input.value = value;
    },
    
    /**
     * Format CVV
     * 
     * @param {HTMLInputElement} input CVV input
     */
    formatCVV: function(input) {
        // Get input value and keep only digits
        input.value = input.value.replace(/\D/g, '');
    },
    
    /**
     * Get form data
     * 
     * @return {Object} Form data
     */
    getFormData: function() {
        // Get form elements
        const form = document.querySelector(this.options.contactForm);
        if (!form) return null;
        
        // Get form values
        const firstName = form.querySelector('input[name="first_name"]')?.value || '';
        const lastName = form.querySelector('input[name="last_name"]')?.value || '';
        const email = form.querySelector('input[name="email"]')?.value || '';
        const phone = form.querySelector('input[name="phone"]')?.value || '';
        const notes = form.querySelector('textarea[name="notes"]')?.value || '';
        
        // Get payment information
        const cardNumber = document.querySelector(this.options.cardNumberInput)?.value.replace(/\s/g, '') || '';
        const expiry = document.querySelector(this.options.expiryInput)?.value || '';
        const cvv = document.querySelector(this.options.cvvInput)?.value || '';
        
        // Parse expiry date
        let expMonth = '';
        let expYear = '';
        if (expiry) {
            const parts = expiry.split('/');
            if (parts.length === 2) {
                expMonth = parts[0];
                expYear = parts[1];
            }
        }
        
        // Create form data object
        const formData = {
            contact: {
                firstName,
                lastName,
                email,
                phone,
                notes
            },
            payment: {
                cardNumber,
                expMonth,
                expYear,
                cvv
            }
        };
        
        return formData;
    },
    
    /**
     * Validate form
     * 
     * @param {Object} formData Form data
     * @return {boolean} Whether form is valid
     */
    validateForm: function(formData) {
        // Check contact details
        if (!formData.contact.firstName) {
            this.showError('Please enter your first name');
            return false;
        }
        
        if (!formData.contact.lastName) {
            this.showError('Please enter your last name');
            return false;
        }
        
        if (!formData.contact.email) {
            this.showError('Please enter your email address');
            return false;
        }
        
        if (!MBUtils.validateEmail(formData.contact.email)) {
            this.showError('Please enter a valid email address');
            return false;
        }
        
        if (!formData.contact.phone) {
            this.showError('Please enter your phone number');
            return false;
        }
        
        // Check payment details
        if (!formData.payment.cardNumber) {
            this.showError('Please enter your card number');
            return false;
        }
        
        if (formData.payment.cardNumber.length < 13) {
            this.showError('Please enter a valid card number');
            return false;
        }
        
        if (!formData.payment.expMonth || !formData.payment.expYear) {
            this.showError('Please enter your card expiry date');
            return false;
        }
        
        if (!formData.payment.cvv) {
            this.showError('Please enter your card security code (CVV)');
            return false;
        }
        
        return true;
    },
    
    /**
     * Show error message
     * 
     * @param {string} message Error message
     */
    showError: function(message) {
        // Check if error message already exists
        let errorElement = document.querySelector('.mb-error-message');
        
        if (!errorElement) {
            // Create error element
            errorElement = document.createElement('div');
            errorElement.className = 'mb-error-message';
            errorElement.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>
                <span class="mb-error-text">${message}</span>
            `;
            
            // Add to page before complete button
            const completeButton = document.querySelector(this.options.completeButton);
            if (completeButton) {
                completeButton.insertAdjacentElement('beforebegin', errorElement);
            }
        } else {
            // Update existing error message
            errorElement.querySelector('.mb-error-text').textContent = message;
        }
        
        // Scroll to error
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    
    /**
     * Complete purchase
     */
    completePurchase: function() {
        // Get form data
        const formData = this.getFormData();
        if (!formData) return;
        
        // Validate form
        if (!this.validateForm(formData)) {
            return;
        }
        
        // Disable complete button and show loading state
        const completeButton = document.querySelector(this.options.completeButton);
        if (completeButton) {
            const originalText = completeButton.textContent;
            completeButton.disabled = true;
            completeButton.innerHTML = '<span class="mb-spinner"></span> Processing...';
            
            // Enable button after timeout (for demo purposes)
            setTimeout(() => {
                completeButton.disabled = false;
                completeButton.textContent = originalText;
            }, 30000); // 30 seconds timeout
        }
        
        // Call onCompletePurchase callback
        if (typeof this.options.onCompletePurchase === 'function') {
            this.options.onCompletePurchase(formData, this.cart);
        }
    }
};

// Export module globally
window.MBCheckout = MBCheckout;