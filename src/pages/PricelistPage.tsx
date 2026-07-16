// ════════════════════════════════════════════════
// MT BARBERSHOP — Price List Page
// Public · services · all Eswatini payment methods
// Downloads: PDF (print), CSV, JSON, TXT
// ════════════════════════════════════════════════

import { BUSINESS, PAYMENT_METHODS } from '@/config/business';

interface ServiceEntry {
  name: string; description: string; tag: string; price: number; duration: number;
}

const SERVICES: ServiceEntry[] = [
  { name: 'Signature Fade',     description: 'Precision skin fade, tailored to your face shape.',  tag: 'Signature', price: 120, duration: 45 },
  { name: 'Taper & Define',     description: 'Timeless taper with surgical edges.',                 tag: 'Classic',   price: 100, duration: 40 },
  { name: 'Beard Architecture', description: 'Hot towel, sculpt, line-up.',                         tag: 'Grooming',  price: 80,  duration: 30 },
  { name: 'Full Package',       description: 'Cut + Beard + Skin ritual.',                          tag: 'Premium',   price: 220, duration: 90 },
  { name: 'Youth Cut',          description: 'Clean cuts for the next generation.',                 tag: 'Youth',     price: 60,  duration: 30 },
  { name: 'Edge & Line-Up',     description: 'Sharp lines, no compromises.',                        tag: 'Quick',     price: 60,  duration: 20 },
];

const TAG_COLORS: Record<string, string> = {
  Signature: '#B8966A', Classic: '#7A9E8A', Grooming: '#8A7A9E',
  Premium: '#C4963A',   Youth:   '#5A9EC4', Quick:    '#9EC45A',
};

const TYPE_LABEL: Record<string, string> = {
  cash: 'Cash', mobile: 'Mobile Money', card: 'Card',
  eft: 'Bank EFT', 'digital-wallet': 'Digital Wallet', qr: 'QR Code',
};

// ── Download helpers ──────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV() {
  const rows = [
    'Service,Category,Price (SZL),Duration (min),Description',
    ...SERVICES.map(s => `"${s.name}","${s.tag}",${s.price},${s.duration},"${s.description}"`),
    '',
    'Payment Method,Type,Detail,Note',
    ...PAYMENT_METHODS.map(p => `"${p.name}","${TYPE_LABEL[p.type] ?? p.type}","${p.detail}","${p.note ?? ''}"`),
  ];
  downloadBlob(rows.join('\n'), 'mt-barbershop-pricelist.csv', 'text/csv');
}

function downloadJSON() {
  downloadBlob(JSON.stringify({
    business: BUSINESS.name, location: BUSINESS.location,
    generated: new Date().toISOString(), currency: 'SZL',
    services: SERVICES.map(s => ({ name: s.name, category: s.tag, price_szl: s.price, duration_minutes: s.duration, description: s.description })),
    payment_methods: PAYMENT_METHODS.map(p => ({ id: p.id, name: p.name, type: p.type, detail: p.detail, note: p.note })),
  }, null, 2), 'mt-barbershop-pricelist.json', 'application/json');
}

function downloadTXT() {
  const pad = (s: string, n: number) => s.padEnd(n);
  const lines = [
    `${BUSINESS.name.toUpperCase()} — PRICE LIST`,
    `${BUSINESS.location}  |  ${BUSINESS.phone.primaryDisplay}`,
    `Generated: ${new Date().toLocaleDateString('en-SZ')}`,
    '', '─'.repeat(64), 'SERVICES', '─'.repeat(64),
    `${'Service'.padEnd(26)}${'Price'.padStart(6)}   ${'Min'.padStart(4)}   Category`,
    '─'.repeat(64),
    ...SERVICES.map(s => `${pad(s.name, 26)}E${String(s.price).padStart(5)}   ${String(s.duration).padStart(4)}   ${s.tag}`),
    '', '─'.repeat(64), 'PAYMENT METHODS', '─'.repeat(64),
    ...Object.entries(
      PAYMENT_METHODS.reduce<Record<string, typeof PAYMENT_METHODS>>((acc, p) => {
        const k = TYPE_LABEL[p.type] ?? p.type;
        (acc[k] ??= []).push(p);
        return acc;
      }, {})
    ).flatMap(([type, methods]) => [
      '', `  ${type.toUpperCase()}`,
      ...methods.map(p => `    ${pad(p.name, 28)} ${p.detail}`),
    ]),
    '', '─'.repeat(64),
    `Contact: ${BUSINESS.phone.primaryDisplay} · ${BUSINESS.phone.secondaryDisplay}`,
    BUSINESS.hoursDisplay,
  ];
  downloadBlob(lines.join('\n'), 'mt-barbershop-pricelist.txt', 'text/plain');
}

// ── Component ─────────────────────────────────────────────────────────

