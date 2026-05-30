import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sets Authorization: Bearer $CRON_SECRET automatically
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const r = await fetch(`${supabaseUrl}/functions/v1/cleanup-photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}
