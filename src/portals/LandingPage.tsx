// ════════════════════════════════════════════════
// MT BARBERSHOP — LandingPage
// Architectural overhaul: craft-first, Swazi-rooted,
// personal vs. chain — one chair, zero compromises.
// ════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useServices } from '@/hooks/useServices';
import { useReveal } from '@/hooks/useReveal';
import { logger } from '@/core/logger';
import { BUSINESS, getTodayHours } from '@/config/business';

// ── Static content ────────────────────────────────────────────────────

const FALLBACK_BG = [
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=80',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80',
];

const PILLARS = [
  {
    kicker: '01 — PRECISION',
    title:  'The Craft',
    body:   'Every cut is engineered to your face shape. We do not rush. A fade at MT is a commitment — skin-clean edges, seamless blend, surgical lines.',
  },
  {
    kicker: '02 — IDENTITY',
    title:  'Your Story',
    body:   'Your cut is not a product — it is a statement. We listen first, then we sculpt. The chair is a conversation, not a conveyor belt.',
  },
  {
    kicker: '03 — COMMUNITY',
    title:  'Kwaluseni Roots',
    body:   'Born in the neighbourhood, built for the Kingdom. MT Barbershop has been the home of precision grooming in Kwaluseni, Manzini since 2020.',
  },
];

const STATS = [
  { value: '2020',   label: 'Established' },
  { value: '5+',     label: 'Years Active' },
  { value: '1,000+', label: 'Cuts Served' },
  { value: '6',      label: 'Services' },
  { value: '1',      label: 'Dedicated Chair' },
];

// ── Types ─────────────────────────────────────────────────────────────

interface ClientPhoto  { id: string; url: string; caption: string | null; created_at: string; }
interface VideoItem    { url: string; }
interface Announcement { id: string; body: string; tag: string; author_name: string; created_at: string; }

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
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

// ── Stat counter ──────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', flex: 1, minWidth: 100 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 400, color: 'var(--brass)', letterSpacing: '-.02em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--stone)', marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

// ── Service tag colours ───────────────────────────────────────────────

const TAG_ACCENT: Record<string, string> = {
  Signature: 'var(--gold)',
  Classic:   'var(--brass)',
  Grooming:  '#8A7A9E',
  Premium:   'var(--gold-l)',
  Youth:     '#5A9EC4',
  Quick:     'var(--brass-l)',
};

// ── Main component ────────────────────────────────────────────────────

interface LandingPageProps { onSignIn: () => void; }

