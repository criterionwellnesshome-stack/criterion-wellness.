// /api/blog/categories.js - Public active categories

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { results } = await db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description,
                COUNT(a.id) as published_article_count
         FROM categories c
         INNER JOIN articles a ON a.category_id = c.id
         WHERE a.publication_status = 'published'
         GROUP BY c.id
         ORDER BY c.display_order ASC, c.name ASC`
      )
      .all();

    return new Response(JSON.stringify({ categories: results || [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
