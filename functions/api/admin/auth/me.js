// GET /api/admin/auth/me

export async function onRequestGet(context) {
  const staff = context.data?.staff;
  if (!staff) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      staff: {
        id: staff.id,
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
