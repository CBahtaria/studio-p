// ════════════════════════════════════════════════
// MT BARBERSHOP — Price List Page
// Public page: services, pricing, payment methods
// Downloads: PDF (print), CSV, JSON, TXT
// ════════════════════════════════════════════════

import { BUSINESS } from '@/config/business';

interface ServiceEntry {
  name: string;
  description: string;
  tag: string;
  price: number;
  duration: number;
}

const SERVICES: ServiceEntry[] = [
  { name: 'Signature Fade',     description: 'Precision skin fade, tailored to your face shape.',  tag: 'Signature', price: 120, duration: 45 },
  { name: 'Taper & Define',     description: 'Timeless taper with surgical edges.',                 tag: 'Classic',   price: 100, duration: 40 },
  { name: 'Beard Architecture', description: 'Hot towel, sculpt, line-up.',                         tag: 'Grooming',  price: 80,  duration: 30 },
  { name: 'Full Package',       description: 'Cut + Beard + Skin ritual.',                          tag: 'Premium',   price: 220, duration: 90 },
  { name: 'Youth Cut',          description: 'Clean cuts for the next generation.',                 tag: 'Youth',     price: 60,  duration: 30 },
  { name: 'Edge & Line-Up',     description: 'Sharp lines, no compromises.',                        tag: 'Quick',     price: 60,  duration: 20 },
];

interface PaymentMethod {
  name: string;
  detail: string;
  note?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { name: 'Cash',                detail: 'Eswatini Lilangeni (SZL)',              note: 'Preferred' },
  { name: 'MTN Mobile Money',    detail: '+268 7933 3760',                        note: 'MoMo' },
  { name: 'EFT / Bank Transfer', detail: 'Contact for banking details',           note: 'Advance booking' },
  { name: 'Eswatini Bank',       detail: 'In-branch or EFT transfer',             note: 'On request' },
];

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV() {
  const header = 'Service,Category,Price (SZL),Duration (min),Description';
  const rows   = SERVICES.map(s =>
    `"${s.name}","${s.tag}",${s.price},${s.duration},"${s.description}"`
  );
  downloadBlob([header, ...rows].join('\n'), 'mt-barbershop-pricelist.csv', 'text/csv');
}

function downloadJSON() {
  const data = {
    business: BUSINESS.name,
    location: BUSINESS.location,
    generated: new Date().toISOString(),
    currency: 'SZL',
    services: SERVICES.map(s => ({
      name: s.name,
      category: s.tag,
      price_szl: s.price,
      duration_minutes: s.duration,
      description: s.description,
    })),
    payment_methods: PAYMENT_METHODS.map(p => ({
      method: p.name,
      detail: p.detail,
      note: p.note,
    })),
  };
  downloadBlob(JSON.stringify(data, null, 2), 'mt-barbershop-pricelist.json', 'application/json');
}

function downloadTXT() {
  const lines = [
    `${BUSINESS.name.toUpperCase()} — PRICE LIST`,
    `${BUSINESS.location}`,
    `Generated: ${new Date().toLocaleDateString('en-SZ')}`,
    '',
    '─'.repeat(60),
    'SERVICES',
    '─'.repeat(60),
    ...SERVICES.map(s =>
      `${s.name.padEnd(24)} E${String(s.price).padStart(4)}   ${s.duration} min   ${s.tag}`
    ),
    '',
    '─'.repeat(60),
    'PAYMENT METHODS',
    '─'.repeat(60),
    ...PAYMENT_METHODS.map(p =>
      `${p.name.padEnd(24)} ${p.detail}${p.note ? `  [${p.note}]` : ''}`
    ),
    '',
    `Contact: ${BUSINESS.phone.primaryDisplay}`,
    BUSINESS.hoursDisplay,
  ];
  downloadBlob(lines.join('\n'), 'mt-barbershop-pricelist.txt', 'text/plain');
}

function downloadPDF() {
  window.print();
}

const TAG_COLORS: Record<string, string> = {
  Signature: '#B8966A',
  Classic:   '#7A9E8A',
  Grooming:  '#8A7A9E',
  Premium:   '#C4963A',
  Youth:     '#5A9EC4',
  Quick:     '#9EC45A',
};