export function PricelistPage() {
  const now = new Date().toLocaleDateString('en-SZ', { year: 'numeric', month: 'long', day: 'numeric' });

  // Group payment methods by type
  const grouped = PAYMENT_METHODS.reduce<Record<string, typeof PAYMENT_METHODS>>((acc, p) => {
    const k = TYPE_LABEL[p.type] ?? p.type;
    (acc[k] ??= []).push(p);
    return acc;
  }, {});

  const btnBase: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase',
    border: '1px solid var(--bord2)', borderRadius: 5, padding: '8px 16px', cursor: 'pointer',
    background: 'none', color: 'var(--stone)', transition: 'color .15s, border-color .15s', minHeight: 'unset',
  };

  return (
    <>
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          .print-page { background: #fff !important; color: #111 !important; padding: 24px !important; }
          .svc-row { border-bottom: 1px solid #ddd !important; }
          .pay-row  { border-bottom: 1px solid #ddd !important; }
          .pay-group-header { color: #555 !important; border-bottom: 1px solid #ccc !important; }
          .price-val { color: #333 !important; }
        }
      `}</style>

      <div className="print-page" style={{ minHeight: '100dvh', background: 'var(--ink)', color: 'var(--parch)', paddingBottom: 80 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '52px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 36, flexWrap: 'wrap' }}>
            <img src="/logo.jpg" alt="MT Barbershop logo" style={{ height: 72, width: 'auto', objectFit: 'contain', borderRadius: 4 }} />
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 8, textTransform: 'uppercase' }}>
                {BUSINESS.location}
              </div>
              <h1 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2rem,5vw,3.8rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .92, marginBottom: 6 }}>
                {BUSINESS.name}
              </h1>
              <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(1rem,2.5vw,1.6rem)', letterSpacing: '-.01em', textTransform: 'uppercase', color: 'var(--brass)', lineHeight: 1 }}>
                Price List
              </h2>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 10 }}>
                Effective {now} · All prices in Eswatini Lilangeni (E / SZL) · Incl. VAT
              </p>
            </div>
          </div>

          {/* Download buttons */}
          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 52 }}>
            {([
              { label: 'PDF / Print', fn: () => window.print(), accent: 'var(--brass)' },
              { label: 'CSV',  fn: downloadCSV,  accent: 'var(--stone)' },
              { label: 'JSON', fn: downloadJSON, accent: 'var(--stone)' },
              { label: 'TXT',  fn: downloadTXT,  accent: 'var(--stone)' },
            ] as const).map(({ label, fn, accent }) => (
              <button key={label} onClick={fn} style={{ ...btnBase, color: accent, borderColor: accent === 'var(--brass)' ? 'var(--brass)' : undefined }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accent === 'var(--brass)' ? 'var(--brass)' : 'var(--bord2)'; }}>
                ↓ {label}
              </button>
            ))}
            <a href="/" style={{ ...btnBase, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}>
              ← Back
            </a>
          </div>

          {/* Services */}
          <section style={{ marginBottom: 60 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 20 }}>Services</div>
            {SERVICES.map((s, i) => (
              <div key={s.name} className="svc-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 24px', padding: '20px 0', borderBottom: i < SERVICES.length - 1 ? '1px solid var(--bord)' : 'none' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--parch)' }}>{s.name}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', textTransform: 'uppercase', color: TAG_COLORS[s.tag] ?? 'var(--brass)', border: `1px solid ${TAG_COLORS[s.tag] ?? 'var(--brass)'}`, borderRadius: 3, padding: '2px 6px' }}>{s.tag}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>{s.description}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 5, opacity: .6 }}>{s.duration} min</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  <div className="price-val" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, color: 'var(--brass)', lineHeight: 1 }}>E{s.price}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', marginTop: 2, letterSpacing: '.1em' }}>SZL</div>
                </div>
              </div>
            ))}
          </section>

          {/* Payment Methods — grouped */}
          <section style={{ marginBottom: 60 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 24 }}>Payment Methods</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px 48px' }}>
              {Object.entries(grouped).map(([type, methods]) => (
                <div key={type}>
                  <div className="pay-group-header" style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--brass)', paddingBottom: 8, borderBottom: '1px solid var(--bord)', marginBottom: 12 }}>
                    {type}
                  </div>
                  {methods.map(p => (
                    <div key={p.id} className="pay-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--bord)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13 }}>{p.icon}</span>
                          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--parch)' }}>{p.name}</span>
                          {p.note && (
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.15em', color: 'var(--brass)', border: '1px solid var(--brass)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>{p.note}</span>
                          )}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--stone)', marginTop: 3 }}>{p.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Hours */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 16 }}>Trading Hours</div>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--stone)', lineHeight: 2.2 }}>{BUSINESS.hoursDisplay}</p>
          </section>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--bord)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>
              {BUSINESS.phone.primaryDisplay} · {BUSINESS.phone.secondaryDisplay}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>
              Prices subject to change without prior notice
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
