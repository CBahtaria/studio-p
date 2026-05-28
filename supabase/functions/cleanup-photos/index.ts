import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };

  // Only accept calls bearing the service role key
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token || token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  );

  // Find gallery_items older than 5 days that have a storage path
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error: fetchErr } = await supabase
    .from('gallery_items')
    .select('id, storage_path')
    .lt('created_at', cutoff)
    .not('storage_path', 'is', null);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers });
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200, headers });
  }

  const storagePaths = expired
    .map((r: { storage_path: string | null }) => r.storage_path)
    .filter((p): p is string => !!p);

  // Remove files from storage bucket
  if (storagePaths.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from('client-photos')
      .remove(storagePaths);
    if (storageErr) {
      console.error('[cleanup-photos] Storage removal error:', storageErr.message);
    }
  }

  // Delete the database rows
  const ids = expired.map((r: { id: string }) => r.id);
  const { error: deleteErr } = await supabase
    .from('gallery_items')
    .delete()
    .in('id', ids);

  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500, headers });
  }

  console.log(`[cleanup-photos] Deleted ${ids.length} expired photos`);
  return new Response(JSON.stringify({ deleted: ids.length }), { status: 200, headers });
});
