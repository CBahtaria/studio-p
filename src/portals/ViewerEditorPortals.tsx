// ════════════════════════════════════════════════
// STUDIO P — ViewerPortal + EditorPortal
// ════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { UserProfile, Agent, OrchestrationResult } from '@/types';
import { bookingService } from '@/services/BookingService';
import { monitor } from '@/core/monitor';
import { AgentPanel } from '@/components/AgentPanel';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ServicesManager } from '@/components/ServicesManager';
import { useServices } from '@/hooks/useServices';

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

const HERO_IMGS = [
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=70',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=70',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=70',
];

// ── Viewer Portal ────────────────────────────────

interface ViewerPortalProps {
  user: UserProfile;
  onClose: () => void;
}

type BookStep = 'select' | 'validating' | 'done';

export function ViewerPortal({ user, onClose }: ViewerPortalProps) {
  const [section, setSection] = useState<'home' | 'book' | 'history'>('home');
  const [svc, setSvc]         = useState('');
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('');
  const [agents, setAgents]   = useState<Agent[]>([]);
  const [result, setResult]   = useState<OrchestrationResult | null>(null);
  const [step, setStep]       = useState<BookStep>('select');
  const [bgIdx]               = useState(() => Math.floor(Math.random() * HERO_IMGS.length));
  const { services }          = useServices();

  useEffect(() => {
    document.documentElement.style.setProperty('--port-bg',   'var(--view-bg)');
    document.documentElement.style.setProperty('--port-side', 'var(--view-s)');
    document.documentElement.style.setProperty('--port-bord', 'var(--view-b)');
    document.documentElement.style.setProperty('--port-a',    'var(--view-a)');
    document.documentElement.style.setProperty('--port-a2',   'var(--view-a2)');
    document.documentElement.style.setProperty('--port-t',    'var(--view-t)');
    document.documentElement.style.setProperty('--port-m',    'var(--view-m)');
    return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
      .forEach(v => document.documentElement.style.removeProperty(v));
  }, []);

  const bookNow = async () => {
    if (!svc || !date || !time) return;
    setStep('validating');
    setAgents([]);
    const res = await bookingService.validate(
      { service: svc, date, time, email: user.email, clientId: user.id },
      ({ agents }) => setAgents(agents ?? [])
    );
    setResult(res);
    setStep('done');
    monitor.recordMetric('booking.flow.complete', 1);
  };

  const reset = () => { setSvc(''); setDate(''); setTime(''); setAgents([]); setResult(null); setStep('select'); };

  const tierLabel = user.memberTier
    ? user.memberTier.charAt(0).toUpperCase() + user.memberTier.slice(1)
    : 'Bronze';
  const firstName = user.name.split(' ')[0];

  return (
    <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--view-bg)' }}>

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '40vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--view-b)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .18, transition: 'opacity .5s' }}/>
        <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--view-bg) 0%, transparent 60%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Member Portal · Studio P</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem,8vw,6rem)', fontWeight: 700, lineHeight: .88, color: 'var(--view-t)' }}>
            {firstName}'s<br/>
            <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Space.</em>
          </h1>
          <div style={{ display: 'flex', gap: 28, marginTop: 18 }}>
            {[{ v: String(user.visitCount || 0), l: 'Visits' }, { v: tierLabel, l: 'Tier' }].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--view-a)', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--view-b)', color: 'var(--view-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', alignSelf: 'flex-end' }}>
              ← Home
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--view-s)', borderRadius: 8, padding: 3 }}>
          {[['home', '✨ Dashboard'], ['book', '📅 Book'], ['history', '📋 History']].map(([id, label]) => (
            <button key={id} onClick={() => setSection(id as typeof section)} style={{
              flex: 1, background: section === id ? 'var(--view-b)' : 'transparent',
              border: 'none', color: section === id ? 'var(--view-a)' : 'var(--view-m)',
              borderRadius: 6, padding: '9px 12px', fontSize: 10,
              fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
              cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Dashboard */}
        {section === 'home' && (
          <div>
            <div className="pc">
              <div className="pc-h"><span className="pc-t">Upcoming Appointments</span></div>
              <div style={{ padding: '4px 18px' }}>
                <div className="bki">
                  <div className="bkav">L</div>
                  <div style={{ flex: 1 }}>
                    <div className="bkn">Signature Fade</div>
                    <div className="bkm">P. Dlamini · Tomorrow 14:30</div>
                  </div>
                  <span className="bkst confirmed">confirmed</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 8, textTransform: 'uppercase' }}>Member Perks</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {[
                  { icon: '✦', title: 'Loyalty Discount', desc: '10% off every 5th visit' },
                  { icon: '⚡', title: 'Priority Booking', desc: 'First access to new slots' },
                  { icon: '✧', title: 'Early Access', desc: 'New services before anyone else' },
                ].map(p => (
                  <div key={p.title} style={{ background: 'var(--view-s)', border: '1px solid var(--view-b)', borderRadius: 8, padding: '16px 14px', transition: 'border-color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--view-a)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--view-b)')}
                  >
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--view-a)', marginBottom: 6 }}>{p.icon}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.12em', color: 'var(--view-t)', marginBottom: 4, textTransform: 'uppercase' }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--view-m)', lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <PhotoUpload userId={user.id} />
          </div>
        )}

        {/* Booking */}
        {section === 'book' && (
          <div>
            {step === 'select' && (
              <div>
                <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 20, marginBottom: 20 }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>The Menu</div>
                  <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--view-b)', marginBottom: 20 }}>
                    {services.map((s, i) => (
                      <button key={s.id} onClick={() => setSvc(s.name)} style={{
                        '--i': i,
                        background: svc === s.name ? 'rgba(167,139,250,.1)' : 'var(--view-bg)',
                        border: 'none',
                        borderLeft: svc === s.name ? '2px solid var(--view-a)' : '2px solid transparent',
                        padding: '18px 16px',
                        textAlign: 'left', cursor: 'pointer',
                        transition: 'background .2s',
                      } as React.CSSProperties}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', marginBottom: 6, textTransform: 'uppercase' }}>{s.tag}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--view-t)', marginBottom: 4 }}>{s.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', fontWeight: 600 }}>E{s.price}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)' }}>{s.duration} min</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pc">
                  <div className="pc-h"><span className="pc-t">Date & Time</span></div>
                  <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>DATE</label>
                      <input className="port-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div>
                      <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>TIME</label>
                      <input className="port-input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
                    </div>
                  </div>
                </div>

                <button className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', opacity: svc && date && time ? 1 : .45 }}
                  onClick={bookNow} disabled={!svc || !date || !time}>
                  Run Parallel Validation →
                </button>
              </div>
            )}

            {(step === 'validating' || step === 'done') && (
              <div>
                <div className="pc">
                  <div className="pc-h"><span className="pc-t">Agent Validation</span></div>
                  <div className="pc-b">
                    <AgentPanel agents={agents} result={result} running={step === 'validating'} />
                  </div>
                </div>
                {step === 'done' && result?.approved && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <a href={`https://wa.me/26879657744?text=${encodeURIComponent(`Booking ${result.bookingId}: ${svc} on ${date} at ${time}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn-primary" style={{ display: 'inline-block', marginBottom: 10 }}>
                      Confirm on WhatsApp →
                    </a>
                    <br/>
                    <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--port-m)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
                      Book another slot
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {section === 'history' && (
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>Past Visits</div>
            {[
              { service: 'Signature Fade', date: 'May 10, 2025', price: 'E120', status: 'completed', barber: 'P. Dlamini' },
              { service: 'Taper & Define', date: 'Apr 03, 2025', price: 'E100', status: 'completed', barber: 'P. Dlamini' },
              { service: 'Full Package',   date: 'Mar 01, 2025', price: 'E220', status: 'completed', barber: 'P. Dlamini' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--view-b)' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, color: 'var(--view-b)', lineHeight: 1, width: 32, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--view-t)' }}>{b.service}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--view-m)', marginTop: 3, letterSpacing: '.06em' }}>{b.barber} · {b.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: 'var(--brass)', fontWeight: 600 }}>{b.price}</div>
                  <span className={`bkst ${b.status}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Editor Portal ────────────────────────────────

interface EditorPortalProps {
  user: UserProfile;
  onClose: () => void;
}

type EditorSection = 'posts' | 'services' | 'media';

export function EditorPortal({ user, onClose }: EditorPortalProps) {
  const [section, setSection] = useState<EditorSection>('posts');
  const [posts] = useState([
    { id: 'p1', author: user.name, text: 'Fresh fade of the day. Precision work.', likes: 12, tag: 'CULTURE' },
    { id: 'p2', author: user.name, text: 'New styling tips: hot towel ritual — a thread.', likes: 8, tag: 'TIPS' },
  ]);
  const [bgIdx] = useState(1);

  useEffect(() => {
    document.documentElement.style.setProperty('--port-bg',   'var(--edit-bg)');
    document.documentElement.style.setProperty('--port-side', 'var(--edit-s)');
    document.documentElement.style.setProperty('--port-bord', 'var(--edit-b)');
    document.documentElement.style.setProperty('--port-a',    'var(--edit-a)');
    document.documentElement.style.setProperty('--port-a2',   'var(--edit-a2)');
    document.documentElement.style.setProperty('--port-t',    'var(--edit-t)');
    document.documentElement.style.setProperty('--port-m',    'var(--edit-m)');
    return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
      .forEach(v => document.documentElement.style.removeProperty(v));
  }, []);

  return (
    <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--edit-bg)' }}>

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '38vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--edit-b)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .15 }}/>
        <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--edit-bg) 0%, transparent 55%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Editor Portal · Studio P</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 700, lineHeight: .9, color: 'var(--edit-t)' }}>
            Studio<br/>
            <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Desk.</em>
          </h1>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--edit-m)', marginTop: 14, letterSpacing: '.06em' }}>
            {user.name} · Content Creator
          </p>
          <button onClick={onClose} style={{ position: 'absolute', bottom: 36, right: 28, background: 'none', border: '1px solid var(--edit-b)', color: 'var(--edit-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
            ← Home
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>

        {/* Section nav */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--edit-s)', borderRadius: 8, padding: 3 }}>
          {([['posts', '✏️ Posts'], ['services', '💈 Services'], ['media', '🖼 Media']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)} style={{
              flex: 1, background: section === id ? 'var(--edit-b)' : 'transparent',
              border: 'none', color: section === id ? 'var(--edit-a)' : 'var(--edit-m)',
              borderRadius: 6, padding: '9px 12px', fontSize: 10,
              fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
              cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Posts */}
        {section === 'posts' && (
          <div>
            <div className="pc">
              <div className="pc-h">
                <span className="pc-t">Trending Tags</span>
              </div>
              <div className="pc-b">
                {['#FadeCulture', '#TaperSeason', '#EswatiniStyle', '#StudioP', '#PrecisionGrooming'].map(tag => (
                  <span key={tag} className={`chip${tag === '#FadeCulture' ? ' active' : ''}`}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="pc">
              <div className="pc-h">
                <span className="pc-t">Your Posts</span>
                <button className="pb">+ Write New</button>
              </div>
              <div style={{ padding: '4px 18px' }}>
                {posts.map(p => (
                  <div key={p.id} className="bki">
                    <div className="bkav" style={{ background: 'var(--edit-b)' }}>{user.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div className="bkn">{p.text}</div>
                      <div className="bkm">♥ {p.likes} likes · <span style={{ color: 'var(--brass)', letterSpacing: '.1em' }}>{p.tag}</span></div>
                    </div>
                    <button className="pbg" style={{ minHeight: 'unset', padding: '5px 10px', fontSize: 9 }}>Edit</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Services CRUD */}
        {section === 'services' && (
          <div className="pc">
            <div className="pc-h"><span className="pc-t">Pricelist Management</span></div>
            <div className="pc-b">
              <ServicesManager />
            </div>
          </div>
        )}

        {/* Media queue */}
        {section === 'media' && (
          <div>
            <div style={{ borderTop: '1px solid var(--edit-b)', paddingTop: 24 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>Media Queue</div>
              <div className="gport">
                {[
                  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&q=70',
                  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&q=70',
                  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&q=70',
                ].map((src, i) => (
                  <div key={i} className="gpimg">
                    <img src={src} alt={`media ${i}`} loading="lazy"/>
                    <div className="gpov">
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }}>✓</button>
                        <button className="pb" style={{ padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.3)', color: '#f87171', minHeight: 'unset' }}>✗</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
