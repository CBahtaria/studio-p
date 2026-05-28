// ════════════════════════════════════════════════
// STUDIO P — LandingPage (portals/LandingPage.tsx)
// Public-facing hero, services, gallery, news
// ════════════════════════════════════════════════

import { SERVICES } from '@/services/BookingService';

const GALLERY = [
  { src: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80', label: 'Skin Fade', wide: true },
  { src: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&q=80', label: 'Taper Clean' },
  { src: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&q=80', label: 'Line Up' },
  { src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80', label: 'Full Cut' },
];

const NEWS = [
  { title: 'The Art of the Fade: Why precision matters', desc: 'Master barber P. Dlamini breaks down his signature technique', tag: 'CULTURE' },
  { title: "Eswatini's next wave: Studio P × Streetwear Collab", desc: 'Limited edition merch drops next week', tag: 'DROPS' },
  { title: 'Member spotlight: 1000th cut celebration', desc: 'We honoured our 1000th client with a full ritual', tag: 'COMMUNITY' },
];

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div style={{ paddingTop: 0, animation: 'fadeIn .4s ease' }}>
      {/* Ticker */}
      <div className="ticker-wrap">
        <div className="ticker-inner" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em', color: 'var(--brass)' }}>
          {Array(6).fill(null).map((_, i) => (
            <span key={i} style={{ marginRight: 60 }}>
              STUDIO P · PRECISION CRAFTSMANSHIP · MANZINI, ESWATINI · EST. 2020 ·
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Bg image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${GALLERY[0].src})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: .22,
        }}/>
        {/* Grain */}
        <div style={{
          position: 'absolute', inset: '-50%',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          animation: 'grain 4s steps(2) infinite',
          opacity: .6,
        }}/>

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '60px 32px', width: '100%' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>
            Manzini · Eswatini · Est. 2020
          </div>
          <h1 style={{
            fontSize: 'clamp(3.2rem, 10vw, 7.5rem)',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 700, lineHeight: .92,
            color: 'var(--parch)',
            animation: 'heroText .8s cubic-bezier(.16,1,.3,1) both',
          }}>
            MORE THAN<br/>
            <em style={{ color: 'var(--brass)', fontStyle: 'italic' }}>a haircut.</em><br/>
            IT'S A CULTURE.
          </h1>
          <p style={{ maxWidth: 500, margin: '28px 0', color: 'var(--stone)', fontSize: 15, lineHeight: 1.7, animation: 'slideUp .6s .2s both' }}>
            Walk in as yourself. Leave as royalty. Studio P is Manzini's home of precision craftsmanship.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'slideUp .6s .35s both' }}>
            <a href="https://wa.me/26876000000" target="_blank" rel="noopener noreferrer" className="btn-primary">
              Book Your Chair
            </a>
            <button className="btn-outline" onClick={onSignIn}>
              Join Studio P
            </button>
          </div>
        </div>
      </div>

      {/* Services */}
      <div style={{ borderTop: '1px solid var(--bord)', borderBottom: '1px solid var(--bord)', background: 'var(--ink2)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 8, textTransform: 'uppercase' }}>
            The Menu
          </div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 600, marginBottom: 32 }}>
            Services
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: 'var(--bord)' }}>
            {SERVICES.map(s => (
              <div key={s.code} style={{ background: 'var(--ink)', padding: 24, transition: 'background .2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}
              >
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', color: 'var(--brass)', marginBottom: 8, textTransform: 'uppercase' }}>
                  {s.tag}
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 600, marginBottom: 6 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 }}>{s.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', color: 'var(--brass)', fontWeight: 600 }}>{s.price}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>{s.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 8, textTransform: 'uppercase' }}>
          The Culture
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 24 }}>
          {NEWS.map(n => (
            <div key={n.title} className="news-card">
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--brass)', marginBottom: 10, letterSpacing: '.2em' }}>{n.tag}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'Cormorant Garamond, serif', marginBottom: 8, lineHeight: 1.3 }}>{n.title}</div>
              <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6 }}>{n.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: '1px solid var(--bord)', padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 5vw, 4rem)', marginBottom: 24 }}>
          Your Chair <em style={{ color: 'var(--brass)' }}>Awaits.</em>
        </h2>
        <button className="btn-primary" onClick={onSignIn}>Create Free Account →</button>
      </div>
    </div>
  );
}
