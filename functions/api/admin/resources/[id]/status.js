// functions/api/admin/resources/[id]/status.js
// Handles status transitions (draft <-> published <-> archived)

export async function onRequestPatch(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;
  const id = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
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

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { status } = body;
  if (!['draft', 'published', 'archived'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status. Must be draft, published, or archived' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await db.prepare('SELECT id FROM resources WHERE id = ?').bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db
      .prepare(
        `UPDATE resources
         SET publication_status = ?, updated_at = datetime('now', 'utc')
         WHERE id = ?`
      )
      .bind(status, id)
      .run();

    return new Response(
      JSON.stringify({ success: true, id, status, message: `Resource status changed to ${status}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to update resource status', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
