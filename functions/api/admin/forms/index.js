// functions/api/admin/forms/index.js
// Handles listing form definitions and creating/versioning form definitions

export async function onRequestGet(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Any authenticated staff can view forms
  if (!staff) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { results } = await db
      .prepare(
        `SELECT f.id, f.form_slug, f.version_number, f.title, f.description,
                f.fields_schema_json, f.is_active, f.created_at,
                s.full_name as created_by_name
         FROM form_definitions f
         LEFT JOIN staff s ON f.created_by = s.id
         ORDER BY f.form_slug ASC, f.version_number DESC`
      )
      .all();

    return new Response(JSON.stringify({ forms: results || [] }), {
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

export async function onRequestPost(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only admin can create or update form definitions
  if (!staff || staff.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
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

  const { form_slug, title, description, fields } = body;

  if (!form_slug || typeof form_slug !== 'string' || !form_slug.trim()) {
    return new Response(JSON.stringify({ error: 'form_slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return new Response(JSON.stringify({ error: 'title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!fields || !Array.isArray(fields)) {
    return new Response(JSON.stringify({ error: 'fields array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanSlug = form_slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
  const fieldsJson = JSON.stringify(fields);

  try {
    // Find current highest version for this form slug
    const maxRow = await db
      .prepare('SELECT MAX(version_number) as max_v FROM form_definitions WHERE form_slug = ?')
      .bind(cleanSlug)
      .first();

    const nextVersion = (maxRow?.max_v || 0) + 1;
    const newId = `${cleanSlug}-v${nextVersion}`;

    // Deactivate previous versions
    await db
      .prepare('UPDATE form_definitions SET is_active = 0 WHERE form_slug = ?')
      .bind(cleanSlug)
      .run();

    // Insert new immutable version
    await db
      .prepare(
        `INSERT INTO form_definitions (
          id, form_slug, version_number, title, description,
          fields_schema_json, is_active, created_at, created_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, 1, datetime('now', 'utc'), ?
        )`
      )
      .bind(
        newId,
        cleanSlug,
        nextVersion,
        title.trim(),
        description?.trim() || null,
        fieldsJson,
        staff.id
      )
      .run();

    const created = await db
      .prepare('SELECT * FROM form_definitions WHERE id = ?')
      .bind(newId)
      .first();

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to create form definition', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
