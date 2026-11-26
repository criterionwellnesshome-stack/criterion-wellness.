// /api/admin/media/[id].js - Media deletion with reference guard

export async function onRequestDelete(context) {
  const db = context.env.DB;
  const storage = context.env.STORAGE;
  const staff = context.data?.staff;
  const mediaId = context.params.id;

  if (!db || !storage) {
    return new Response(JSON.stringify({ error: 'Storage services unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorization: Only admin can delete media
  if (!staff || staff.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Only administrators can delete media assets' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const media = await db
      .prepare('SELECT id, r2_key, public_url FROM media WHERE id = ?')
      .bind(mediaId)
      .first();

    if (!media) {
      return new Response(JSON.stringify({ error: 'Media not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Safeguard 3: Check if media is referenced by any article cover or body content
    const mediaUrl = media.public_url;
    const { results: referencingArticles } = await db
      .prepare(
        `SELECT id, title, slug, publication_status 
         FROM articles 
         WHERE cover_image_url = ? OR content LIKE ?`
      )
      .bind(mediaUrl, `%${mediaUrl}%`)
      .all();

    if (referencingArticles && referencingArticles.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete image: it is currently referenced by one or more articles.',
          referencingArticles,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Safe to delete: Delete from R2 object storage
    await storage.delete(media.r2_key);

    // Delete record from D1
    await db.prepare('DELETE FROM media WHERE id = ?').bind(mediaId).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Media asset deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Delete failed', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
