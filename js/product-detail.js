// The Criterion Holistic Wellness Home — Product Detail Page Controller

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 'gonado-guard';
    
    if (typeof CRITERION_PRODUCTS === 'undefined') {
        console.error('CRITERION_PRODUCTS data not found');
        return;
    }

    const product = CRITERION_PRODUCTS[productId] || CRITERION_PRODUCTS['gonado-guard'];

    // Document Title
    document.title = `${product.name} | The Criterion Holistic Wellness Home`;

    // Breadcrumb
    const breadcrumbName = document.getElementById('breadcrumb-product-name');
    if (breadcrumbName) breadcrumbName.textContent = product.name;

    // 01. PRODUCT HERO (GALLERY & DETAILS)
    const categoryEl = document.getElementById('detail-category');
    if (categoryEl) categoryEl.textContent = product.category;

    const badgeEl = document.getElementById('detail-badge');
    if (badgeEl) badgeEl.textContent = product.badge || product.category;

    const titleEl = document.getElementById('detail-title');
    if (titleEl) titleEl.textContent = product.name;

    const positioningEl = document.getElementById('detail-positioning');
    if (positioningEl) positioningEl.textContent = product.shortDescription;

    const priceEl = document.getElementById('detail-price');
    if (priceEl) priceEl.textContent = product.formattedPrice;

    const packSizeEl = document.getElementById('detail-pack-size');
    if (packSizeEl) packSizeEl.textContent = product.packSize;

    const availabilityEl = document.getElementById('detail-availability');
    if (availabilityEl) {
        availabilityEl.textContent = product.availability;
        if (product.purchaseType === 'DIRECT_PURCHASE') {
            availabilityEl.className = 'detail-availability-badge in-stock';
        } else {
            availabilityEl.className = 'detail-availability-badge consult-required';
        }
    }

    // Gallery Images
    const mainImageEl = document.getElementById('gallery-main-image');
    const thumbContainer = document.getElementById('gallery-thumbs');
    const images = (product.images && product.images.length > 0) ? product.images : ['https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80'];

    if (mainImageEl) {
        mainImageEl.src = images[0];
        mainImageEl.alt = product.name;
    }

    if (thumbContainer) {
        thumbContainer.innerHTML = images.map((imgUrl, idx) => `
            <button type="button" class="gallery-thumb-btn ${idx === 0 ? 'active' : ''}" data-img="${imgUrl}" aria-label="View product image ${idx + 1}">
                <img src="${imgUrl}" alt="${product.name} detail ${idx + 1}" loading="lazy">
            </button>
        `).join('');

        const thumbBtns = thumbContainer.querySelectorAll('.gallery-thumb-btn');
        thumbBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                thumbBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const targetImg = btn.getAttribute('data-img');
                if (mainImageEl && targetImg) {
                    mainImageEl.src = targetImg;
                }
            });
        });
    }

    // Purchase Action Section (Differentiating DIRECT_PURCHASE vs CONSULTATION_REQUIRED)
    const purchaseContainer = document.getElementById('detail-purchase-action-container');
    if (purchaseContainer) {
        if (product.purchaseType === 'DIRECT_PURCHASE') {
            purchaseContainer.innerHTML = `
                <div class="purchase-controls">
                    <div class="qty-widget" aria-label="Quantity selector">
                        <button type="button" class="qty-btn" id="qty-minus" aria-label="Decrease quantity">&minus;</button>
                        <input type="text" class="qty-input" id="qty-input" value="1" readonly aria-label="Selected quantity">
                        <button type="button" class="qty-btn" id="qty-plus" aria-label="Increase quantity">&plus;</button>
                    </div>

                    <button type="button" class="btn btn-primary btn-add-cart-detail" id="detail-add-cart">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        Add to Cart
                    </button>
                </div>
            `;

            // Setup quantity selector logic
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

            // Setup Add to Cart click
            const btnAddCart = document.getElementById('detail-add-cart');
            if (btnAddCart) {
                btnAddCart.addEventListener('click', () => {
                    let cart = JSON.parse(localStorage.getItem('criterion_cart')) || [];
                    const existingIndex = cart.findIndex(item => item.id === product.id);

                    if (existingIndex > -1) {
                        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + currentQty;
                    } else {
                        cart.push({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            img: images[0],
                            quantity: currentQty
                        });
                    }

                    localStorage.setItem('criterion_cart', JSON.stringify(cart));
                    if (typeof updateCartCount === 'function') {
                        updateCartCount();
                    }

                    // Toast Feedback
                    if (typeof showToast === 'function') {
                        showToast(`Added ${currentQty} &times; <strong>${product.name}</strong> to cart!`, 'View Cart', 'cart.html');
                    }

                    btnAddCart.innerHTML = '&#10003; Added to Cart!';
                    setTimeout(() => {
                        btnAddCart.innerHTML = `
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            Add to Cart
                        `;
                    }, 2200);
                });
            }
        } else {
            // CONSULTATION_REQUIRED Path
            purchaseContainer.innerHTML = `
                <div class="consultation-pathway-notice">
                    <h4>Need guidance before purchasing?</h4>
                    <p>Some Criterion Life products are available through a consultation pathway so that your individual health circumstances can be understood before you purchase.</p>
                    <a href="consultation.html" class="btn btn-secondary btn-full-width">Book a Consultation</a>
                </div>
            `;
        }
    }

    // 02. ABOUT THIS FORMULATION
    const aboutEl = document.getElementById('detail-about-text');
    if (aboutEl) {
        aboutEl.textContent = product.fullDescription || product.shortDescription;
    }

    // 03. WHAT IT IS DESIGNED TO SUPPORT
    const supportListEl = document.getElementById('detail-support-list');
    if (supportListEl && product.supportAreas && product.supportAreas.length > 0) {
        supportListEl.innerHTML = product.supportAreas.map(point => `
            <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4D3A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>${point}</span>
            </li>
        `).join('');
    }

    // 04. ACTIVE BOTANICAL INGREDIENTS
    const ingredientsTableBody = document.getElementById('detail-ingredients-tbody');
    if (ingredientsTableBody && product.ingredients && product.ingredients.length > 0) {
        ingredientsTableBody.innerHTML = product.ingredients.map(ing => `
            <tr>
                <td class="td-ingredient-name">${ing.name}</td>
                <td class="td-ingredient-ratio">${ing.percentage || '—'}</td>
                <td class="td-ingredient-role">${ing.role || 'Active botanical constituent.'}</td>
            </tr>
        `).join('');
    }

    // 05. HOW TO USE
    const usageRecommendedEl = document.getElementById('detail-usage-recommended');
    if (usageRecommendedEl && product.usage) {
        usageRecommendedEl.textContent = product.usage.recommended || 'Take as directed.';
    }

    const usageInstructionsEl = document.getElementById('detail-usage-instructions');
    if (usageInstructionsEl && product.usage) {
        usageInstructionsEl.textContent = product.usage.instructions || '';
    }

    // 06. PRODUCT INFORMATION
    const infoGridEl = document.getElementById('detail-product-info-grid');
    if (infoGridEl && product.productInformation) {
        const info = product.productInformation;
        const fields = [
            { label: 'Product Form', val: info.form },
            { label: 'Pack Size', val: info.packSize },
            { label: 'Serving Size', val: info.servingSize },
            { label: 'Servings per Pack', val: info.servingsPerPack },
            { label: 'Storage', val: info.storage },
            { label: 'Product Type', val: info.productType },
            { label: 'Availability', val: info.availability }
        ].filter(f => f.val);

        infoGridEl.innerHTML = fields.map(f => `
            <div class="info-fact-item">
                <span class="fact-label">${f.label}</span>
                <span class="fact-value">${f.val}</span>
            </div>
        `).join('');
    }

    // 07. QUALITY & PRODUCT INFORMATION (Only display fields that actually exist)
    const qualitySection = document.getElementById('detail-quality-section');
    const qualityContainer = document.getElementById('detail-quality-content');
    if (qualityContainer && product.qualityInformation) {
        const q = product.qualityInformation;
        const validQualityBlocks = [
            q.regulatoryStatus ? `<div class="quality-item"><strong>Regulatory Status:</strong> <span>${q.regulatoryStatus}</span></div>` : '',
            q.standardisation ? `<div class="quality-item"><strong>Standardisation:</strong> <span>${q.standardisation}</span></div>` : '',
            q.manufacturing ? `<div class="quality-item"><strong>Manufacturing:</strong> <span>${q.manufacturing}</span></div>` : '',
            q.qualityControl ? `<div class="quality-item"><strong>Quality Control:</strong> <span>${q.qualityControl}</span></div>` : ''
        ].filter(Boolean);

        if (validQualityBlocks.length > 0) {
            qualityContainer.innerHTML = validQualityBlocks.join('');
            if (qualitySection) qualitySection.style.display = 'block';
        } else if (qualitySection) {
            qualitySection.style.display = 'none';
        }
    }

    // 08. IMPORTANT INFORMATION
    const importantContainer = document.getElementById('detail-important-content');
    if (importantContainer && product.importantInformation) {
        const imp = product.importantInformation;
        const items = [
            imp.warnings ? `<p><strong>Warnings & Precautions:</strong> ${imp.warnings}</p>` : '',
            imp.whoShouldSeekGuidance ? `<p><strong>Who Should Seek Guidance:</strong> ${imp.whoShouldSeekGuidance}</p>` : '',
            imp.storage ? `<p><strong>Storage Instructions:</strong> ${imp.storage}</p>` : '',
            imp.general ? `<p><strong>General Information:</strong> ${imp.general}</p>` : ''
        ].filter(Boolean);

        importantContainer.innerHTML = items.join('');
    }

    // 09. FREQUENTLY ASKED QUESTIONS
    const faqContainer = document.getElementById('detail-faq-container');
    if (faqContainer && product.faqs && product.faqs.length > 0) {
        faqContainer.innerHTML = product.faqs.map((faq, idx) => `
            <div class="faq-item">
                <button type="button" class="faq-question-btn" aria-expanded="false" id="faq-btn-${idx}">
                    <span>${faq.question}</span>
                    <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="faq-answer-panel" id="faq-answer-${idx}" hidden>
                    <p>${faq.answer}</p>
                </div>
            </div>
        `).join('');

        const faqBtns = faqContainer.querySelectorAll('.faq-question-btn');
        faqBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', !expanded);
                const answer = btn.nextElementSibling;
                if (answer) {
                    answer.hidden = expanded;
                }
            });
        });
    }

    // 10. RELATED PRODUCTS (Reusing the ONE Product Card component)
    const relatedContainer = document.getElementById('detail-related-grid');
    if (relatedContainer && product.relatedProducts && typeof createProductCardHTML === 'function') {
        const relatedList = product.relatedProducts
            .map(relId => CRITERION_PRODUCTS[relId])
            .filter(Boolean);

        if (relatedList.length > 0) {
            relatedContainer.innerHTML = relatedList.map(rel => createProductCardHTML(rel)).join('');
        } else {
            const relatedSection = document.getElementById('detail-related-section');
            if (relatedSection) relatedSection.style.display = 'none';
        }
    }
});
