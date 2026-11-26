// /api/admin/articles/[id]/status.js

export async function onRequestPatch(context) {
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
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
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

  const { status } = body || {};
  const validStatuses = ['draft', 'published', 'unpublished'];

  if (!status || !validStatuses.includes(status)) {
    return new Response(
      JSON.stringify({ error: `Status must be one of: ${validStatuses.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const current = await db
    .prepare('SELECT id, published_at FROM articles WHERE id = ?')
    .bind(articleId)
    .first();

  if (!current) {
    return new Response(JSON.stringify({ error: 'Article not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Preserve original published_at timestamp if already published previously
  let publishedAt = current.published_at;
  if (status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  try {
    await db
      .prepare(
        `UPDATE articles 
         SET publication_status = ?, published_at = ?, updated_at = datetime('now', 'utc') 
         WHERE id = ?`
      )
      .bind(status, publishedAt, articleId)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        article: { id: articleId, publication_status: status, published_at: publishedAt },
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
