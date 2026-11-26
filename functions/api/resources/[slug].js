// functions/api/resources/[slug].js
// Public API to retrieve a single published resource by slug

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
    const resource = await db
      .prepare(
        `SELECT r.id, r.type, r.title, r.slug, r.short_description, r.full_description,
                r.cover_image_url, r.image_alt_text, r.category_id,
                r.price_kobo, r.package_size, r.availability_status,
                r.course_duration, r.course_level, r.course_format, r.enrollment_status,
                r.start_date, r.material_format, r.download_url, r.file_size_bytes,
                r.external_link, r.metadata_json, r.created_at,
                c.name as category_name, c.slug as category_slug
         FROM resources r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.slug = ? AND r.publication_status = 'published'`
      )
      .bind(slug)
      .first();

    if (!resource) {
      return new Response(JSON.stringify({ error: 'Resource not found or not published' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(resource), {
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
