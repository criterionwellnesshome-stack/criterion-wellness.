// Criterion Admin Portal - Authentication Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const alertContainer = document.getElementById('alertContainer');
  const submitBtn = document.getElementById('submitBtn');

  // Check URL params for expired session notification
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === '1') {
    showAlert('Your session has expired. Please sign in again.', 'warning');
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showAlert('Please provide both email address and password.', 'danger');
        return;
      }

      setLoading(true);

      try {
        const response = await adminFetch('/api/admin/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        if (response.success) {
          showAlert('Sign in successful. Redirecting...', 'info');
          setTimeout(() => {
            window.location.href = '/admin/index.html';
          }, 350);
        }
      } catch (err) {
        setLoading(false);
        const errorMsg = err.message || 'Unable to sign in. Please verify your credentials.';
        showAlert(errorMsg, err.status === 429 ? 'warning' : 'danger');
      }
    });
  }

  function showAlert(message, type = 'danger') {
    if (!alertContainer) return;
    alertContainer.innerHTML = `
      <div class="alert alert-${type}">
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function clearAlert() {
    if (alertContainer) alertContainer.innerHTML = '';
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Signing In...' : 'Sign In';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
