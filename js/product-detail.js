// Product Detail Page Controller

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 'gonado-guard';
    const product = CRITERION_PRODUCTS[productId] || CRITERION_PRODUCTS['gonado-guard'];

    // Update document title
    document.title = `${product.name} | The Criterion Holistic Wellness Home`;

    // Populate UI elements
    const breadcrumbName = document.getElementById('breadcrumb-product-name');
    if (breadcrumbName) breadcrumbName.textContent = product.name;

    const imgEl = document.getElementById('detail-image');
    if (imgEl) {
        imgEl.src = product.image;
        imgEl.alt = product.name;
    }

    const badgeEl = document.getElementById('detail-badge');
    if (badgeEl) badgeEl.textContent = product.badge;

    const titleEl = document.getElementById('detail-title');
    if (titleEl) titleEl.textContent = product.name;

    const categoryEl = document.getElementById('detail-category');
    if (categoryEl) categoryEl.textContent = product.category;

    const priceEl = document.getElementById('detail-price');
    if (priceEl) priceEl.textContent = product.formattedPrice;

    const formEl = document.getElementById('detail-form');
    if (formEl) formEl.textContent = product.form;

    const descEl = document.getElementById('detail-desc');
    if (descEl) descEl.textContent = product.description;

    const usageEl = document.getElementById('detail-usage');
    if (usageEl) usageEl.textContent = product.usage;

    const durationEl = document.getElementById('detail-duration');
    if (durationEl) durationEl.textContent = product.duration;

    // Populate Ingredients Table
    const tbody = document.getElementById('ingredients-tbody');
    if (tbody && product.ingredients) {
        tbody.innerHTML = product.ingredients.map(ing => `
            <tr>
                <td style="padding: 12px; font-weight: 600; color: var(--color-primary);">${ing.name}</td>
                <td style="padding: 12px; font-weight: 700; color: var(--color-accent);">${ing.percentage}</td>
                <td style="padding: 12px; color: #555;">${ing.role}</td>
            </tr>
        `).join('');
    }

    // Quantity Selector logic
    let currentQty = 1;
    const qtyInput = document.getElementById('qty-input');
    const btnMinus = document.getElementById('qty-minus');
    const btnPlus = document.getElementById('qty-plus');

    if (btnMinus && qtyInput) {
        btnMinus.addEventListener('click', () => {
            if (currentQty > 1) {
                currentQty--;
                qtyInput.value = currentQty;
            }
        });
    }

    if (btnPlus && qtyInput) {
        btnPlus.addEventListener('click', () => {
            currentQty++;
            qtyInput.value = currentQty;
        });
    }

    // Add to Cart Button
    const btnAddCart = document.getElementById('detail-add-cart');
    if (btnAddCart) {
        btnAddCart.addEventListener('click', () => {
            let cart = JSON.parse(localStorage.getItem('criterion_cart')) || [];
            const existingIndex = cart.findIndex(item => item.id === product.id);

            if (existingIndex > -1) {
                cart[existingIndex].quantity += currentQty;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    img: product.image,
                    quantity: currentQty
                });
            }

            localStorage.setItem('criterion_cart', JSON.stringify(cart));
            if (typeof updateCartCount === 'function') {
                updateCartCount();
            }

            // Notification
            btnAddCart.textContent = '✓ Added to Cart!';
            btnAddCart.style.backgroundColor = '#1F5E3B';
            setTimeout(() => {
                btnAddCart.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    Add to Cart
                `;
                btnAddCart.style.backgroundColor = '';
            }, 2500);
        });
    }

    // WhatsApp Order Button
    const btnWhatsapp = document.getElementById('btn-order-whatsapp');
    if (btnWhatsapp) {
        const phone = "2349012367492"; // Official Criterion Number
        const msg = encodeURIComponent(`Hello Criterion Holistic Wellness Home, I would like to order: ${product.name} (${product.formattedPrice}). Please guide me on payment and delivery.`);
        btnWhatsapp.href = `https://wa.me/${phone}?text=${msg}`;
    }
});
