// functions/api/resources/index.js
// Public API to list published resources (Products, Courses, Educational Materials)

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10)));
  const offset = (page - 1) * limit;

  const type = url.searchParams.get('type') || '';
  const categorySlug = url.searchParams.get('category') || '';
  const q = url.searchParams.get('q')?.trim() || '';

  try {
    let whereClauses = ["r.publication_status = 'published'"];
    let params = [];

    if (type && ['product', 'course', 'educational_material'].includes(type)) {
      whereClauses.push('r.type = ?');
      params.push(type);
    }

    if (categorySlug) {
      whereClauses.push('(c.slug = ? OR c.id = ?)');
      params.push(categorySlug, categorySlug);
    }

    if (q) {
      whereClauses.push('(r.title LIKE ? OR r.short_description LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) as total
      FROM resources r
      LEFT JOIN categories c ON r.category_id = c.id
      ${whereSql}
    `;
    const totalRow = await db.prepare(countSql).bind(...params).first();
    const total = totalRow?.total || 0;

    const querySql = `
      SELECT r.id, r.type, r.title, r.slug, r.short_description, r.full_description,
             r.cover_image_url, r.image_alt_text, r.category_id, r.display_order,
             r.price_kobo, r.package_size, r.availability_status,
             r.course_duration, r.course_level, r.course_format, r.enrollment_status,
             r.start_date, r.material_format, r.download_url, r.file_size_bytes,
             r.external_link, r.created_at,
             c.name as category_name, c.slug as category_slug
      FROM resources r
      LEFT JOIN categories c ON r.category_id = c.id
      ${whereSql}
      ORDER BY r.display_order ASC, r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const { results } = await db.prepare(querySql).bind(...params, limit, offset).all();

    return new Response(
      JSON.stringify({
        resources: results || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
