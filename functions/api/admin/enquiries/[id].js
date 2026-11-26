// functions/api/admin/enquiries/[id].js
// Admin API for viewing and deleting a specific enquiry

export async function onRequestGet(context) {
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

  try {
    const enquiry = await db
      .prepare(
        `SELECT e.*,
                f.title as form_title, f.fields_schema_json,
                s.full_name as reviewed_by_name
         FROM enquiries e
         LEFT JOIN form_definitions f ON e.form_version_id = f.id
         LEFT JOIN staff s ON e.reviewed_by = s.id
         WHERE e.id = ?`
      )
      .bind(id)
      .first();

    if (!enquiry) {
      return new Response(JSON.stringify({ error: 'Enquiry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(enquiry), {
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

export async function onRequestDelete(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;
  const id = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Deleting enquiries is restricted to admin only
  if (!staff || staff.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can delete enquiries' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await db.prepare('SELECT id FROM enquiries WHERE id = ?').bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Enquiry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.prepare('DELETE FROM enquiries WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, message: 'Enquiry deleted successfully' }), {
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
