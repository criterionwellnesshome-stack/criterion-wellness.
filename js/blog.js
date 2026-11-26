// Criterion Holistic Wellness Home - Public Blog Controller

document.addEventListener('DOMContentLoaded', () => {
  const featuredEl = document.getElementById('blogFeaturedArticle');
  const gridEl = document.getElementById('blogGrid');
  const paginationEl = document.getElementById('blogPagination');
  const categoriesPillsEl = document.getElementById('blogCategoriesPills');
  const searchInput = document.getElementById('blogSearchInput');

  // Read URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  let currentCategory = urlParams.get('category') || '';
  let currentSearch = urlParams.get('q') || '';
  let currentPage = parseInt(urlParams.get('page') || '1', 10);

  if (searchInput && currentSearch) {
    searchInput.value = currentSearch;
  }

  // Load initial data
  loadCategories();
  loadArticles();

  // Search input debouncer
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        updateUrlParams();
        loadArticles();
      }, 350);
    });
  }

  async function loadCategories() {
    if (!categoriesPillsEl) return;
    try {
      const res = await fetch('/api/blog/categories');
      if (!res.ok) return;
      const data = await res.json();
      const categories = data.categories || [];

      let html = `
        <button class="category-pill ${!currentCategory ? 'active' : ''}" data-category="">
          All Categories
        </button>
      `;

      categories.forEach((cat) => {
        const isActive = currentCategory === cat.slug;
        html += `
          <button class="category-pill ${isActive ? 'active' : ''}" data-category="${escapeAttr(cat.slug)}">
            ${escapeHtml(cat.name)} (${cat.published_article_count})
          </button>
        `;
      });

      categoriesPillsEl.innerHTML = html;

      // Attach click events
      categoriesPillsEl.querySelectorAll('.category-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          categoriesPillsEl.querySelectorAll('.category-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          currentCategory = btn.getAttribute('data-category') || '';
          currentPage = 1;
          updateUrlParams();
          loadArticles();
        });
      });
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function formatArticleDate(isoDate) {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function renderFeaturedArticle(art) {
    if (!featuredEl || !art) return;
    const dateStr = formatArticleDate(art.published_at);
    const coverUrl = art.cover_image_url || '/images/hero-fertility-botanical.jpg';
    const altText = art.image_alt_text || art.title;
    const articleUrl = `/blog/${encodeURIComponent(art.slug)}`;

    featuredEl.innerHTML = `
      <a href="${articleUrl}" class="blog-featured-card">
        <div class="blog-featured-media">
          <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(altText)}" loading="eager">
        </div>
        <div class="blog-featured-body">
          <div class="blog-featured-meta">
            <span class="blog-featured-badge">Latest Article</span>
            <span class="blog-category-tag">${escapeHtml(art.category_name || 'Wellness')}</span>
            ${art.reading_time_minutes ? `<span class="blog-read-time">${art.reading_time_minutes} min read</span>` : ''}
          </div>
          <h2 class="blog-featured-title">${escapeHtml(art.title)}</h2>
          ${art.summary ? `<p class="blog-featured-excerpt">${escapeHtml(art.summary)}</p>` : ''}
          <div class="blog-featured-footer">
            ${dateStr ? `<time>${dateStr}</time>` : '<span></span>'}
            <span class="blog-card-readmore">Read Article &rarr;</span>
          </div>
        </div>
      </a>
    `;
  }

  function renderArticleCard(art) {
    const dateStr = formatArticleDate(art.published_at);
    const coverUrl = art.cover_image_url || '/images/hero-fertility-botanical.jpg';
    const altText = art.image_alt_text || art.title;
    const articleUrl = `/blog/${encodeURIComponent(art.slug)}`;

    return `
      <a href="${articleUrl}" class="blog-card">
        <div class="blog-card-media">
          <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(altText)}" loading="lazy">
        </div>
        <div class="blog-card-body">
          <div class="blog-card-meta">
            <span class="blog-category-tag">${escapeHtml(art.category_name || 'Wellness')}</span>
            <span>${art.reading_time_minutes || 3} min read</span>
          </div>
          <h2 class="blog-card-title">${escapeHtml(art.title)}</h2>
          <p class="blog-card-excerpt">${escapeHtml(art.summary || '')}</p>
          <div class="blog-card-footer">
            <time>${dateStr}</time>
            <span class="blog-card-readmore">Read Article &rarr;</span>
          </div>
        </div>
      </a>
    `;
  }

  async function loadArticles() {
    if (!gridEl) return;
    if (featuredEl) featuredEl.innerHTML = '';
    gridEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--color-text-muted);">
        Loading wellness articles...
      </div>
    `;

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('limit', 10);
      if (currentCategory) params.set('category', currentCategory);
      if (currentSearch) params.set('q', currentSearch);

      const res = await fetch(`/api/blog/articles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch articles');

      const data = await res.json();
      const articles = data.articles || [];
      const pagination = data.pagination || { total: 0, totalPages: 1 };

      if (articles.length === 0) {
        if (featuredEl) featuredEl.innerHTML = '';
        gridEl.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--color-white); border: 1px solid var(--color-border); border-radius: 14px;">
            <h3 style="font-family: var(--font-heading); color: var(--color-primary); margin-bottom: 8px;">No Articles Found</h3>
            <p style="color: var(--color-text-muted); max-width: 480px; margin: 0 auto 20px;">
              ${currentSearch ? `No published articles matched "${escapeHtml(currentSearch)}".` : 'There are currently no articles in this category.'}
            </p>
            <button class="btn btn-outline" id="clearFiltersBtn">View All Articles</button>
          </div>
        `;

        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            currentCategory = '';
            currentSearch = '';
            currentPage = 1;
            if (searchInput) searchInput.value = '';
            if (categoriesPillsEl) {
              categoriesPillsEl.querySelectorAll('.category-pill').forEach((b) => b.classList.remove('active'));
              const allBtn = categoriesPillsEl.querySelector('[data-category=""]');
              if (allBtn) allBtn.classList.add('active');
            }
            updateUrlParams();
            loadArticles();
          });
        }

        renderPagination(pagination);
        return;
      }

      let gridArticles = articles;
      if (currentPage === 1 && featuredEl) {
        renderFeaturedArticle(articles[0]);
        gridArticles = articles.slice(1);
      } else if (featuredEl) {
        featuredEl.innerHTML = '';
      }

      gridEl.innerHTML = gridArticles.length > 0
        ? gridArticles.map(renderArticleCard).join('')
        : '';

      renderPagination(pagination);
    } catch (err) {
      if (featuredEl) featuredEl.innerHTML = '';
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #c93b2b;">
          Failed to load articles. Please refresh the page.
        </div>
      `;
    }
  }

  function renderPagination(pagination) {
    if (!paginationEl) return;
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let html = `
      <button class="pagination-btn" id="prevPageBtn" ${page <= 1 ? 'disabled' : ''}>
        &larr; Previous
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    html += `
      <button class="pagination-btn" id="nextPageBtn" ${page >= totalPages ? 'disabled' : ''}>
        Next &rarr;
      </button>
    `;

    paginationEl.innerHTML = html;

    const prevBtn = document.getElementById('prevPageBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          updateUrlParams();
          loadArticles();
          window.scrollTo({ top: gridEl.offsetTop - 100, behavior: 'smooth' });
        }
      });
    }

    const nextBtn = document.getElementById('nextPageBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          updateUrlParams();
          loadArticles();
          window.scrollTo({ top: gridEl.offsetTop - 100, behavior: 'smooth' });
        }
      });
    }

    paginationEl.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (p !== currentPage) {
          currentPage = p;
          updateUrlParams();
          loadArticles();
          window.scrollTo({ top: gridEl.offsetTop - 100, behavior: 'smooth' });
        }
      });
    });
  }

  function updateUrlParams() {
    const params = new URLSearchParams();
    if (currentCategory) params.set('category', currentCategory);
    if (currentSearch) params.set('q', currentSearch);
    if (currentPage > 1) params.set('page', currentPage);
    const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newQuery);
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
