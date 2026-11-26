// GET /api/media/:key - Stream media object from R2

export async function onRequestGet(context) {
  const storage = context.env.STORAGE;
  if (!storage) {
    return new Response(JSON.stringify({ error: 'Storage service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = context.params.key;
  if (!key) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const object = await storage.get(key);
    if (!object) {
      return new Response('Media Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'image/jpeg');
    }

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response(`Error retrieving media: ${err.message}`, { status: 500 });
  }
}
