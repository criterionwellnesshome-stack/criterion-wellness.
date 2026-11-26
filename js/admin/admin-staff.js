// Criterion Admin Portal - Staff & Access Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const staffTableBody = document.getElementById('staffTableBody');
  const addStaffModal = document.getElementById('addStaffModal');
  const openModalBtn = document.getElementById('openAddStaffBtn');
  const closeModalBtn = document.getElementById('closeAddStaffBtn');
  const cancelModalBtn = document.getElementById('cancelAddStaffBtn');
  const addStaffForm = document.getElementById('addStaffForm');
  const modalAlert = document.getElementById('modalAlert');
  const submitStaffBtn = document.getElementById('submitStaffBtn');

  await loadStaffList();

  if (openModalBtn && addStaffModal) {
    openModalBtn.addEventListener('click', () => {
      clearModalAlert();
      addStaffForm.reset();
      addStaffModal.classList.add('open');
    });
  }

  const closeModal = () => {
    if (addStaffModal) addStaffModal.classList.remove('open');
  };

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  if (addStaffForm) {
    addStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearModalAlert();

      const fullName = document.getElementById('staffFullName').value.trim();
      const email = document.getElementById('staffEmail').value.trim();
      const role = document.getElementById('staffRole').value;
      const password = document.getElementById('staffPassword').value;

      if (!fullName || !email || !role || !password) {
        showModalAlert('All fields are required.');
        return;
      }

      if (password.length < 10) {
        showModalAlert('Password must be at least 10 characters long.');
        return;
      }

      submitStaffBtn.disabled = true;
      submitStaffBtn.textContent = 'Saving...';

      try {
        await adminFetch('/api/admin/staff', {
          method: 'POST',
          body: { fullName, email, role, password },
        });

        closeModal();
        await loadStaffList();
      } catch (err) {
        showModalAlert(err.message || 'Failed to create staff member.');
      } finally {
        submitStaffBtn.disabled = false;
        submitStaffBtn.textContent = 'Create Staff Account';
      }
    });
  }

  async function loadStaffList() {
    if (!staffTableBody) return;

    try {
      const data = await adminFetch('/api/admin/staff');
      const staffMembers = data.staff || [];

      if (staffMembers.length === 0) {
        staffTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 28px;">
              No staff members found.
            </td>
          </tr>
        `;
        return;
      }

      const roleLabels = {
        admin: 'Administrator',
        content_staff: 'Content Staff',
        enquiry_staff: 'Enquiry Staff',
      };

      staffTableBody.innerHTML = staffMembers
        .map((member) => {
          const formattedDate = member.created_at
            ? new Date(member.created_at + 'Z').toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—';

          const lastLogin = member.last_login_at
            ? new Date(member.last_login_at + 'Z').toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Never';

          return `
            <tr>
              <td>
                <strong>${escapeHtml(member.full_name)}</strong>
                <div style="font-size: 0.8rem; color: var(--admin-text-muted);">${escapeHtml(member.email)}</div>
              </td>
              <td>
                <span class="badge badge-role">${escapeHtml(roleLabels[member.role] || member.role)}</span>
              </td>
              <td>
                <span class="badge ${member.is_active ? 'badge-active' : 'badge-phase2'}">
                  ${member.is_active ? 'Active' : 'Suspended'}
                </span>
              </td>
              <td style="font-size: 0.85rem; color: var(--admin-text-muted);">${lastLogin}</td>
              <td style="font-size: 0.85rem; color: var(--admin-text-muted);">${formattedDate}</td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      staffTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--admin-danger); padding: 20px;">
            Failed to load staff list: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  function showModalAlert(msg) {
    if (!modalAlert) return;
    modalAlert.innerHTML = `<div class="alert alert-danger" style="margin-bottom: 14px;">${escapeHtml(msg)}</div>`;
  }

  function clearModalAlert() {
    if (modalAlert) modalAlert.innerHTML = '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
