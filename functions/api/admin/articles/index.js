// /api/admin/articles/index.js

import { sanitizeArticleHtml, calculateReadingTime, generateSlug } from '../../_utils.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status') || 'all';
  const categoryId = url.searchParams.get('category') || '';
  const q = url.searchParams.get('q')?.trim() || '';

  try {
    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('a.publication_status = ?');
      params.push(status);
    }

    if (categoryId) {
      whereClauses.push('a.category_id = ?');
      params.push(categoryId);
    }

    if (q) {
      whereClauses.push('(a.title LIKE ? OR a.summary LIKE ? OR a.slug LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM articles a ${whereSql}`;
    const totalRow = await db.prepare(countSql).bind(...params).first();
    const total = totalRow?.total || 0;

    const querySql = `
      SELECT a.id, a.title, a.slug, a.seo_title, a.seo_description, a.summary,
             a.cover_image_url, a.image_alt_text, a.author_id, a.author_name,
             a.reading_time_minutes, a.category_id, a.publication_status,
             a.published_at, a.created_at, a.updated_at,
             c.name as category_name, c.slug as category_slug
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereSql}
      ORDER BY 
        CASE WHEN a.publication_status = 'published' THEN a.published_at ELSE a.created_at END DESC
      LIMIT ? OFFSET ?
    `;

    const { results } = await db.prepare(querySql).bind(...params, limit, offset).all();

    return new Response(
      JSON.stringify({
        articles: results || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;

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

  // Check slug uniqueness across active articles and archived redirects
  const existingSlug = await db
    .prepare('SELECT id FROM articles WHERE slug = ?')
    .bind(rawSlug)
    .first();

  if (existingSlug) {
    return new Response(
      JSON.stringify({ error: 'An article with this URL slug already exists. Please choose a unique slug.' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Sanitize content server-side
  const cleanContent = sanitizeArticleHtml(content || '');
  const readingTime = calculateReadingTime(cleanContent);
  const cleanAuthor = author_name?.trim() || 'Criterion Holistic Wellness Home';
  const cleanSummary = summary?.trim() || '';
  const cleanSeoTitle = seo_title?.trim() || cleanTitle;
  const cleanSeoDesc = seo_description?.trim() || cleanSummary;

  // Publication state handling: default to 'draft'
  const isPublishing = publication_status === 'published';
  const status = isPublishing ? 'published' : 'draft';
  const publishedAt = isPublishing ? new Date().toISOString() : null;

  const articleId = crypto.randomUUID();

  try {
    await db
      .prepare(
        `INSERT INTO articles (
          id, title, slug, seo_title, seo_description, summary, content,
          cover_image_url, image_alt_text, author_id, author_name,
          reading_time_minutes, category_id, publication_status, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        articleId,
        cleanTitle,
        rawSlug,
        cleanSeoTitle,
        cleanSeoDesc,
        cleanSummary,
        cleanContent,
        cover_image_url || null,
        image_alt_text || null,
        staff.id,
        cleanAuthor,
        readingTime,
        category_id || null,
        status,
        publishedAt
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: articleId,
          title: cleanTitle,
          slug: rawSlug,
          publication_status: status,
          published_at: publishedAt,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to create article', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
