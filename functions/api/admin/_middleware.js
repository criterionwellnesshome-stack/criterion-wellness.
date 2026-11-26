// Cloudflare Pages Functions Middleware for /api/admin/*

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Allowlist of unauthenticated endpoints
  const isPublicAuthRoute =
    pathname === '/api/admin/auth/login' ||
    pathname === '/api/admin/auth/request-password-reset';

  if (isPublicAuthRoute) {
    return context.next();
  }

  // Ensure DB binding exists
  const db = context.env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ error: 'Database service is unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cookieHeader = context.request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['crt_admin_session'];

  if (!sessionToken) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const tokenHash = await sha256(sessionToken);

  try {
    const sessionRow = await db
      .prepare(
        `SELECT s.id AS session_id, s.expires_at, u.id AS staff_id, u.full_name, u.email, u.role, u.is_active
         FROM staff_sessions s
         JOIN staff u ON s.staff_id = u.id
         WHERE s.session_token_hash = ? AND s.expires_at > datetime('now', 'utc')`
      )
      .bind(tokenHash)
      .first();

    if (!sessionRow) {
      // Invalid or expired session - clear cookie
      return new Response(
        JSON.stringify({ error: 'Session expired or invalid' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'crt_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
          },
        }
      );
    }

    if (sessionRow.is_active !== 1) {
      // Account suspended - revoke session immediately
      await db.prepare('DELETE FROM staff_sessions WHERE id = ?').bind(sessionRow.session_id).run();
      return new Response(
        JSON.stringify({ error: 'Account suspended. Contact system administrator.' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'crt_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
          },
        }
      );
    }

    // Attach verified staff data to context for downstream handlers
    context.data.staff = {
      id: sessionRow.staff_id,
      fullName: sessionRow.full_name,
      email: sessionRow.email,
      role: sessionRow.role,
      sessionId: sessionRow.session_id,
    };

    return context.next();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Authentication check failed', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
