import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };

  const cronSecret = Deno.env.get('CRON_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token || token !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  let totalDeleted = 0;

  // ── 1. Image cleanup: delete images older than 5 days ──────────────
  const imageCutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredImages, error: imgFetchErr } = await supabase
    .from('gallery_items')
    .select('id, storage_path')
    .eq('media_type', 'image')
    .lt('created_at', imageCutoff)
    .not('storage_path', 'is', null);

  if (imgFetchErr) {
    return new Response(JSON.stringify({ error: imgFetchErr.message }), { status: 500, headers });
  }

  if (expiredImages && expiredImages.length > 0) {
    const imgPaths = expiredImages
      .map((r: { storage_path: string | null }) => r.storage_path)
      .filter((p): p is string => !!p);

    if (imgPaths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('client-photos').remove(imgPaths);
      if (storageErr) console.error('[cleanup] Image storage removal error:', storageErr.message);
    }

    const imgIds = expiredImages.map((r: { id: string }) => r.id);
    const { error: deleteErr } = await supabase.from('gallery_items').delete().in('id', imgIds);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500, headers });
    }
    totalDeleted += imgIds.length;
    console.log(`[cleanup] Deleted ${imgIds.length} expired images`);
  }

  // ── 2. Video cleanup: delete videos past their 7-day expires_at ────
  const { data: expiredVideos, error: vidFetchErr } = await supabase
    .from('gallery_items')
    .select('id, storage_path')
    .eq('media_type', 'video')
    .lt('expires_at', new Date().toISOString())
    .not('storage_path', 'is', null);

  if (vidFetchErr) {
    return new Response(JSON.stringify({ error: vidFetchErr.message }), { status: 500, headers });
  }

  if (expiredVideos && expiredVideos.length > 0) {
    const vidPaths = expiredVideos
      .map((r: { storage_path: string | null }) => r.storage_path)
      .filter((p): p is string => !!p);

    if (vidPaths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('studio-media').remove(vidPaths);
      if (storageErr) console.error('[cleanup] Video storage removal error:', storageErr.message);
    }

    const vidIds = expiredVideos.map((r: { id: string }) => r.id);
    const { error: deleteErr } = await supabase.from('gallery_items').delete().in('id', vidIds);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500, headers });
    }
    totalDeleted += vidIds.length;
    console.log(`[cleanup] Deleted ${vidIds.length} expired videos`);
  }

  return new Response(JSON.stringify({ deleted: totalDeleted }), { status: 200, headers });
});
