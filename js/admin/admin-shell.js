// Criterion Admin Portal - Shell & Layout Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Session verification & Profile rendering
  try {
    const data = await adminFetch('/api/admin/auth/me');
    if (data?.authenticated && data.staff) {
      renderUserProfile(data.staff);
    }
  } catch (err) {
    // If not authenticated, adminFetch will automatically redirect to login
    return;
  }

  // 2. Mobile sidebar toggle
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('adminSidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !toggleBtn.contains(e.target)
      ) {
        sidebar.classList.remove('open');
      }
    });
  }

  // 3. Logout action
  const logoutButtons = document.querySelectorAll('.action-logout');
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await adminFetch('/api/admin/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        window.location.href = '/admin/login.html';
      }
    });
  });

  function renderUserProfile(staff) {
    const nameEl = document.getElementById('userProfileName');
    const roleEl = document.getElementById('userProfileRole');
    const avatarEl = document.getElementById('userAvatarLetter');

    if (nameEl) nameEl.textContent = staff.fullName;
    if (roleEl) {
      const roleLabels = {
        admin: 'Administrator',
        content_staff: 'Content Staff',
        enquiry_staff: 'Enquiry Staff',
      };
      roleEl.textContent = roleLabels[staff.role] || staff.role;
    }
    if (avatarEl) {
      avatarEl.textContent = (staff.fullName || 'A').charAt(0).toUpperCase();
    }
  }
});
