// /api/admin/categories/[id].js

import { generateSlug } from '../../_utils.js';

export async function onRequestPut(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;
  const catId = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
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

  try {
    const existing = await db
      .prepare('SELECT id FROM categories WHERE (name = ? OR slug = ?) AND id != ?')
      .bind(cleanName, cleanSlug, catId)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Another category with this name or slug already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db
      .prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?')
      .bind(cleanName, cleanSlug, cleanDesc, catId)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        category: { id: catId, name: cleanName, slug: cleanSlug, description: cleanDesc },
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

export async function onRequestDelete(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;
  const catId = context.params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrator can delete categories
  if (!staff || staff.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Only administrators can delete categories' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(context.request.url);
  let reassignToId = url.searchParams.get('reassign_to');

  let body = {};
  try {
    body = await context.request.json();
    if (!reassignToId && body?.reassign_to_category_id) {
      reassignToId = body.reassign_to_category_id;
    }
  } catch {}

  try {
    // Check if category has articles
    const countRow = await db
      .prepare('SELECT COUNT(*) as count FROM articles WHERE category_id = ?')
      .bind(catId)
      .first();

    const articleCount = countRow?.count || 0;

    if (articleCount > 0) {
      if (!reassignToId) {
        // Safeguard 7: Inform administrator with option to reassign
        return new Response(
          JSON.stringify({
            error: `Category contains ${articleCount} article(s). Please specify a target category to reassign them to before deleting.`,
            articleCount,
            requiresReassignment: true,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (reassignToId === catId) {
        return new Response(
          JSON.stringify({ error: 'Cannot reassign articles to the same category being deleted.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Verify target category exists
      const targetCategory = await db
        .prepare('SELECT id FROM categories WHERE id = ?')
        .bind(reassignToId)
        .first();

      if (!targetCategory) {
        return new Response(
          JSON.stringify({ error: 'Reassignment target category not found.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Reassign articles to the target category
      await db
        .prepare('UPDATE articles SET category_id = ? WHERE category_id = ?')
        .bind(reassignToId, catId)
        .run();
    }

    // Now delete the category
    await db.prepare('DELETE FROM categories WHERE id = ?').bind(catId).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Category deleted successfully',
        reassignedCount: articleCount,
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
