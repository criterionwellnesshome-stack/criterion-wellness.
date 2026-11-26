// js/admin/resources.js
// Client logic for Resources Management page

document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let currentType = '';
  let currentStatus = '';
  let currentCategory = '';
  let currentSearch = '';
  let searchTimeout = null;

  const tableBody = document.getElementById('resourcesTableBody');
  const typeTabs = document.getElementById('typeTabs');
  const statusFilter = document.getElementById('statusFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const searchInput = document.getElementById('searchInput');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationButtons = document.getElementById('paginationButtons');

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
      document.getElementById('userProfileName').textContent = staff.fullName || staff.email;
      document.getElementById('userProfileRole').textContent = staff.role.replace('_', ' ').toUpperCase();
      document.getElementById('userAvatarLetter').textContent = (staff.fullName || staff.email || 'A')[0].toUpperCase();
    } catch {
      window.location.href = '/admin/login.html';
    }
  }

  // Load categories for filter
  async function loadCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        const cats = data.categories || [];
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
          cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  // Fetch and render resources
  async function loadResources() {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">Loading resources...</td></tr>`;

    const params = new URLSearchParams({
      page: currentPage,
      limit: 15,
    });
    if (currentType) params.append('type', currentType);
    if (currentStatus) params.append('status', currentStatus);
    if (currentCategory) params.append('category', currentCategory);
    if (currentSearch) params.append('q', currentSearch);

    try {
      const res = await fetch(`/api/admin/resources?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        throw new Error('Failed to load resources');
      }

      const data = await res.json();
      const resources = data.resources || [];
      const pagination = data.pagination || { total: 0, totalPages: 1 };

      if (resources.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 48px; color: var(--admin-text-muted);">No resources found matching the criteria.</td></tr>`;
        paginationInfo.textContent = 'Showing 0 of 0';
        paginationButtons.innerHTML = '';
        return;
      }

      tableBody.innerHTML = resources.map(r => {
        let typeBadge = '';
        let attrHtml = '';

        if (r.type === 'product') {
          typeBadge = '<span class="badge badge-product">Product</span>';
          const priceStr = r.price_kobo != null ? `₦${(r.price_kobo / 100).toLocaleString()}` : 'Price on enquiry';
          const availStr = r.availability_status ? r.availability_status.replace('_', ' ') : 'available';
          attrHtml = `<div><strong>${priceStr}</strong></div><div style="font-size: 0.78rem; color: var(--admin-text-muted);">${r.package_size || ''} &bull; ${availStr}</div>`;
        } else if (r.type === 'course') {
          typeBadge = '<span class="badge badge-course">Course</span>';
          attrHtml = `<div><strong>${r.course_duration || 'Self-paced'}</strong> &bull; ${r.course_level || 'All levels'}</div><div style="font-size: 0.78rem; color: var(--admin-text-muted);">${r.course_format || 'Online'} &bull; Status: ${r.enrollment_status || 'open'}</div>`;
        } else {
          typeBadge = '<span class="badge badge-material">Educational</span>';
          const sizeKb = r.file_size_bytes ? `${Math.round(r.file_size_bytes / 1024)} KB` : '';
          attrHtml = `<div><strong>${r.material_format || 'PDF Guide'}</strong> ${sizeKb}</div><div style="font-size: 0.78rem; color: var(--admin-text-muted);">${r.download_url ? 'Download ready' : 'Direct reading'}</div>`;
        }

        const statusClass = `status-pill-${r.publication_status || 'draft'}`;
        const coverImg = r.cover_image_url
          ? `<img src="${r.cover_image_url}" alt="" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover; flex-shrink: 0;">`
          : `<div style="width: 36px; height: 36px; border-radius: 4px; background: var(--admin-cream); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--admin-text-muted); flex-shrink: 0;">&mdash;</div>`;

        return `
          <tr>
            <td>${typeBadge}</td>
            <td>
              <div style="display: flex; gap: 10px; align-items: center;">
                ${coverImg}
                <div>
                  <div style="font-weight: 600; color: var(--admin-primary);">${escapeHtml(r.title)}</div>
                  <div style="font-size: 0.75rem; color: var(--admin-text-muted);">/${r.slug}</div>
                </div>
              </div>
            </td>
            <td><span style="font-size: 0.85rem;">${r.category_name ? escapeHtml(r.category_name) : '&mdash;'}</span></td>
            <td>${attrHtml}</td>
            <td>
              <select class="form-control status-select" data-id="${r.id}" style="padding: 4px 8px; font-size: 0.78rem; border-radius: 12px; width: auto; font-weight: 500;">
                <option value="draft" ${r.publication_status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="published" ${r.publication_status === 'published' ? 'selected' : ''}>Published</option>
                <option value="archived" ${r.publication_status === 'archived' ? 'selected' : ''}>Archived</option>
              </select>
            </td>
            <td style="text-align: right;">
              <a href="/admin/resource-editor.html?id=${r.id}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.78rem; margin-right: 4px;">Edit</a>
              <button class="btn btn-danger action-delete" data-id="${r.id}" data-title="${escapeHtml(r.title)}" style="padding: 4px 8px; font-size: 0.78rem;">&times;</button>
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
          loadResources();
        }
      });
      document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        if (currentPage < pagination.totalPages) {
          currentPage++;
          loadResources();
        }
      });

      // Status change listener
      document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const resId = e.target.getAttribute('data-id');
          const newStatus = e.target.value;
          try {
            const patchRes = await fetch(`/api/admin/resources/${resId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            });
            if (!patchRes.ok) {
              alert('Failed to update status');
              loadResources();
            }
          } catch (err) {
            alert('Error updating status');
            loadResources();
          }
        });
      });

      // Delete listener
      document.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const resId = btn.getAttribute('data-id');
          const title = btn.getAttribute('data-title');
          if (confirm(`Are you sure you want to delete the resource "${title}"? This action cannot be undone.`)) {
            try {
              const delRes = await fetch(`/api/admin/resources/${resId}`, { method: 'DELETE' });
              if (delRes.ok) {
                loadResources();
              } else {
                const data = await delRes.json();
                alert(data.error || 'Failed to delete resource');
              }
            } catch (err) {
              alert('Error connecting to server');
            }
          }
        });
      });

    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 36px; color: var(--admin-danger);">${err.message}</td></tr>`;
    }
  }

  // Type tabs event
  typeTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('status-tab')) {
      typeTabs.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentType = e.target.getAttribute('data-type') || '';
      currentPage = 1;
      loadResources();
    }
  });

  statusFilter.addEventListener('change', () => {
    currentStatus = statusFilter.value;
    currentPage = 1;
    loadResources();
  });

  categoryFilter.addEventListener('change', () => {
    currentCategory = categoryFilter.value;
    currentPage = 1;
    loadResources();
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      loadResources();
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

  // Initial load
  checkAuth();
  loadCategories();
  loadResources();
});
