// ════════════════════════════════════════════════
// STUDIO P — LandingPage (portals/LandingPage.tsx)
// Public-facing hero, services, gallery, news
// ════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useServices } from '@/hooks/useServices';
import { useReveal } from '@/hooks/useReveal';

const FALLBACK_BG = [
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80',
];

const NEWS = [
  { title: 'The Art of the Fade: Why precision matters', desc: 'Master barber P. Dlamini breaks down his signature technique', tag: 'CULTURE' },
  { title: "Eswatini's next wave: Studio P × Streetwear Collab", desc: 'Limited edition merch drops next week', tag: 'DROPS' },
  { title: 'Member spotlight: 1000th cut celebration', desc: 'We honoured our 1000th client with a full ritual', tag: 'COMMUNITY' },
];

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ClientPhoto { url: string; caption: string | null; created_at: string; }
interface VideoItem   { url: string; }

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  const { services } = useServices();

  const [bgPhotos, setBgPhotos]   = useState<string[]>(FALLBACK_BG);
  const [bgVideos, setBgVideos]   = useState<VideoItem[]>([]);
  const [bgIdx, setBgIdx]         = useState(0);
  const [bgVisible, setBgVisible] = useState(true);
  const [clientPhotos, setClientPhotos] = useState<ClientPhoto[]>([]);

  const useVideos = bgVideos.length > 0;
  const bgItems   = useVideos ? bgVideos.map(v => v.url) : bgPhotos;
  const rotateMs  = useVideos ? 12000 : 6000;

  // Scroll reveal refs
  const revealServices = useReveal();
  const revealGallery  = useReveal();
  const revealNews     = useReveal();

  // Fetch approved media for hero + gallery
  useEffect(() => {
    // Images for background and gallery
    supabase
      .from('gallery_items')
      .select('url, caption, created_at')
      .eq('approved', true)
      .eq('media_type', 'image')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBgPhotos(shuffle(data.map(d => d.url)));
          setClientPhotos(data as ClientPhoto[]);
        }
      });

    // Videos for hero (newest first, up to 5)
    supabase
      .from('gallery_items')
      .select('url')
      .eq('approved', true)
      .eq('media_type', 'video')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && data.length > 0) setBgVideos(data as VideoItem[]);
      });
  }, []);

  // Rotate hero background (12 s for videos, 6 s for photos)
  useEffect(() => {
    if (bgItems.length <= 1) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const intervalId = setInterval(() => {
      setBgVisible(false);
      timeoutId = setTimeout(() => {
        setBgIdx(i => (i + 1) % bgItems.length);
        setBgVisible(true);
      }, 400);
    }, rotateMs);
    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [bgItems.length, rotateMs]);

  return (
    <div style={{ paddingTop: 0, animation: 'fadeIn .4s ease' }}>
      {/* Ticker */}
      <div className="ticker-wrap">
        <div className="ticker-inner" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em', color: 'var(--brass)' }}>
          {Array(6).fill(null).map((_, i) => (
            <span key={i} style={{ marginRight: 60 }}>
              STUDIO P · PRECISION CRAFTSMANSHIP · MATSAPHA, ESWATINI · EST. 2020 ·
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Dynamic background — video or photo crossfade */}
        {useVideos ? (
          <video
            key={bgIdx}
            src={bgItems[bgIdx]}
            autoPlay muted loop playsInline
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: bgVisible ? .3 : 0,
              transition: 'opacity .4s ease',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bgItems[bgIdx]})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: bgVisible ? .22 : 0,
            transition: 'opacity .4s ease',
          }}/>
        )}

        {/* Grain overlay */}
        <div style={{
          position: 'absolute', inset: '-50%',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          animation: 'grain 4s steps(2) infinite',
          opacity: .6,
        }}/>

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '60px 32px', width: '100%' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>
            Matsapha · Eswatini · Est. 2020
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
            Walk in as yourself. Leave as royalty. Fanu's Studio-P is Matsapha's home of precision craftsmanship.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'slideUp .6s .35s both' }}>
            <a href="https://wa.me/26879657744" target="_blank" rel="noopener noreferrer" className="btn-primary">
              Book Your Chair
            </a>
            <button className="btn-outline" onClick={onSignIn}>
              Join Fanu's Studio-P
            </button>
          </div>
        </div>
      </div>

      {/* Services */}
      <div
        ref={revealServices}
        data-reveal
        style={{ borderTop: '1px solid var(--bord)', borderBottom: '1px solid var(--bord)', background: 'var(--ink2)' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 8, textTransform: 'uppercase' }}>
            The Menu
          </div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 600, marginBottom: 32 }}>
            Services
          </h2>
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: 'var(--bord)' }}>
            {services.map((s, i) => (
              <div
                key={s.id}
                style={{ '--i': i, background: 'var(--ink)', padding: 24, transition: 'background .2s' } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}
              >
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', color: 'var(--brass)', marginBottom: 8, textTransform: 'uppercase' }}>
                  {s.tag}
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 600, marginBottom: 6 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12, lineHeight: 1.5 }}>{s.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', color: 'var(--brass)', fontWeight: 600 }}>E{s.price}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)' }}>{s.duration} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client photo gallery — only shown when approved photos exist */}
      {clientPhotos.length > 0 && (
        <div
          ref={revealGallery}
          data-reveal
          style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}
        >
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 8, textTransform: 'uppercase' }}>
            Fresh Cuts
          </div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 600, marginBottom: 32 }}>
            From the Chair
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {clientPhotos.slice(0, 8).map((photo, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4 }}>
                <img
                  src={photo.url}
                  alt={photo.caption ?? 'Studio P client photo'}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,.65))',
                  padding: '20px 8px 7px',
                  fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,.7)',
                  letterSpacing: '.08em',
                }}>
                  {photo.caption && <div style={{ marginBottom: 2, color: '#fff', fontSize: 10 }}>{photo.caption}</div>}
                  {timeAgo(photo.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      <div
        ref={revealNews}
        data-reveal
        style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}
      >
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
