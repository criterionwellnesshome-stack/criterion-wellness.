// functions/api/admin/enquiries/index.js
// Admin API for listing client enquiries with filters, search, and pagination

export async function onRequestGet(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorization check: admin and enquiry_staff can access enquiries
  if (!staff || (staff.role !== 'admin' && staff.role !== 'enquiry_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to access enquiries' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  const status = url.searchParams.get('status') || '';
  const type = url.searchParams.get('type') || '';
  const q = url.searchParams.get('q')?.trim() || '';

  try {
    let whereClauses = [];
    let params = [];

    if (status && ['new', 'reviewed', 'archived'].includes(status)) {
      whereClauses.push('e.status = ?');
      params.push(status);
    }

    if (type) {
      whereClauses.push('e.enquiry_type = ?');
      params.push(type);
    }

    if (q) {
      whereClauses.push('(e.full_name LIKE ? OR e.phone LIKE ? OR e.email LIKE ? OR e.message LIKE ? OR e.id LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM enquiries e ${whereSql}`;
    const totalRow = await db.prepare(countSql).bind(...params).first();
    const total = totalRow?.total || 0;

    const querySql = `
      SELECT e.id, e.form_version_id, e.enquiry_type, e.full_name, e.phone, e.email,
             e.preferred_contact_method, e.consultation_area, e.selected_program_or_course,
             e.message, e.additional_responses_json, e.status, e.reviewed_at, e.created_at,
             f.title as form_title,
             s.full_name as reviewed_by_name
      FROM enquiries e
      LEFT JOIN form_definitions f ON e.form_version_id = f.id
      LEFT JOIN staff s ON e.reviewed_by = s.id
      ${whereSql}
      ORDER BY 
        CASE WHEN e.status = 'new' THEN 0 ELSE 1 END,
        e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const { results } = await db.prepare(querySql).bind(...params, limit, offset).all();

    return new Response(
      JSON.stringify({
        enquiries: results || [],
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
