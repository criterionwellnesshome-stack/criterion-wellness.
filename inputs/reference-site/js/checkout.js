// The Criterion Holistic Wellness Home — Checkout Controller

const NIGERIAN_STATES = [
    "Kwara", "Lagos", "Abuja FCT", "Oyo", "Osun", "Ogun", "Ondo", "Ekiti",
    "Rivers", "Delta", "Edo", "Enugu", "Anambra", "Imo", "Abia", "Akwa Ibom",
    "Cross River", "Bayelsa", "Kano", "Kaduna", "Katsina", "Plateau", "Benue",
    "Niger", "Kogi", "Nasarawa", "Bauchi", "Gombe", "Borno", "Adamawa", "Yobe",
    "Taraba", "Sokoto", "Kebbi", "Zamfara", "Jigawa"
];

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('criterion_cart')) || [];
    } catch (e) {
        return [];
    }
}

function formatNaira(amount) {
    return '₦' + Number(amount).toLocaleString('en-NG');
}

function renderCheckoutPage() {
    const root = document.getElementById('checkout-root');
    if (!root) return;

    const cart = getCart();

    // 01. EMPTY CART GUARD
    if (!cart || cart.length === 0) {
        root.innerHTML = `
            <div class="cart-empty-state">
                <div class="empty-icon-circle">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-2V6l-3-4z"></path>
                    </svg>
                </div>
                <h2>Your Shopping Cart Is Empty</h2>
                <p>You cannot proceed to checkout without any products in your cart. Please explore our herbal catalog first.</p>
                <div class="empty-actions">
                    <a href="products.html" class="btn btn-primary">Browse Products</a>
                    <a href="cart.html" class="btn btn-outline">View Cart</a>
                </div>
            </div>
        `;
        return;
    }

    // 02. CALCULATE SUMMARY
    let subtotal = 0;
    const summaryItemsHTML = cart.map(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        subtotal += itemTotal;
        return `
            <div class="checkout-summary-item">
                <div class="summary-item-img">
                    <img src="${item.img || 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=150&q=80'}" alt="${item.name}">
                    <span class="summary-item-qty">${item.quantity || 1}</span>
                </div>
                <div class="summary-item-info">
                    <h4>${item.name}</h4>
                    <span class="summary-item-price">${formatNaira(item.price)} each</span>
                </div>
                <div class="summary-item-total">
                    ${formatNaira(itemTotal)}
                </div>
            </div>
        `;
    }).join('');

    // State options
    const stateOptionsHTML = NIGERIAN_STATES.map(st => `<option value="${st}">${st}</option>`).join('');

    // 03. RENDER CHECKOUT TWO-COLUMN LAYOUT
    root.innerHTML = `
        <div class="checkout-layout-grid">
            <!-- Left: Checkout Form -->
            <div class="checkout-form-column">
                <form id="checkout-form" novalidate>
                    
                    <!-- SECTION 1: Customer Information -->
                    <div class="checkout-section-card">
                        <div class="section-card-header">
                            <span class="step-badge">1</span>
                            <h3>Customer Information</h3>
                        </div>
                        <p class="section-intro">We need your contact information to communicate order confirmation and dispatch progress.</p>
                        
                        <div class="form-group">
                            <label for="cust-fullname">Full Name <span class="required-star">*</span></label>
                            <input type="text" id="cust-fullname" name="fullname" class="form-control" placeholder="e.g. Adebayo Ogunlesi" required>
                            <span class="form-error" id="err-fullname"></span>
                        </div>

                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label for="cust-phone">Phone Number <span class="required-star">*</span></label>
                                <input type="tel" id="cust-phone" name="phone" class="form-control" placeholder="e.g. 0803 123 4567" required>
                                <span class="form-hint">Used for order verification and delivery calls</span>
                                <span class="form-error" id="err-phone"></span>
                            </div>
                            <div class="form-group flex-1">
                                <label for="cust-email">Email Address <span class="optional-tag">(Optional)</span></label>
                                <input type="email" id="cust-email" name="email" class="form-control" placeholder="e.g. adebayo@example.com">
                                <span class="form-hint">For receiving order status updates</span>
                                <span class="form-error" id="err-email"></span>
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 2: Delivery Details -->
                    <div class="checkout-section-card">
                        <div class="section-card-header">
                            <span class="step-badge">2</span>
                            <h3>Delivery Information</h3>
                        </div>
                        <p class="section-intro">Provide the physical address where your package will be delivered.</p>
                        
                        <div class="form-group">
                            <label for="deliv-address">Street Address <span class="required-star">*</span></label>
                            <input type="text" id="deliv-address" name="address" class="form-control" placeholder="House number, street name, estate, or landmark" required>
                            <span class="form-error" id="err-address"></span>
                        </div>

                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label for="deliv-state">State <span class="required-star">*</span></label>
                                <select id="deliv-state" name="state" class="form-control" required>
                                    <option value="">Select Delivery State...</option>
                                    ${stateOptionsHTML}
                                </select>
                                <span class="form-error" id="err-state"></span>
                            </div>
                            <div class="form-group flex-1">
                                <label for="deliv-city">City / Town <span class="required-star">*</span></label>
                                <input type="text" id="deliv-city" name="city" class="form-control" placeholder="e.g. Ilorin, Ikeja, Garki" required>
                                <span class="form-error" id="err-city"></span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="deliv-notes">Delivery Instructions / Landmarks <span class="optional-tag">(Optional)</span></label>
                            <textarea id="deliv-notes" name="notes" class="form-control" rows="2" placeholder="e.g. Opposite Central Mosque, call when near the gate"></textarea>
                        </div>

                        <div class="delivery-notice-box">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <div>
                                <strong>Delivery Notice:</strong> Dispatch fees vary based on exact destination and courier service. Our care coordinator will confirm the delivery dispatch fee with you upon order confirmation.
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 3: Payment Method -->
                    <div class="checkout-section-card">
                        <div class="section-card-header">
                            <span class="step-badge">3</span>
                            <h3>Payment Method Selection</h3>
                        </div>
                        <p class="section-intro">Choose your preferred payment pathway. Select an option below to proceed.</p>

                        <div class="payment-methods-grid">
                            <!-- Paystack Option -->
                            <label class="payment-option-card" for="pay-paystack">
                                <input type="radio" id="pay-paystack" name="payment_method" value="paystack" checked>
                                <div class="payment-option-content">
                                    <div class="payment-option-title">
                                        <strong>Paystack (Cards, USSD, Bank Transfer)</strong>
                                        <span class="payment-badge">Online Payment</span>
                                    </div>
                                    <p class="payment-option-desc">Secure instant payment via debit card, USSD, or direct account transfer.</p>
                                    <div class="preview-mode-tag">
                                        Preview Mode: Live Paystack processing will be enabled upon production launch. No real debit occurs in this preview.
                                    </div>
                                </div>
                            </label>

                            <!-- Direct Bank Transfer Option -->
                            <label class="payment-option-card" for="pay-transfer">
                                <input type="radio" id="pay-transfer" name="payment_method" value="bank_transfer">
                                <div class="payment-option-content">
                                    <div class="payment-option-title">
                                        <strong>Direct Bank Transfer</strong>
                                        <span class="payment-badge-alt">Manual Transfer</span>
                                    </div>
                                    <p class="payment-option-desc">Direct electronic transfer to The Criterion Holistic Wellness Home official business account.</p>
                                    <div class="bank-details-notice">
                                        Official account credentials and reference instructions will be provided upon order request review.
                                    </div>
                                </div>
                            </label>
                        </div>
                        <span class="form-error" id="err-payment"></span>
                    </div>

                    <!-- Submission Action -->
                    <div class="checkout-submit-area">
                        <button type="submit" class="btn btn-primary btn-full-width btn-place-order" id="btn-submit-order">
                            Place Order Request &rarr;
                        </button>
                        <p class="submit-disclaimer">
                            By placing this order request, you agree to our <a href="terms.html">Terms of Service</a> and <a href="delivery-policy.html">Delivery Policy</a>.
                        </p>
                    </div>

                </form>
            </div>

            <!-- Right: Order Summary Sidebar -->
            <div class="checkout-summary-column">
                <div class="checkout-summary-card">
                    <h2>Order Summary</h2>
                    <div class="summary-items-list">
                        ${summaryItemsHTML}
                    </div>

                    <div class="summary-divider"></div>

                    <div class="summary-line">
                        <span>Items Subtotal</span>
                        <span>${formatNaira(subtotal)}</span>
                    </div>
                    <div class="summary-line">
                        <span>Delivery Fee</span>
                        <span class="summary-muted">To be confirmed</span>
                    </div>

                    <div class="summary-divider"></div>

                    <div class="summary-line summary-total">
                        <span>Order Total</span>
                        <span class="highlight-price">${formatNaira(subtotal)}</span>
                    </div>

                    <div class="checkout-reassurance-box">
                        <div class="reassurance-item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span>Practitioner-Verified Herbal Formulations</span>
                        </div>
                        <div class="reassurance-item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span>Direct Consultation & Support Line</span>
                        </div>
                    </div>

                    <a href="cart.html" class="summary-back-link">&larr; Return to Cart to Edit Items</a>
                </div>
            </div>
        </div>
    `;

    // Attach form submission validation
    attachCheckoutValidation(subtotal, cart);
}

