// /api/blog/articles/index.js - Public published articles list

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
  const limit = Math.min(24, Math.max(1, parseInt(url.searchParams.get('limit') || '9', 10)));
  const offset = (page - 1) * limit;
  const categorySlug = url.searchParams.get('category')?.trim() || '';
  const q = url.searchParams.get('q')?.trim() || '';

  try {
    let whereClauses = ["a.publication_status = 'published'"];
    let params = [];

    if (categorySlug) {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (q) {
      whereClauses.push('(a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereSql}
    `;
    const countRow = await db.prepare(countSql).bind(...params).first();
    const total = countRow?.total || 0;

    // Articles query
    const querySql = `
      SELECT a.id, a.title, a.slug, a.seo_title, a.seo_description, a.summary,
             a.cover_image_url, a.image_alt_text, a.author_name,
             a.reading_time_minutes, a.published_at,
             c.name as category_name, c.slug as category_slug
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereSql}
      ORDER BY a.published_at DESC
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
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=120',
        },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