export function LandingPage({ onSignIn }: LandingPageProps) {
  const { services } = useServices();

  const [bgPhotos, setBgPhotos]   = useState<string[]>(FALLBACK_BG);
  const [bgVideos, setBgVideos]   = useState<VideoItem[]>([]);
  const [bgIdx, setBgIdx]         = useState(0);
  const [bgVisible, setBgVisible] = useState(true);
  const [clientPhotos, setClientPhotos]   = useState<ClientPhoto[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const useVideos = bgVideos.length > 0;
  const bgItems   = useVideos ? bgVideos.map(v => v.url) : bgPhotos;
  const rotateMs  = useVideos ? 12000 : 7000;

  // Scroll reveal
  const revealCulture  = useReveal();
  const revealStory    = useReveal();
  const revealServices = useReveal();
  const revealPillars  = useReveal();
  const revealGallery  = useReveal();

  const servicesAnchorRef = useRef<HTMLDivElement>(null);
  const scrollToServices  = () => servicesAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Fetch gallery
  useEffect(() => {
    Promise.resolve(
      supabase
        .from('gallery_items')
        .select('id, url, caption, created_at')
        .eq('approved', true)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false })
        .limit(20)
    ).then(({ data, error }) => {
      if (error) { logger.warn('LandingPage', 'gallery images fetch failed', { error: error.message }); return; }
      if (data && data.length > 0) {
        const photos: ClientPhoto[] = data.map(d => ({
          id: d.id as string, url: d.url as string,
          caption: d.caption as string | null, created_at: d.created_at as string,
        }));
        setBgPhotos(shuffle(photos.map(p => p.url)));
        setClientPhotos(photos);
      }
    }).catch((e: unknown) => logger.warn('LandingPage', 'gallery images error', { error: String(e) }));

    Promise.resolve(
      supabase
        .from('gallery_items')
        .select('url')
        .eq('approved', true)
        .eq('media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(5)
    ).then(({ data, error }) => {
      if (error) { logger.warn('LandingPage', 'gallery videos fetch failed', { error: error.message }); return; }
      if (data && data.length > 0) setBgVideos(data.map(d => ({ url: d.url as string })));
    }).catch((e: unknown) => logger.warn('LandingPage', 'gallery videos error', { error: String(e) }));

    Promise.resolve(
      supabase
        .from('announcements')
        .select('id, body, tag, author_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
    ).then(({ data, error }) => {
      if (error) { logger.warn('LandingPage', 'announcements fetch failed', { error: error.message }); return; }
      if (data && data.length > 0) setAnnouncements(data as Announcement[]);
    }).catch((e: unknown) => logger.warn('LandingPage', 'announcements error', { error: String(e) }));
  }, []);

  // Rotate hero background
  useEffect(() => {
    if (bgItems.length <= 1) return;
    let tid: ReturnType<typeof setTimeout> | null = null;
    const iid = setInterval(() => {
      setBgVisible(false);
      tid = setTimeout(() => { setBgIdx(i => (i + 1) % bgItems.length); setBgVisible(true); }, 500);
    }, rotateMs);
    return () => { clearInterval(iid); if (tid) clearTimeout(tid); };
  }, [bgItems.length, rotateMs]);

  const todayHours = getTodayHours();
  const isOpen     = !!todayHours;

  return (
    <div style={{ animation: 'fadeIn .4s ease' }}>

      {/* ── Ticker ───────────────────────────────────────────────── */}
      <div className="ticker-wrap" style={{ borderTop: 'none' }}>
        <div className="ticker-inner" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.25em', color: 'var(--brass)' }}>
          {Array(8).fill(null).map((_, i) => (
            <span key={i} style={{ marginRight: 56 }}>
              MT BARBERSHOP · PRECISION BARBERING · KWALUSENI, MANZINI · EST. {BUSINESS.established} ·
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', minHeight: '94vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>

        {/* Background media */}
        {useVideos ? (
          <video
            key={bgIdx}
            src={bgItems[bgIdx % bgItems.length]}
            autoPlay muted loop playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: bgVisible ? .28 : 0, transition: 'opacity .5s ease', pointerEvents: 'none' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bgItems[bgIdx % bgItems.length]})`,
            backgroundSize: 'cover', backgroundPosition: 'center 30%',
            opacity: bgVisible ? .18 : 0,
            transition: 'opacity .5s ease',
          }}/>
        )}

        {/* Vignette — darkens edges to frame the text */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 60% 50%, transparent 30%, var(--ink) 90%)',
          pointerEvents: 'none',
        }}/>

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: '-50%',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .5, pointerEvents: 'none',
        }}/>

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '80px 32px 60px', width: '100%' }}>

          {/* Kicker */}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 24, textTransform: 'uppercase', animation: 'slideUp .5s .1s both' }}>
            {BUSINESS.location} · Est. {BUSINESS.established}
          </div>

          {/* Headline — distinctly MT's own */}
          <h1 style={{ lineHeight: .88, marginBottom: 32, animation: 'heroText .8s cubic-bezier(.16,1,.3,1) both' }}>
            <span style={{ display: 'block', fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(3.8rem, 12vw, 9rem)', letterSpacing: '-.03em', color: 'var(--parch)', textTransform: 'uppercase' }}>
              YOUR FACE.
            </span>
            <em style={{ display: 'block', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontStyle: 'italic', fontSize: 'clamp(3.2rem, 10.5vw, 7.8rem)', color: 'var(--gold)', lineHeight: 1.02, letterSpacing: '-.01em' }}>
              Our Craft.
            </em>
            <span style={{ display: 'block', fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(1.4rem, 4vw, 3rem)', letterSpacing: '.04em', color: 'var(--brass-l)', textTransform: 'uppercase', marginTop: 8 }}>
              Every Single Time.
            </span>
          </h1>

          {/* Sub-copy */}
          <p style={{ maxWidth: 480, marginBottom: 36, color: 'var(--stone)', fontSize: 15, lineHeight: 1.75, animation: 'slideUp .6s .2s both' }}>
            {BUSINESS.owner} has been sculpting precision cuts in Kwaluseni since {BUSINESS.established}.
            One chair. Zero compromises. The barbershop where your barber knows your face shape.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'slideUp .6s .35s both' }}>
            <a
              href={`https://wa.me/${BUSINESS.phone.primary}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-primary"
            >
              Book Your Chair
            </a>
            <button className="btn-outline" onClick={scrollToServices}>
              View Services
            </button>
            <button className="btn-outline" onClick={onSignIn} style={{ borderColor: 'var(--bord2)', color: 'var(--stone)' }}>
              Member Login
            </button>
          </div>

          {/* Open status */}
          <div style={{ marginTop: 28, animation: 'slideUp .6s .5s both' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.18em', color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpen ? '#52E89A' : '#f87171', display: 'inline-block', flexShrink: 0, boxShadow: isOpen ? '0 0 6px #52E89A' : 'none' }}/>
              {isOpen
                ? `OPEN NOW · ${todayHours.open}–${todayHours.close}`
                : 'CLOSED TODAY'}
              <span style={{ color: 'var(--bord)', margin: '0 4px' }}>·</span>
              <a href={`https://wa.me/${BUSINESS.phone.primary}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'none' }}>
                {BUSINESS.phone.primaryDisplay}
              </a>
            </div>
          </div>

          {/* Scroll cue */}
          <div style={{ position: 'absolute', bottom: 20, right: 32, fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.35em', color: 'var(--stone2)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
            Scroll
            <span style={{ display: 'inline-block', width: 1, height: 40, background: 'var(--stone2)', marginLeft: 4 }}/>
          </div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--bord)', borderBottom: '1px solid var(--bord)', background: 'var(--ink2)', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <StatCard value={s.value} label={s.label} />
              {i < STATS.length - 1 && (
                <div style={{ width: 1, height: 40, background: 'var(--bord)', flexShrink: 0 }}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Origin Story ─────────────────────────────────────────── */}
      <div
        ref={revealStory}
        data-reveal
        style={{ maxWidth: 1280, margin: '0 auto', padding: '100px 32px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px 80px', alignItems: 'start' }}>

          {/* Left — Pull quote */}
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 24, textTransform: 'uppercase' }}>
              The Story
            </div>
            <blockquote style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.9rem,3.5vw,3rem)', fontWeight: 600, fontStyle: 'italic', color: 'var(--parch)', lineHeight: 1.2, margin: 0, borderLeft: '2px solid var(--brass)', paddingLeft: 24 }}>
              "Born in the neighbourhood.<br/>Built for the Kingdom."
            </blockquote>
            <div style={{ marginTop: 32, fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--stone)', textTransform: 'uppercase' }}>
              — Mfanomuhle Tsabedze · Founder
            </div>
          </div>

          {/* Right — Narrative */}
          <div>
            <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2rem,3.5vw,3rem)', letterSpacing: '-.02em', textTransform: 'uppercase', marginBottom: 24, lineHeight: .95 }}>
              Kwaluseni's<br/>Precision<br/>House
            </h2>
            <p style={{ fontSize: 15, color: 'var(--stone)', lineHeight: 1.8, marginBottom: 16 }}>
              MT Barbershop opened its doors in 2020 in Kwaluseni, Manzini — not as a chain, not as a franchise, but as a statement. That precision barbering belongs in the Kingdom of Eswatini. That every client deserves a barber who studies their face, not their clock.
            </p>
            <p style={{ fontSize: 15, color: 'var(--stone)', lineHeight: 1.8 }}>
              One chair. Mfanomuhle Tsabedze behind it. More than a thousand cuts served. Zero compromises on craft.
            </p>
            <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href={`https://wa.me/${BUSINESS.phone.primary}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-primary"
              >
                Reserve Your Seat
              </a>
              <a href="/pricelist" style={{
                fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase',
                color: 'var(--stone)', border: '1px solid var(--bord2)', borderRadius: 6,
                padding: '13px 24px', textDecoration: 'none', transition: 'color .2s, border-color .2s',
                display: 'inline-flex', alignItems: 'center', minHeight: 'unset',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--brass)'; e.currentTarget.style.borderColor = 'var(--brass)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}
              >
                View Price List
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Services ─────────────────────────────────────────────── */}
      <div ref={servicesAnchorRef} style={{ scrollMarginTop: 48 }}/>
      <div
        ref={revealServices}
        data-reveal
        style={{ borderTop: '1px solid var(--bord)', borderBottom: '1px solid var(--bord)', background: 'var(--ink2)' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 10, textTransform: 'uppercase' }}>
                The Menu
              </div>
              <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2rem,4.5vw,3.8rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .92 }}>
                Services &<br/>Pricing
              </h2>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--stone)', maxWidth: 260, lineHeight: 1.7, textAlign: 'right' }}>
              All prices in SZL · Incl. VAT<br/>
              Duration is a guide, never a rush.
            </div>
          </div>

          {/* Services list — editorial row layout */}
          <div style={{ borderTop: '1px solid var(--bord)' }}>
            {services.map((s, i) => {
              const accent = TAG_ACCENT[s.tag] ?? 'var(--brass)';
              return (
                <div
                  key={s.id}
                  className="service-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '16px 32px',
                    padding: '28px 0',
                    borderBottom: '1px solid var(--bord)',
                    transition: 'background .2s',
                    cursor: 'default',
                    '--i': i,
                  } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.015)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(1rem,2.5vw,1.3rem)', fontWeight: 600, color: 'var(--parch)' }}>
                        {s.name}
                      </span>
                      <span style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.25em', textTransform: 'uppercase',
                        color: accent, border: `1px solid ${accent}`, borderRadius: 3, padding: '2px 7px', opacity: .9,
                      }}>
                        {s.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>{s.description}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone2)', letterSpacing: '.1em' }}>
                      {s.duration} min
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>
                      E{s.price}
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', marginTop: 3, letterSpacing: '.12em' }}>
                      SZL
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Book + Pricelist CTAs */}
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={`https://wa.me/${BUSINESS.phone.primary}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Book Now via WhatsApp
            </a>
            <a href="/pricelist" style={{
              fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase',
              color: 'var(--stone)', textDecoration: 'none', transition: 'color .2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--brass)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
            >
              Download Full Price List →
            </a>
          </div>
        </div>
      </div>

      {/* ── Gallery ──────────────────────────────────────────────── */}
      {clientPhotos.length > 0 && (
        <div
          ref={revealGallery}
          data-reveal
          style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 10, textTransform: 'uppercase' }}>
                Fresh Cuts
              </div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.1 }}>
                From the Chair
              </h2>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.15em', color: 'var(--stone)', textTransform: 'uppercase', opacity: .6 }}>
              {clientPhotos.length} photos
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {clientPhotos.slice(0, 9).map((photo) => (
              <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4 }}>
                <img
                  src={photo.url}
                  alt={photo.caption ?? 'MT Barbershop client photo'}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .4s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
                  padding: '24px 8px 8px',
                  fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,.65)',
                  letterSpacing: '.08em',
                }}>
                  {photo.caption && <div style={{ color: '#fff', fontSize: 10, marginBottom: 2 }}>{photo.caption}</div>}
                  {timeAgo(photo.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── The Culture — live announcements ────────────────────── */}
      {announcements.length > 0 && (
        <div
          ref={revealCulture}
          data-reveal
          style={{ borderTop: '1px solid var(--bord)' }}
        >
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 10, textTransform: 'uppercase' }}>
                  From the Shop
                </div>
                <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(1.8rem,4vw,3rem)', letterSpacing: '-.02em', textTransform: 'uppercase', lineHeight: .92 }}>
                  The Culture
                </h2>
              </div>
              <button onClick={onSignIn} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--bord2)', color: 'var(--stone)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', minHeight: 'unset', transition: 'color .15s, border-color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--brass)'; e.currentTarget.style.borderColor = 'var(--brass)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--bord2)'; }}
              >
                Join as Member →
              </button>
            </div>
            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {announcements.map((a, i) => (
                <div
                  key={a.id}
                  style={{ '--i': i, background: 'var(--ink2)', border: '1px solid var(--bord)', borderRadius: 10, padding: '24px 22px', transition: 'border-color .2s' } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brass)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bord)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--brass)', border: '1px solid var(--brass)', borderRadius: 3, padding: '2px 7px' }}>
                      {a.tag}
                    </span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', letterSpacing: '.06em' }}>
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--parch)', lineHeight: 1.7, margin: '0 0 14px' }}>
                    {a.body}
                  </p>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', letterSpacing: '.1em' }}>
                    — {a.author_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Three Pillars — The Craft ─────────────────────────────── */}
      <div
        ref={revealPillars}
        data-reveal
        style={{ borderTop: '1px solid var(--bord)', background: 'var(--ink2)' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 48, textTransform: 'uppercase' }}>
            What Sets Us Apart
          </div>
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, background: 'var(--bord)' }}>
            {PILLARS.map((p, i) => (
              <div
                key={i}
                style={{ '--i': i, background: 'var(--ink2)', padding: '36px 28px', transition: 'background .2s' } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink2)')}
              >
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.3em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>
                  {p.kicker}
                </div>
                <h3 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: '1.8rem', letterSpacing: '-.01em', textTransform: 'uppercase', marginBottom: 14, color: 'var(--parch)' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.75 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA Band ─────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--bord)', padding: '100px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background accent */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(184,150,106,.04) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.5em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>
            The Chair is Waiting
          </div>
          <h2 style={{ fontFamily: 'Anton, sans-serif', fontWeight: 400, fontSize: 'clamp(2.5rem,6vw,5rem)', letterSpacing: '-.02em', textTransform: 'uppercase', marginBottom: 8, lineHeight: .92 }}>
            Ready for Your
          </h2>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontStyle: 'italic', fontSize: 'clamp(2.8rem,6.5vw,5.5rem)', color: 'var(--gold)', lineHeight: .95, marginBottom: 40 }}>
            Precision Cut?
          </h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`https://wa.me/${BUSINESS.phone.primary}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Book via WhatsApp
            </a>
            <button className="btn-outline" onClick={onSignIn}>
              Create Member Account
            </button>
          </div>
        </div>
      </div>

      {/* ── Hours & Contact ──────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--bord)', background: 'var(--ink2)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px 48px' }}>

            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 18, textTransform: 'uppercase' }}>
                Trading Hours
              </div>
              {([
                { days: 'Mon – Thu', hours: '08:00 – 17:00' },
                { days: 'Fri – Sat', hours: '08:00 – 19:00' },
                { days: 'Sunday',    hours: 'Closed' },
              ] as const).map(row => (
                <div key={row.days} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, maxWidth: 240 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--stone)' }}>{row.days}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: row.hours === 'Closed' ? 'var(--stone2)' : 'var(--brass)' }}>{row.hours}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 18, textTransform: 'uppercase' }}>
                Contact & Location
              </div>
              <a href={`https://wa.me/${BUSINESS.phone.primary}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--brass)', textDecoration: 'none', marginBottom: 6, transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--brass)')}
              >
                {BUSINESS.phone.primaryDisplay}
              </a>
              <a href={`https://wa.me/${BUSINESS.phone.secondary}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--stone)', textDecoration: 'none', marginBottom: 16 }}
              >
                {BUSINESS.phone.secondaryDisplay}
              </a>
              <div style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.8 }}>
                {BUSINESS.location}<br/>
                {BUSINESS.address}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 18, textTransform: 'uppercase' }}>
                The Barber
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 600, color: 'var(--parch)', marginBottom: 6 }}>
                {BUSINESS.owner}
              </div>
              <div style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.8 }}>
                Founder & Head Barber<br/>
                Est. {BUSINESS.established} · {BUSINESS.name}
              </div>
              <div style={{ marginTop: 20 }}>
                <a href="/pricelist" style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--brass)', textDecoration: 'none', letterSpacing: '.15em', textTransform: 'uppercase', transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--brass)')}
                >
                  View Full Price List →
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--bord)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', letterSpacing: '.2em' }}>
            © {new Date().getFullYear()} {BUSINESS.name.toUpperCase()} · KINGDOM OF ESWATINI
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)', letterSpacing: '.1em', display: 'block', marginTop: 3, opacity: .45 }}>
            Trading Licence {BUSINESS.licence.renewedYear()} · {BUSINESS.licence.issuedTo}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { href: '/pricelist', label: 'Price List' },
            { href: '/privacy',   label: 'Privacy' },
            { href: '/terms',     label: 'Terms' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', letterSpacing: '.15em', textDecoration: 'none', textTransform: 'uppercase', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--brass)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
