// The Criterion Holistic Wellness Home — Cart Controller

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('criterion_cart')) || [];
    } catch (e) {
        console.error('Error reading cart from localStorage', e);
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem('criterion_cart', JSON.stringify(cart));
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
    } catch (e) {
        console.error('Error saving cart to localStorage', e);
    }
}

function formatNaira(amount) {
    return '₦' + Number(amount).toLocaleString('en-NG');
}

function renderCartPage() {
    const root = document.getElementById('cart-root');
    if (!root) return;

    let cart = getCart();

    // Enforce Rule: Consultation-required products must not be in the direct cart
    // If found, filter them out and notify the customer
    let consultationItemsFound = false;
    if (typeof CRITERION_PRODUCTS !== 'undefined') {
        const filteredCart = cart.filter(item => {
            const product = CRITERION_PRODUCTS[item.id];
            if (product && product.purchaseType === 'CONSULTATION_REQUIRED') {
                consultationItemsFound = true;
                return false;
            }
            return true;
        });

        if (consultationItemsFound) {
            cart = filteredCart;
            saveCart(cart);
        }
    }

    // EMPTY CART STATE
    if (!cart || cart.length === 0) {
        root.innerHTML = `
            <div class="cart-empty-state">
                <div class="empty-icon-circle">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-2V6l-3-4z"></path>
                    </svg>
                </div>
                <h2>Your Shopping Cart Is Empty</h2>
                <p>You have not added any natural wellness remedies to your cart yet. Explore our practitioner-formulated herbal solutions to get started.</p>
                ${consultationItemsFound ? `
                    <div class="cart-notice-box" style="max-width: 540px; margin: 0 auto 24px auto;">
                        <strong>Notice:</strong> Consultation-required protocols cannot be purchased directly through the cart. Please <a href="consultation.html">book a consultation</a> to begin your customized clinical pathway.
                    </div>
                ` : ''}
                <div class="empty-actions">
                    <a href="products.html" class="btn btn-primary">Explore Products</a>
                    <a href="consultation.html" class="btn btn-outline">Book a Consultation</a>
                </div>
            </div>
        `;
        return;
    }

    // ACTIVE CART WITH ITEMS
    let subtotal = 0;
    const itemsHTML = cart.map((item, index) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        subtotal += itemTotal;
        const catalogItem = (typeof CRITERION_PRODUCTS !== 'undefined') ? CRITERION_PRODUCTS[item.id] : null;
        const packSize = catalogItem ? catalogItem.packSize : (item.packSize || 'Standard Pack');

        return `
            <div class="cart-item-row" data-id="${item.id}">
                <div class="cart-item-media">
                    <a href="product-detail.html?id=${item.id}">
                        <img src="${item.img || 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=400&q=80'}" alt="${item.name}">
                    </a>
                </div>
                <div class="cart-item-details">
                    <span class="cart-item-cat">${catalogItem ? catalogItem.category : 'Herbal Remedy'}</span>
                    <h3 class="cart-item-title"><a href="product-detail.html?id=${item.id}">${item.name}</a></h3>
                    <div class="cart-item-meta">Pack: <span>${packSize}</span></div>
                    <div class="cart-item-unit-price">${formatNaira(item.price)} each</div>
                </div>
                <div class="cart-item-controls">
                    <div class="qty-widget" aria-label="Quantity selector">
                        <button type="button" class="qty-btn btn-qty-dec" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
                        <input type="text" class="qty-input" value="${item.quantity || 1}" readonly aria-label="Quantity">
                        <button type="button" class="qty-btn btn-qty-inc" data-id="${item.id}" aria-label="Increase quantity">&plus;</button>
                    </div>
                    <button type="button" class="cart-item-remove" data-id="${item.id}" aria-label="Remove ${item.name} from cart">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Remove
                    </button>
                </div>
                <div class="cart-item-subtotal">
                    <span class="subtotal-label">Subtotal</span>
                    <span class="subtotal-val">${formatNaira(itemTotal)}</span>
                </div>
            </div>
        `;
    }).join('');

    root.innerHTML = `
        ${consultationItemsFound ? `
            <div class="cart-notice-box" style="margin-bottom: 24px;">
                <strong>Notice:</strong> One or more consultation-required items were removed from your direct cart. Consultation-required protocols are arranged through our <a href="consultation.html">clinical consultation pathway</a>.
            </div>
        ` : ''}
        <div class="cart-layout-grid">
            <!-- Left: Cart Items List -->
            <div class="cart-items-column">
                <div class="cart-items-header">
                    <span>Product Details</span>
                    <span>Quantity & Total</span>
                </div>
                <div class="cart-items-list">
                    ${itemsHTML}
                </div>
                <div class="cart-list-actions">
                    <a href="products.html" class="btn btn-outline">&larr; Continue Shopping</a>
                    <button type="button" class="btn-clear-cart" id="btn-clear-cart">Clear Entire Cart</button>
                </div>
            </div>

            <!-- Right: Order Summary Sidebar -->
            <div class="cart-summary-column">
                <div class="cart-summary-card">
                    <h2>Order Summary</h2>
                    <div class="summary-line">
                        <span>Items Subtotal</span>
                        <span id="cart-subtotal-figure">${formatNaira(subtotal)}</span>
                    </div>
                    <div class="summary-line">
                        <span>Delivery Fee</span>
                        <span class="summary-muted">Calculated at checkout</span>
                    </div>
                    <div class="summary-divider"></div>
                    <div class="summary-line summary-total">
                        <span>Estimated Total</span>
                        <span id="cart-total-figure">${formatNaira(subtotal)}</span>
                    </div>
                    <p class="summary-note">
                        🌿 Sincere herbal formulations. Standard dispatch timeline and delivery arrangements confirmed during checkout.
                    </p>
                    <a href="checkout.html" class="btn btn-primary btn-full-width" style="margin-top: 18px;">
                        Proceed to Checkout &rarr;
                    </a>
                    <div class="summary-guarantees">
                        <div class="guarantee-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span>Quality Botanical Formulations</span>
                        </div>
                        <div class="guarantee-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                            <span>Nationwide Delivery in Nigeria</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attach Event Listeners
    attachCartEventListeners();
}

function attachCartEventListeners() {
    // Quantity Increment
    document.querySelectorAll('.btn-qty-inc').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const cart = getCart();
            const item = cart.find(i => i.id === id);
            if (item) {
                item.quantity = (item.quantity || 1) + 1;
                saveCart(cart);
                renderCartPage();
            }
        });
    });

    // Quantity Decrement
    document.querySelectorAll('.btn-qty-dec').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const cart = getCart();
            const item = cart.find(i => i.id === id);
            if (item) {
                if ((item.quantity || 1) > 1) {
                    item.quantity -= 1;
                } else {
                    // If quantity reaches 0, remove item
                    const idx = cart.indexOf(item);
                    cart.splice(idx, 1);
                }
                saveCart(cart);
                renderCartPage();
            }
        });
    });

    // Remove item
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            let cart = getCart();
            cart = cart.filter(i => i.id !== id);
            saveCart(cart);
            renderCartPage();
        });
    });

    // Clear entire cart
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your shopping cart?')) {
                saveCart([]);
                renderCartPage();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderCartPage();
});
