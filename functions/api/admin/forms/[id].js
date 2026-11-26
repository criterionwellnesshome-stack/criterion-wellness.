// functions/api/admin/forms/[id].js
// Retrieve single form definition version

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

  if (!staff) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const form = await db
      .prepare(
        `SELECT f.*, s.full_name as created_by_name
         FROM form_definitions f
         LEFT JOIN staff s ON f.created_by = s.id
         WHERE f.id = ?`
      )
      .bind(id)
      .first();

    if (!form) {
      return new Response(JSON.stringify({ error: 'Form definition not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(form), {
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
