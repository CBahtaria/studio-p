import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

type NotificationType = 'confirmation' | 'reminder' | 'cancellation';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const waNumber = Deno.env.get('WHATSAPP_NUMBER') ?? '26879657744';

    const { bookingId, type = 'confirmation' }: { bookingId: string; type: NotificationType } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ sent: false, reason: 'bookingId required' }), {
        status: 400, headers: ch,
      });
    }

    // Fetch booking with client profile
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, profiles(name, email, phone)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ sent: false, reason: 'Booking not found' }), {
        status: 404, headers: ch,
      });
    }

    const scheduledDate = new Date(booking.scheduled_at);
    const dateStr = scheduledDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = scheduledDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
    const clientName = booking.profiles?.name ?? booking.client_name;
    const clientEmail = booking.profiles?.email;

    const messages: Record<NotificationType, string> = {
      confirmation: `✂️ Studio P Booking Confirmed!\n\nHi ${clientName},\nYour appointment is confirmed:\n📅 ${dateStr}\n⏰ ${timeStr}\n💈 ${booking.service}\n\nRef: ${bookingId}\n\nSee you soon!`,
      reminder:     `⏰ Reminder: Studio P appointment tomorrow\n\nHi ${clientName},\nJust a reminder for ${dateStr} at ${timeStr}.\n💈 ${booking.service}\n\nRef: ${bookingId}`,
      cancellation: `Studio P: Booking ${bookingId} cancelled.\n\nHi ${clientName}, your ${booking.service} on ${dateStr} at ${timeStr} has been cancelled. Book again at studio-p.vercel.app`,
    };

    const waText = encodeURIComponent(messages[type]);
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    const result: Record<string, unknown> = { sent: false, whatsappUrl: waUrl };

    // Send email via Resend if configured
    if (resendApiKey && clientEmail) {
      const emailSubjects: Record<NotificationType, string> = {
        confirmation: `Booking Confirmed — ${booking.service} at Studio P`,
        reminder:     `Reminder: Your Studio P appointment tomorrow`,
        cancellation: `Studio P Booking Cancelled — ${bookingId}`,
      };

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Studio P <noreply@studiop.sz>',
          to: [clientEmail],
          subject: emailSubjects[type],
          text: messages[type],
        }),
      });

      result.emailSent = emailRes.ok;
      result.sent = emailRes.ok;
    } else {
      // Log only — no email provider configured
      console.log(`[send-notification] No Resend key — would send to ${clientEmail}:`, messages[type]);
      result.sent = true;
      result.note = 'logged only — configure RESEND_API_KEY to send real emails';
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: ch,
    });

  } catch (err) {
    return new Response(JSON.stringify({ sent: false, reason: String(err) }), {
      status: 500, headers: ch,
    });
  }
});