function attachCheckoutValidation(subtotal, cart) {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear previous error messages
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));

        let isValid = true;

        // 1. Full Name
        const nameInput = document.getElementById('cust-fullname');
        const nameVal = nameInput ? nameInput.value.trim() : '';
        if (!nameVal || nameVal.length < 3) {
            isValid = false;
            showFieldError('err-fullname', nameInput, 'Please provide your full name (minimum 3 characters).');
        }

        // 2. Phone Number
        const phoneInput = document.getElementById('cust-phone');
        const phoneVal = phoneInput ? phoneInput.value.trim() : '';
        const phoneRegex = /^[0-9+\s\-()]{10,16}$/;
        if (!phoneVal || !phoneRegex.test(phoneVal)) {
            isValid = false;
            showFieldError('err-phone', phoneInput, 'Please provide a valid contact phone number (10 to 14 digits).');
        }

        // 3. Email (Optional, but validated if supplied)
        const emailInput = document.getElementById('cust-email');
        const emailVal = emailInput ? emailInput.value.trim() : '';
        if (emailVal) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                isValid = false;
                showFieldError('err-email', emailInput, 'Please enter a valid email address.');
            }
        }

        // 4. Street Address
        const addrInput = document.getElementById('deliv-address');
        const addrVal = addrInput ? addrInput.value.trim() : '';
        if (!addrVal || addrVal.length < 6) {
            isValid = false;
            showFieldError('err-address', addrInput, 'Please provide a complete street delivery address.');
        }

        // 5. State
        const stateInput = document.getElementById('deliv-state');
        const stateVal = stateInput ? stateInput.value : '';
        if (!stateVal) {
            isValid = false;
            showFieldError('err-state', stateInput, 'Please select your delivery state.');
        }

        // 6. City
        const cityInput = document.getElementById('deliv-city');
        const cityVal = cityInput ? cityInput.value.trim() : '';
        if (!cityVal || cityVal.length < 2) {
            isValid = false;
            showFieldError('err-city', cityInput, 'Please provide your delivery city or town.');
        }

        // 7. Payment Method
        const paymentRadio = document.querySelector('input[name="payment_method"]:checked');
        const paymentMethod = paymentRadio ? paymentRadio.value : '';
        if (!paymentMethod) {
            isValid = false;
            const errPayment = document.getElementById('err-payment');
            if (errPayment) errPayment.textContent = 'Please select a payment method.';
        }

        if (!isValid) {
            const firstInvalid = document.querySelector('.is-invalid');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid.focus();
            }
            return;
        }

        // Notes
        const notesInput = document.getElementById('deliv-notes');
        const notesVal = notesInput ? notesInput.value.trim() : '';

        // COMPILE FRONTEND ORDER REPRESENTATION
        const orderData = {
            orderId: 'CRIT-ORD-' + Math.floor(100000 + Math.random() * 900000),
            customer: {
                fullName: nameVal,
                phone: phoneVal,
                email: emailVal || null
            },
            delivery: {
                address: addrVal,
                state: stateVal,
                city: cityVal,
                notes: notesVal || null
            },
            items: cart.map(i => ({
                id: i.id,
                name: i.name,
                price: i.price,
                quantity: i.quantity || 1,
                itemSubtotal: (i.price || 0) * (i.quantity || 1)
            })),
            subtotal: subtotal,
            deliveryFeeStatus: 'To be confirmed upon dispatch review',
            total: subtotal,
            paymentMethod: paymentMethod === 'paystack' ? 'Paystack (Cards, USSD, Bank)' : 'Direct Bank Transfer',
            paymentStatus: 'PENDING_VERIFICATION',
            orderStatus: 'ORDER_REQUEST_RECEIVED',
            createdAt: new Date().toISOString()
        };

        // Render Confirmation View
        renderOrderConfirmation(orderData);
    });
}

