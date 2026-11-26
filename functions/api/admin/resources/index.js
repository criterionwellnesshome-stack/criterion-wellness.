// functions/api/admin/resources/index.js
// Handles listing and creating resources (Products, Courses, Educational Materials)

import { sanitizeArticleHtml, generateSlug } from '../../_utils.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorization check: admin and content_staff
  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  const type = url.searchParams.get('type') || '';
  const status = url.searchParams.get('status') || '';
  const categoryId = url.searchParams.get('category') || '';
  const q = url.searchParams.get('q')?.trim() || '';

  try {
    let whereClauses = [];
    let params = [];

    if (type && ['product', 'course', 'educational_material'].includes(type)) {
      whereClauses.push('r.type = ?');
      params.push(type);
    }

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      whereClauses.push('r.publication_status = ?');
      params.push(status);
    }

    if (categoryId) {
      whereClauses.push('r.category_id = ?');
      params.push(categoryId);
    }

    if (q) {
      whereClauses.push('(r.title LIKE ? OR r.short_description LIKE ? OR r.slug LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM resources r ${whereSql}`;
    const totalRow = await db.prepare(countSql).bind(...params).first();
    const total = totalRow?.total || 0;

    const querySql = `
      SELECT r.id, r.type, r.title, r.slug, r.short_description, r.full_description,
             r.cover_image_url, r.image_alt_text, r.category_id, r.publication_status,
             r.display_order, r.price_kobo, r.package_size, r.availability_status,
             r.course_duration, r.course_level, r.course_format, r.enrollment_status,
             r.start_date, r.material_format, r.download_url, r.file_r2_key,
             r.file_size_bytes, r.external_link, r.metadata_json, r.created_at, r.updated_at,
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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

  // Authorization check: admin and content_staff
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

  const {
    type,
    title,
    slug: rawSlug,
    short_description,
    full_description,
    cover_image_url,
    image_alt_text,
    category_id,
    publication_status = 'draft',
    display_order = 0,
    price_kobo,
    package_size,
    availability_status = 'available',
    course_duration,
    course_level,
    course_format,
    enrollment_status = 'open',
    start_date,
    material_format,
    download_url,
    file_r2_key,
    file_size_bytes,
    external_link,
    metadata_json = '{}',
  } = body;

  // Validation
  if (!type || !['product', 'course', 'educational_material'].includes(type)) {
    return new Response(
      JSON.stringify({ error: 'Invalid resource type. Must be product, course, or educational_material' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return new Response(JSON.stringify({ error: 'Resource title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let slug = (rawSlug && typeof rawSlug === 'string' && rawSlug.trim())
    ? generateSlug(rawSlug)
    : generateSlug(title);

  if (!slug) {
    slug = `resource-${Date.now().toString(36)}`;
  }

  // Ensure slug uniqueness
  const existingSlug = await db
    .prepare('SELECT id FROM resources WHERE slug = ?')
    .bind(slug)
    .first();

  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  // Validate publication status
  if (!['draft', 'published', 'archived'].includes(publication_status)) {
    return new Response(JSON.stringify({ error: 'Invalid publication status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate category_id if provided
  let validCategoryId = category_id || null;
  if (validCategoryId) {
    const catExists = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(validCategoryId).first();
    if (!catExists) {
      validCategoryId = null;
    }
  }

  const resourceId = crypto.randomUUID();
  const sanitizedDescription = full_description ? sanitizeArticleHtml(full_description) : '';

  // Type specific normalization
  const parsedPrice = type === 'product' && price_kobo !== undefined && price_kobo !== null && price_kobo !== ''
    ? Math.max(0, parseInt(price_kobo, 10) || 0)
    : null;

  const validAvailability = type === 'product' && ['available', 'unavailable', 'pre_order'].includes(availability_status)
    ? availability_status
    : 'available';

  const validEnrollment = type === 'course' && ['open', 'closed', 'waitlist'].includes(enrollment_status)
    ? enrollment_status
    : 'open';

  const parsedFileSize = file_size_bytes ? parseInt(file_size_bytes, 10) || null : null;

  try {
    await db
      .prepare(
        `INSERT INTO resources (
          id, type, title, slug, short_description, full_description,
          cover_image_url, image_alt_text, category_id, publication_status,
          display_order, price_kobo, package_size, availability_status,
          course_duration, course_level, course_format, enrollment_status,
          start_date, material_format, download_url, file_r2_key,
          file_size_bytes, external_link, metadata_json, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, datetime('now', 'utc'), datetime('now', 'utc')
        )`
      )
      .bind(
        resourceId,
        type,
        title.trim(),
        slug,
        short_description?.trim() || null,
        sanitizedDescription || null,
        cover_image_url || null,
        image_alt_text?.trim() || null,
        validCategoryId,
        publication_status,
        parseInt(display_order, 10) || 0,
        parsedPrice,
        package_size?.trim() || null,
        validAvailability,
        course_duration?.trim() || null,
        course_level?.trim() || null,
        course_format?.trim() || null,
        validEnrollment,
        start_date?.trim() || null,
        material_format?.trim() || null,
        download_url?.trim() || null,
        file_r2_key?.trim() || null,
        parsedFileSize,
        external_link?.trim() || null,
        typeof metadata_json === 'string' ? metadata_json : JSON.stringify(metadata_json)
      )
      .run();

    const created = await db
      .prepare(
        `SELECT r.*, c.name as category_name, c.slug as category_slug
         FROM resources r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.id = ?`
      )
      .bind(resourceId)
      .first();

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to create resource', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
