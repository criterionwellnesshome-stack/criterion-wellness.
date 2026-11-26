// POST /api/admin/auth/logout

export async function onRequestPost(context) {
  const db = context.env.DB;
  const staff = context.data?.staff;

  if (db && staff?.sessionId) {
    try {
      await db.prepare('DELETE FROM staff_sessions WHERE id = ?').bind(staff.sessionId).run();
      await db
        .prepare(
          `INSERT INTO activity_logs (id, staff_id, action, entity_type, entity_id)
           VALUES (?, ?, 'staff.logout', 'staff', ?)`
        )
        .bind(crypto.randomUUID(), staff.id, staff.id)
        .run();
    } catch (err) {
      console.error('Logout error:', err.message);
    }
  }

  return new Response(JSON.stringify({ success: true, message: 'Logged out successfully' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'crt_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  });
}
