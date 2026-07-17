// ════════════════════════════════════════════════
// MT BARBERSHOP — Price List Page
// Card-per-service layout · grouped payments ·
// Downloads: PDF, CSV, JSON, TXT
// ════════════════════════════════════════════════

import { useState } from 'react';
import { BUSINESS, PAYMENT_METHODS } from '@/config/business';

interface ServiceEntry {
  name: string; description: string; tag: string; price: number; duration: number;
  includes: string[]; featured?: boolean;
}

const SERVICES: ServiceEntry[] = [
  {
    name: 'Signature Fade',
    description: 'Precision skin fade engineered to your face shape. The MT signature.',
    tag: 'Signature', price: 120, duration: 45, featured: false,
    includes: ['Face shape consultation', 'Skin-clean fade', 'Edge detailing', 'Hot towel finish'],
  },
  {
    name: 'Taper & Define',
    description: 'Timeless taper with surgical edges. Classic, clean, commanding.',
    tag: 'Classic', price: 100, duration: 40, featured: false,
    includes: ['Classic taper', 'Surgical line-up', 'Neckline shave', 'Style consult'],
  },
  {
    name: 'Beard Architecture',
    description: 'Hot towel, sculpt, line-up. Your beard deserves a blueprint.',
    tag: 'Grooming', price: 80, duration: 30, featured: false,
    includes: ['Hot towel prep', 'Beard sculpt', 'Edge line-up', 'Balm treatment'],
  },
  {
    name: 'Full Package',
    description: 'Cut + Beard + Skin ritual. The complete MT experience. Nothing held back.',
    tag: 'Premium', price: 220, duration: 90, featured: true,
    includes: ['Full precision cut', 'Beard architecture', 'Skin ritual', 'Hot towel service', 'Style consultation', 'Priority booking'],
  },
  {
    name: 'Youth Cut',
    description: 'Clean, sharp cuts for the next generation. Precision without compromise.',
    tag: 'Youth', price: 60, duration: 30, featured: false,
    includes: ['Age-appropriate cut', 'Gentle finish', 'Edge tidy', 'Style guide'],
  },
  {
    name: 'Edge & Line-Up',
    description: 'Sharp lines, no compromises. The quick reset between full cuts.',
    tag: 'Quick', price: 60, duration: 20, featured: false,
    includes: ['Hairline edge-up', 'Beard line-up', 'Temple taper', 'Eyebrow tidy'],
  },
];

const TAG_COLORS: Record<string, string> = {
  Signature: '#B8966A', Classic: '#7A9E8A', Grooming: '#8A7A9E',
  Premium:   '#C4963A', Youth:   '#5A9EC4', Quick:    '#9EC45A',
};

const TYPE_LABEL: Record<string, string> = {
  cash: 'Cash', mobile: 'Mobile Money', card: 'Card',
  eft: 'Bank EFT', 'digital-wallet': 'Digital Wallet', qr: 'QR Code',
};

// ── Download helpers ──────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
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
    ).flatMap(([type, methods]) => ['', `  ${type.toUpperCase()}`, ...methods.map(p => `    ${pad(p.name, 28)} ${p.detail}`)]),
    '', '─'.repeat(64),
    `Contact: ${BUSINESS.phone.primaryDisplay} · ${BUSINESS.phone.secondaryDisplay}`,
    BUSINESS.hoursDisplay,
  ];
  downloadBlob(lines.join('\n'), 'mt-barbershop-pricelist.txt', 'text/plain');
}

// ── Component ─────────────────────────────────────────────────────────

