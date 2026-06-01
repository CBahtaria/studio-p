// ════════════════════════════════════════════════
// STUDIO P — daily-report Edge Function
// Generates Mfanomuhle's daily briefing:
//   reads today's bookings → computes stats →
//   builds WhatsApp message → stores in daily_reports
// Triggered by Vercel Cron at 4 AM UTC (6 AM Eswatini)
// Can also be called on-demand from AdminPortal
// ════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OWNER        = 'Mfanomuhle';
const BUSINESS     = 'Fano Barbershop';
const LOCATION     = 'Kwaluseni, Manzini';
const WA_NUMBER    = Deno.env.get('WHATSAPP_NUMBER') ?? '26879333760';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

// Day-of-week hours in Eswatini (UTC+2): 0=Sun closed, 1-4=17:00, 5-6=19:00
const DAY_HOURS: Record<number, string | null> = {
  0: null,
  1: '08:00–17:00',
  2: '08:00–17:00',
  3: '08:00–17:00',
  4: '08:00–17:00',
  5: '08:00–19:00',
  6: '08:00–19:00',
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function eswatiniNow(): Date {
  // Eswatini = UTC+2
  const utcMs = Date.now();
  return new Date(utcMs + 2 * 60 * 60 * 1000);
}

function statusEmoji(status: string): string {
  if (status === 'confirmed') return '✅';
  if (status === 'pending')   return '⏳';
  if (status === 'cancelled') return '❌';
  if (status === 'completed') return '💈';
  return '·';
}

Deno.serve(async (req: Request) => {
  const ch = { 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: ch });
  }

  // Require service-role key or cron secret in Authorization header
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: ch });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Resolve "today" in Eswatini time
  const now    = eswatiniNow();
  const year   = now.getUTCFullYear();
  const month  = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day    = String(now.getUTCDate()).padStart(2, '0');
  const today  = `${year}-${month}-${day}`;
  const dayIdx = now.getUTCDay(); // 0=Sun … 6=Sat

  // Allow override via body (for manual triggers from AdminPortal)
  let reportDate = today;
  try {
    const body = await req.json().catch(() => ({})) as { date?: string; trigger?: string };
    if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) reportDate = body.date;
  } catch { /* use today */ }

  // Fetch all bookings for the report date
  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select('id, client_name, service, scheduled_at, status, price_swl, notes')
    .gte('scheduled_at', `${reportDate}T00:00:00+02:00`)
    .lt('scheduled_at',  `${reportDate}T23:59:59+02:00`)
    .order('scheduled_at', { ascending: true });

  if (bErr) {
    return new Response(JSON.stringify({ error: bErr.message }), { status: 500, headers: ch });
  }

  const rows = bookings ?? [];

  // Compute stats
  const stats = {
    total:     rows.length,
    confirmed: rows.filter(b => b.status === 'confirmed').length,
    pending:   rows.filter(b => b.status === 'pending').length,
    cancelled: rows.filter(b => b.status === 'cancelled').length,
    completed: rows.filter(b => b.status === 'completed').length,
    revenue:   rows.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.price_swl ?? 0), 0),
  };

  // Build schedule lines
  const scheduleLines = rows.map(b => {
    const t  = new Date(b.scheduled_at);
    // Convert to Eswatini UTC+2
    const localMs = t.getTime() + 2 * 60 * 60 * 1000;
    const localT  = new Date(localMs);
    const hh = String(localT.getUTCHours()).padStart(2, '0');
    const mm = String(localT.getUTCMinutes()).padStart(2, '0');
    const price = b.price_swl ? `E${Math.round(b.price_swl / 100)}` : '';
    return `${hh}:${mm}  ${statusEmoji(b.status)}  ${b.client_name}  ·  ${b.service}  ${price}`;
  });

  // Build appointments JSON for DB storage
  const appointmentsJson = rows.map(b => {
    const t       = new Date(b.scheduled_at);
    const localMs = t.getTime() + 2 * 60 * 60 * 1000;
    const localT  = new Date(localMs);
    return {
      id:           b.id,
      clientName:   b.client_name,
      service:      b.service,
      time:         `${String(localT.getUTCHours()).padStart(2, '0')}:${String(localT.getUTCMinutes()).padStart(2, '0')}`,
      status:       b.status,
      priceSWL:     b.price_swl ?? 0,
    };
  });

  const dayName   = DAY_NAMES[dayIdx];
  const hoursStr  = DAY_HOURS[dayIdx] ?? 'CLOSED';
  const revenueE  = Math.round(stats.revenue / 100);

  // Build WhatsApp message
  const whatsappMessage = [
    `🌅 *Good morning, ${OWNER}!*`,
    '',
    `📅 *${BUSINESS} — ${dayName} ${reportDate}*`,
    `📍 ${LOCATION}`,
    `⏰ Today: ${hoursStr}`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    `📊 *Today's Summary*`,
    `Appointments: ${stats.total}`,
    `✅ Confirmed: ${stats.confirmed}`,
    `⏳ Pending: ${stats.pending}`,
    `💰 Revenue: E${revenueE}`,
    '',
    ...(rows.length > 0
      ? [`📋 *Schedule*`, ...scheduleLines, '']
      : ['No appointments booked for today.', '']),
    ...(stats.pending > 0
      ? [`⚠️ *${stats.pending} booking${stats.pending > 1 ? 's' : ''} await your confirmation*`, '']
      : []),
    '💈 Have a great day!',
  ].join('\n');

  // Upsert into daily_reports
  const { error: upsertErr } = await supabase
    .from('daily_reports')
    .upsert({
      report_date:        reportDate,
      total_bookings:     stats.total,
      confirmed:          stats.confirmed,
      pending_count:      stats.pending,
      cancelled:          stats.cancelled,
      completed:          stats.completed,
      total_revenue_swl:  stats.revenue,
      appointments:       appointmentsJson,
      whatsapp_message:   whatsappMessage,
      generated_at:       new Date().toISOString(),
    }, { onConflict: 'report_date' });

  if (upsertErr) {
    console.error('[daily-report] upsert failed:', upsertErr.message);
  }

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  return new Response(JSON.stringify({
    ok:           true,
    reportDate,
    stats,
    whatsappUrl:  waUrl,
    message:      whatsappMessage,
    appointments: appointmentsJson,
  }), { status: 200, headers: ch });
});
