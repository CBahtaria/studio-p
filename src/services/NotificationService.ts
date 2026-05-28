import type { Booking } from '@/types';
import { supabase } from '@/lib/supabase';

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) NotificationService.instance = new NotificationService();
    return NotificationService.instance;
  }

  // ── WhatsApp booking URL ─────────────────────
  buildWhatsAppURL(booking: Booking, recipientNumber?: string): string {
    const number = recipientNumber ?? import.meta.env.VITE_WHATSAPP_NUMBER ?? '26879657744';
    const text = [
      '✂️ Studio P Booking Request',
      `Service: ${booking.service}`,
      `Date: ${booking.date} at ${booking.time}`,
      `Ref: ${booking.id}`,
      '',
      'Booked via studio-p.vercel.app',
    ].join('\n');
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  openWhatsApp(booking: Booking): void {
    window.open(this.buildWhatsAppURL(booking), '_blank', 'noopener,noreferrer');
  }

  // ── Browser push notifications ───────────────
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  async showToast(title: string, body: string, icon = '/favicon.ico'): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) return;
    new Notification(title, { body, icon, badge: '/favicon.ico' });
  }

  async sendBookingConfirmation(booking: Booking): Promise<void> {
    await this.showToast(
      'Booking Confirmed — Studio P',
      `${booking.service} on ${booking.date} at ${booking.time}. Ref: ${booking.id}`,
    );

    // Also trigger server-side notification via Edge Function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('send-notification', {
        body: { bookingId: booking.id, type: 'confirmation' },
      });
    } catch {
      // Non-critical — notification sent in browser regardless
    }
  }

  async sendBookingReminder(booking: Booking): Promise<void> {
    await this.showToast(
      'Studio P — Appointment Tomorrow',
      `${booking.service} at ${booking.time}. Ref: ${booking.id}`,
    );
  }
}

export const notificationService = NotificationService.getInstance();
