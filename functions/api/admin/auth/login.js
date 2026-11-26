// POST /api/admin/auth/login

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

async function verifyPassword(password, storedHash) {
  try {
    // Format: $pbkdf2-sha256$i=600000$<salt_hex>$<hash_hex>
    const parts = storedHash.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') {
      return false;
    }

    const iterPart = parts[2]; // e.g. i=600000
    const iterations = parseInt(iterPart.replace('i=', ''), 10);
    const saltHex = parts[3];
    const originalHashHex = parts[4];

    const saltBytes = hexToBytes(saltHex);
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

    const derivedHex = bytesToHex(new Uint8Array(derivedBits));

    // Constant-time string comparison to prevent timing leaks
    if (derivedHex.length !== originalHashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < derivedHex.length; i++) {
      diff |= derivedHex.charCodeAt(i) ^ originalHashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    return false;
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database service is unavailable' }), {
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

  const { email, password } = body || {};
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientIp = context.request.headers.get('cf-connecting-ip') || '127.0.0.1';
  const userAgent = context.request.headers.get('user-agent') || '';
  const cleanEmail = email.trim().toLowerCase();

  // 1. Rate-limiting check: 5 failed attempts in past 15 minutes
  try {
    const rateCheck = await db
      .prepare(
        `SELECT COUNT(*) AS failed_count 
         FROM login_attempts 
         WHERE (ip_address = ? OR identifier = ?) 
           AND attempted_at > datetime('now', '-15 minutes') 
           AND is_successful = 0`
      )
      .bind(clientIp, cleanEmail)
      .first();

    if (rateCheck && rateCheck.failed_count >= 5) {
      // Record blocked attempt
      await db
        .prepare(
          `INSERT INTO login_attempts (id, ip_address, identifier, is_successful)
           VALUES (?, ?, ?, 0)`
        )
        .bind(crypto.randomUUID(), clientIp, cleanEmail)
        .run();

      return new Response(
        JSON.stringify({
          error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900',
          },
        }
      );
    }
  } catch (err) {
    // If rate-check fails, log error but proceed to auth check
    console.error('Rate limit query failed:', err.message);
  }

  // 2. Fetch staff record
  let staff;
  try {
    staff = await db
      .prepare(
        `SELECT id, full_name, email, password_hash, role, is_active
         FROM staff
         WHERE email = ? COLLATE NOCASE`
      )
      .bind(cleanEmail)
      .first();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Database query failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Verify credentials
  const isValid = staff && staff.is_active === 1 && (await verifyPassword(password, staff.password_hash));

  if (!isValid) {
    // Record failed attempt
    try {
      await db
        .prepare(
          `INSERT INTO login_attempts (id, ip_address, identifier, is_successful)
           VALUES (?, ?, ?, 0)`
        )
        .bind(crypto.randomUUID(), clientIp, cleanEmail)
        .run();
    } catch {}

    const errorMsg =
      staff && staff.is_active === 0
        ? 'Account is deactivated. Contact system administrator.'
        : 'Invalid email or password.';

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Record successful login attempt
  try {
    await db
      .prepare(
        `INSERT INTO login_attempts (id, ip_address, identifier, is_successful)
         VALUES (?, ?, ?, 1)`
      )
      .bind(crypto.randomUUID(), clientIp, cleanEmail)
      .run();
  } catch {}

  // 5. Generate secure 32-byte cryptographic token (256 bits)
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const sessionToken = bytesToHex(tokenBytes);
  const tokenHash = await sha256(sessionToken);
  const sessionId = crypto.randomUUID();

  // 6. Store hashed session in D1 (24-hour expiration)
  try {
    await db
      .prepare(
        `INSERT INTO staff_sessions (id, staff_id, session_token_hash, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, datetime('now', '+24 hours'))`
      )
      .bind(sessionId, staff.id, tokenHash, clientIp, userAgent)
      .run();

    // Update staff last_login_at
    await db
      .prepare(`UPDATE staff SET last_login_at = datetime('now', 'utc') WHERE id = ?`)
      .bind(staff.id)
      .run();

    // Log administrative action
    await db
      .prepare(
        `INSERT INTO activity_logs (id, staff_id, action, entity_type, entity_id, ip_address)
         VALUES (?, ?, 'staff.login', 'staff', ?, ?)`
      )
      .bind(crypto.randomUUID(), staff.id, staff.id, clientIp)
      .run();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to establish session', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 7. Issue secure cookie
  const isHttps = context.request.url.startsWith('https:');
  const secureFlag = isHttps ? '; Secure' : '';
  const cookieHeader = `crt_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secureFlag}`;

  return new Response(
    JSON.stringify({
      success: true,
      staff: {
        id: staff.id,
        fullName: staff.full_name,
        email: staff.email,
        role: staff.role,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    }
  );
}
