// The Criterion Holistic Wellness Home - Products & Shop Engine

function initCategoryFilter() {
    const pills = document.querySelectorAll('.filter-pill');
    const sections = document.querySelectorAll('.catalog-section');

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const filter = pill.getAttribute('data-filter');
            if (filter === 'all') {
                sections.forEach(sec => sec.style.display = 'block');
            } else {
                sections.forEach(sec => {
                    if (sec.id === filter) {
                        sec.style.display = 'block';
                        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        sec.style.display = 'none';
                    }
                });
            }
        });
    });
}

function showToast(productName) {
    let toast = document.getElementById('criterion-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'criterion-toast';
        toast.className = 'criterion-toast';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <span>&#10003; <strong>${productName}</strong> added to cart!</span>
        <a href="cart.html">View Cart &rarr;</a>
    `;
    
    toast.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function initAddToCart() {
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
            cart[existingIndex].quantity += 1;
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
        
        // Update header count if available
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
        
        showToast(name);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCategoryFilter();
    initAddToCart();
});
