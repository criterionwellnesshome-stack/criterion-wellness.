// Criterion Admin Portal - Articles List Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const articlesTableBody = document.getElementById('articlesTableBody');
  const categoryFilter = document.getElementById('categoryFilter');
  const searchInput = document.getElementById('articleSearchInput');
  const statusTabs = document.getElementById('statusTabs');
  const paginationEl = document.getElementById('articlesPagination');

  let currentStatus = 'all';
  let currentCategory = '';
  let currentSearch = '';
  let currentPage = 1;

  // Load initial categories for dropdown filter
  await loadCategoryOptions();
  await loadArticles();

  // Status Tab Clicks
  if (statusTabs) {
    statusTabs.querySelectorAll('.status-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        statusTabs.querySelectorAll('.status-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentStatus = tab.getAttribute('data-status') || 'all';
        currentPage = 1;
        loadArticles();
      });
    });
  }

  // Category Filter Change
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      currentCategory = categoryFilter.value;
      currentPage = 1;
      loadArticles();
    });
  }

  // Search Input Debouncer
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadArticles();
      }, 350);
    });
  }

  async function loadCategoryOptions() {
    if (!categoryFilter) return;
    try {
      const data = await adminFetch('/api/admin/categories');
      const cats = data.categories || [];
      let html = '<option value="">All Categories</option>';
      cats.forEach((c) => {
        html += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
      });
      categoryFilter.innerHTML = html;
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function loadArticles() {
    if (!articlesTableBody) return;
    articlesTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--admin-text-muted); padding: 32px;">
          Loading articles...
        </td>
      </tr>
    `;

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('limit', 15);
      if (currentStatus !== 'all') params.set('status', currentStatus);
      if (currentCategory) params.set('category', currentCategory);
      if (currentSearch) params.set('q', currentSearch);

      const data = await adminFetch(`/api/admin/articles?${params.toString()}`);
      const articles = data.articles || [];
      const pagination = data.pagination || { total: 0, totalPages: 1 };

      if (articles.length === 0) {
        articlesTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--admin-text-muted); padding: 48px 20px;">
              No articles found matching the current filters.
            </td>
          </tr>
        `;
        renderPagination(pagination);
        return;
      }

      articlesTableBody.innerHTML = articles
        .map((art) => {
          const coverUrl = art.cover_image_url || '/images/hero-fertility-botanical.jpg';
          const altText = art.image_alt_text || art.title;

          let statusClass = 'status-pill-draft';
          let statusLabel = 'Draft';
          if (art.publication_status === 'published') {
            statusClass = 'status-pill-published';
            statusLabel = 'Published';
          } else if (art.publication_status === 'unpublished') {
            statusClass = 'status-pill-unpublished';
            statusLabel = 'Unpublished';
          }

          const dateToFormat = art.published_at || art.updated_at || art.created_at;
          const formattedDate = dateToFormat
            ? new Date(dateToFormat).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—';

          const isPublished = art.publication_status === 'published';

          return `
            <tr data-id="${art.id}">
              <td>
                <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(altText)}" class="article-thumb" onerror="this.src='/images/hero-fertility-botanical.jpg'">
              </td>
              <td>
                <div style="font-weight: 600; color: var(--admin-primary);">${escapeHtml(art.title)}</div>
                <div style="font-size: 0.78rem; color: var(--admin-text-muted); font-family: monospace;">/blog/${escapeHtml(art.slug)}</div>
              </td>
              <td>
                <span class="badge" style="background: var(--admin-cream); color: var(--admin-primary); border: 1px solid var(--admin-border);">
                  ${escapeHtml(art.category_name || 'Uncategorized')}
                </span>
              </td>
              <td style="font-size: 0.82rem; color: var(--admin-text-muted);">
                ${escapeHtml(art.author_name || 'Criterion Wellness')}
              </td>
              <td>
                <span class="badge ${statusClass}" style="padding: 3px 8px;">
                  ${statusLabel}
                </span>
              </td>
              <td style="font-size: 0.82rem; color: var(--admin-text-muted);">
                ${formattedDate}
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <a href="/admin/article-editor.html?id=${art.id}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;">
                  Edit
                </a>
                <button class="btn btn-secondary action-toggle-status" data-id="${art.id}" data-current="${art.publication_status}" style="padding: 4px 8px; font-size: 0.78rem;">
                  ${isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button class="btn btn-secondary action-delete" data-id="${art.id}" data-title="${escapeAttr(art.title)}" style="padding: 4px 8px; font-size: 0.78rem; color: var(--admin-danger);">
                  Delete
                </button>
              </td>
            </tr>
          `;
        })
        .join('');

      attachActionHandlers();
      renderPagination(pagination);
    } catch (err) {
      articlesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--admin-danger); padding: 24px;">
            Failed to load articles: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  function attachActionHandlers() {
    // Status Toggle (Publish/Unpublish)
    articlesTableBody.querySelectorAll('.action-toggle-status').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-current');
        const newStatus = current === 'published' ? 'unpublished' : 'published';

        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
          await adminFetch(`/api/admin/articles/${id}/status`, {
            method: 'PATCH',
            body: { status: newStatus },
          });
          await loadArticles();
        } catch (err) {
          alert('Status update failed: ' + err.message);
          btn.disabled = false;
        }
      });
    });

    // Delete Article with confirmation
    articlesTableBody.querySelectorAll('.action-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');

        const confirmed = confirm(`Are you sure you want to permanently delete the article "${title}"?\n\nThis cannot be undone.`);
        if (!confirmed) return;

        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
          await adminFetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
          await loadArticles();
        } catch (err) {
          alert('Delete failed: ' + err.message);
          btn.disabled = false;
        }
      });
    });
  }

  function renderPagination(pagination) {
    if (!paginationEl) return;
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let html = `
      <button class="btn btn-secondary" id="artPrevBtn" style="padding: 6px 12px; font-size: 0.8rem;" ${page <= 1 ? 'disabled' : ''}>
        &larr; Prev
      </button>
      <span style="display: inline-flex; align-items: center; font-size: 0.85rem; color: var(--admin-text-muted); padding: 0 8px;">
        Page ${page} of ${totalPages}
      </span>
      <button class="btn btn-secondary" id="artNextBtn" style="padding: 6px 12px; font-size: 0.8rem;" ${page >= totalPages ? 'disabled' : ''}>
        Next &rarr;
      </button>
    `;

    paginationEl.innerHTML = html;

    const prevBtn = document.getElementById('artPrevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadArticles();
        }
      });
    }

    const nextBtn = document.getElementById('artNextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadArticles();
        }
      });
    }
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
