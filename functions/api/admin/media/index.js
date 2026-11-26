// /api/admin/media/index.js

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  const q = url.searchParams.get('q')?.trim() || '';

  try {
    let countSql = 'SELECT COUNT(*) as total FROM media';
    let querySql = `
      SELECT m.id, m.filename, m.original_filename, m.mime_type, m.file_size_bytes,
             m.alt_text, m.caption, m.r2_key, m.public_url, m.created_at,
             s.full_name as uploader_name
      FROM media m
      LEFT JOIN staff s ON m.uploaded_by = s.id
    `;

    const params = [];
    if (q) {
      countSql += ' WHERE original_filename LIKE ? OR alt_text LIKE ? OR caption LIKE ?';
      querySql += ' WHERE m.original_filename LIKE ? OR m.alt_text LIKE ? OR m.caption LIKE ?';
      const searchPattern = `%${q}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    querySql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';

    const countStmt = params.length > 0 ? db.prepare(countSql).bind(...params) : db.prepare(countSql);
    const totalRow = await countStmt.first();
    const total = totalRow?.total || 0;

    const queryParams = [...params, limit, offset];
    const { results } = await db.prepare(querySql).bind(...queryParams).all();

    return new Response(
      JSON.stringify({
        media: results || [],
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
  const storage = context.env.STORAGE;
  const staff = context.data?.staff;

  if (!db || !storage) {
    return new Response(JSON.stringify({ error: 'Storage services unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorization check: Only admin and content_staff can upload media
  if (!staff || (staff.role !== 'admin' && staff.role !== 'content_staff')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let formData;
  try {
    formData = await context.request.formData();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = formData.get('file');
  const altText = formData.get('alt_text')?.toString().trim() || '';
  const caption = formData.get('caption')?.toString().trim() || '';

  if (!file || typeof file === 'string') {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Strict MIME type whitelist: JPEG, PNG, WebP and PDF documents. Reject SVG and executables!
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const mimeType = file.type?.toLowerCase();

  if (!allowedMimeTypes.includes(mimeType)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid file format. Only JPEG, PNG, WebP images, and PDF documents are permitted.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Max file size: 15MB for PDF documents, 5MB for images
  const maxBytes = mimeType === 'application/pdf' ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    const limitMb = mimeType === 'application/pdf' ? '15MB' : '5MB';
    return new Response(JSON.stringify({ error: `File size exceeds maximum limit of ${limitMb}.` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const originalFilename = file.name || 'uploaded_file';
  const extension =
    mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'image/jpeg'
      ? 'jpg'
      : mimeType === 'image/png'
      ? 'png'
      : 'webp';
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const r2Key = `${Date.now()}_${randomSuffix}.${extension}`;
  const publicUrl = `/api/media/${r2Key}`;

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Store in Cloudflare R2
    await storage.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    const mediaId = crypto.randomUUID();

    // Record in D1 media table
    await db
      .prepare(
        `INSERT INTO media (id, filename, original_filename, mime_type, file_size_bytes, alt_text, caption, r2_key, public_url, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        mediaId,
        r2Key,
        originalFilename,
        mimeType,
        file.size,
        altText,
        caption,
        r2Key,
        publicUrl,
        staff.id
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        media: {
          id: mediaId,
          filename: r2Key,
          originalFilename,
          mimeType,
          fileSizeBytes: file.size,
          altText,
          caption,
          r2Key,
          publicUrl,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Upload failed', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
