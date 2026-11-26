// functions/api/forms/[slug].js
// Public API to retrieve the current active form definition for frontend rendering

export async function onRequestGet(context) {
  const db = context.env.DB;
  const slug = context.params.slug;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const form = await db
      .prepare(
        `SELECT id, form_slug, version_number, title, description, fields_schema_json
         FROM form_definitions
         WHERE form_slug = ? AND is_active = 1`
      )
      .bind(slug)
      .first();

    if (!form) {
      return new Response(JSON.stringify({ error: 'Active form definition not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(form), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
