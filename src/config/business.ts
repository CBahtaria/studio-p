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

export interface PaymentMethod {
  id:      string;
  name:    string;
  detail:  string;
  type:    'cash' | 'mobile' | 'card' | 'eft' | 'digital-wallet' | 'qr';
  note?:   string;
  icon?:   string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  // ── Cash ──────────────────────────────────────────────────────────
  { id: 'cash-szl',   name: 'Cash (SZL)',          detail: 'Eswatini Lilangeni',              type: 'cash',           note: 'Preferred',   icon: '💵' },
  { id: 'cash-zar',   name: 'Cash (ZAR)',           detail: 'South African Rand — 1:1 parity', type: 'cash',           note: 'Accepted',    icon: '💵' },

  // ── Mobile Money ──────────────────────────────────────────────────
  { id: 'mtn-momo',   name: 'MTN MoMo',             detail: '+268 7933 3760',                  type: 'mobile',         note: 'Instant',     icon: '📱' },
  { id: 'emali',      name: 'E-Mali',               detail: 'Eswatini Mobile Money',           type: 'mobile',         note: 'Supported',   icon: '📱' },
  { id: 'fnb-ewallet',name: 'FNB eWallet',          detail: 'First National Bank mobile wallet',type: 'mobile',        note: 'Supported',   icon: '📱' },

  // ── Digital Wallets ───────────────────────────────────────────────
  { id: 'apple-pay',  name: 'Apple Pay',            detail: 'Via NFC / contactless',           type: 'digital-wallet', note: 'Tap to Pay',  icon: '' },
  { id: 'google-pay', name: 'Google Pay',           detail: 'Via NFC / contactless',           type: 'digital-wallet', note: 'Tap to Pay',  icon: '' },
  { id: 'samsung-pay',name: 'Samsung Pay',          detail: 'Via NFC / contactless',           type: 'digital-wallet', note: 'Supported',   icon: '' },

  // ── Card ──────────────────────────────────────────────────────────
  { id: 'visa',       name: 'Visa',                 detail: 'Credit / Debit — POS terminal',   type: 'card',           note: 'Swipe / Tap', icon: '💳' },
  { id: 'mastercard', name: 'Mastercard',           detail: 'Credit / Debit — POS terminal',   type: 'card',           note: 'Swipe / Tap', icon: '💳' },

  // ── QR Code ───────────────────────────────────────────────────────
  { id: 'snapscan',   name: 'SnapScan',             detail: 'QR code scan',                    type: 'qr',             note: 'Scan',        icon: '🔲' },
  { id: 'momo-qr',   name: 'MTN MoMo QR',          detail: 'Scan merchant QR',                type: 'qr',             note: 'Scan',        icon: '🔲' },

  // ── Bank EFT ─────────────────────────────────────────────────────
  { id: 'eft-esw',    name: 'Eswatini Bank EFT',    detail: 'Advance payment — contact us',    type: 'eft',            note: 'Advance',     icon: '🏦' },
  { id: 'eft-std',    name: 'Standard Bank EFT',    detail: 'Advance payment — contact us',    type: 'eft',            note: 'Advance',     icon: '🏦' },
  { id: 'eft-fnb',    name: 'FNB Eswatini EFT',     detail: 'Advance payment — contact us',    type: 'eft',            note: 'Advance',     icon: '🏦' },
  { id: 'eft-ned',    name: 'Nedbank Eswatini EFT', detail: 'Advance payment — contact us',    type: 'eft',            note: 'Advance',     icon: '🏦' },
  { id: 'eft-absa',   name: 'Absa Eswatini EFT',    detail: 'Advance payment — contact us',    type: 'eft',            note: 'Advance',     icon: '🏦' },
];

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
