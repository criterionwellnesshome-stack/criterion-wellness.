// functions/api/admin/enquiries/[id]/status.js
// Updates the status of an enquiry (new, reviewed, archived)

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

  if (!staff || (staff.role !== 'admin' && staff.role !== 'enquiry_staff')) {
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
  if (!['new', 'reviewed', 'archived'].includes(status)) {
    return new Response(
      JSON.stringify({ error: 'Invalid status. Must be new, reviewed, or archived' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const existing = await db.prepare('SELECT id, status FROM enquiries WHERE id = ?').bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Enquiry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (status === 'reviewed') {
      await db
        .prepare(
          `UPDATE enquiries
           SET status = ?, reviewed_by = ?, reviewed_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
           WHERE id = ?`
        )
        .bind(status, staff.id, id)
        .run();
    } else if (status === 'new') {
      await db
        .prepare(
          `UPDATE enquiries
           SET status = ?, reviewed_by = NULL, reviewed_at = NULL, updated_at = datetime('now', 'utc')
           WHERE id = ?`
        )
        .bind(status, id)
        .run();
    } else {
      // archived
      await db
        .prepare(
          `UPDATE enquiries
           SET status = ?, updated_at = datetime('now', 'utc')
           WHERE id = ?`
        )
        .bind(status, id)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        id,
        status,
        message: `Enquiry status changed to ${status}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to update enquiry status', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
