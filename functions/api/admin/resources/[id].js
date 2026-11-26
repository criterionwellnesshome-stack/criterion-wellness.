// functions/api/admin/resources/[id].js
// Handles fetching, updating, and deleting an individual resource

import { sanitizeArticleHtml, generateSlug } from '../../_utils.js';

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

  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const resource = await db
      .prepare(
        `SELECT r.*, c.name as category_name, c.slug as category_slug
         FROM resources r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.id = ?`
      )
      .bind(id)
      .first();

    if (!resource) {
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(resource), {
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

export async function onRequestPut(context) {
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

  const existing = await db.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Resource not found' }), {
      status: 404,
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
    type = existing.type,
    title = existing.title,
    slug: rawSlug,
    short_description = existing.short_description,
    full_description = existing.full_description,
    cover_image_url = existing.cover_image_url,
    image_alt_text = existing.image_alt_text,
    category_id = existing.category_id,
    publication_status = existing.publication_status,
    display_order = existing.display_order,
    price_kobo = existing.price_kobo,
    package_size = existing.package_size,
    availability_status = existing.availability_status,
    course_duration = existing.course_duration,
    course_level = existing.course_level,
    course_format = existing.course_format,
    enrollment_status = existing.enrollment_status,
    start_date = existing.start_date,
    material_format = existing.material_format,
    download_url = existing.download_url,
    file_r2_key = existing.file_r2_key,
    file_size_bytes = existing.file_size_bytes,
    external_link = existing.external_link,
    metadata_json = existing.metadata_json,
  } = body;

  if (!['product', 'course', 'educational_material'].includes(type)) {
    return new Response(JSON.stringify({ error: 'Invalid resource type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let slug = existing.slug;
  if (rawSlug && rawSlug !== existing.slug) {
    slug = generateSlug(rawSlug);
    const slugConflict = await db
      .prepare('SELECT id FROM resources WHERE slug = ? AND id != ?')
      .bind(slug, id)
      .first();

    if (slugConflict) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }
  }

  // Validate category_id if changed
  let validCategoryId = category_id || null;
  if (validCategoryId) {
    const catExists = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(validCategoryId).first();
    if (!catExists) validCategoryId = null;
  }

  const sanitizedDescription = full_description ? sanitizeArticleHtml(full_description) : '';

  const parsedPrice = type === 'product' && price_kobo !== undefined && price_kobo !== null && price_kobo !== ''
    ? Math.max(0, parseInt(price_kobo, 10) || 0)
    : null;

  const validAvailability = type === 'product' && ['available', 'unavailable', 'pre_order'].includes(availability_status)
    ? availability_status
    : (existing.availability_status || 'available');

  const validEnrollment = type === 'course' && ['open', 'closed', 'waitlist'].includes(enrollment_status)
    ? enrollment_status
    : (existing.enrollment_status || 'open');

  const parsedFileSize = file_size_bytes ? parseInt(file_size_bytes, 10) || null : null;

  try {
    await db
      .prepare(
        `UPDATE resources SET
          type = ?,
          title = ?,
          slug = ?,
          short_description = ?,
          full_description = ?,
          cover_image_url = ?,
          image_alt_text = ?,
          category_id = ?,
          publication_status = ?,
          display_order = ?,
          price_kobo = ?,
          package_size = ?,
          availability_status = ?,
          course_duration = ?,
          course_level = ?,
          course_format = ?,
          enrollment_status = ?,
          start_date = ?,
          material_format = ?,
          download_url = ?,
          file_r2_key = ?,
          file_size_bytes = ?,
          external_link = ?,
          metadata_json = ?,
          updated_at = datetime('now', 'utc')
        WHERE id = ?`
      )
      .bind(
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
        typeof metadata_json === 'string' ? metadata_json : JSON.stringify(metadata_json),
        id
      )
      .run();

    const updated = await db
      .prepare(
        `SELECT r.*, c.name as category_name, c.slug as category_slug
         FROM resources r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.id = ?`
      )
      .bind(id)
      .first();

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to update resource', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
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

  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
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

    await db.prepare('DELETE FROM resources WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, message: 'Resource deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to delete resource', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
