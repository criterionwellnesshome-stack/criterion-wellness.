// functions/api/enquiries/index.js
// Public endpoint for submitting client/patient enquiries

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service unavailable' }), {
      status: 503,
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
    full_name,
    phone,
    email,
    enquiry_type = 'general',
    preferred_contact_method = 'phone',
    consultation_area,
    selected_program_or_course,
    message,
    form_version_id: requestedFormVersionId,
    additional_responses = {},
  } = body;

  // Validation: Full name is required
  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return new Response(JSON.stringify({ error: 'Full name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validation: Phone is mandatory
  if (!phone || typeof phone !== 'string' || !phone.trim() || phone.replace(/\D/g, '').length < 6) {
    return new Response(JSON.stringify({ error: 'A valid phone number is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validation: Email is optional, but if present must be valid
  let cleanEmail = null;
  if (email && typeof email === 'string' && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    cleanEmail = email.trim().toLowerCase();
  }

  // Preferred contact method validation
  const validContactMethods = ['phone', 'whatsapp', 'email'];
  const contactMethod = validContactMethods.includes(preferred_contact_method)
    ? preferred_contact_method
    : 'phone';

  // Rate Limiting: Max 10 submissions per 10 minutes per IP
  const clientIp = context.request.headers.get('cf-connecting-ip') || '127.0.0.1';
  try {
    const recentSubmissions = await db
      .prepare(
        `SELECT COUNT(*) as count
         FROM enquiries
         WHERE created_at > datetime('now', '-10 minutes')
           AND json_extract(additional_responses_json, '$._client_ip') = ?`
      )
      .bind(clientIp)
      .first();

    if ((recentSubmissions?.count || 0) >= 10) {
      return new Response(
        JSON.stringify({
          error: 'Too many submissions received from your connection. Please wait a few moments before trying again.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    // If rate check fails, proceed without hard blocking
  }

  // Determine Form Version ID
  let formVersionId = requestedFormVersionId || null;
  if (!formVersionId) {
    try {
      const activeForm = await db
        .prepare('SELECT id FROM form_definitions WHERE form_slug = ? AND is_active = 1')
        .bind(enquiry_type)
        .first();
      if (activeForm) {
        formVersionId = activeForm.id;
      }
    } catch {
      // Continue even if lookup fails
    }
  }

  // Dynamic responses container
  const safeResponses = typeof additional_responses === 'object' && additional_responses !== null
    ? { ...additional_responses, _client_ip: clientIp }
    : { _client_ip: clientIp };

  const id = `CRIT-ENQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  try {
    await db
      .prepare(
        `INSERT INTO enquiries (
          id, form_version_id, enquiry_type, full_name, phone,
          email, preferred_contact_method, consultation_area,
          selected_program_or_course, message, additional_responses_json,
          status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          'new', datetime('now', 'utc'), datetime('now', 'utc')
        )`
      )
      .bind(
        id,
        formVersionId,
        enquiry_type.trim(),
        full_name.trim(),
        phone.trim(),
        cleanEmail,
        contactMethod,
        consultation_area?.trim() || null,
        selected_program_or_course?.trim() || null,
        message?.trim() || null,
        JSON.stringify(safeResponses)
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        reference: id,
        message: 'Your enquiry has been received. Our clinical team will reach out to you promptly.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to record enquiry', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
