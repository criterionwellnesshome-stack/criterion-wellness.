// The Criterion Holistic Wellness Home — Reusable Product Component & Catalog Engine

// ONE Reusable Product Card Component generator
function createProductCardHTML(product) {
    if (!product) return '';

    const isDirectPurchase = product.purchaseType === 'DIRECT_PURCHASE';
    const mainImg = (product.images && product.images.length > 0) ? product.images[0] : '';
    
    // Purchase action button depending on purchaseType
    const actionButtonHTML = isDirectPurchase ? `
        <button class="btn btn-card-primary btn-add-cart" 
                data-id="${product.id}" 
                data-name="${product.name}" 
                data-price="${product.price}" 
                data-img="${mainImg}"
                aria-label="Add ${product.name} to cart">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            Add to Cart
        </button>
    ` : `
        <a href="consultation.html" class="btn btn-card-consult" aria-label="Book a consultation for ${product.name}">
            Book Consultation
        </a>
    `;

    // Subtle tonal rhythm across product categories
    let toneClass = 'card-tone-ivory';
    if (product.category === 'Female Reproductive Wellness') toneClass = 'card-tone-sage';
    else if (product.category === 'Systemic & Microbial Detox') toneClass = 'card-tone-linen';
    else if (product.category === 'Digestive & Gastrointestinal Wellness') toneClass = 'card-tone-earth';

    return `
        <article class="product-card ${toneClass}" data-category="${product.category}" data-id="${product.id}">
            <div class="product-card-media">
                <img src="${mainImg}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-card-body">
                <span class="product-card-category">${product.category}</span>
                <h3><a href="product-detail.html?id=${product.id}">${product.name}</a></h3>
                <p class="product-card-desc">${product.shortDescription}</p>
                <div class="product-card-meta">
                    <span class="product-card-price">${product.formattedPrice}</span>
                </div>
                <div class="product-card-actions">
                    <a href="product-detail.html?id=${product.id}" class="btn btn-card-outline">View Details</a>
                    ${actionButtonHTML}
                </div>
            </div>
        </article>
    `;
}

// Render Products Catalog on products.html
function initProductsCatalog() {
    const catalogContainer = document.getElementById('catalog-products-grid');
    if (!catalogContainer || typeof CRITERION_PRODUCTS === 'undefined') return;

    function renderCategory(filter) {
        const productList = Object.values(CRITERION_PRODUCTS);
        let filtered = productList;

        if (filter === 'male') {
            filtered = productList.filter(p => p.category === 'Male Reproductive Care');
        } else if (filter === 'female') {
            filtered = productList.filter(p => p.category === 'Female Reproductive Wellness');
        } else if (filter === 'systemic') {
            filtered = productList.filter(p => p.category === 'Systemic & Microbial Detox');
        } else if (filter === 'digestive') {
            filtered = productList.filter(p => p.category === 'Digestive & Gastrointestinal Wellness');
        }

        catalogContainer.innerHTML = filtered.map(p => createProductCardHTML(p)).join('');
    }

    // Initial render: all
    renderCategory('all');

    // Filter pills
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const category = pill.getAttribute('data-filter') || 'all';
            renderCategory(category);
        });
    });
}

// Render Homepage Featured Products on index.html
function initFeaturedProducts() {
    const featuredContainer = document.getElementById('homepage-featured-grid');
    if (!featuredContainer || typeof CRITERION_PRODUCTS === 'undefined') return;

    // Selected first three products for homepage discovery in exact catalogue order:
    // 01: Micro-Guard, 02: Gonado-Guard, 03: Women's Cycle Support
    const featuredIds = ['micro-guard', 'gonado-guard', 'womens-cycle-support'];
    const featuredList = featuredIds.map(id => CRITERION_PRODUCTS[id]).filter(Boolean);

    featuredContainer.innerHTML = featuredList.map(p => createProductCardHTML(p)).join('');
}

// Toast Feedback Notification
function showToast(message, linkText, linkUrl) {
    let toast = document.getElementById('criterion-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'criterion-toast';
        toast.className = 'criterion-toast';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <span>&#10003; ${message}</span>
        ${linkText && linkUrl ? `<a href="${linkUrl}">${linkText} &rarr;</a>` : ''}
    `;
    
    toast.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Add to Cart event delegation
function initAddToCartListeners() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-add-cart');
        if (!btn) return;
        
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const price = parseInt(btn.getAttribute('data-price'), 10) || 0;
        const img = btn.getAttribute('data-img') || '';

        let cart = JSON.parse(localStorage.getItem('criterion_cart')) || [];
        const existingIndex = cart.findIndex(item => item.id === id);
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
        } else {
            cart.push({
                id: id,
                name: name,
                price: price,
                img: img,
                quantity: 1
            });
        }
        
        localStorage.setItem('criterion_cart', JSON.stringify(cart));
        
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
        
        showToast(`<strong>${name}</strong> added to cart!`, 'View Cart', 'cart.html');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initProductsCatalog();
    initFeaturedProducts();
    initAddToCartListeners();
});
