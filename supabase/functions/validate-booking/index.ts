import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const ALLOWED_ORIGINS = [
  'https://studio-p-prod.vercel.app',
  'https://studio-p.vercel.app',
  'http://localhost:5173',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const BookingRequestSchema = z.object({
  service:   z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:      z.string().regex(/^\d{2}:\d{2}$/),
  clientId:  z.string().uuid(),
  email:     z.string().email(),
  phone:     z.string().optional(),
  notes:     z.string().max(200).optional(),
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    // Verify caller JWT before any data operation
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ approved: false, reason: 'Unauthorized' }), { status: 401, headers: ch });
    }
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ approved: false, reason: 'Unauthorized' }), { status: 401, headers: ch });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const parsed = BookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ approved: false, reason: 'Invalid request', errors: parsed.error.issues }), { status: 400, headers: ch });
    }

    // Caller must match the clientId they're booking for
    if (caller.id !== parsed.data.clientId) {
      return new Response(JSON.stringify({ approved: false, reason: 'Forbidden' }), { status: 403, headers: ch });
    }

    const { service, date, time, clientId } = parsed.data;

    const { data: limited } = await supabase
      .rpc('check_booking_rate_limit', { p_user_id: clientId });

    if (limited === false) {
      return new Response(JSON.stringify({ approved: false, reason: 'Daily booking limit reached (max 5 per day)' }), { status: 429, headers: ch });
    }

    const { data: svc, error: svcErr } = await supabase
      .from('services')
      .select('id, name, price_swl, duration_minutes')
      .eq('id', service)
      .eq('active', true)
      .single();

    if (svcErr || !svc) {
      return new Response(JSON.stringify({ approved: false, reason: 'Service not found or unavailable' }), { status: 400, headers: ch });
    }

    const scheduledAt = new Date(`${date}T${time}:00`);
    if (scheduledAt < new Date()) {
      return new Response(JSON.stringify({ approved: false, reason: 'Booking date must be in the future' }), { status: 400, headers: ch });
    }

    const slotEnd = new Date(scheduledAt.getTime() + svc.duration_minutes * 60000);
    const { count: conflict } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed'])
      .lt('scheduled_at', slotEnd.toISOString())
      .gt('scheduled_at', new Date(scheduledAt.getTime() - svc.duration_minutes * 60000).toISOString());

    if ((conflict ?? 0) > 0) {
      return new Response(JSON.stringify({ approved: false, reason: 'Time slot is already booked' }), { status: 409, headers: ch });
    }

    const bookingId = 'BK-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', clientId)
      .single();

    const { error: insertErr } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        client_id: clientId,
        client_name: profile?.name ?? 'Studio P Member',
        service: svc.name,
        barber: 'Any Available',
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        price_swl: svc.price_swl,
        notes: parsed.data.notes ?? null,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ approved: false, reason: 'Failed to create booking' }), { status: 500, headers: ch });
    }

    return new Response(
      JSON.stringify({ approved: true, bookingId, confidence: 99, scheduledAt: scheduledAt.toISOString() }),
      { status: 201, headers: ch },
    );

  } catch {
    return new Response(JSON.stringify({ approved: false, reason: 'Internal server error' }), { status: 500, headers: ch });
  }
});
