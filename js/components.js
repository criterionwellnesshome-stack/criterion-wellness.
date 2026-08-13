// Function to load external HTML components
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
        }
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
        
        // If this is the nav, initialize cart count and mobile toggle
        if (elementId === 'nav-placeholder') {
            updateCartCount();
            initMobileNav();
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

// Mobile Hamburger Menu Toggle
function initMobileNav() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!toggleBtn.contains(e.target) && !navLinks.contains(e.target)) {
                toggleBtn.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
}

// Dummy cart count function (to be expanded later)
function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const cart = JSON.parse(localStorage.getItem('criterion_cart')) || [];
        cartCountElement.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    }
}

// Load components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Assuming pages are at the root level relative to components/
    loadComponent('nav-placeholder', 'components/nav.html');
    loadComponent('footer-placeholder', 'components/footer.html');
});
