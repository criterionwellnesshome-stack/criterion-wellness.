// Cloudflare Pages Function: /blog/:slug
// Server-Side Rendering (SSR) for clean URLs, search engine SEO, and OpenGraph metadata

export async function onRequestGet(context) {
  const db = context.env.DB;
  const slug = context.params.slug;

  if (!db || !slug) {
    return context.next();
  }

  try {
    // 1. Fetch published article from D1
    const article = await db
      .prepare(
        `SELECT a.id, a.title, a.slug, a.seo_title, a.seo_description, a.summary,
                a.content, a.cover_image_url, a.image_alt_text, a.author_name,
                a.reading_time_minutes, a.published_at,
                c.name as category_name, c.slug as category_slug
         FROM articles a
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.slug = ? AND a.publication_status = 'published'`
      )
      .bind(slug)
      .first();

    // 2. If not found, check if this is an old slug with an active redirect
    if (!article) {
      const redirectMatch = await db
        .prepare(
          `SELECT a.slug 
           FROM article_slug_redirects r
           JOIN articles a ON r.article_id = a.id
           WHERE r.old_slug = ? AND a.publication_status = 'published'`
        )
        .bind(slug)
        .first();

      if (redirectMatch && redirectMatch.slug) {
        return new Response(null, {
          status: 301,
          headers: {
            'Location': `/blog/${redirectMatch.slug}`,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // Not found in articles or redirects
      return new Response('Article not found', { status: 404 });
    }

    // 3. Fetch the public blog post template
    const templateUrl = new URL('/blog-post.html', context.request.url);
    const templateResponse = await context.env.ASSETS.fetch(new Request(templateUrl));

    if (!templateResponse.ok) {
      return templateResponse;
    }

    // Format metadata and publication date
    const pageTitle = `${article.seo_title || article.title} | The Criterion Holistic Wellness Home`;
    const metaDescription = article.seo_description || article.summary || '';
    const formattedDate = article.published_at
      ? new Date(article.published_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';
    const coverUrl = article.cover_image_url || '/images/hero-fertility-botanical.jpg';
    const altText = article.image_alt_text || article.title;
    const readingTime = `${article.reading_time_minutes || 3} min read`;
    const categoryName = article.category_name || 'Wellness';
    const categorySlug = article.category_slug || '';
    const authorName = article.author_name || 'Criterion Holistic Wellness Home';

    // 4. Use Cloudflare native HTMLRewriter to inject SEO metadata & article markup server-side
    const rewriter = new HTMLRewriter()
      .on('title', {
        element(el) {
          el.setInnerContent(pageTitle);
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute('content', metaDescription);
        },
      })
      .on('head', {
        element(el) {
          el.append(
            `\n<meta property="og:title" content="${escapeAttr(article.title)}">` +
            `\n<meta property="og:description" content="${escapeAttr(metaDescription)}">` +
            `\n<meta property="og:image" content="${coverUrl}">` +
            `\n<meta property="og:type" content="article">` +
            `\n<meta property="og:url" content="${context.request.url}">` +
            `\n<meta name="twitter:card" content="summary_large_image">` +
            `\n<meta name="twitter:title" content="${escapeAttr(article.title)}">` +
            `\n<meta name="twitter:description" content="${escapeAttr(metaDescription)}">` +
            `\n<meta name="twitter:image" content="${coverUrl}">`,
            { html: true }
          );
        },
      })
      .on('#article-category-badge', {
        element(el) {
          el.setInnerContent(categoryName);
          if (categorySlug) {
            el.setAttribute('href', `/blog.html?category=${categorySlug}`);
          }
        },
      })
      .on('#article-title', {
        element(el) {
          el.setInnerContent(article.title);
        },
      })
      .on('#article-author-name', {
        element(el) {
          el.setInnerContent(authorName);
        },
      })
      .on('#article-date', {
        element(el) {
          el.setInnerContent(formattedDate);
        },
      })
      .on('#article-reading-time', {
        element(el) {
          el.setInnerContent(readingTime);
        },
      })
      .on('#article-cover-img', {
        element(el) {
          el.setAttribute('src', coverUrl);
          el.setAttribute('alt', altText);
          el.removeAttribute('style'); // Unhide if initially hidden
        },
      })
      .on('#article-body-content', {
        element(el) {
          el.setInnerContent(article.content, { html: true });
        },
      });

    return rewriter.transform(templateResponse);
  } catch (err) {
    return new Response(`SSR Rendering Error: ${err.message}`, { status: 500 });
  }
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
