<?php
/**
 * Service selection template
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="mb-service-selection">
    <!-- Optional Filters -->
    <div class="mb-filters mb-hidden" data-show-filters="false">
        <div class="mb-filter-group">
            <label for="mb-category-filter">Category:</label>
            <select id="mb-category-filter" class="mb-select">
                <option value="">All Categories</option>
                <!-- Categories will be added dynamically -->
            </select>
        </div>
    </div>

    <!-- Service Categories -->
    <div class="mb-categories">
        <!-- Categories will be added dynamically -->
    </div>

    <!-- Category Template -->
    <template id="mb-category-template">
        <div class="mb-category">
            <h3 class="mb-category-title"></h3>
            <div class="mb-services">
                <!-- Services will be added dynamically -->
            </div>
        </div>
    </template>

    <!-- Service Template -->
    <template id="mb-service-template">
        <div class="mb-service">
            <div class="mb-service-header">
                <div class="mb-service-info">
                    <h4 class="mb-service-name"></h4>
                    <div class="mb-service-price"></div>
                    <div class="mb-service-duration"></div>
                </div>
                <button class="mb-service-select-btn">Select</button>
            </div>
            <div class="mb-service-description mb-hidden"></div>
            <div class="mb-service-staff mb-hidden">
                <h5>Select Provider</h5>
                <div class="mb-staff-options">
                    <div class="mb-staff-option mb-any-staff">
                        <div class="mb-staff-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M4 22a8 8 0 1 1 16 0H4zm8-9c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6z"/></svg>
                        </div>
                        <div class="mb-staff-info">
                            <div class="mb-staff-name">Any Available Provider</div>
                            <div class="mb-staff-subtitle">First available</div>
                        </div>
                    </div>
                    <!-- Staff options will be added dynamically -->
                </div>
            </div>
        </div>
    </template>

    <!-- Staff Option Template -->
    <template id="mb-staff-option-template">
        <div class="mb-staff-option">
            <div class="mb-staff-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M4 22a8 8 0 1 1 16 0H4zm8-9c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6z"/></svg>
            </div>
            <div class="mb-staff-info">
                <div class="mb-staff-name"></div>
                <div class="mb-staff-subtitle">Select provider</div>
            </div>
        </div>
    </template>

    <!-- No Services Template -->
    <template id="mb-no-services-template">
        <div class="mb-no-services">
            <div class="mb-no-services-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/></svg>
            </div>
            <h3>No Services Available</h3>
            <p>Sorry, there are no services available at this time. Please try again later.</p>
        </div>
    </template>
</div>