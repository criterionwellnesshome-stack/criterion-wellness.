// Criterion Holistic Wellness Home - Public Article Client-Side Fallback Loader

document.addEventListener('DOMContentLoaded', async () => {
  const contentEl = document.getElementById('article-body-content');
  if (!contentEl) return;

  // If content is already injected by Cloudflare Pages SSR, do not re-fetch
  if (contentEl.children.length > 0 || contentEl.innerHTML.trim().length > 50) {
    return;
  }

  // Fallback for direct /blog-post.html?slug=... navigation
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    contentEl.innerHTML = `
      <div style="text-align: center; padding: 60px 0; color: var(--color-text-muted);">
        <p>No article slug specified. Please return to the <a href="/blog.html">Wellness Blog</a>.</p>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch(`/api/blog/articles/${encodeURIComponent(slug)}`);
    if (res.status === 301) {
      const loc = res.headers.get('Location');
      if (loc) {
        window.location.href = loc;
        return;
      }
    }

    if (!res.ok) {
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 60px 0; color: #c93b2b;">
          <h2>Article Not Found</h2>
          <p style="margin-top: 8px;">The requested article may have been unpublished or removed. Return to the <a href="/blog.html">Wellness Blog</a>.</p>
        </div>
      `;
      return;
    }

    const data = await res.json();
    const article = data.article;
    if (!article) return;

    // Populate elements
    document.title = `${article.seo_title || article.title} | The Criterion Holistic Wellness Home`;

    const titleEl = document.getElementById('article-title');
    const badgeEl = document.getElementById('article-category-badge');
    const authorEl = document.getElementById('article-author-name');
    const dateEl = document.getElementById('article-date');
    const timeEl = document.getElementById('article-reading-time');
    const coverEl = document.getElementById('article-cover-img');

    if (titleEl) titleEl.textContent = article.title;
    if (badgeEl) {
      badgeEl.textContent = article.category_name || 'Wellness';
      if (article.category_slug) {
        badgeEl.setAttribute('href', `/blog.html?category=${encodeURIComponent(article.category_slug)}`);
      }
    }
    if (authorEl) authorEl.textContent = article.author_name || 'Criterion Holistic Wellness Home';
    if (dateEl && article.published_at) {
      dateEl.textContent = new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (timeEl) timeEl.textContent = `${article.reading_time_minutes || 3} min read`;
    if (coverEl) {
      coverEl.src = article.cover_image_url || '/images/hero-fertility-botanical.jpg';
      coverEl.alt = article.image_alt_text || article.title;
    }

    contentEl.innerHTML = article.content || '<p>No content available.</p>';
  } catch (err) {
    contentEl.innerHTML = `
      <div style="text-align: center; padding: 40px 0; color: #c93b2b;">
        <p>Failed to load article content. Please refresh the page.</p>
      </div>
    `;
  }
});