export function PricelistPage() {
  const now = new Date().toLocaleDateString('en-SZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const btnBase: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace',
    fontSize: 9,
    letterSpacing: '.2em',
    textTransform: 'uppercase',
    border: '1px solid var(--bord2)',
    borderRadius: 5,
    padding: '8px 16px',
    cursor: 'pointer',
    background: 'none',
    color: 'var(--stone)',
    transition: 'color .15s, border-color .15s',
    minHeight: 'unset',
  };

  return (
    <>
      {/* ── Print-only styles ───────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          .print-page {
            background: #fff !important;
            color: #111 !important;
            padding: 32px !important;
          }
          .svc-tag { border: 1px solid #999 !important; color: #444 !important; }
          .svc-row { border-bottom: 1px solid #ddd !important; }
          .pay-row  { border-bottom: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="print-page" style={{ minHeight: '100dvh', background: 'var(--ink)', color: 'var(--parch)', paddingBottom: 80 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 32px' }}>

          {/* ── Header ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 12 }}>
              {BUSINESS.location}
            </div>
            <h1 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2.4rem,6vw,4.5rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .9, marginBottom: 6 }}>
              {BUSINESS.name}
            </h1>
            <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(1.2rem,3vw,2rem)', letterSpacing: '-.01em', textTransform: 'uppercase', color: 'var(--brass)', lineHeight: 1, marginBottom: 20 }}>
              Price List
            </h2>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--stone)', marginBottom: 0 }}>
              Effective {now} · All prices in Eswatini Lilangeni (E / SZL) · Incl. VAT
            </p>
          </div>

          {/* ── Download buttons ─────────────────────────────────── */}
          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '32px 0 48px' }}>
            {[
              { label: 'PDF / Print', fn: downloadPDF,  accent: 'var(--brass)' },
              { label: 'CSV',         fn: downloadCSV,  accent: 'var(--stone)' },
              { label: 'JSON',        fn: downloadJSON, accent: 'var(--stone)' },
              { label: 'TXT',         fn: downloadTXT,  accent: 'var(--stone)' },
            ].map(({ label, fn, accent }) => (
              <button
                key={label}
                onClick={fn}
                style={{ ...btnBase, borderColor: accent === 'var(--brass)' ? 'var(--brass)' : undefined, color: accent }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent === 'var(--brass)' ? 'var(--brass)' : 'var(--bord2)'; }}
              >
                ↓ {label}
              </button>
            ))}
            <a
              href="/"
              style={{ ...btnBase, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}
            >
              ← Back
            </a>
          </div>

          {/* ── Services ─────────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 20 }}>
              Services
            </div>

            <div>
              {SERVICES.map((s, i) => (
                <div
                  key={s.name}
                  className="svc-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '12px 24px',
                    padding: '20px 0',
                    borderBottom: i < SERVICES.length - 1 ? '1px solid var(--bord)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--parch)' }}>
                        {s.name}
                      </span>
                      <span
                        className="svc-tag"
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 7,
                          letterSpacing: '.2em',
                          textTransform: 'uppercase',
                          color: TAG_COLORS[s.tag] ?? 'var(--brass)',
                          border: `1px solid ${TAG_COLORS[s.tag] ?? 'var(--brass)'}`,
                          borderRadius: 3,
                          padding: '2px 6px',
                        }}
                      >
                        {s.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>{s.description}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 4, opacity: .6 }}>
                      {s.duration} min
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600, color: 'var(--brass)', lineHeight: 1 }}>
                      E{s.price}
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', marginTop: 2, letterSpacing: '.1em' }}>
                      SZL
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Payment Methods ───────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 20 }}>
              Payment Methods
            </div>
            <div>
              {PAYMENT_METHODS.map((p, i) => (
                <div
                  key={p.name}
                  className="pay-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: i < PAYMENT_METHODS.length - 1 ? '1px solid var(--bord)' : 'none',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--parch)' }}>
                      {p.name}
                    </span>
                    {p.note && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: 'var(--brass)', border: '1px solid var(--brass)', borderRadius: 3, padding: '2px 6px', marginLeft: 8, textTransform: 'uppercase' }}>
                        {p.note}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--stone)' }}>
                    {p.detail}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Hours ────────────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 20 }}>
              Trading Hours
            </div>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--stone)', lineHeight: 2 }}>
              {BUSINESS.hoursDisplay}
            </p>
          </section>

          {/* ── Footer ───────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--bord)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>
              {BUSINESS.phone.primaryDisplay} · {BUSINESS.phone.secondaryDisplay}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>
              Prices subject to change without notice
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