export function PricelistPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const now = new Date().toLocaleDateString('en-SZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const allTags = Array.from(new Set(SERVICES.map(s => s.tag)));
  const filtered = activeTag ? SERVICES.filter(s => s.tag === activeTag) : SERVICES;

  const grouped = PAYMENT_METHODS.reduce<Record<string, typeof PAYMENT_METHODS>>((acc, p) => {
    const k = TYPE_LABEL[p.type] ?? p.type;
    (acc[k] ??= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          .print-page { background: #fff !important; color: #111 !important; }
          .pl-card { border: 1px solid #ddd !important; background: #fff !important; break-inside: avoid; }
          .pl-price { color: #333 !important; }
          .pl-inc li { color: #444 !important; }
          .pay-chip { border: 1px solid #ddd !important; background: #f5f5f5 !important; color: #333 !important; }
        }
        .pl-card { transition: transform .2s, box-shadow .2s; }
        .pl-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,.35); }
        .pl-book-btn { transition: background .2s, color .2s; }
        .pl-book-btn:hover { background: var(--gold) !important; color: var(--ink) !important; }
        .tag-pill { transition: all .15s; cursor: pointer; }
        .tag-pill:hover { opacity: 1 !important; }
        .pay-chip { transition: border-color .15s; }
        .pay-chip:hover { border-color: var(--brass) !important; }
      `}</style>

      <div className="print-page" style={{ minHeight: '100dvh', background: 'var(--ink)', color: 'var(--parch)', paddingBottom: 80 }}>

        {/* ── Nav bar ──────────────────────────────────────────────── */}
        <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,9,6,.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--bord)', padding: '0 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/mt-logo.png" alt="MT Barbershop" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', color: 'var(--stone)', textTransform: 'uppercase' }}>
                Price List
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {([
                { label: '↓ PDF',  fn: () => window.print() },
                { label: '↓ CSV',  fn: downloadCSV },
                { label: '↓ JSON', fn: downloadJSON },
                { label: '↓ TXT',  fn: downloadTXT },
              ] as const).map(({ label, fn }) => (
                <button key={label} onClick={fn} style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', border: '1px solid var(--bord2)', borderRadius: 4, padding: '5px 10px', cursor: 'pointer', background: 'none', color: 'var(--stone)', minHeight: 'unset', transition: 'color .15s, border-color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}>
                  {label}
                </button>
              ))}
              <a href="/" style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', border: '1px solid var(--bord2)', borderRadius: 4, padding: '5px 10px', color: 'var(--stone)', textDecoration: 'none', transition: 'color .15s, border-color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}>
                ← Home
              </a>
            </div>
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px 48px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 16, textTransform: 'uppercase' }}>
            {BUSINESS.location} · Est. {BUSINESS.established}
          </div>
          <h1 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(3rem,8vw,6rem)', letterSpacing: '-.03em', textTransform: 'uppercase', lineHeight: .9, marginBottom: 12 }}>
            Services &{' '}
            <em style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--gold)' }}>Pricing</em>
          </h1>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--stone)', letterSpacing: '.1em', marginBottom: 8 }}>
            All prices in Eswatini Lilangeni (E / SZL) · Incl. VAT · Effective {now}
          </p>
          <p style={{ fontSize: 14, color: 'var(--stone)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            One chair. One barber. Zero compromises. Every price reflects the time and precision your cut deserves.
          </p>
        </div>

        {/* ── Tag filter ───────────────────────────────────────────── */}
        <div className="no-print" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 40px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="tag-pill"
            onClick={() => setActiveTag(null)}
            style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', border: `1px solid ${activeTag === null ? 'var(--brass)' : 'var(--bord2)'}`, borderRadius: 20, padding: '6px 16px', cursor: 'pointer', background: activeTag === null ? 'rgba(184,150,106,.12)' : 'none', color: activeTag === null ? 'var(--brass)' : 'var(--stone)', minHeight: 'unset', opacity: 1 }}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className="tag-pill"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', border: `1px solid ${activeTag === tag ? TAG_COLORS[tag] : 'var(--bord2)'}`, borderRadius: 20, padding: '6px 16px', cursor: 'pointer', background: activeTag === tag ? `${TAG_COLORS[tag]}18` : 'none', color: activeTag === tag ? TAG_COLORS[tag] : 'var(--stone)', minHeight: 'unset', opacity: activeTag && activeTag !== tag ? 0.5 : 1 }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Service cards ────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(s => {
              const accent = TAG_COLORS[s.tag] ?? 'var(--brass)';
              return (
                <div
                  key={s.name}
                  className="pl-card"
                  style={{
                    position: 'relative',
                    background: s.featured ? 'linear-gradient(145deg, var(--ink2) 0%, rgba(184,150,106,.06) 100%)' : 'var(--ink2)',
                    border: `1px solid ${s.featured ? 'var(--brass)' : 'var(--bord)'}`,
                    borderRadius: 12,
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {s.featured && (
                    <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'var(--brass)', color: 'var(--ink)', fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.25em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '0 0 6px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Best Value
                    </div>
                  )}

                  {/* Tag + duration row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.25em', textTransform: 'uppercase', color: accent, border: `1px solid ${accent}`, borderRadius: 4, padding: '3px 8px' }}>
                      {s.tag}
                    </span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', letterSpacing: '.08em' }}>
                      ⏱ {s.duration} min
                    </span>
                  </div>

                  {/* Service name */}
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--parch)', lineHeight: 1.1, marginBottom: 10 }}>
                    {s.name}
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.65, marginBottom: 24, flexGrow: 1 }}>
                    {s.description}
                  </div>

                  {/* Includes */}
                  <ul className="pl-inc" style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {s.includes.map(inc => (
                      <li key={inc} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)', fontFamily: 'DM Mono, monospace', letterSpacing: '.04em' }}>
                        <span style={{ color: accent, fontSize: 10, flexShrink: 0 }}>✓</span>
                        {inc}
                      </li>
                    ))}
                  </ul>

                  {/* Price + CTA */}
                  <div style={{ borderTop: `1px solid ${s.featured ? 'rgba(184,150,106,.3)' : 'var(--bord)'}`, paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div className="pl-price" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, color: s.featured ? 'var(--gold)' : 'var(--brass)', lineHeight: 1 }}>
                        E{s.price}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', marginTop: 2, letterSpacing: '.15em' }}>
                        SZL · Incl. VAT
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${BUSINESS.phone.primary}?text=${encodeURIComponent(`Hi MT Barbershop — I'd like to book a ${s.name} (E${s.price}, ${s.duration} min).`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="pl-book-btn no-print"
                      style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', background: s.featured ? 'var(--brass)' : 'none', color: s.featured ? 'var(--ink)' : 'var(--brass)', border: `1px solid var(--brass)`, borderRadius: 6, padding: '10px 18px', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Book →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Payment methods ──────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--bord)', background: 'var(--ink2)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 12 }}>
                Accepted Payments
              </div>
              <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(1.8rem,4vw,3rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .92 }}>
                Pay Your Way
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px 40px' }}>
              {Object.entries(grouped).map(([type, methods]) => (
                <div key={type}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.35em', textTransform: 'uppercase', color: 'var(--brass)', borderBottom: '1px solid var(--bord)', paddingBottom: 10, marginBottom: 14 }}>
                    {type}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {methods.map(p => (
                      <div
                        key={p.id}
                        className="pay-chip"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ink)', border: '1px solid var(--bord)', borderRadius: 8, padding: '10px 14px' }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--parch)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', letterSpacing: '.04em' }}>
                            {p.detail}
                          </div>
                        </div>
                        {p.note && (
                          <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.15em', color: 'var(--brass)', border: '1px solid var(--brass)', borderRadius: 3, padding: '2px 6px', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {p.note}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Trading Hours ─────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--bord)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', display: 'flex', gap: '40px 80px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 16 }}>Trading Hours</div>
              {([
                { days: 'Mon – Thu', hours: '08:00 – 17:00' },
                { days: 'Fri – Sat', hours: '08:00 – 19:00' },
                { days: 'Sunday',    hours: 'Closed' },
              ] as const).map(row => (
                <div key={row.days} style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 8, maxWidth: 260 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--stone)' }}>{row.days}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: row.hours === 'Closed' ? 'var(--stone2)' : 'var(--brass)' }}>{row.hours}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 16 }}>Book a Seat</div>
              <a href={`https://wa.me/${BUSINESS.phone.primary}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--brass)', textDecoration: 'none', marginBottom: 6, transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--brass)')}
              >
                {BUSINESS.phone.primaryDisplay} (WhatsApp)
              </a>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--stone)', lineHeight: 1.8 }}>
                {BUSINESS.location}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--bord)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', letterSpacing: '.1em' }}>
            © {new Date().getFullYear()} {BUSINESS.name.toUpperCase()} · Prices subject to change without notice
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', letterSpacing: '.1em', opacity: .5 }}>
            {BUSINESS.licence.issuedTo} · Licence {BUSINESS.licence.renewedYear()}
          </span>
        </div>

      </div>
    </>
  );
}
