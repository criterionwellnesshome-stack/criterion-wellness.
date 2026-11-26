// js/admin/enquiries.js
// Client logic for Enquiry Management

document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let currentStatus = '';
  let currentType = '';
  let currentSearch = '';
  let searchTimeout = null;
  let activeEnquiryId = null;
  let userRole = '';

  const tableBody = document.getElementById('enquiriesTableBody');
  const statusTabs = document.getElementById('statusTabs');
  const typeFilter = document.getElementById('typeFilter');
  const searchInput = document.getElementById('searchInput');
  const newEnquiriesBadge = document.getElementById('newEnquiriesBadge');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationButtons = document.getElementById('paginationButtons');

  // Modal elements
  const enquiryModal = document.getElementById('enquiryModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const modalClientName = document.getElementById('modalClientName');
  const modalRefCode = document.getElementById('modalRefCode');
  const modalPhone = document.getElementById('modalPhone');
  const modalEmail = document.getElementById('modalEmail');
  const modalPreferredMethod = document.getElementById('modalPreferredMethod');
  const modalType = document.getElementById('modalType');
  const modalArea = document.getElementById('modalArea');
  const modalDate = document.getElementById('modalDate');
  const modalMessage = document.getElementById('modalMessage');
  const modalDynamicResponsesSection = document.getElementById('modalDynamicResponsesSection');
  const modalDynamicResponses = document.getElementById('modalDynamicResponses');
  const modalReviewHistory = document.getElementById('modalReviewHistory');

  // Modal actions
  const actionWhatsApp = document.getElementById('actionWhatsApp');
  const actionCall = document.getElementById('actionCall');
  const actionEmail = document.getElementById('actionEmail');
  const btnStatusNew = document.getElementById('btnStatusNew');
  const btnStatusArchive = document.getElementById('btnStatusArchive');
  const btnStatusReviewed = document.getElementById('btnStatusReviewed');
  const btnDeleteEnquiry = document.getElementById('btnDeleteEnquiry');

  // Verify auth session
  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (!res.ok) {
        window.location.href = '/admin/login.html';
        return;
      }
      const data = await res.json();
      const staff = data.staff;
      userRole = staff.role;
      document.getElementById('userProfileName').textContent = staff.fullName || staff.email;
      document.getElementById('userProfileRole').textContent = staff.role.replace('_', ' ').toUpperCase();
      document.getElementById('userAvatarLetter').textContent = (staff.fullName || staff.email || 'A')[0].toUpperCase();

      if (userRole === 'admin') {
        btnDeleteEnquiry.style.display = 'inline-block';
      }
    } catch {
      window.location.href = '/admin/login.html';
    }
  }

  // Load new count badge
  async function updateNewCount() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        const newCount = data.enquiries?.new || 0;
        if (newCount > 0) {
          newEnquiriesBadge.textContent = newCount;
          newEnquiriesBadge.style.display = 'inline-block';
        } else {
          newEnquiriesBadge.style.display = 'none';
        }
      }
    } catch {}
  }

  // Format Nigerian or international phone for WhatsApp wa.me link
  function formatWhatsAppPhone(phone) {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '234' + digits.substring(1);
    }
    return digits;
  }

  // Fetch and render enquiries list
  async function loadEnquiries() {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">Loading enquiries...</td></tr>`;

    const params = new URLSearchParams({
      page: currentPage,
      limit: 15,
    });
    if (currentStatus) params.append('status', currentStatus);
    if (currentType) params.append('type', currentType);
    if (currentSearch) params.append('q', currentSearch);

    try {
      const res = await fetch(`/api/admin/enquiries?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        throw new Error('Failed to load enquiries');
      }

      const data = await res.json();
      const enquiries = data.enquiries || [];
      const pagination = data.pagination || { total: 0, totalPages: 1 };

      if (enquiries.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 48px; color: var(--admin-text-muted);">No enquiries found.</td></tr>`;
        paginationInfo.textContent = 'Showing 0 of 0';
        paginationButtons.innerHTML = '';
        return;
      }

      tableBody.innerHTML = enquiries.map(e => {
        const statusClass = `status-pill-${e.status || 'new'}`;
        const waPhone = formatWhatsAppPhone(e.phone);
        const areaOrCourse = e.consultation_area || e.selected_program_or_course || e.enquiry_type;
        const formattedDate = new Date(e.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return `
          <tr>
            <td>
              <span class="status-pill ${statusClass}" style="text-transform: capitalize;">${e.status}</span>
            </td>
            <td>
              <div style="font-weight: 600; color: var(--admin-primary);">${escapeHtml(e.full_name)}</div>
              <div class="enquiry-contact-links">
                <a href="tel:${escapeHtml(e.phone)}" class="contact-icon-link" title="Call">📞 ${escapeHtml(e.phone)}</a>
                ${waPhone ? `<a href="https://wa.me/${waPhone}" target="_blank" class="contact-icon-link" title="WhatsApp" style="color: #25d366;">💬 WhatsApp</a>` : ''}
                ${e.email ? `<a href="mailto:${escapeHtml(e.email)}" class="contact-icon-link" title="Email">✉️ Email</a>` : ''}
              </div>
            </td>
            <td>
              <div style="font-weight: 500; font-size: 0.85rem; text-transform: capitalize;">${escapeHtml(e.enquiry_type)}</div>
              <div style="font-size: 0.78rem; color: var(--admin-text-muted);">${escapeHtml(areaOrCourse || '')}</div>
            </td>
            <td>
              <div style="font-size: 0.8rem; color: var(--admin-text-muted);">${formattedDate}</div>
            </td>
            <td style="text-align: right;">
              <button class="btn btn-secondary action-view" data-id="${e.id}" style="padding: 4px 10px; font-size: 0.8rem;">View</button>
            </td>
          </tr>
        `;
      }).join('');

      // Update pagination
      const start = (currentPage - 1) * 15 + 1;
      const end = Math.min(pagination.total, currentPage * 15);
      paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.total}`;

      paginationButtons.innerHTML = `
        <button class="btn btn-secondary" id="prevPageBtn" ${currentPage <= 1 ? 'disabled' : ''} style="padding: 4px 10px; font-size: 0.82rem;">&larr; Prev</button>
        <button class="btn btn-secondary" id="nextPageBtn" ${currentPage >= pagination.totalPages ? 'disabled' : ''} style="padding: 4px 10px; font-size: 0.82rem;">Next &rarr;</button>
      `;

      document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadEnquiries();
        }
      });
      document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        if (currentPage < pagination.totalPages) {
          currentPage++;
          loadEnquiries();
        }
      });

      // View details listener
      document.querySelectorAll('.action-view').forEach(btn => {
        btn.addEventListener('click', () => {
          openEnquiryModal(btn.getAttribute('data-id'));
        });
      });

    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 36px; color: var(--admin-danger);">${err.message}</td></tr>`;
    }
  }

  // Open detail modal
  async function openEnquiryModal(id) {
    activeEnquiryId = id;
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`);
      if (!res.ok) throw new Error('Failed to load enquiry details');
      const e = await res.json();

      modalClientName.textContent = e.full_name;
      modalRefCode.textContent = `Reference: ${e.id} &bull; Form: ${e.form_title || e.form_version_id || 'Standard'}`;
      modalPhone.textContent = e.phone;
      modalEmail.textContent = e.email || 'Not provided';
      modalPreferredMethod.textContent = e.preferred_contact_method || 'Phone';
      modalType.textContent = e.enquiry_type;
      modalArea.textContent = e.consultation_area || e.selected_program_or_course || 'None specified';
      modalDate.textContent = new Date(e.created_at).toLocaleString();
      modalMessage.textContent = e.message || 'No additional message was included.';

      // Quick contact links
      const waPhone = formatWhatsAppPhone(e.phone);
      if (waPhone) {
        actionWhatsApp.style.display = 'inline-flex';
        const msg = encodeURIComponent(`Hello ${e.full_name}, thank you for contacting Criterion Holistic Wellness Home regarding your ${e.enquiry_type} enquiry.`);
        actionWhatsApp.href = `https://wa.me/${waPhone}?text=${msg}`;
      } else {
        actionWhatsApp.style.display = 'none';
      }

      actionCall.href = `tel:${e.phone}`;

      if (e.email) {
        actionEmail.style.display = 'inline-flex';
        actionEmail.href = `mailto:${e.email}?subject=${encodeURIComponent('Criterion Holistic Wellness Home - Re: Your Enquiry')}`;
      } else {
        actionEmail.style.display = 'none';
      }

      // Dynamic questions display
      let additional = {};
      try {
        additional = typeof e.additional_responses_json === 'string'
          ? JSON.parse(e.additional_responses_json)
          : (e.additional_responses_json || {});
      } catch {}

      // Strip internal fields like _client_ip
      const publicAnswers = Object.entries(additional).filter(([k]) => !k.startsWith('_'));
      if (publicAnswers.length > 0) {
        modalDynamicResponsesSection.style.display = 'block';
        modalDynamicResponses.innerHTML = publicAnswers.map(([key, val]) => `
          <div style="margin-bottom: 8px;">
            <strong style="color: var(--admin-primary);">${formatFieldKey(key)}:</strong>
            <span style="color: var(--admin-text-main); margin-left: 6px;">${escapeHtml(String(val))}</span>
          </div>
        `).join('');
      } else {
        modalDynamicResponsesSection.style.display = 'none';
      }

      // Review history
      if (e.reviewed_at) {
        const revDate = new Date(e.reviewed_at).toLocaleString();
        modalReviewHistory.innerHTML = `&check; Reviewed by <strong>${escapeHtml(e.reviewed_by_name || 'Staff')}</strong> on ${revDate}`;
      } else {
        modalReviewHistory.innerHTML = 'Pending clinical review';
      }

      enquiryModal.style.display = 'flex';
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function formatFieldKey(str) {
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  btnCloseModal.addEventListener('click', () => {
    enquiryModal.style.display = 'none';
  });

  // Status transitions
  async function updateStatus(newStatus) {
    if (!activeEnquiryId) return;
    try {
      const res = await fetch(`/api/admin/enquiries/${activeEnquiryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        enquiryModal.style.display = 'none';
        loadEnquiries();
        updateNewCount();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch {
      alert('Error updating enquiry status');
    }
  }

  btnStatusReviewed.addEventListener('click', () => updateStatus('reviewed'));
  btnStatusArchive.addEventListener('click', () => updateStatus('archived'));
  btnStatusNew.addEventListener('click', () => updateStatus('new'));

  // Delete enquiry (Admin only)
  btnDeleteEnquiry.addEventListener('click', async () => {
    if (!activeEnquiryId) return;
    if (confirm('Are you sure you want to permanently delete this enquiry record?')) {
      try {
        const res = await fetch(`/api/admin/enquiries/${activeEnquiryId}`, { method: 'DELETE' });
        if (res.ok) {
          enquiryModal.style.display = 'none';
          loadEnquiries();
          updateNewCount();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to delete');
        }
      } catch {
        alert('Server communication error');
      }
    }
  });

  // Filter handlers
  statusTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.status-tab');
    if (tab) {
      statusTabs.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatus = tab.getAttribute('data-status') || '';
      currentPage = 1;
      loadEnquiries();
    }
  });

  typeFilter.addEventListener('change', () => {
    currentType = typeFilter.value;
    currentPage = 1;
    loadEnquiries();
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      loadEnquiries();
    }, 300);
  });

  // Logout handler
  document.querySelectorAll('.action-logout').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      window.location.href = '/admin/login.html';
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]));
  }

  // Init
  checkAuth();
  updateNewCount();
  loadEnquiries();
});
