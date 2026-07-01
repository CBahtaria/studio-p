   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — ViewerPortal + EditorPortal
   3 | // ════════════════════════════════════════════════
   4 | 
   5 | import { useState, useEffect } from 'react';
   6 | import type { UserProfile, Agent, OrchestrationResult } from '@/types';
   7 | import { bookingService } from '@/services/BookingService';
   8 | import { monitor } from '@/core/monitor';
   9 | import { logger } from '@/core/logger';
  10 | import { supabase } from '@/lib/supabase';
  11 | import { AgentPanel } from '@/components/AgentPanel';
  12 | import { PhotoUpload } from '@/components/PhotoUpload';
  13 | import { ServicesManager } from '@/components/ServicesManager';
  14 | import { useServices } from '@/hooks/useServices';
  15 | 
  16 | interface BookingRecord {
  17 |   id: string;
  18 |   service: string;
  19 |   barber: string;
  20 |   scheduled_at: string;
  21 |   price_swl: number;
  22 |   status: string;
  23 | }
  24 | 
  25 | interface GalleryItem {
  26 |   id: string;
  27 |   url: string;
  28 |   caption: string | null;
  29 |   approved: boolean;
  30 |   created_at: string;
  31 | }
  32 | 
  32 | const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'\%3E%3Cfilter id=\'n\'\%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.06\'/%3E%3C/svg%3E")`;
  33 | 
  34 | const HERO_IMGS = [
  35 |   'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=70',
  36 |   'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=70',
  37 |   'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=70',
  38 | ];
  39 | 
  40 | // ── Viewer Portal ────────────────────────────────
  41 | 
  42 | interface ViewerPortalProps {
  43 |   user: UserProfile;
  44 |   onClose: () => void;
  45 |   onSignOut: () => void;
  46 | }
  47 | 
  48 | type BookStep = 'select' | 'validating' | 'done';
  49 | 
  50 | export function ViewerPortal({ user, onClose, onSignOut }: ViewerPortalProps) {
  51 |   const [section, setSection]   = useState<'home' | 'book' | 'history'>('home');
  52 |   const [svc, setSvc]           = useState('');
  53 |   const [date, setDate]         = useState('');
  54 |   const [time, setTime]         = useState('');
  55 |   const [agents, setAgents]     = useState<Agent[]>([]);
  56 |   const [result, setResult]     = useState<OrchestrationResult | null>(null);
  57 |   const [step, setStep]         = useState<BookStep>('select');
  58 |   const [bgIdx]                 = useState(() => Math.floor(Math.random() * HERO_IMGS.length));
  59 |   const [history, setHistory]   = useState<BookingRecord[]>([]);
  60 |   const [histLoading, setHistLoading] = useState(false);
  61 |   const { services }            = useServices();
  62 | 
  63 |   useEffect(() => {
  64 |     document.documentElement.style.setProperty('--port-bg',   'var(--view-bg)');
  65 |     document.documentElement.style.setProperty('--port-side', 'var(--view-s)');
  66 |     document.documentElement.style.setProperty('--port-bord', 'var(--view-b)');
  67 |     document.documentElement.style.setProperty('--port-a',    'var(--view-a)');
  68 |     document.documentElement.style.setProperty('--port-a2',   'var(--view-a2)');
  69 |     document.documentElement.style.setProperty('--port-t',    'var(--view-t)');
  70 |     document.documentElement.style.setProperty('--port-m',    'var(--view-m)');
  71 | 
  72 |     setHistLoading(true);
  73 |     Promise.resolve(
  74 |       supabase
  75 |         .from('bookings')
  76 |         .select('id, service, barber, scheduled_at, price_swl, status')
  77 |         .eq('client_id', user.id)
  78 |         .order('scheduled_at', { ascending: false })
  79 |         .limit(20)
  80 |     ).then(({ data, error }) => {
  81 |         if (error) logger.warn('ViewerPortal', 'history fetch failed', { error: error.message });
  82 |         else setHistory((data ?? []) as BookingRecord[]);
  83 |         setHistLoading(false);
  84 |       })
  85 |       .catch((e: unknown) => { logger.warn('ViewerPortal', 'history fetch error', { error: String(e) }); setHistLoading(false); });
  86 | 
  87 |     return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
  88 |       .forEach(v => document.documentElement.style.removeProperty(v));
  89 |   }, [user.id]);
  90 | 
  91 |   const bookNow = async () => {
  92 |     if (!svc || !date || !time) return;
  93 |     setStep('validating');
  94 |     setAgents([]);
  95 |     try {
  96 |       const res = await bookingService.validate(
  97 |         { service: svc, date, time, email: user.email, clientId: user.id },
  98 |         ({ agents }) => setAgents(agents ?? [])
  99 |       );
 100 |       setResult(res);
 101 |     } catch (e) {
 102 |       logger.error('ViewerPortal', 'Booking validation failed', { error: String(e) });
 103 |       setResult({ bookingId: '', approved: false, confidence: 0, parallelMs: 0, rounds: 1, agents: [], issuesFixed: 0, reason: 'Unexpected error — please try again.' });
 104 |     } finally {
 105 |       setStep('done');
 106 |       monitor.recordMetric('booking.flow.complete', 1);
 107 |     }
 108 |   };
 109 | 
 110 |   const reset = () => { setSvc(''); setDate(''); setTime(''); setAgents([]); setResult(null); setStep('select'); };
 111 | 
 112 |   const tierLabel = user.memberTier
 113 |     ? user.memberTier.charAt(0).toUpperCase() + user.memberTier.slice(1)
 114 |     : 'Bronze';
 115 |   const firstName = user.name?.split(' ')[0] || 'Member';
 116 | 
 117 |   return (
 118 |     <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--view-bg)' }}>
 119 | 
 120 |       {/* Hero */}
 121 |       <div style={{ position: 'relative', minHeight: '40vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--view-b)' }}>
 122 |         <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .18, transition: 'opacity .5s' }}/>
 123 |         <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
 124 |         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--view-bg) 0%, transparent 60%)', pointerEvents: 'none' }}/>
 125 |         <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
 126 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Member Portal · Studio P</div>
 127 |           <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem,8vw,6rem)', fontWeight: 700, lineHeight: .88, color: 'var(--view-t)' }}>
 128 |             {firstName}'s<br/>
 129 |             <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Space.</em>
 130 |           </h1>
 131 |           <div style={{ display: 'flex', gap: 28, marginTop: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
 132 |             {[{ v: String(user.visitCount || 0), l: 'Visits' }, { v: tierLabel, l: 'Tier' }].map(s => (
 133 |               <div key={s.l}>
 134 |                 <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--view-a)', lineHeight: 1 }}>{s.v}</div>
 135 |                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>{s.l}</div>
 136 |               </div>
 137 |             ))}
 138 |             <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
 139 |               <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--view-b)', color: 'var(--view-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 140 |                 ← Home
 141 |               </button>
 142 |               <button onClick={onSignOut} style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 143 |                 Sign Out
 144 |               </button>
 145 |             </div>
 146 |           </div>
 147 |         </div>
 148 |       </div>
 149 | 
 150 |       {/* Content */}
 151 |       <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
 152 | 
 153 |         {/* Nav */}
 154 |         <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--view-s)', borderRadius: 8, padding: 3 }}>
 155 |           {[["home", "✨ Dashboard"], ["book", "📅 Book"], ["history", "📋 History"]].map(([id, label]) => (
 156 |             <button key={id} onClick={() => setSection(id as typeof section)} style={{
 157 |               flex: 1, background: section === id ? 'var(--view-b)' : 'transparent',
 158 |               border: 'none', color: section === id ? 'var(--view-a)' : 'var(--view-m)',
 159 |               borderRadius: 6, padding: '9px 12px', fontSize: 10,
 160 |               fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 161 |               cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
 162 |             }}>{label}</button>
 163 |           ))}
 164 |         </div>
 165 | 
 166 |         {/* Dashboard */}
 167 |         {section === 'home' && (
 168 |           <div>
 169 |             <div className="pc">
 170 |               <div className="pc-h">
 171 |                 <span className="pc-t">Upcoming Appointments</span>
 172 |                 <button className="pbg" onClick={() => setSection('book')} style={{ fontSize: 9 }}>+ Book</button>
 173 |               </div>
 174 |               <div style={{ padding: '4px 18px' }}>
 175 |                 {(() => {
 176 |                   const upcoming = history.filter(b => new Date(b.scheduled_at) > new Date() && b.status !== 'cancelled').slice(0, 3);
 177 |                   if (histLoading) return <div style={{ padding: '16px 0', color: 'var(--view-m)', fontFamily: 'DM Mono, monospace', fontSize: 10, textAlign: 'center' }}>Loading…</div>;
 178 |                   if (upcoming.length === 0) return (
 179 |                     <div style={{ padding: '16px 0', color: 'var(--view-m)', fontSize: 12, textAlign: 'center' }}>
 180 |                       No upcoming appointments.{' '}
 181 |                       <button onClick={() => setSection('book')} style={{ background: 'none', border: 'none', color: 'var(--view-a)', cursor: 'pointer', fontSize: 12, minHeight: 'unset', padding: 0, fontFamily: 'inherit' }}>Book now →</button>
 182 |                     </div>
 183 |                   );
 184 |                   return upcoming.map(b => {
 185 |                     const d = new Date(b.scheduled_at);
 186 |                     const dateStr = d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
 187 |                     const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 188 |                     return (
 189 |                       <div key={b.id} className="bki">
 190 |                         <div className="bkav">{b.service?.[0] ?? '✦'}</div>
 191 |                         <div style={{ flex: 1 }}>
 192 |                           <div className="bkn">{b.service}</div>
 193 |                           <div className="bkm">{b.barber} · {dateStr} {timeStr}</div>
 194 |                         </div>
 195 |                         <span className={`bkst ${b.status}`}>{b.status}</span>
 196 |                       </div>
 197 |                     );
 198 |                   });
 199 |                 })()}
 200 |               </div>
 201 |             </div>
 202 | 
 203 |             <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 24, marginBottom: 20 }}>
 204 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 8, textTransform: 'uppercase' }}>Member Perks</div>
 205 |               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
 206 |                 {[
 207 |                   { icon: '✦', title: 'Loyalty Discount', desc: '10% off every 5th visit' },
 208 |                   { icon: '⚡', title: 'Priority Booking', desc: 'First access to new slots' },
 209 |                   { icon: '✧', title: 'Early Access', desc: 'New services before anyone else' },
 210 |                 ].map(p => (
 211 |                   <div key={p.title} style={{ background: 'var(--view-s)', border: '1px solid var(--view-b)', borderRadius: 8, padding: '16px 14px', transition: 'border-color .2s' }}
 212 |                     onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--view-a)')}
 213 |                     onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--view-b)')}
 214 |                   >
 215 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--view-a)', marginBottom: 6 }}>{p.icon}</div>
 216 |                     <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.12em', color: 'var(--view-t)', marginBottom: 4, textTransform: 'uppercase' }}>{p.title}</div>
 217 |                     <div style={{ fontSize: 11, color: 'var(--view-m)', lineHeight: 1.5 }}>{p.desc}</div>
 218 |                   </div>
 219 |                 ))}
 220 |               </div>
 221 |             </div>
 222 | 
 223 |             <PhotoUpload userId={user.id} />
 224 |           </div>
 225 |         )}
 226 | 
 227 |         {/* Booking */}
 228 |         {section === 'book' && (
 229 |           <div>
 230 |             {step === 'select' && (
 231 |               <div>
 232 |                 <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 20, marginBottom: 20 }}>
 233 |                   <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>The Menu</div>
 234 |                   <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--view-b)', marginBottom: 20 }}>
 235 |                     {services.map((s, i) => (
 236 |                       <button key={s.id} onClick={() => setSvc(s.name)} style={{
 237 |                         '--i': i,
 238 |                         background: svc === s.name ? 'rgba(167,139,250,.1)' : 'var(--view-bg)',
 239 |                         border: 'none',
 240 |                         borderLeft: svc === s.name ? '2px solid var(--view-a)' : '2px solid transparent',
 241 |                         padding: '18px 16px',
 242 |                         textAlign: 'left', cursor: 'pointer',
 243 |                         transition: 'background .2s',
 244 |                       } as React.CSSProperties}>
 245 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', marginBottom: 6, textTransform: 'uppercase' }}>{s.tag}</div>
 246 |                         <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--view-t)', marginBottom: 4 }}>{s.name}</div>
 247 |                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
 248 |                           <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', fontWeight: 600 }}>E{s.price}</span>
 249 |                           <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)' }}>{s.duration} min</span>
 250 |                         </div>
 251 |                       </button>
 252 |                     ))}
 253 |                   </div>
 254 |                 </div>
 255 | 
 256 |                 <div className="pc">
 257 |                   <div className="pc-h"><span className="pc-t">Date & Time</span></div>
 258 |                   <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 259 |                     <div>
 260 |                       <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>DATE</label>
 261 |                       <input className="port-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}/>
 262 |                     </div>
 263 |                     <div>
 264 |                       <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>TIME</label>
 265 |                       <input className="port-input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
 266 |                     </div>
 267 |                   </div>
 268 |                 </div>
 269 | 
 270 |                 <button className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', opacity: svc && date && time ? 1 : .45 }}
 271 |                   onClick={bookNow} disabled={!svc || !date || !time}>
 272 |                   Check Availability →
 273 |                 </button>
 274 |               </div>
 275 |             )}
 276 | 
 277 |             {(step === 'validating' || step === 'done') && (
 278 |               <div>
 279 |                 <div className="pc">
 280 |                   <div className="pc-h"><span className="pc-t">Agent Validation</span></div>
 281 |                   <div className="pc-b">
 282 |                     <AgentPanel agents={agents} result={result} running={step === 'validating'} />
 283 |                   </div>
 284 |                 </div>
 285 |                 {step === 'done' && result?.approved && (
 286 |                   <div style={{ textAlign: 'center', marginTop: 8 }}>
 287 |                     <a href={`https://wa.me/26879333760?text=${encodeURIComponent(`Booking ${result.bookingId}: ${svc} on ${date} at ${time}`)}`}
 288 |                       target="_blank" rel="noopener noreferrer"
 289 |                       className="btn-primary" style={{ display: 'inline-block', marginBottom: 10 }}>
 290 |                       Confirm on WhatsApp →
 291 |                     </a>
 292 |                     <br/>
 293 |                     <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--port-m)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
 294 |                       Book another slot
 295 |                     </button>
 296 |                   </div>
 297 |                 )}
 298 |                 {step === 'done' && result && !result.approved && (
 299 |                   <div style={{ textAlign: 'center', marginTop: 8, padding: '16px', background: 'rgba(248,113,113,.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,.25)' }}>
 300 |                     <div style={{ color: '#f87171', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.15em', marginBottom: 8 }}>
 301 |                       SLOT UNAVAILABLE
 302 |                     </div>
 303 |                     <div style={{ fontSize: 13, color: 'var(--port-m)', marginBottom: 14, lineHeight: 1.6 }}>
 304 |                       {result.reason ?? 'This time slot could not be booked. Please choose a different time.'}
 305 |                     </div>
 306 |                     <button onClick={reset} className="btn-outline" style={{ fontSize: 10 }}>
 307 |                       Try Another Slot
 308 |                     </button>
 309 |                   </div>
 310 |                 )}
 311 |               </div>
 312 |             )}
 313 |           </div>
 314 |         )}
 315 | 
 316 |         {/* History */}
 317 |         {section === 'history' && (
 318 |           <div>
 319 |             <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>Past Visits</div>
 320 |             {histLoading && (
 321 |               <div style={{ textAlign: 'center', padding: 32, color: 'var(--view-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 322 |             )}
 323 |             {!histLoading && history.length === 0 && (
 324 |               <div style={{ textAlign: 'center', padding: 32, color: 'var(--view-m)', fontSize: 13 }}>No bookings yet — book your first cut above.</div>
 325 |             )}
 326 |             {!histLoading && history.map((b, i) => {
 327 |               const d = new Date(b.scheduled_at);
 328 |               const dateStr = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
 329 |               const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 330 |               return (
 331 |                 <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--view-b)' }}>
 332 |                   <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, color: 'var(--view-b)', lineHeight: 1, width: 32, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</div>
 333 |                   <div style={{ flex: 1 }}>
 334 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--view-t)' }}>{b.service}</div>
 335 |                     <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--view-m)', marginTop: 3, letterSpacing: '.06em' }}>{b.barber} · {dateStr} {timeStr}</div>
 336 |                   </div>
 337 |                   <div style={{ textAlign: 'right' }}>
 338 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: 'var(--brass)', fontWeight: 600 }}>E{(b.price_swl / 100).toFixed(0)}</div>
 339 |                     <span className={`bkst ${b.status}`}>{b.status}</span>
 340 |                   </div>
 341 |                 </div>
 342 |               );
 343 |             })}
 344 |           </div>
 345 |         )}
 346 | 
 347 |       </div>
 348 |     </div>
 349 |   );
 350 | }
 351 | 
 352 | // ── Editor Portal ────────────────────────────────
 353 | 
 354 | interface Post {
 355 |   id: string;
 356 |   author_id: string;
 357 |   author_name: string;
 358 |   body: string;
 359 |   tag: string;
 360 |   likes: number;
 361 |   created_at: string;
 362 | }
 363 | 
 364 | const POST_TAGS = ['CULTURE', 'TIPS', 'UPDATE', 'PROMO', 'EVENT'] as const;
 365 | 
 366 | interface EditorPortalProps {
 367 |   user: UserProfile;
 368 |   onClose: () => void;
 369 |   onSignOut: () => void;
 370 | }
 371 | 
 372 | type EditorSection = 'posts' | 'services' | 'media';
 373 | 
 374 | export function EditorPortal({ user, onClose, onSignOut }: EditorPortalProps) {
 375 |   const [section, setSection]         = useState<EditorSection>('posts');
 376 |   const [posts, setPosts]             = useState<Post[]>([]);
 377 |   const [postsLoading, setPostsLoading] = useState(false);
 378 |   const [postsError, setPostsError]   = useState(false);
 379 |   const [newPostOpen, setNewPostOpen] = useState(false);
 380 |   const [newPostText, setNewPostText] = useState('');
 381 |   const [newPostTag, setNewPostTag]   = useState<typeof POST_TAGS[number]>('CULTURE');
 382 |   const [posting, setPosting]         = useState(false);
 383 |   const [editId, setEditId]           = useState<string | null>(null);
 384 |   const [editText, setEditText]       = useState('');
 385 |   const [bgIdx] = useState(1);
 386 |   const [mediaQueue, setMediaQueue]   = useState<GalleryItem[]>([]);
 387 |   const [mediaLoading, setMediaLoading] = useState(false);
 388 | 
 389 |   useEffect(() => {
 390 |     document.documentElement.style.setProperty('--port-bg',   'var(--edit-bg)');
 391 |     document.documentElement.style.setProperty('--port-side', 'var(--edit-s)');
 392 |     document.documentElement.style.setProperty('--port-bord', 'var(--edit-b)');
 393 |     document.documentElement.style.setProperty('--port-a',    'var(--edit-a)');
 394 |     document.documentElement.style.setProperty('--port-a2',   'var(--edit-a2)');
 395 |     document.documentElement.style.setProperty('--port-t',    'var(--edit-t)');
 396 |     document.documentElement.style.setProperty('--port-m',    'var(--edit-m)');
 397 | 
 398 |     setPostsLoading(true);
 399 |     Promise.resolve(
 400 |       supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(30)
 401 |     ).then(({ data, error }) => {
 402 |       if (error) { logger.warn('EditorPortal', 'posts fetch failed', { error: error.message }); setPostsError(true); }
 403 |       else setPosts((data ?? []) as Post[]);
 404 |       setPostsLoading(false);
 405 |     }).catch(() => { setPostsError(true); setPostsLoading(false); });
 406 | 
 407 |     setMediaLoading(true);
 408 |     Promise.resolve(
 409 |       supabase
 410 |         .from('gallery_items')
 411 |         .select('id, url, caption, approved, created_at')
 412 |         .eq('approved', false)
 413 |         .order('created_at', { ascending: false })
 414 |         .limit(30)
 415 |     ).then(({ data, error }) => {
 416 |         if (error) logger.warn('EditorPortal', 'media queue fetch failed', { error: error.message });
 417 |         else setMediaQueue((data ?? []) as GalleryItem[]);
 418 |         setMediaLoading(false);
 419 |       })
 420 |       .catch((e: unknown) => { logger.warn('EditorPortal', 'media queue error', { error: String(e) }); setMediaLoading(false); });
 421 | 
 422 |     return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
 423 |       .forEach(v => document.documentElement.style.removeProperty(v));
 424 |   }, []);
 425 | 
 426 |   const submitPost = async () => {
 427 |     if (!newPostText.trim()) return;
 428 |     setPosting(true);
 429 |     const { data, error } = await supabase.from('announcements').insert({
 430 |       author_id: user.id, author_name: user.name ?? 'Editor',
 431 |       body: newPostText.trim(), tag: newPostTag,
 432 |     }).select().single();
 433 |     if (!error && data) {
 434 |       setPosts(prev => [data as Post, ...prev]);
 435 |       setNewPostText(''); setNewPostOpen(false);
 436 |     } else logger.error('EditorPortal', 'post insert failed', { error: error?.message });
 437 |     setPosting(false);
 438 |   };
 439 | 
 440 |   const saveEdit = async (id: string) => {
 441 |     if (!editText.trim()) return;
 442 |     const { error } = await supabase.from('announcements').update({ body: editText.trim() }).eq('id', id);
 443 |     if (!error) { setPosts(prev => prev.map(p => p.id === id ? { ...p, body: editText.trim() } : p)); setEditId(null); }
 444 |     else logger.error('EditorPortal', 'post update failed', { error: error.message });
 445 |   };
 446 | 
 447 |   const deletePost = async (id: string) => {
 448 |     const { error } = await supabase.from('announcements').delete().eq('id', id);
 449 |     if (!error) setPosts(prev => prev.filter(p => p.id !== id));
 450 |     else logger.error('EditorPortal', 'post delete failed', { error: error.message });
 451 |   };
 452 | 
 453 |   return (
 454 |     <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--edit-bg)' }}>
 455 | 
 456 |       {/* Hero */}
 457 |       <div style={{ position: 'relative', minHeight: '38vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--edit-b)' }}>
 458 |         <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .15 }}/>
 459 |         <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
 460 |         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--edit-bg) 0%, transparent 55%)', pointerEvents: 'none' }}/>
 461 |         <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
 462 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Editor Portal · Studio P</div>
 463 |           <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 700, lineHeight: .9, color: 'var(--edit-t)' }}>
 464 |             Studio<br/>
 465 |             <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Desk.</em>
 466 |           </h1>
 467 |           <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--edit-m)', marginTop: 14, letterSpacing: '.06em' }}>
 468 |             {user.name} · Content Creator
 469 |           </p>
 470 |           <div style={{ position: 'absolute', bottom: 36, right: 28, display: 'flex', gap: 8 }}>
 471 |             <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--edit-b)', color: 'var(--edit-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 472 |               ← Home
 473 |             </button>
 474 |             <button onClick={onSignOut} style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 475 |               Sign Out
 476 |             </button>
 477 |           </div>
 478 |         </div>
 479 |       </div>
 480 | 
 481 |       {/* Content */}
 482 |       <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
 483 | 
 484 |         {/* Section nav */}
 485 |         <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--edit-s)', borderRadius: 8, padding: 3 }}>
 486 |           {([['posts', '✏️ Posts'], ['services', '💈 Services'], ['media', '🖼 Media']] as const).map(([id, label]) => (
 487 |             <button key={id} onClick={() => setSection(id)} style={{
 488 |               flex: 1, background: section === id ? 'var(--edit-b)' : 'transparent',
 489 |               border: 'none', color: section === id ? 'var(--edit-a)' : 'var(--edit-m)',
 490 |               borderRadius: 6, padding: '9px 12px', fontSize: 10,
 491 |               fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 492 |               cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
 493 |             }}>{label}</button>
 494 |           ))}
 495 |         </div>
 496 | 
 497 |         {/* Posts */}
 498 |         {section === 'posts' && (
 499 |           <div>
 500 |             {/* New post form */}
 501 |             <div className="pc">
 502 |               <div className="pc-h">
 503 |                 <span className="pc-t">New Post</span>
 504 |                 <button className="pb" onClick={() => setNewPostOpen(v => !v)} style={{ fontSize: 9 }}>
 505 |                   {newPostOpen ? '✕ Cancel' : '+ Write'}
 506 |                 </button>
 507 |               </div>
 508 |               {newPostOpen && (
 509 |                 <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 510 |                   <textarea
 511 |                     className="port-input"
 512 |                     placeholder="What's happening at the barbershop…"
 513 |                     value={newPostText}
 514 |                     onChange={e => setNewPostText(e.target.value)}
 515 |                     maxLength={1000}
 516 |                     rows={4}
 517 |                     style={{ resize: 'vertical' }}
 518 |                   />
 519 |                   <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 520 |                     {POST_TAGS.map(t => (
 521 |                       <button key={t} onClick={() => setNewPostTag(t)} style={{
 522 |                         background: newPostTag === t ? 'var(--edit-a)' : 'transparent',
 523 |                         color: newPostTag === t ? 'var(--edit-bg)' : 'var(--edit-m)',
 524 |                         border: `1px solid ${newPostTag === t ? 'var(--edit-a)' : 'var(--edit-b)'}`,
 525 |                         borderRadius: 4, padding: '4px 10px',
 526 |                         fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', fontSize: 9,
 527 |                         cursor: 'pointer', minHeight: 'unset',
 528 |                       }}>{t}</button>
 529 |                     ))}
 530 |                   </div>
 531 |                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 532 |                     <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-m)' }}>{newPostText.length}/1000</span>
 533 |                     <button className="pb" onClick={submitPost} disabled={posting || !newPostText.trim()} style={{ fontSize: 9 }}>
 534 |                       {posting ? 'Publishing…' : 'Publish Post'}
 535 |                     </button>
 536 |                   </div>
 537 |                 </div>
 538 |               )}
 539 |             </div>
 540 | 
 541 |             {/* Posts list */}
 542 |             <div className="pc">
 543 |               <div className="pc-h">
 544 |                 <span className="pc-t">Published Posts</span>
 545 |                 <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-m)' }}>{posts.length}</span>
 546 |               </div>
 547 |               <div style={{ padding: '4px 18px' }}>
 548 |                 {postsLoading && <div style={{ padding: '16px 0', color: 'var(--edit-m)', fontFamily: 'DM Mono, monospace', fontSize: 10, textAlign: 'center' }}>Loading…</div>}
 549 |                 {postsError && !postsLoading && (
 550 |                   <div style={{ padding: '16px 0', color: 'var(--stone)', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
 551 |                     Posts table not found. Apply migration 011 in Supabase SQL editor to enable this feature.
 552 |                   </div>
 553 |                 )}
 554 |                 {!postsLoading && !postsError && posts.length === 0 && (
 555 |                   <div style={{ padding: '16px 0', color: 'var(--edit-m)', fontSize: 12, textAlign: 'center' }}>No posts yet. Write the first one above.</div>
 556 |                 )}
 557 |                 {!postsLoading && posts.map(p => (
 558 |                   <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--edit-b)' }}>
 559 |                     {editId === p.id ? (
 560 |                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 561 |                         <textarea
 562 |                           className="port-input"
 563 |                           value={editText}
 564 |                           onChange={e => setEditText(e.target.value)}
 565 |                           maxLength={1000}
 566 |                           rows={3}
 567 |                           style={{ resize: 'vertical' }}
 568 |                         />
 569 |                         <div style={{ display: 'flex', gap: 6 }}>
 570 |                           <button className="pb" onClick={() => saveEdit(p.id)} style={{ fontSize: 9 }}>Save</button>
 571 |                           <button className="pbg" onClick={() => setEditId(null)} style={{ fontSize: 9 }}>Cancel</button>
 572 |                         </div>
 573 |                       </div>
 574 |                     ) : (
 575 |                       <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
 576 |                         <div className="bkav" style={{ background: 'var(--edit-b)', flexShrink: 0 }}>{(p.author_name ?? user.name)?.[0] ?? '?'}</div>
 577 |                         <div style={{ flex: 1, minWidth: 0 }}>
 578 |                           <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
 579 |                             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--brass)', letterSpacing: '.1em', border: '1px solid var(--brass-d)', padding: '2px 6px', borderRadius: 3 }}>{p.tag}</span>
 580 |                             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--edit-m)' }}>{new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
 581 |                           </div>
 582 |                           <div className="bkn" style={{ lineHeight: 1.5, fontSize: 13 }}>{p.body}</div>
 583 |                           <div className="bkm" style={{ marginTop: 6 }}>♥ {p.likes} · {p.author_name}</div>
 584 |                         </div>
 585 |                         {p.author_id === user.id && (
 586 |                           <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
 587 |                             <button className="pbg" onClick={() => { setEditId(p.id); setEditText(p.body); }} style={{ minHeight: 'unset', padding: '4px 8px', fontSize: 8 }}>Edit</button>
 588 |                             <button onClick={() => deletePost(p.id)} style={{ minHeight: 'unset', padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171', borderRadius: 4, cursor: 'pointer' }}>✕</button>
 589 |                           </div>
 590 |                         )}
 591 |                       </div>
 592 |                     )}
 593 |                   </div>
 594 |                 ))}
 595 |               </div>
 596 |             </div>
 597 |           </div>
 598 |         )}
 599 | 
 600 |         {/* Services CRUD */}
 601 |         {section === 'services' && (
 602 |           <div className="pc">
 603 |             <div className="pc-h"><span className="pc-t">Pricelist Management</span></div>
 604 |             <div className="pc-b">
 605 |               <ServicesManager />
 606 |             </div>
 607 |           </div>
 608 |         )}
 609 | 
 610 |         {/* Media queue */}
 611 |         {section === 'media' && (
 612 |           <div>
 613 |             <div style={{ borderTop: '1px solid var(--edit-b)', paddingTop: 24 }}>
 614 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>
 615 |                 Pending Approval — {mediaQueue.length} item{mediaQueue.length !== 1 ? 's' : ''}
 616 |               </div>
 617 |               {mediaLoading && (
 618 |                 <div style={{ textAlign: 'center', padding: 32, color: 'var(--edit-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 619 |               )}
 620 |               {!mediaLoading && mediaQueue.length === 0 && (
 621 |                 <div style={{ textAlign: 'center', padding: 32, color: 'var(--edit-m)', fontSize: 13 }}>No items pending review.</div>
 622 |               )}
 623 |               {!mediaLoading && mediaQueue.length > 0 && (
 624 |                 <div className="gport">
 625 |                   {mediaQueue.map(item => (
 626 |                     <div key={item.id} className="gpimg">
 627 |                       {item.url.includes('/studio-media/') ? (
 628 |                         <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 629 |                       ) : (
 630 |                         <img src={item.url} alt={item.caption ?? 'pending media'} loading="lazy"/>
 631 |                       )}
 632 |                       <div className="gpov">
 633 |                         {item.caption && (
 634 |                           <div style={{ fontSize: 9, color: 'rgba(255,255,255,.8)', marginBottom: 4, fontFamily: 'DM Mono, monospace', letterSpacing: '.06em', padding: '0 4px' }}>
 635 |                             {item.caption}
 636 |                           </div>
 637 |                         )}
 638 |                         <div style={{ display: 'flex', gap: 5 }}>
 639 |                           <button className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }} onClick={async () => {
 640 |                             const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
 641 |                             if (!error) setMediaQueue(q => q.filter(x => x.id !== item.id));
 642 |                             else logger.error('EditorPortal', 'approve failed', { error: error.message });
 643 |                           }} aria-label="Approve media item">✓</button>
 644 |                           <button className="pb" style={{ padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.3)', color: '#f87171', minHeight: 'unset' }} onClick={async () => {
 645 |                             const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
 646 |                             if (!error) setMediaQueue(q => q.filter(x => x.id !== item.id));
 647 |                             else logger.error('EditorPortal', 'reject failed', { error: error.message });
 648 |                           }} aria-label="Reject media item">✗</button>
 649 |                         </div>
 650 |                       </div>
 651 |                     </div>
 652 |                   ))}
 653 |                 </div>
 654 |               )}
 655 |             </div>
 656 |           </div>
 657 |         )}
 658 | 
 659 |       </div>
 660 |     </div>
 661 |   );
 662 | }
 663 | 