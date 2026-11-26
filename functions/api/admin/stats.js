// GET /api/admin/stats

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service is unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const [enquiriesTotal, enquiriesNew, articlesTotal, resourcesTotal, staffTotal] =
      await Promise.all([
        db.prepare('SELECT COUNT(*) as count FROM enquiries').first(),
        db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'new'").first(),
        db.prepare('SELECT COUNT(*) as count FROM articles').first(),
        db.prepare('SELECT COUNT(*) as count FROM resources').first(),
        db.prepare('SELECT COUNT(*) as count FROM staff WHERE is_active = 1').first(),
      ]);

    return new Response(
      JSON.stringify({
        enquiries: {
          total: enquiriesTotal?.count || 0,
          new: enquiriesNew?.count || 0,
        },
        articles: {
          total: articlesTotal?.count || 0,
        },
        resources: {
          total: resourcesTotal?.count || 0,
        },
        staff: {
          activeTotal: staffTotal?.count || 0,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve stats', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
