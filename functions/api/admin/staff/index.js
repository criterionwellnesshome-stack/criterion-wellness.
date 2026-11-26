// /api/admin/staff/index.js

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const iterations = 600000;
  const encoder = new TextEncoder();

  const passKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passKey,
    256
  );

  const saltHex = bytesToHex(saltBytes);
  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  return `$pbkdf2-sha256$i=${iterations}$${saltHex}$${hashHex}`;
}

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
        `SELECT id, full_name, email, role, is_active, last_login_at, created_at
         FROM staff
         ORDER BY created_at ASC`
      )
      .all();

    return new Response(JSON.stringify({ staff: results || [] }), {
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
  const currentStaff = context.data?.staff;

  // Authorization: Only administrators can create staff
  if (!currentStaff || currentStaff.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Only administrators can provision staff' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { fullName, email, password, role } = body || {};

  if (!fullName || !email || !password || !role) {
    return new Response(
      JSON.stringify({ error: 'Full name, email, password, and role are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const validRoles = ['admin', 'content_staff', 'enquiry_staff'];
  if (!validRoles.includes(role)) {
    return new Response(
      JSON.stringify({ error: `Role must be one of: ${validRoles.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 10) {
    return new Response(
      JSON.stringify({ error: 'Password must be at least 10 characters long' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existing = await db
      .prepare('SELECT id FROM staff WHERE email = ? COLLATE NOCASE')
      .bind(cleanEmail)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'A staff member with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passwordHash = await hashPassword(password);
    const newStaffId = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO staff (id, full_name, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`
      )
      .bind(newStaffId, fullName.trim(), cleanEmail, passwordHash, role)
      .run();

    await db
      .prepare(
        `INSERT INTO activity_logs (id, staff_id, action, entity_type, entity_id, details_json)
         VALUES (?, ?, 'staff.create', 'staff', ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        currentStaff.id,
        newStaffId,
        JSON.stringify({ email: cleanEmail, role })
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        staff: {
          id: newStaffId,
          fullName: fullName.trim(),
          email: cleanEmail,
          role,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to create staff member', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
