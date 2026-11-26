// /api/admin/categories/index.js

import { generateSlug } from '../../_utils.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { results } = await db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description, c.display_order,
                COUNT(a.id) AS article_count
         FROM categories c
         LEFT JOIN articles a ON a.category_id = c.id
         GROUP BY c.id
         ORDER BY c.display_order ASC, c.name ASC`
      )
      .all();

    return new Response(JSON.stringify({ categories: results || [] }), {
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
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorization: admin and content_staff
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

  const { name, slug, description } = body || {};

  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: 'Category name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanName = name.trim();
  const cleanSlug = generateSlug(slug || cleanName);
  const cleanDesc = description?.trim() || '';

  if (!cleanSlug) {
    return new Response(JSON.stringify({ error: 'Valid category slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await db
      .prepare('SELECT id FROM categories WHERE name = ? OR slug = ?')
      .bind(cleanName, cleanSlug)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'A category with this name or slug already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const catId = 'cat_' + crypto.randomUUID().slice(0, 8);
    const maxOrderRow = await db
      .prepare('SELECT MAX(display_order) as max_order FROM categories')
      .first();
    const nextOrder = (maxOrderRow?.max_order || 0) + 1;

    await db
      .prepare(
        `INSERT INTO categories (id, name, slug, description, display_order)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(catId, cleanName, cleanSlug, cleanDesc, nextOrder)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        category: {
          id: catId,
          name: cleanName,
          slug: cleanSlug,
          description: cleanDesc,
          display_order: nextOrder,
          article_count: 0,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to create category', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
