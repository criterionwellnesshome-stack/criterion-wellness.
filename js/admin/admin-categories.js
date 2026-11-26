// Criterion Admin Portal - Category Management Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const openCategoriesBtn = document.getElementById('openCategoriesBtn');
  const categoriesModal = document.getElementById('categoriesModal');
  const closeCategoriesBtn = document.getElementById('closeCategoriesBtn');
  const dismissCategoriesBtn = document.getElementById('dismissCategoriesBtn');
  const addCategoryForm = document.getElementById('addCategoryForm');
  const newCatName = document.getElementById('newCatName');
  const categoryTableBody = document.getElementById('categoryTableBody');
  const categoryAlert = document.getElementById('categoryAlert');

  // Reassignment Modal elements (Safeguard 7)
  const reassignModal = document.getElementById('reassignCategoryModal');
  const closeReassignBtn = document.getElementById('closeReassignBtn');
  const cancelReassignBtn = document.getElementById('cancelReassignBtn');
  const confirmReassignBtn = document.getElementById('confirmReassignBtn');
  const reassignCategoryName = document.getElementById('reassignCategoryName');
  const reassignArticleCount = document.getElementById('reassignArticleCount');
  const targetCategorySelect = document.getElementById('targetCategorySelect');

  let pendingDeleteCatId = null;
  let cachedCategories = [];

  if (openCategoriesBtn && categoriesModal) {
    openCategoriesBtn.addEventListener('click', async () => {
      categoriesModal.classList.add('open');
      clearAlert();
      await loadCategoriesList();
    });
  }

  const closeModal = () => {
    if (categoriesModal) categoriesModal.classList.remove('open');
  };

  if (closeCategoriesBtn) closeCategoriesBtn.addEventListener('click', closeModal);
  if (dismissCategoriesBtn) dismissCategoriesBtn.addEventListener('click', closeModal);

  // Add Category Submission
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const name = newCatName.value.trim();
      if (!name) return;

      const saveBtn = document.getElementById('saveCatBtn');
      if (saveBtn) saveBtn.disabled = true;

      try {
        await adminFetch('/api/admin/categories', {
          method: 'POST',
          body: { name },
        });

        newCatName.value = '';
        await loadCategoriesList();
      } catch (err) {
        showAlert(err.message || 'Failed to add category', 'danger');
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });
  }

  async function loadCategoriesList() {
    if (!categoryTableBody) return;
    try {
      const data = await adminFetch('/api/admin/categories');
      cachedCategories = data.categories || [];

      if (cachedCategories.length === 0) {
        categoryTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--admin-text-muted); padding: 18px;">
              No categories defined.
            </td>
          </tr>
        `;
        return;
      }

      categoryTableBody.innerHTML = cachedCategories
        .map((cat) => {
          return `
            <tr>
              <td><strong>${escapeHtml(cat.name)}</strong></td>
              <td style="color: var(--admin-text-muted); font-family: monospace;">${escapeHtml(cat.slug)}</td>
              <td>
                <span class="badge" style="background: var(--admin-cream); color: var(--admin-primary); font-weight: 600;">
                  ${cat.article_count}
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-secondary action-delete-cat" data-id="${cat.id}" data-name="${escapeAttr(cat.name)}" data-count="${cat.article_count}" style="padding: 4px 8px; font-size: 0.75rem; color: var(--admin-danger);">
                  Delete
                </button>
              </td>
            </tr>
          `;
        })
        .join('');

      attachCategoryDeleteHandlers();
    } catch (err) {
      categoryTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--admin-danger); padding: 14px;">
            Failed to load categories: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  function attachCategoryDeleteHandlers() {
    categoryTableBody.querySelectorAll('.action-delete-cat').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const count = parseInt(btn.getAttribute('data-count') || '0', 10);

        if (count > 0) {
          // Safeguard 7: Open reassignment modal
          openReassignmentModal(id, name, count);
        } else {
          // No articles - simple confirmation
          const confirmed = confirm(`Are you sure you want to delete the category "${name}"?`);
          if (!confirmed) return;

          try {
            await adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            await loadCategoriesList();
          } catch (err) {
            showAlert('Delete failed: ' + err.message, 'danger');
          }
        }
      });
    });
  }

  function openReassignmentModal(catId, catName, count) {
    pendingDeleteCatId = catId;
    if (reassignCategoryName) reassignCategoryName.textContent = catName;
    if (reassignArticleCount) reassignArticleCount.textContent = count;

    // Populate target select with all other categories
    if (targetCategorySelect) {
      let options = '';
      cachedCategories.forEach((c) => {
        if (c.id !== catId) {
          options += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        }
      });
      targetCategorySelect.innerHTML = options;
    }

    if (reassignModal) reassignModal.classList.add('open');
  }

  const closeReassign = () => {
    pendingDeleteCatId = null;
    if (reassignModal) reassignModal.classList.remove('open');
  };

  if (closeReassignBtn) closeReassignBtn.addEventListener('click', closeReassign);
  if (cancelReassignBtn) cancelReassignBtn.addEventListener('click', closeReassign);

  // Confirm Reassign & Delete
  if (confirmReassignBtn) {
    confirmReassignBtn.addEventListener('click', async () => {
      if (!pendingDeleteCatId || !targetCategorySelect) return;
      const targetId = targetCategorySelect.value;
      if (!targetId) {
        alert('Please select a target category.');
        return;
      }

      confirmReassignBtn.disabled = true;
      confirmReassignBtn.textContent = 'Processing...';

      try {
        await adminFetch(`/api/admin/categories/${pendingDeleteCatId}?reassign_to=${encodeURIComponent(targetId)}`, {
          method: 'DELETE',
          body: { reassign_to_category_id: targetId },
        });

        closeReassign();
        await loadCategoriesList();
        showAlert('Articles reassigned and category deleted successfully.', 'info');
      } catch (err) {
        alert('Reassignment failed: ' + err.message);
      } finally {
        confirmReassignBtn.disabled = false;
        confirmReassignBtn.textContent = 'Reassign & Delete';
      }
    });
  }

  function showAlert(msg, type = 'danger') {
    if (!categoryAlert) return;
    categoryAlert.innerHTML = `<div class="alert alert-${type}" style="margin-bottom: 14px;">${escapeHtml(msg)}</div>`;
  }

  function clearAlert() {
    if (categoryAlert) categoryAlert.innerHTML = '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
});