function showFieldError(errorId, inputEl, message) {
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('is-invalid');
}

function renderOrderConfirmation(order) {
    const root = document.getElementById('checkout-root');
    if (!root) return;

    // Update Progress Stepper in Header
    const stepper = document.querySelector('.checkout-stepper');
    if (stepper) {
        stepper.innerHTML = `
            <div class="step-node completed">
                <span class="step-num">&#10003;</span>
                <span class="step-label">Cart</span>
            </div>
            <div class="step-line active"></div>
            <div class="step-node completed">
                <span class="step-num">&#10003;</span>
                <span class="step-label">Delivery & Payment</span>
            </div>
            <div class="step-line active"></div>
            <div class="step-node current">
                <span class="step-num">&#10003;</span>
                <span class="step-label">Confirmed</span>
            </div>
        `;
    }

    const itemsSummaryHTML = order.items.map(it => `
        <li class="conf-item-row">
            <span><strong>${it.quantity}&times;</strong> ${it.name}</span>
            <span>${formatNaira(it.itemSubtotal)}</span>
        </li>
    `).join('');

    root.innerHTML = `
        <div class="confirmation-panel">
            <div class="confirmation-icon-circle">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>

            <span class="section-tag" style="margin-bottom: 8px;">Order Request Received</span>
            <h2 class="confirmation-title">Thank You, ${order.customer.fullName}</h2>
            <p class="confirmation-subtitle">
                Your order request has been compiled and received by the Criterion Holistic Wellness Home frontend flow.
            </p>

            <div class="order-ref-card">
                <div class="order-ref-label">Order Request Reference</div>
                <div class="order-ref-value">${order.orderId}</div>
            </div>

            <!-- Notice explaining local frontend simulation accurately -->
            <div class="confirmation-notice-box">
                <h4>What Happens Next?</h4>
                <p>
                    Our dispensary team reviews your requested herbal remedies. A Criterion care representative will contact you via phone or WhatsApp (<strong>${order.customer.phone}</strong>) to confirm your exact delivery destination, provide payment details for your selected method (<strong>${order.paymentMethod}</strong>), and schedule dispatch.
                </p>
            </div>

            <div class="confirmation-details-grid">
                <!-- Customer & Delivery -->
                <div class="conf-card">
                    <h3>Delivery Details</h3>
                    <p><strong>Recipient:</strong> ${order.customer.fullName}</p>
                    <p><strong>Phone:</strong> ${order.customer.phone}</p>
                    ${order.customer.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ''}
                    <p><strong>Address:</strong> ${order.delivery.address}, ${order.delivery.city}, ${order.delivery.state} State</p>
                    ${order.delivery.notes ? `<p><strong>Notes:</strong> ${order.delivery.notes}</p>` : ''}
                </div>

                <!-- Order Recap -->
                <div class="conf-card">
                    <h3>Order Items Recap</h3>
                    <ul class="conf-items-list">
                        ${itemsSummaryHTML}
                    </ul>
                    <div class="conf-total-line">
                        <span>Items Subtotal:</span>
                        <strong>${formatNaira(order.subtotal)}</strong>
                    </div>
                    <div class="conf-total-line">
                        <span>Selected Payment:</span>
                        <span>${order.paymentMethod}</span>
                    </div>
                </div>
            </div>

            <div class="confirmation-actions">
                <a href="products.html" class="btn btn-primary">Return to Herbal Catalog</a>
                <a href="index.html" class="btn btn-outline">Back to Home</a>
            </div>
        </div>
    `;

    // Clear cart in localStorage after order request compilation
    try {
        localStorage.removeItem('criterion_cart');
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
    } catch (e) {
        console.error('Error resetting cart', e);
    }

    // Scroll to top of confirmation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    renderCheckoutPage();
});
