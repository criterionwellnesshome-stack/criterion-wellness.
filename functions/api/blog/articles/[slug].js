// /api/blog/articles/[slug].js - Public single published article endpoint

export async function onRequestGet(context) {
  const db = context.env.DB;
  const slug = context.params.slug;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Direct match in published articles
    const article = await db
      .prepare(
        `SELECT a.id, a.title, a.slug, a.seo_title, a.seo_description, a.summary,
                a.content, a.cover_image_url, a.image_alt_text, a.author_name,
                a.reading_time_minutes, a.published_at, a.created_at,
                c.name as category_name, c.slug as category_slug
         FROM articles a
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.slug = ? AND a.publication_status = 'published'`
      )
      .bind(slug)
      .first();

    if (article) {
      return new Response(JSON.stringify({ article }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }

    // 2. Safeguard 5: Check if this was an old slug that was modified (automatic 301 redirect)
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

    // 3. Not found or unpublished
    return new Response(JSON.stringify({ error: 'Article not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
