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
  33 | const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\\' xmlns=\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width=\'100%25\\' height=\'100%25\\' filter=\'url(%23n)\' opacity=\'0.06\'%3E%3C/rect%3E%3C/svg%3E")`;
  34 | 
  35 | const HERO_IMGS = [
  36 |   'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=70',
  37 |   'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=70',
  38 |   'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=70',
  39 | ];
  40 | 
  41 | // ── Viewer Portal ────────────────────────────────
  42 | 
  43 | interface ViewerPortalProps {
  44 |   user: UserProfile;
  45 |   onClose: () => void;
  46 |   onSignOut: () => void;
  47 | }
  48 | 
  49 | type BookStep = 'select' | 'validating' | 'done';
  50 | 
  51 | export function ViewerPortal({ user, onClose, onSignOut }: ViewerPortalProps) {
  52 |   const [section, setSection]   = useState<'home' | 'book' | 'history'>('home');
  53 |   const [svc, setSvc]           = useState('');
  54 |   const [date, setDate]         = useState('');
  55 |   const [time, setTime]         = useState('');
  56 |   const [agents, setAgents]     = useState<Agent[]>([]);
  57 |   const [result, setResult]     = useState<OrchestrationResult | null>(null);
  58 |   const [step, setStep]         = useState<BookStep>('select');
  59 |   const [bgIdx]                 = useState(() => Math.floor(Math.random() * HERO_IMGS.length));
  60 |   const [history, setHistory]   = useState<BookingRecord[]>([]);
  61 |   const [histLoading, setHistLoading] = useState(false);
  62 |   const { services }            = useServices();
  63 | 
  64 |   useEffect(() => {
  65 |     document.documentElement.style.setProperty('--port-bg',   'var(--view-bg)');
  66 |     document.documentElement.style.setProperty('--port-side', 'var(--view-s)');
  67 |     document.documentElement.style.setProperty('--port-bord', 'var(--view-b)');
  68 |     document.documentElement.style.setProperty('--port-a',    'var(--view-a)');
  69 |     document.documentElement.style.setProperty('--port-a2',   'var(--view-a2)');
  70 |     document.documentElement.style.setProperty('--port-t',    'var(--view-t)');
  71 |     document.documentElement.style.setProperty('--port-m',    'var(--view-m)');
  72 | 
  73 |     setHistLoading(true);
  74 |     Promise.resolve(
  75 |       supabase
  76 |         .from('bookings')
  77 |         .select('id, service, barber, scheduled_at, price_swl, status')
  78 |         .eq('client_id', user.id)
  79 |         .order('scheduled_at', { ascending: false })
  80 |         .limit(20)
  81 |     ).then(({ data, error }) => {
  82 |         if (error) logger.warn('ViewerPortal', 'history fetch failed', { error: error.message });
  83 |         else setHistory((data ?? []) as BookingRecord[]);
  84 |         setHistLoading(false);
  85 |       })
  86 |       .catch((e: unknown) => { logger.warn('ViewerPortal', 'history fetch error', { error: String(e) }); setHistLoading(false); });
  87 | 
  88 |     return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
  89 |       .forEach(v => document.documentElement.style.removeProperty(v));
  90 |   }, [user.id]);
  91 | 
  92 |   const bookNow = async () => {
  93 |     if (!svc || !date || !time) return;
  94 |     setStep('validating');
  95 |     setAgents([]);
  96 |     try {
  97 |       const res = await bookingService.validate(
  98 |         { service: svc, date, time, email: user.email, clientId: user.id },
  99 |         ({ agents }) => setAgents(agents ?? [])
 100 |       );
 101 |       setResult(res);
 102 |     } catch (e) {
 103 |       logger.error('ViewerPortal', 'Booking validation failed', { error: String(e) });
 104 |       setResult({ bookingId: '', approved: false, confidence: 0, parallelMs: 0, rounds: 1, agents: [], issuesFixed: 0, reason: 'Unexpected error — please try again.' });
 105 |     } finally {
 106 |       setStep('done');
 107 |       monitor.recordMetric('booking.flow.complete', 1);
 108 |     }
 109 |   };
 110 | 
 111 |   const reset = () => { setSvc(''); setDate(''); setTime(''); setAgents([]); setResult(null); setStep('select'); };
 112 | 
 113 |   const tierLabel = user.memberTier
 114 |     ? user.memberTier.charAt(0).toUpperCase() + user.memberTier.slice(1)
 115 |     : 'Bronze';
 116 |   const firstName = user.name?.split(' ')[0] || 'Member';
 117 | 
 118 |   return (
 119 |     <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--view-bg)' }}>
 120 | 
 121 |       {/* Hero */}
 122 |       <div style={{ position: 'relative', minHeight: '40vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--view-b)' }}>
 123 |         <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .18, transition: 'opacity .5s' }}/>
 124 |         <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
 125 |         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--view-bg) 0%, transparent 60%)', pointerEvents: 'none' }}/>
 126 |         <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
 127 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Member Portal · Studio P</div>
 128 |           <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem,8vw,6rem)', fontWeight: 700, lineHeight: .88, color: 'var(--view-t)' }}>
 129 |             {firstName}'s<br/>
 130 |             <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Space.</em>
 131 |           </h1>
 132 |           <div style={{ display: 'flex', gap: 28, marginTop: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
 133 |             {[{ v: String(user.visitCount || 0), l: 'Visits' }, { v: tierLabel, l: 'Tier' }].map(s => (
 134 |               <div key={s.l}>
 135 |                 <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--view-a)', lineHeight: 1 }}>{s.v}</div>
 136 |                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>{s.l}</div>
 137 |               </div>
 138 |             ))}
 139 |             <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
 140 |               <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--view-b)', color: 'var(--view-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 141 |                 ← Home
 142 |               </button>
 143 |               <button onClick={onSignOut} style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 144 |                 Sign Out
 145 |               </button>
 146 |             </div>
 147 |           </div>
 148 |         </div>
 149 |       </div>
 150 | 
 151 |       {/* Content */}
 152 |       <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
 153 | 
 154 |         {/* Nav */}
 155 |         <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--view-s)', borderRadius: 8, padding: 3 }}>
 156 |           {[['home', '✨ Dashboard'], ['book', '📅 Book'], ['history', '📋 History']].map(([id, label]) => (
 157 |             <button key={id} onClick={() => setSection(id as typeof section)} style={{
 158 |               flex: 1, background: section === id ? 'var(--view-b)' : 'transparent',
 159 |               border: 'none', color: section === id ? 'var(--view-a)' : 'var(--view-m)',
 160 |               borderRadius: 6, padding: '9px 12px', fontSize: 10,
 161 |               fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 162 |               cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
 163 |             }}>{label}</button>
 164 |           ))}
 165 |         </div>
 166 | 
 167 |         {/* Dashboard */}
 168 |         {section === 'home' && (
 169 |           <div>
 170 |             <div className="pc">
 171 |               <div className="pc-h">
 172 |                 <span className="pc-t">Upcoming Appointments</span>
 173 |                 <button className="pbg" onClick={() => setSection('book')} style={{ fontSize: 9 }}>+ Book</button>
 174 |               </div>
 175 |               <div style={{ padding: '4px 18px' }}>
 176 |                 {(() => {
 177 |                   const upcoming = history.filter(b => new Date(b.scheduled_at) > new Date() && b.status !== 'cancelled').slice(0, 3);
 178 |                   if (histLoading) return <div style={{ padding: '16px 0', color: 'var(--view-m)', fontFamily: 'DM Mono, monospace', fontSize: 10, textAlign: 'center' }}>Loading…</div>;
 179 |                   if (upcoming.length === 0) return (
 180 |                     <div style={{ padding: '16px 0', color: 'var(--view-m)', fontSize: 12, textAlign: 'center' }}>
 181 |                       No upcoming appointments.{' '}
 182 |                       <button onClick={() => setSection('book')} style={{ background: 'none', border: 'none', color: 'var(--view-a)', cursor: 'pointer', fontSize: 12, minHeight: 'unset', padding: 0, fontFamily: 'inherit' }}>Book now →</button>
 183 |                     </div>
 184 |                   );
 185 |                   return upcoming.map(b => {
 186 |                     const d = new Date(b.scheduled_at);
 187 |                     const dateStr = d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
 188 |                     const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 189 |                     return (
 190 |                       <div key={b.id} className="bki">
 191 |                         <div className="bkav">{b.service?.[0] ?? '✦'}</div>
 192 |                         <div style={{ flex: 1 }}>
 193 |                           <div className="bkn">{b.service}</div>
 194 |                           <div className="bkm">{b.barber} · {dateStr} {timeStr}</div>
 195 |                         </div>
 196 |                         <span className={`bkst ${b.status}`}>{b.status}</span>
 197 |                       </div>
 198 |                     );
 199 |                   });
 200 |                 })()}
 201 |               </div>
 202 |             </div>
 203 | 
 204 |             <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 24, marginBottom: 20 }}>
 205 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 8, textTransform: 'uppercase' }}>Member Perks</div>
 206 |               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
 207 |                 {[
 208 |                   { icon: '✦', title: 'Loyalty Discount', desc: '10% off every 5th visit' },
 209 |                   { icon: '⚡', title: 'Priority Booking', desc: 'First access to new slots' },
 210 |                   { icon: '✧', title: 'Early Access', desc: 'New services before anyone else' },
 211 |                 ].map(p => (
 212 |                   <div key={p.title} style={{ background: 'var(--view-s)', border: '1px solid var(--view-b)', borderRadius: 8, padding: '16px 14px', transition: 'border-color .2s' }}
 213 |                     onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--view-a)')}
 214 |                     onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--view-b)')}
 215 |                   >
 216 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--view-a)', marginBottom: 6 }}>{p.icon}</div>
 217 |                     <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.12em', color: 'var(--view-t)', marginBottom: 4, textTransform: 'uppercase' }}>{p.title}</div>
 218 |                     <div style={{ fontSize: 11, color: 'var(--view-m)', lineHeight: 1.5 }}>{p.desc}</div>
 219 |                   </div>
 220 |                 ))}
 221 |               </div>
 222 |             </div>
 223 | 
 224 |             <PhotoUpload userId={user.id} />
 225 |           </div>
 226 |         )}
 227 | 
 228 |         {/* Booking */}
 229 |         {section === 'book' && (
 230 |           <div>
 231 |             {step === 'select' && (
 232 |               <div>
 233 |                 <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 20, marginBottom: 20 }}>
 234 |                   <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>The Menu</div>
 235 |                   <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--view-b)', marginBottom: 20 }}>
 236 |                     {services.map((s, i) => (
 237 |                       <button key={s.id} onClick={() => setSvc(s.name)} style={{
 238 |                         '--i': i,
 239 |                         background: svc === s.name ? 'rgba(167,139,250,.1)' : 'var(--view-bg)',
 240 |                         border: 'none',
 241 |                         borderLeft: svc === s.name ? '2px solid var(--view-a)' : '2px solid transparent',
 242 |                         padding: '18px 16px',
 243 |                         textAlign: 'left', cursor: 'pointer',
 244 |                         transition: 'background .2s',
 245 |                       } as React.CSSProperties}>
 246 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', marginBottom: 6, textTransform: 'uppercase' }}>{s.tag}</div>
 247 |                         <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--view-t)', marginBottom: 4 }}>{s.name}</div>
 248 |                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
 249 |                           <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', fontWeight: 600 }}>E{s.price}</span>
 250 |                           <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)' }}>{s.duration} min</span>
 251 |                         </div>
 252 |                       </button>
 253 |                     ))}
 254 |                   </div>
 255 |                 </div>
 256 | 
 257 |                 <div className="pc">
 258 |                   <div className="pc-h"><span className="pc-t">Date & Time</span></div>
 259 |                   <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 260 |                     <div>
 261 |                       <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>DATE</label>
 262 |                       <input className="port-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}/>
 263 |                     </div>
 264 |                     <div>
 265 |                       <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>TIME</label>
 266 |                       <input className="port-input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
 267 |                     </div>
 268 |                   </div>
 269 |                 </div>
 270 | 
 271 |                 <button className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', opacity: svc && date && time ? 1 : .45 }}
 272 |                   onClick={bookNow} disabled={!svc || !date || !time}>
 273 |                   Check Availability →
 274 |                 </button>
 275 |               </div>
 276 |             )}
 277 | 
 278 |             {(step === 'validating' || step === 'done') && (
 279 |               <div>
 280 |                 <div className="pc">
 281 |                   <div className="pc-h"><span className="pc-t">Agent Validation</span></div>
 282 |                   <div className="pc-b">
 283 |                     <AgentPanel agents={agents} result={result} running={step === 'validating'} />
 284 |                   </div>
 285 |                 </div>
 286 |                 {step === 'done' && result?.approved && (
 287 |                   <div style={{ textAlign: 'center', marginTop: 8 }}>
 288 |                     <a href={`https://wa.me/26879333760?text=${encodeURIComponent(`Booking ${result.bookingId}: ${svc} on ${date} at ${time}`)}`}
 289 |                       target="_blank" rel="noopener noreferrer"
 290 |                       className="btn-primary" style={{ display: 'inline-block', marginBottom: 10 }}>
 291 |                       Confirm on WhatsApp →
 292 |                     </a>
 293 |                     <br/>
 294 |                     <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--port-m)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
 295 |                       Book another slot
 296 |                     </button>
 297 |                   </div>
 298 |                 )}
 299 |                 {step === 'done' && result && !result.approved && (
 300 |                   <div style={{ textAlign: 'center', marginTop: 8, padding: '16px', background: 'rgba(248,113,113,.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,.25)' }}>
 301 |                     <div style={{ color: '#f87171', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.15em', marginBottom: 8 }}>
 302 |                       SLOT UNAVAILABLE
 303 |                     </div>
 304 |                     <div style={{ fontSize: 13, color: 'var(--port-m)', marginBottom: 14, lineHeight: 1.6 }}>
 305 |                       {result.reason ?? 'This time slot could not be booked. Please choose a different time.'}
 306 |                     </div>
 307 |                     <button onClick={reset} className="btn-outline" style={{ fontSize: 10 }}>
 308 |                       Try Another Slot
 309 |                     </button>
 310 |                   </div>
 311 |                 )}
 312 |               </div>
 313 |             )}
 314 |           </div>
 315 |         )}
 316 | 
 317 |         {/* History */}
 318 |         {section === 'history' && (
 319 |           <div>
 320 |             <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>Past Visits</div>
 321 |             {histLoading && (
 322 |               <div style={{ textAlign: 'center', padding: 32, color: 'var(--view-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 323 |             )}
 324 |             {!histLoading && history.length === 0 && (
 325 |               <div style={{ textAlign: 'center', padding: 32, color: 'var(--view-m)', fontSize: 13 }}>No bookings yet — book your first cut above.</div>
 326 |             )}
 327 |             {!histLoading && history.map((b, i) => {
 328 |               const d = new Date(b.scheduled_at);
 329 |               const dateStr = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
 330 |               const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 331 |               return (
 332 |                 <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--view-b)' }}>
 333 |                   <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, color: 'var(--view-b)', lineHeight: 1, width: 32, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</div>
 334 |                   <div style={{ flex: 1 }}>
 335 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--view-t)' }}>{b.service}</div>
 336 |                     <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--view-m)', marginTop: 3, letterSpacing: '.06em' }}>{b.barber} · {dateStr} {timeStr}</div>
 337 |                   </div>
 338 |                   <div style={{ textAlign: 'right' }}>
 339 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: 'var(--brass)', fontWeight: 600 }}>E{(b.price_swl / 100).toFixed(0)}</div>
 340 |                     <span className={`bkst ${b.status}`}>{b.status}</span>
 341 |                   </div>
 342 |                 </div>
 343 |               );
 344 |             })}
 345 |           </div>
 346 |         )}
 347 | 
 348 |       </div>
 349 |     </div>
 350 |   );
 351 | }
 352 | 
 353 | // ── Editor Portal ────────────────────────────────
 354 | 
 355 | interface Post {
 356 |   id: string;
 357 |   author_id: string;
 358 |   author_name: string;
 359 |   body: string;
 360 |   tag: string;
 361 |   likes: number;
 362 |   created_at: string;
 363 | }
 364 | 
 365 | const POST_TAGS = ['CULTURE', 'TIPS', 'UPDATE', 'PROMO', 'EVENT'] as const;
 366 | 
 367 | interface EditorPortalProps {
 368 |   user: UserProfile;
 369 |   onClose: () => void;
 370 |   onSignOut: () => void;
 371 | }
 372 | 
 373 | type EditorSection = 'posts' | 'services' | 'media';
 374 | 
 375 | export function EditorPortal({ user, onClose, onSignOut }: EditorPortalProps) {
 376 |   const [section, setSection]         = useState<EditorSection>('posts');
 377 |   const [posts, setPosts]             = useState<Post[]>([]);
 378 |   const [postsLoading, setPostsLoading] = useState(false);
 379 |   const [postsError, setPostsError]   = useState(false);
 380 |   const [newPostOpen, setNewPostOpen] = useState(false);
 381 |   const [newPostText, setNewPostText] = useState('');
 382 |   const [newPostTag, setNewPostTag]   = useState<typeof POST_TAGS[number]>('CULTURE');
 383 |   const [posting, setPosting]         = useState(false);
 384 |   const [editId, setEditId]           = useState<string | null>(null);
 385 |   const [editText, setEditText]       = useState('');
 386 |   const [bgIdx] = useState(1);
 387 |   const [mediaQueue, setMediaQueue]   = useState<GalleryItem[]>([]);
 388 |   const [mediaLoading, setMediaLoading] = useState(false);
 389 | 
 390 |   useEffect(() => {
 391 |     document.documentElement.style.setProperty('--port-bg',   'var(--edit-bg)');
 392 |     document.documentElement.style.setProperty('--port-side', 'var(--edit-s)');
 393 |     document.documentElement.style.setProperty('--port-bord', 'var(--edit-b)');
 394 |     document.documentElement.style.setProperty('--port-a',    'var(--edit-a)');
 395 |     document.documentElement.style.setProperty('--port-a2',   'var(--edit-a2)');
 396 |     document.documentElement.style.setProperty('--port-t',    'var(--edit-t)');
 397 |     document.documentElement.style.setProperty('--port-m',    'var(--edit-m)');
 398 | 
 399 |     setPostsLoading(true);
 400 |     Promise.resolve(
 401 |       supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(30)
 402 |     ).then(({ data, error }) => {
 403 |       if (error) { logger.warn('EditorPortal', 'posts fetch failed', { error: error.message }); setPostsError(true); }
 404 |       else setPosts((data ?? []) as Post[]);
 405 |       setPostsLoading(false);
 406 |     }).catch(() => { setPostsError(true); setPostsLoading(false); });
 407 | 
 408 |     setMediaLoading(true);
 409 |     Promise.resolve(
 410 |       supabase
 411 |         .from('gallery_items')
 412 |         .select('id, url, caption, approved, created_at')
 413 |         .eq('approved', false)
 414 |         .order('created_at', { ascending: false })
 415 |         .limit(30)
 416 |     ).then(({ data, error }) => {
 417 |         if (error) logger.warn('EditorPortal', 'media queue fetch failed', { error: error.message });
 418 |         else setMediaQueue((data ?? []) as GalleryItem[]);
 419 |         setMediaLoading(false);
 420 |       })
 421 |       .catch((e: unknown) => { logger.warn('EditorPortal', 'media queue error', { error: String(e) }); setMediaLoading(false); });
 422 | 
 423 |     return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
 424 |       .forEach(v => document.documentElement.style.removeProperty(v));
 425 |   }, []);
 426 | 
 427 |   const submitPost = async () => {
 428 |     if (!newPostText.trim()) return;
 429 |     setPosting(true);
 430 |     const { data, error } = await supabase.from('announcements').insert({
 431 |       author_id: user.id, author_name: user.name ?? 'Editor',
 432 |       body: newPostText.trim(), tag: newPostTag,
 433 |     }).select().single();
 434 |     if (!error && data) {
 435 |       setPosts(prev => [data as Post, ...prev]);
 436 |       setNewPostText(''); setNewPostOpen(false);
 437 |     } else logger.error('EditorPortal', 'post insert failed', { error: error?.message });
 438 |     setPosting(false);
 439 |   };
 440 | 
 441 |   const saveEdit = async (id: string) => {
 442 |     if (!editText.trim()) return;
 443 |     const { error } = await supabase.from('announcements').update({ body: editText.trim() }).eq('id', id);
 444 |     if (!error) { setPosts(prev => prev.map(p => p.id === id ? { ...p, body: editText.trim() } : p)); setEditId(null); }
 445 |     else logger.error('EditorPortal', 'post update failed', { error: error.message });
 446 |   };
 447 | 
 448 |   const deletePost = async (id: string) => {
 449 |     const { error } = await supabase.from('announcements').delete().eq('id', id);
 450 |     if (!error) setPosts(prev => prev.filter(p => p.id !== id));
 451 |     else logger.error('EditorPortal', 'post delete failed', { error: error.message });
 452 |   };
 453 | 
 454 |   return (
 455 |     <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--edit-bg)' }}>
 456 | 
 457 |       {/* Hero */}
 458 |       <div style={{ position: 'relative', minHeight: '38vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--edit-b)' }}>
 459 |         <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .15 }}/>
 460 |         <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
 461 |         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--edit-bg) 0%, transparent 55%)', pointerEvents: 'none' }}/>
 462 |         <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
 463 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Editor Portal · Studio P</div>
 464 |           <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 700, lineHeight: .9, color: 'var(--edit-t)' }}>
 465 |             Studio<br/>
 466 |             <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Desk.</em>
 467 |           </h1>
 468 |           <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--edit-m)', marginTop: 14, letterSpacing: '.06em' }}>
 469 |             {user.name} · Content Creator
 470 |           </p>
 471 |           <div style={{ position: 'absolute', bottom: 36, right: 28, display: 'flex', gap: 8 }}>
 472 |             <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--edit-b)', color: 'var(--edit-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 473 |               ← Home
 474 |             </button>
 475 |             <button onClick={onSignOut} style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 476 |               Sign Out
 477 |             </button>
 478 |           </div>
 479 |         </div>
 480 |       </div>
 481 | 
 482 |       {/* Content */}
 483 |       <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
 484 | 
 485 |         {/* Section nav */}
 486 |         <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--edit-s)', borderRadius: 8, padding: 3 }}>
 487 |           {([['posts', '✏️ Posts'], ['services', '💈 Services'], ['media', '🖼 Media']] as const).map(([id, label]) => (
 488 |             <button key={id} onClick={() => setSection(id)} style={{
 489 |               flex: 1, background: section === id ? 'var(--edit-b)' : 'transparent',
 490 |               border: 'none', color: section === id ? 'var(--edit-a)' : 'var(--edit-m)',
 491 |               borderRadius: 6, padding: '9px 12px', fontSize: 10,
 492 |               fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 493 |               cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
 494 |             }}>{label}</button>
 495 |           ))}
 496 |         </div>
 497 | 
 498 |         {/* Posts */}
 499 |         {section === 'posts' && (
 500 |           <div>
 501 |             {/* New post form */}
 502 |             <div className="pc">
 503 |               <div className="pc-h">
 504 |                 <span className="pc-t">New Post</span>
 505 |                 <button className="pb" onClick={() => setNewPostOpen(v => !v)} style={{ fontSize: 9 }}>
 506 |                   {newPostOpen ? '✕ Cancel' : '+ Write'}
 507 |                 </button>
 508 |               </div>
 509 |               {newPostOpen && (
 510 |                 <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 511 |                   <textarea
 512 |                     className="port-input"
 513 |                     placeholder="What's happening at the barbershop…"
 514 |                     value={newPostText}
 515 |                     onChange={e => setNewPostText(e.target.value)}
 516 |                     maxLength={1000}
 517 |                     rows={4}
 518 |                     style={{ resize: 'vertical' }}
 519 |                   />
 520 |                   <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 521 |                     {POST_TAGS.map(t => (
 522 |                       <button key={t} onClick={() => setNewPostTag(t)} style={{
 523 |                         background: newPostTag === t ? 'var(--edit-a)' : 'transparent',
 524 |                         color: newPostTag === t ? 'var(--edit-bg)' : 'var(--edit-m)',
 525 |                         border: `1px solid ${newPostTag === t ? 'var(--edit-a)' : 'var(--edit-b)'}`,
 526 |                         borderRadius: 4, padding: '4px 10px', fontSize: 9,
 527 |                         fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 528 |                         cursor: 'pointer', minHeight: 'unset',
 529 |                       }}>{t}</button>
 530 |                     ))}
 531 |                   </div>
 532 |                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 533 |                     <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-m)' }}>{newPostText.length}/1000</span>
 534 |                     <button className="pb" onClick={submitPost} disabled={posting || !newPostText.trim()} style={{ fontSize: 9 }}>
 535 |                       {posting ? 'Publishing…' : 'Publish Post'}
 536 |                     </button>
 537 |                   </div>
 538 |                 </div>
 539 |               )}
 540 |             </div>
 541 | 
 542 |             {/* Posts list */}
 543 |             <div className="pc">
 544 |               <div className="pc-h">
 545 |                 <span className="pc-t">Published Posts</span>
 546 |                 <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-m)' }}>{posts.length}</span>
 547 |               </div>
 548 |               <div style={{ padding: '4px 18px' }}>
 549 |                 {postsLoading && <div style={{ padding: '16px 0', color: 'var(--edit-m)', fontFamily: 'DM Mono, monospace', fontSize: 10, textAlign: 'center' }}>Loading…</div>}
 550 |                 {postsError && !postsLoading && (
 551 |                   <div style={{ padding: '16px 0', color: 'var(--stone)', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
 552 |                     Posts table not found. Apply migration 011 in Supabase SQL editor to enable this feature.
 553 |                   </div>
 554 |                 )}
 555 |                 {!postsLoading && !postsError && posts.length === 0 && (
 556 |                   <div style={{ padding: '16px 0', color: 'var(--edit-m)', fontSize: 12, textAlign: 'center' }}>No posts yet. Write the first one above.</div>
 557 |                 )}
 558 |                 {!postsLoading && posts.map(p => (
 559 |                   <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--edit-b)' }}>
 560 |                     {editId === p.id ? (
 561 |                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 562 |                         <textarea
 563 |                           className="port-input"
 564 |                           value={editText}
 565 |                           onChange={e => setEditText(e.target.value)}
 566 |                           maxLength={1000}
 567 |                           rows={3}
 568 |                           style={{ resize: 'vertical' }}
 569 |                         />
 570 |                         <div style={{ display: 'flex', gap: 6 }}>
 571 |                           <button className="pb" onClick={() => saveEdit(p.id)} style={{ fontSize: 9 }}>Save</button>
 572 |                           <button className="pbg" onClick={() => setEditId(null)} style={{ fontSize: 9 }}>Cancel</button>
 573 |                         </div>
 574 |                       </div>
 575 |                     ) : (
 576 |                       <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
 577 |                         <div className="bkav" style={{ background: 'var(--edit-b)', flexShrink: 0 }}>{(p.author_name ?? user.name)?.[0] ?? '?'}</div>
 578 |                         <div style={{ flex: 1, minWidth: 0 }}>
 579 |                           <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
 580 |                             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--brass)', letterSpacing: '.1em', border: '1px solid var(--brass-d)', padding: '2px 6px', borderRadius: 3 }}>{p.tag}</span>
 581 |                             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--edit-m)' }}>{new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
 582 |                           </div>
 583 |                           <div className="bkn" style={{ lineHeight: 1.5, fontSize: 13 }}>{p.body}</div>
 584 |                           <div className="bkm" style={{ marginTop: 6 }}>♥ {p.likes} · {p.author_name}</div>
 585 |                         </div>
 586 |                         {p.author_id === user.id && (
 587 |                           <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
 588 |                             <button className="pbg" onClick={() => { setEditId(p.id); setEditText(p.body); }} style={{ minHeight: 'unset', padding: '4px 8px', fontSize: 8 }}>Edit</button>
 589 |                             <button onClick={() => deletePost(p.id)} style={{ minHeight: 'unset', padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171', borderRadius: 4, cursor: 'pointer' }}>✕</button>
 590 |                           </div>
 591 |                         )}
 592 |                       </div>
 593 |                     )}
 594 |                   </div>
 595 |                 ))}
 596 |               </div>
 597 |             </div>
 598 |           </div>
 599 |         )}
 600 | 
 601 |         {/* Services CRUD */}
 602 |         {section === 'services' && (
 603 |           <div className="pc">
 604 |             <div className="pc-h"><span className="pc-t">Pricelist Management</span></div>
 605 |             <div className="pc-b">
 606 |               <ServicesManager />
 607 |             </div>
 608 |           </div>
 609 |         )}
 610 | 
 611 |         {/* Media queue */}
 612 |         {section === 'media' && (
 613 |           <div>
 614 |             <div style={{ borderTop: '1px solid var(--edit-b)', paddingTop: 24 }}>
 615 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>
 616 |                 Pending Approval — {mediaQueue.length} item{mediaQueue.length !== 1 ? 's' : ''}
 617 |               </div>
 618 |               {mediaLoading && (
 619 |                 <div style={{ textAlign: 'center', padding: 32, color: 'var(--edit-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 620 |               )}
 621 |               {!mediaLoading && mediaQueue.length === 0 && (
 622 |                 <div style={{ textAlign: 'center', padding: 32, color: 'var(--edit-m)', fontSize: 13 }}>No items pending review.</div>
 623 |               )}
 624 |               {!mediaLoading && mediaQueue.length > 0 && (
 625 |                 <div className="gport">
 626 |                   {mediaQueue.map(item => (
 627 |                     <div key={item.id} className="gpimg">
 628 |                       {item.url.includes('/studio-media/') ? (
 629 |                         <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 630 |                       ) : (
 631 |                         <img src={item.url} alt={item.caption ?? 'pending media'} loading="lazy"/>
 632 |                       )}
 633 |                       <div className="gpov">
 634 |                         {item.caption && (
 635 |                           <div style={{ fontSize: 9, color: 'rgba(255,255,255,.8)', marginBottom: 4, fontFamily: 'DM Mono, monospace', letterSpacing: '.06em', padding: '0 4px' }}>
 636 |                             {item.caption}
 637 |                           </div>
 638 |                         )}
 639 |                         <div style={{ display: 'flex', gap: 5 }}>
 640 |                           <button className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }} onClick={async () => {
 641 |                             const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
 642 |                             if (!error) setMediaQueue(q => q.filter(x => x.id !== item.id));
 643 |                             else logger.error('EditorPortal', 'approve failed', { error: error.message });
 644 |                           }} aria-label="Approve media">✓</button>
 645 |                           <button className="pb" style={{ padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.3)', color: '#f87171', minHeight: 'unset' }} onClick={async () => {
 646 |                             const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
 647 |                             if (!error) setMediaQueue(q => q.filter(x => x.id !== item.id));
 648 |                             else logger.error('EditorPortal', 'reject failed', { error: error.message });
 649 |                           }} aria-label="Reject media">✗</button>
 650 |                         </div>
 651 |                       </div>
 652 |                     </div>
 653 |                   ))}
 654 |                 </div>
 655 |               )}
 656 |             </div>
 657 |           </div>
 658 |         )}
 659 | 
 660 |       </div>
 661 |     </div>
 662 |   );
 663 | }
 664 | 