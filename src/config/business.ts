// ════════════════════════════════════════════════
// MT BARBERSHOP — Business Configuration
// Single source of truth for all business details
// ════════════════════════════════════════════════

export const BUSINESS = {
  name:        'MT Barbershop',
  tradingAs:   'MT Barbershop',
  owner:       'Mfanomuhle Tsabedze',
  ownerAlias:  'MT',
  address:     'P.O.Box 1741 Mbabane',
  location:    'Kwaluseni, Manzini, Eswatini',
  established: '2020',
  timezone:    'Africa/Mbabane', // UTC+2

  phone: {
    primary:          '26879333760',
    secondary:        '26878333760',
    primaryDisplay:   '+268 7933 3760',
    secondaryDisplay: '+268 7833 3760',
  },

  // Keyed by JS getDay() result: 0=Sun, 1=Mon … 6=Sat
  // null = closed that day
  hours: {
    0: null,
    1: { open: '08:00', close: '17:00', label: 'Mon' },
    2: { open: '08:00', close: '17:00', label: 'Tue' },
    3: { open: '08:00', close: '17:00', label: 'Wed' },
    4: { open: '08:00', close: '17:00', label: 'Thu' },
    5: { open: '08:00', close: '19:00', label: 'Fri' },
    6: { open: '08:00', close: '19:00', label: 'Sat' },
  } as Record<number, { open: string; close: string; label: string } | null>,

  hoursDisplay: 'Mon–Thu: 08:00–17:00  ·  Fri–Sat: 08:00–19:00  ·  Sun: Closed',
  hoursShort:   'Mon–Thu 8–17h · Fri–Sat 8–19h · Closed Sun',

  licence: {
    businessName: 'MT BARBERSHOP',
    issuedTo:     'Mfanomuhle Tsabedze',
    type:         'Informal, Individual Business',
    area:         'Rural area Kwaluseni Manzini',
    renewedYear:  () => new Date().getFullYear(),
    expiresDate:  () => `${new Date().getFullYear()}1231`,
    note:         'New Grant — renewed annually',
  },
} as const;

/** Returns today's operating hours for a given day index (0=Sun…6=Sat), or null if closed. */
export function getTodayHours(dayIndex?: number): { open: string; close: string; label: string } | null {
  const day = dayIndex ?? new Date().getDay();
  return BUSINESS.hours[day] ?? null;
}

/** Returns true if the given HH:MM time string falls within operating hours for dayIndex. */
export function isWithinHours(time: string, dayIndex: number): boolean {
  const slot = BUSINESS.hours[dayIndex];
  if (!slot) return false;
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}
