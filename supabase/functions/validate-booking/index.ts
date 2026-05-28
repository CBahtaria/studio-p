import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const parsed = BookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ approved: false, reason: 'Invalid request', errors: parsed.error.issues }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { service, date, time, clientId } = parsed.data;

    // Rate limit check (5 bookings per day per user)
    const { data: limited } = await supabase
      .rpc('check_booking_rate_limit', { p_user_id: clientId });

    if (limited === false) {
      return new Response(JSON.stringify({ approved: false, reason: 'Daily booking limit reached (max 5 per day)' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service exists and is active
    const { data: svc, error: svcErr } = await supabase
      .from('services')
      .select('id, name, price_swl, duration_minutes')
      .eq('id', service)
      .eq('active', true)
      .single();

    if (svcErr || !svc) {
      return new Response(JSON.stringify({ approved: false, reason: 'Service not found or unavailable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Date must be today or future
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (scheduledAt < new Date()) {
      return new Response(JSON.stringify({ approved: false, reason: 'Booking date must be in the future' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check slot availability (no overlap within service duration)
    const slotEnd = new Date(scheduledAt.getTime() + svc.duration_minutes * 60000);
    const { count: conflict } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed'])
      .lt('scheduled_at', slotEnd.toISOString())
      .gt('scheduled_at', new Date(scheduledAt.getTime() - svc.duration_minutes * 60000).toISOString());

    if ((conflict ?? 0) > 0) {
      return new Response(JSON.stringify({ approved: false, reason: 'Time slot is already booked' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate booking ID
    const bookingId = 'BK-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    // Fetch client name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', clientId)
      .single();

    // Insert booking
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
      return new Response(JSON.stringify({ approved: false, reason: 'Failed to create booking', detail: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ approved: true, bookingId, confidence: 99, scheduledAt: scheduledAt.toISOString() }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    return new Response(JSON.stringify({ approved: false, reason: 'Internal server error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
