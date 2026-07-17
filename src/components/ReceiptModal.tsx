// ════════════════════════════════════════════════
// MT BARBERSHOP — ReceiptModal
// Generates a branded service receipt from booking
// + client metadata. Print → PDF, or download as
// JSON / TXT. Payment method selected at generation.
// ════════════════════════════════════════════════

import { useState, useId } from 'react';
import type { UserProfile } from '@/types';
import { BUSINESS, PAYMENT_METHODS } from '@/config/business';

export interface ReceiptBooking {
  id: string;
  service: string;
  barber: string;
  scheduled_at: string;
  price_swl: number;   // cents
  status: string;
  notes?: string;
}

interface Props {
  booking: ReceiptBooking;
  client: UserProfile;
  onClose: () => void;
}

function receiptNumber(bookingId: string): string {
  const d    = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const tail = bookingId.replace(/-/g, '').slice(-4).toUpperCase() || Math.random().toString(36).slice(-4).toUpperCase();
  return `MT-${date}-${tail}`;
}

function fmt(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-SZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-SZ', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function ReceiptModal({ booking, client, onClose }: Props) {
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0].id);
  const receiptId = receiptNumber(booking.id);
  const { date, time } = fmt(booking.scheduled_at);
  const priceE = (booking.price_swl / 100).toFixed(2);
  const selectedPay = PAYMENT_METHODS.find(p => p.id === payMethod) ?? PAYMENT_METHODS[0];
  const generatedAt = new Date().toLocaleString('en-SZ');
  const labelId = useId();

  function downloadTXT() {
    const lines = [
      '━'.repeat(50),
      `  ${BUSINESS.name.toUpperCase()}`,
      `  ${BUSINESS.location}`,
      `  ${BUSINESS.phone.primaryDisplay}`,
      '━'.repeat(50),
      '',
      `  RECEIPT NO : ${receiptId}`,
      `  DATE       : ${date}`,
      `  TIME       : ${time}`,
      `  ISSUED     : ${generatedAt}`,
      '',
      '━'.repeat(50),
      `  CLIENT     : ${client.name}`,
      `  EMAIL      : ${client.email}`,
      client.phone ? `  PHONE      : ${client.phone}` : '',
      '',
      '━'.repeat(50),
      `  SERVICE    : ${booking.service}`,
      `  BARBER     : ${booking.barber || BUSINESS.owner}`,
      `  STATUS     : ${booking.status.toUpperCase()}`,
      '',
      `  AMOUNT     : E${priceE} SZL`,
      `  PAYMENT    : ${selectedPay.name}`,
      '',
      '━'.repeat(50),
      '  Thank you for choosing MT Barbershop.',
      '  Your precision cut is our commitment.',
      '━'.repeat(50),
    ].filter(l => l !== null);
    downloadBlob(lines.join('\n'), `receipt-${receiptId}.txt`, 'text/plain');
  }

  function downloadJSON() {
    downloadBlob(JSON.stringify({
      receipt_number: receiptId,
      business: { name: BUSINESS.name, location: BUSINESS.location, phone: BUSINESS.phone.primaryDisplay },
      client: { name: client.name, email: client.email, phone: client.phone ?? null, member_tier: client.memberTier },
      service: { name: booking.service, barber: booking.barber || BUSINESS.owner, status: booking.status },
      appointment: { date, time, scheduled_at: booking.scheduled_at },
      payment: { amount_szl: Number(priceE), currency: 'SZL', method: selectedPay.name, method_id: selectedPay.id },
      generated_at: new Date().toISOString(),
    }, null, 2), `receipt-${receiptId}.json`, 'application/json');
  }

  const mono  = { fontFamily: 'DM Mono, monospace' };
  const serif = { fontFamily: 'Cormorant Garamond, serif' };

  return (
    <>
      {/* Print-only receipt styles */}
      <style>{`
        @media print {
          body > *:not(.receipt-print-root) { display: none !important; }
          .receipt-print-root {
            position: fixed !important; inset: 0 !important;
            background: #fff !important; color: #111 !important;
            z-index: 9999 !important; padding: 40px !important;
          }
          .receipt-no-print { display: none !important; }
          .receipt-divider  { border-color: #ccc !important; }
          .receipt-label    { color: #666 !important; }
          .receipt-value    { color: #111 !important; }
          .receipt-price    { color: #111 !important; }
          .receipt-footer   { color: #555 !important; }
        }
      `}</style>

      {/* Overlay */}
      <div
        className="auth-overlay"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        aria-modal="true"
        role="dialog"
        aria-labelledby={labelId}
      >
        <div
          className="receipt-print-root"
          style={{
            background: 'var(--ink2)', border: '1px solid var(--bord)',
            borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh',
            overflowY: 'auto', padding: '32px 28px', animation: 'windowIn .25s ease both',
          }}
        >

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="/mt-logo.png" alt="MT Barbershop" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
              <div>
                <div style={{ ...mono, fontSize: 8, letterSpacing: '.3em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 3 }}>Service Receipt</div>
                <div style={{ ...mono, fontSize: 11, letterSpacing: '.12em', color: 'var(--parch)' }}>{BUSINESS.name}</div>
              </div>
            </div>
            <button
              className="receipt-no-print"
              onClick={onClose}
              aria-label="Close receipt"
              style={{ background: 'none', border: '1px solid var(--bord2)', color: 'var(--stone)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}
            >
              ✕
            </button>
          </div>

          <hr className="receipt-divider" style={{ border: 'none', borderTop: '1px solid var(--bord)', margin: '0 0 20px' }}/>

          {/* ── Receipt meta ────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 20 }}>
            {[
              ['Receipt No.', receiptId],
              ['Issued',      generatedAt],
              ['Date of Service', date],
              ['Time',        time],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="receipt-label" style={{ ...mono, fontSize: 8, letterSpacing: '.2em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div className="receipt-value" style={{ ...mono, fontSize: 10, color: 'var(--parch)', lineHeight: 1.4 }}>{value}</div>
              </div>
            ))}
          </div>

          <hr className="receipt-divider" style={{ border: 'none', borderTop: '1px solid var(--bord)', margin: '0 0 20px' }}/>

          {/* ── Client ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '.3em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 12 }}>Client</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {[
                ['Name',  client.name],
                ['Email', client.email],
                ...(client.phone ? [['Phone', client.phone]] : []),
                ['Member Tier', client.memberTier.charAt(0).toUpperCase() + client.memberTier.slice(1)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="receipt-label" style={{ ...mono, fontSize: 8, letterSpacing: '.2em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div className="receipt-value" style={{ fontSize: 12, color: 'var(--parch)', lineHeight: 1.4 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <hr className="receipt-divider" style={{ border: 'none', borderTop: '1px solid var(--bord)', margin: '0 0 20px' }}/>

          {/* ── Service ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '.3em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 12 }}>Service Rendered</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ ...serif, fontSize: '1.25rem', fontWeight: 600, color: 'var(--parch)', marginBottom: 3 }}>{booking.service}</div>
                <div style={{ ...mono, fontSize: 9, color: 'var(--stone)', letterSpacing: '.08em' }}>
                  Barber: {booking.barber || BUSINESS.owner}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`bkst ${booking.status}`}>{booking.status}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="receipt-price" style={{ ...serif, fontSize: '2rem', fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>
                  E{priceE}
                </div>
                <div style={{ ...mono, fontSize: 8, color: 'var(--stone)', marginTop: 3, letterSpacing: '.12em' }}>SZL</div>
              </div>
            </div>
          </div>

          <hr className="receipt-divider" style={{ border: 'none', borderTop: '1px solid var(--bord)', margin: '0 0 20px' }}/>

          {/* ── Payment method selector ─────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor={labelId}
              style={{ ...mono, fontSize: 8, letterSpacing: '.3em', color: 'var(--brass)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}
            >
              Payment Method
            </label>
            <select
              id={labelId}
              className="receipt-no-print port-input"
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              style={{ width: '100%', background: 'var(--ink)', color: 'var(--parch)', border: '1px solid var(--bord2)', borderRadius: 6, padding: '9px 12px', fontSize: 12, outline: 'none' }}
            >
              {Object.entries(
                PAYMENT_METHODS.reduce<Record<string, typeof PAYMENT_METHODS>>((acc, p) => {
                  const k = p.type === 'cash' ? 'Cash' : p.type === 'mobile' ? 'Mobile Money' : p.type === 'card' ? 'Card' : p.type === 'digital-wallet' ? 'Digital Wallet' : p.type === 'qr' ? 'QR Code' : 'Bank EFT';
                  (acc[k] ??= []).push(p);
                  return acc;
                }, {})
              ).map(([group, methods]) => (
                <optgroup key={group} label={group}>
                  {methods.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name} — {p.detail}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {/* Print-only payment display */}
            <div className="receipt-value" style={{ ...mono, fontSize: 11, color: 'var(--parch)', display: 'none' }}>
              {selectedPay.icon} {selectedPay.name} · {selectedPay.detail}
            </div>
          </div>

          {/* ── Total line ──────────────────────────────────────── */}
          <div style={{ background: 'var(--ink)', border: '1px solid var(--bord2)', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '.2em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 3 }}>Total Paid</div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--stone)' }}>{selectedPay.name}</div>
            </div>
            <div style={{ ...serif, fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)' }}>E{priceE}</div>
          </div>

          {/* ── Actions ─────────────────────────────────────────── */}
          <div className="receipt-no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => window.print()}
              style={{ flex: 1, background: 'var(--gold)', color: 'var(--ink)', border: 'none', borderRadius: 6, padding: '11px 16px', fontFamily: 'Anton, sans-serif', fontSize: 12, letterSpacing: '.08em', cursor: 'pointer', textTransform: 'uppercase', transition: 'background .2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-l)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold)')}
            >
              Print / Save PDF
            </button>
            <button onClick={downloadTXT} style={{ ...{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', border: '1px solid var(--bord2)', borderRadius: 6, padding: '11px 14px', cursor: 'pointer', background: 'none', color: 'var(--stone)', minHeight: 'unset' } }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}>
              ↓ TXT
            </button>
            <button onClick={downloadJSON} style={{ ...{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', border: '1px solid var(--bord2)', borderRadius: 6, padding: '11px 14px', cursor: 'pointer', background: 'none', color: 'var(--stone)', minHeight: 'unset' } }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--parch)'; e.currentTarget.style.borderColor = 'var(--stone)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}>
              ↓ JSON
            </button>
          </div>

          {/* ── Thank-you footer ────────────────────────────────── */}
          <div className="receipt-footer" style={{ ...mono, marginTop: 28, fontSize: 9, letterSpacing: '.15em', color: 'var(--stone)', textAlign: 'center', lineHeight: 1.8, textTransform: 'uppercase' }}>
            Thank you for choosing {BUSINESS.name}<br/>
            {BUSINESS.location} · {BUSINESS.phone.primaryDisplay}
          </div>

        </div>
      </div>
    </>
  );
}
