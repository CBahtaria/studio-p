import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Cron handler — calls the Supabase daily-report Edge Function
// Schedule: 0 4 * * * (4 AM UTC = 6 AM Eswatini UTC+2)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-vercel-cron-signature'] ?? req.headers['authorization'];
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/daily-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'cron' }),
    });

    const body = await resp.json();
    return res.status(resp.ok ? 200 : 502).json(body);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
