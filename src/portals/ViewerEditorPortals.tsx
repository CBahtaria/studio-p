// ════════════════════════════════════════════════
// STUDIO P — ViewerPortal (portals/ViewerPortal.tsx)
// Member booking flow with parallel agent validation
// ════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { UserProfile, Agent, OrchestrationResult } from '@/types';
import { bookingService, SERVICES } from '@/services/BookingService';
import { monitor } from '@/core/monitor';
import { AgentPanel } from '@/components/AgentPanel';

interface ViewerPortalProps {
  user: UserProfile;
  onClose: () => void;
}

type BookStep = 'select' | 'validating' | 'done';

export function ViewerPortal({ user, onClose }: ViewerPortalProps) {
  const [section, setSection] = useState<'home' | 'book' | 'history'>('home');
  const [svc, setSvc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [step, setStep] = useState<BookStep>('select');

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

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--view-bg)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="port-ey">Member Portal</div>
            <h1 className="port-title">
              {user.name.split(' ')[0]}'s Space
            </h1>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--view-b)', color: 'var(--view-m)', borderRadius: 8, padding: '6px 12px', fontSize: 11, minHeight: 'unset' }}>
            ← Home
          </button>
        </div>

        {/* Stats */}
        <div className="sg">
          {[{ v: '3', l: 'Visits' }, { v: 'Gold', l: 'Tier' }, { v: 'E300', l: 'Total Spend' }].map(s => (
            <div key={s.l} className="sc">
              <div className="sc-v">{s.v}</div>
              <div className="sc-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--view-s)', borderRadius: 8, padding: 3 }}>
          {[['home', '✨ Dashboard'], ['book', '📅 Book'], ['history', '📋 History']].map(([id, label]) => (
            <button key={id} onClick={() => setSection(id as typeof section)} style={{
              flex: 1, background: section === id ? 'var(--view-b)' : 'transparent',
              border: 'none', color: section === id ? 'var(--view-a)' : 'var(--view-m)',
              borderRadius: 6, padding: '8px 12px', fontSize: 11,
              fontFamily: 'DM Mono, monospace', letterSpacing: '.08em',
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
            <div className="pc">
              <div className="pc-h"><span className="pc-t">Member Perks</span></div>
              <div className="pc-b">
                {['10% off every 5th visit', 'Priority booking slots', 'Early access to new services'].map(p => (
                  <div key={p} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--port-bord)', fontSize: 12, color: 'var(--port-t)' }}>
                    <span style={{ color: 'var(--view-a)' }}>✓</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Booking */}
        {section === 'book' && (
          <div>
            {step === 'select' && (
              <div>
                <div className="pc">
                  <div className="pc-h"><span className="pc-t">Book Your Chair</span></div>
                  <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>SERVICE</label>
                      <select className="port-input" value={svc} onChange={e => setSvc(e.target.value)}>
                        <option value="">Select service…</option>
                        {SERVICES.map(s => <option key={s.code} value={s.name}>{s.name} — {s.price} ({s.duration})</option>)}
                      </select>
                    </div>
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
                <button className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', opacity: svc && date && time ? 1 : .5 }}
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
                    <a href={`https://wa.me/26876000000?text=Booking ${result.bookingId}: ${svc} on ${date} at ${time}`}
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
          <div className="pc">
            <div className="pc-h"><span className="pc-t">Past Visits</span></div>
            <div style={{ padding: '4px 18px' }}>
              {[
                { service: 'Signature Fade', date: 'May 10, 2025', price: 'E120', status: 'completed' },
                { service: 'Taper & Define', date: 'Apr 03, 2025', price: 'E100', status: 'completed' },
                { service: 'Full Package',   date: 'Mar 01, 2025', price: 'E220', status: 'completed' },
              ].map((b, i) => (
                <div key={i} className="bki">
                  <div className="bkav" style={{ background: 'var(--view-b)' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div className="bkn">{b.service}</div>
                    <div className="bkm">{b.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, color: 'var(--view-a)' }}>{b.price}</div>
                    <span className={`bkst ${b.status}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// STUDIO P — EditorPortal (portals/EditorPortal.tsx)
// ════════════════════════════════════════════════

interface EditorPortalProps {
  user: UserProfile;
  onClose: () => void;
}

export function EditorPortal({ user, onClose }: EditorPortalProps) {
  const [posts] = useState([
    { id: 'p1', author: user.name, text: 'Fresh fade of the day. Precision work.', likes: 12, tag: 'CULTURE' },
    { id: 'p2', author: user.name, text: 'New styling tips: hot towel ritual — a thread.', likes: 8, tag: 'TIPS' },
  ]);

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
    <div style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--edit-bg)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="port-ey">Editor Portal</div>
            <h1 className="port-title">Studio Desk</h1>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--edit-b)', color: 'var(--edit-m)', borderRadius: 8, padding: '6px 12px', fontSize: 11, minHeight: 'unset' }}>
            ← Home
          </button>
        </div>

        <div className="pc">
          <div className="pc-h"><span className="pc-t">Trending Tags</span></div>
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
                  <div className="bkm">♥ {p.likes} likes · {p.tag}</div>
                </div>
                <button className="pbg" style={{ minHeight: 'unset', padding: '5px 10px', fontSize: 9 }}>Edit</button>
              </div>
            ))}
          </div>
        </div>

        <div className="pc">
          <div className="pc-h"><span className="pc-t">Media Queue</span></div>
          <div className="pc-b">
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
      </div>
    </div>
  );
}
