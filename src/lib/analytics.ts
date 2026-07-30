// Analytics event tracking — Plausible + PostHog ready.
// Enable via VITE_ANALYTICS_ENABLED=true in production environment.
const ENABLED = typeof window !== 'undefined' && import.meta.env.VITE_ANALYTICS_ENABLED === 'true'

export function trackEvent(event: string, props?: Record<string, string | number>): void {
  if (!ENABLED) return
  ;(window as Record<string, unknown> & typeof window).plausible?.(event, { props })
  ;(window as Record<string, unknown> & typeof window).posthog?.capture(event, props)
}

export const EVENTS = {
  BOOKING_START:    'Booking Started',
  BOOKING_COMPLETE: 'Booking Completed',
  BOOKING_CANCEL:   'Booking Cancelled',
  SERVICE_VIEW:     'Service Viewed',
  CONTACT_CLICK:    'Contact Clicked',
} as const
