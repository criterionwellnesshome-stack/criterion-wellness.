// /api/admin/articles/[id].js

import { sanitizeArticleHtml, calculateReadingTime, generateSlug } from '../../_utils.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  const articleId = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const article = await db
      .prepare(
        `SELECT a.*, c.name as category_name, c.slug as category_slug
         FROM articles a
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.id = ?`
      )
      .bind(articleId)
      .first();

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ article }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPut(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;
  const articleId = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch current article
  const current = await db
    .prepare('SELECT * FROM articles WHERE id = ?')
    .bind(articleId)
    .first();

  if (!current) {
    return new Response(JSON.stringify({ error: 'Article not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    title,
    slug,
    summary,
    content,
    cover_image_url,
    image_alt_text,
    category_id,
    author_name,
    seo_title,
    seo_description,
    publication_status,
  } = body || {};

  if (!title || !title.trim()) {
    return new Response(JSON.stringify({ error: 'Article title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanTitle = title.trim();
  const rawSlug = slug ? generateSlug(slug) : generateSlug(cleanTitle);

  if (!rawSlug) {
    return new Response(JSON.stringify({ error: 'Valid article URL slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check slug uniqueness
  if (rawSlug !== current.slug) {
    const existing = await db
      .prepare('SELECT id FROM articles WHERE slug = ? AND id != ?')
      .bind(rawSlug, articleId)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Another article already uses this URL slug.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Safeguard 4 & 5: If the article was previously published and the slug changes,
    // record a redirect from old_slug to prevent broken URLs
    if (current.publication_status === 'published' || current.published_at) {
      await db
        .prepare(
          `INSERT OR REPLACE INTO article_slug_redirects (id, old_slug, article_id)
           VALUES (?, ?, ?)`
        )
        .bind(crypto.randomUUID(), current.slug, articleId)
        .run();
    }
  }

  const cleanContent = sanitizeArticleHtml(content || '');
  const readingTime = calculateReadingTime(cleanContent);
  const cleanAuthor = author_name?.trim() || current.author_name || 'Criterion Holistic Wellness Home';
  const cleanSummary = summary?.trim() ?? current.summary;
  const cleanSeoTitle = seo_title?.trim() || cleanTitle;
  const cleanSeoDesc = seo_description?.trim() || cleanSummary;

  // Safeguard 4: Preserve published status unless explicitly requested to change
  let nextStatus = current.publication_status;
  let nextPublishedAt = current.published_at;

  if (publication_status && ['draft', 'published', 'unpublished'].includes(publication_status)) {
    nextStatus = publication_status;
    if (nextStatus === 'published' && !nextPublishedAt) {
      nextPublishedAt = new Date().toISOString();
    }
  }

  try {
    await db
      .prepare(
        `UPDATE articles SET
          title = ?,
          slug = ?,
          seo_title = ?,
          seo_description = ?,
          summary = ?,
          content = ?,
          cover_image_url = ?,
          image_alt_text = ?,
          author_name = ?,
          reading_time_minutes = ?,
          category_id = ?,
          publication_status = ?,
          published_at = ?,
          updated_at = datetime('now', 'utc')
        WHERE id = ?`
      )
      .bind(
        cleanTitle,
        rawSlug,
        cleanSeoTitle,
        cleanSeoDesc,
        cleanSummary,
        cleanContent,
        cover_image_url || null,
        image_alt_text || null,
        cleanAuthor,
        readingTime,
        category_id || null,
        nextStatus,
        nextPublishedAt,
        articleId
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: articleId,
          title: cleanTitle,
          slug: rawSlug,
          publication_status: nextStatus,
          published_at: nextPublishedAt,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to update article', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestDelete(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;
  const articleId = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorization: admin and content_staff
  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const article = await db.prepare('SELECT id FROM articles WHERE id = ?').bind(articleId).first();
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete redirects and article (foreign keys cascade)
    await db.prepare('DELETE FROM article_slug_redirects WHERE article_id = ?').bind(articleId).run();
    await db.prepare('DELETE FROM articles WHERE id = ?').bind(articleId).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Article deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Delete failed', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
