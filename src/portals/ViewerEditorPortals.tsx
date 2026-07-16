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
  33 | const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\\' xmlns=\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'%2F%3E%3C%2Ffilter%3E%3Crect width=\'100%25\\' height=\'100%25\\' filter=\'url(%23n)\' opacity=\'0.06\'%2F%3E%3C%2Fsvg%3E")`;
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
  83 |         else setHistory((data ?? []).map(item => ({
  84 |           id: item.id,
  85 |           service: item.service,
  86 |           barber: item.barber,
  87 |           scheduled_at: item.scheduled_at,
  88 |           price_swl: item.price_swl,
  89 |           status: item.status,
  90 |         })));
  91 |         setHistLoading(false);
  92 |       })
  93 |       .catch((e: unknown) => { logger.warn('ViewerPortal', 'history fetch error', { error: String(e) }); setHistLoading(false); });
  94 | 
  95 |     return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
  96 |       .forEach(v => document.documentElement.style.removeProperty(v));
  97 |   }, [user.id]);
  98 | 
  99 |   const bookNow = async () => {
 100 |     if (!svc || !date || !time) return;
 101 |     setStep('validating');
 102 |     setAgents([]);
 103 |     try {
 104 |       const res = await bookingService.validate(
 105 |         { service: svc, date, time, email: user.email, clientId: user.id },
 106 |         ({ agents }) => setAgents(agents ?? [])
 107 |       );
 108 |       setResult(res);
 109 |     } catch (e) {
 110 |       logger.error('ViewerPortal', 'Booking validation failed', { error: String(e) });
 111 |       setResult({ bookingId: '', approved: false, confidence: 0, parallelMs: 0, rounds: 1, agents: [], issuesFixed: 0, reason: 'Unexpected error — please try again.' });
 112 |     } finally {
 113 |       setStep('done');
 114 |       monitor.recordMetric('booking.flow.complete', 1);
 115 |     }
 116 |   };
 117 | 
 118 |   const reset = () => { setSvc(''); setDate(''); setTime(''); setAgents([]); setResult(null); setStep('select'); };
 119 | 
 120 |   const tierLabel = user.memberTier
 121 |     ? user.memberTier.charAt(0).toUpperCase() + user.memberTier.slice(1)
 122 |     : 'Bronze';
 123 |   const firstName = user.name?.split(' ')[0] || 'Member';
 124 | 
 125 |   return (
 126 |     <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--view-bg)' }}>
 127 | 
 128 |       {/* Hero */}
 129 |       <div style={{ position: 'relative', minHeight: '40vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--view-b)' }}>
 130 |         <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .18, transition: 'opacity .5s' }}/>
 131 |         <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
 132 |         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--view-bg) 0%, transparent 60%)', pointerEvents: 'none' }}/>
 133 |         <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
 134 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Member Portal · Studio P</div>
 135 |           <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem,8vw,6rem)', fontWeight: 700, lineHeight: .88, color: 'var(--view-t)' }}>
 136 |             {firstName}'s<br/>
 137 |             <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Space.</em>
 138 |           </h1>
 139 |           <div style={{ display: 'flex', gap: 28, marginTop: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
 140 |             {[{ v: String(user.visitCount || 0), l: 'Visits' }, { v: tierLabel, l: 'Tier' }].map(s => (
 141 |               <div key={s.l}>
 142 |                 <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--view-a)', lineHeight: 1 }}>{s.v}</div>
 143 |                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.2em', color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>{s.l}</div>
 144 |               </div>
 145 |             ))}
 146 |             <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
 147 |               <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--view-b)', color: 'var(--view-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 148 |                 ← Home
 149 |               </button>
 150 |               <button onClick={onSignOut} style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 151 |                 Sign Out
 152 |               </button>
 153 |             </div>
 154 |           </div>
 155 |         </div>
 156 |       </div>
 157 | 
 158 |       {/* Content */}
 159 |       <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
 160 | 
 161 |         {/* Nav */}
 162 |         <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--view-s)', borderRadius: 8, padding: 3 }}>
 163 |           {[['home', '✨ Dashboard'], ['book', '📅 Book'], ['history', '📋 History']].map(([id, label]) => (
 164 |             <button key={id} onClick={() => setSection(id as typeof section)} style={{
 165 |               flex: 1, background: section === id ? 'var(--view-b)' : 'transparent',
 166 |               border: 'none', color: section === id ? 'var(--view-a)' : 'var(--view-m)',
 167 |               borderRadius: 6, padding: '9px 12px', fontSize: 10,
 168 |               fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 169 |               cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
 170 |             }}>{label}</button>
 171 |           ))}
 172 |         </div>
 173 | 
 174 |         {/* Dashboard */}
 175 |         {section === 'home' && (
 176 |           <div>
 177 |             <div className="pc">
 178 |               <div className="pc-h">
 179 |                 <span className="pc-t">Upcoming Appointments</span>
 180 |                 <button className="pbg" onClick={() => setSection('book')} style={{ fontSize: 9 }}>+ Book</button>
 181 |               </div>
 182 |               <div style={{ padding: '4px 18px' }}>
 183 |                 {(() => {
 184 |                   const upcoming = history.filter(b => new Date(b.scheduled_at) > new Date() && b.status !== 'cancelled').slice(0, 3);
 185 |                   if (histLoading) return <div style={{ padding: '16px 0', color: 'var(--view-m)', fontFamily: 'DM Mono, monospace', fontSize: 10, textAlign: 'center' }}>Loading…</div>;
 186 |                   if (upcoming.length === 0) return (
 187 |                     <div style={{ padding: '16px 0', color: 'var(--view-m)', fontSize: 12, textAlign: 'center' }}>
 188 |                       No upcoming appointments.{' '}
 189 |                       <button onClick={() => setSection('book')} style={{ background: 'none', border: 'none', color: 'var(--view-a)', cursor: 'pointer', fontSize: 12, minHeight: 'unset', padding: 0, fontFamily: 'inherit' }}>Book now →</button>
 190 |                     </div>
 191 |                   );
 192 |                   return upcoming.map(b => {
 193 |                     const d = new Date(b.scheduled_at);
 194 |                     const dateStr = d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
 195 |                     const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 196 |                     return (
 197 |                       <div key={b.id} className="bki">
 198 |                         <div className="bkav">{b.service?.[0] ?? '✦'}</div>
 199 |                         <div style={{ flex: 1 }}>
 200 |                           <div className="bkn">{b.service}</div>
 201 |                           <div className="bkm">{b.barber} · {dateStr} {timeStr}</div>
 202 |                         </div>
 203 |                         <span className={`bkst ${b.status}`}>{b.status}</span>
 204 |                       </div>
 205 |                     );
 206 |                   });
 207 |                 })()}
 208 |               </div>
 209 |             </div>
 210 | 
 211 |             <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 24, marginBottom: 20 }}>
 212 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 8, textTransform: 'uppercase' }}>Member Perks</div>
 213 |               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
 214 |                 {[
 215 |                   { icon: '✦', title: 'Loyalty Discount', desc: '10% off every 5th visit' },
 216 |                   { icon: '⚡', title: 'Priority Booking', desc: 'First access to new slots' },
 217 |                   { icon: '✧', title: 'Early Access', desc: 'New services before anyone else' },
 218 |                 ].map(p => (
 219 |                   <div key={p.title} style={{ background: 'var(--view-s)', border: '1px solid var(--view-b)', borderRadius: 8, padding: '16px 14px', transition: 'border-color .2s' }}
 220 |                     onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--view-a)')}
 221 |                     onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--view-b)')}
 222 |                   >
 223 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--view-a)', marginBottom: 6 }}>{p.icon}</div>
 224 |                     <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.12em', color: 'var(--view-t)', marginBottom: 4, textTransform: 'uppercase' }}>{p.title}</div>
 225 |                     <div style={{ fontSize: 11, color: 'var(--view-m)', lineHeight: 1.5 }}>{p.desc}</div>
 226 |                   </div>
 227 |                 ))}
 228 |               </div>
 229 |             </div>
 230 | 
 231 |             <PhotoUpload userId={user.id} />
 232 |           </div>
 233 |         )}
 234 | 
 235 |         {/* Booking */}
 236 |         {section === 'book' && (
 237 |           <div>
 238 |             {step === 'select' && (
 239 |               <div>
 240 |                 <div style={{ borderTop: '1px solid var(--view-b)', paddingTop: 20, marginBottom: 20 }}>
 241 |                   <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>The Menu</div>
 242 |                   <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'var(--view-b)', marginBottom: 20 }}>
 243 |                     {services.map((s, i) => (
 244 |                       <button key={s.id} onClick={() => setSvc(s.name)} style={{
 245 |                         '--i': i,
 246 |                         background: svc === s.name ? 'rgba(167,139,250,.1)' : 'var(--view-bg)',
 247 |                         border: 'none',
 248 |                         borderLeft: svc === s.name ? '2px solid var(--view-a)' : '2px solid transparent',
 249 |                         padding: '18px 16px',
 250 |                         textAlign: 'left', cursor: 'pointer',
 251 |                         transition: 'background .2s',
 252 |                       } as React.CSSProperties}>
 253 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', marginBottom: 6, textTransform: 'uppercase' }}>{s.tag}</div>
 254 |                         <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--view-t)', marginBottom: 4 }}>{s.name}</div>
 255 |                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
 256 |                           <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: svc === s.name ? 'var(--view-a)' : 'var(--brass)', fontWeight: 600 }}>E{s.price}</span>
 257 |                           <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--stone)' }}>{s.duration} min</span>
 258 |                         </div>
 259 |                       </button>
 260 |                     ))}
 261 |                   </div>
 262 |                 </div>
 263 | 
 264 |                 <div className="pc">
 265 |                   <div className="pc-h"><span className="pc-t">Date & Time</span></div>
 266 |                   <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 267 |                     <div>
 268 |                       <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>DATE</label>
 269 |                       <input className="port-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}/>
 270 |                     </div>
 271 |                     <div>
 272 |                       <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', display: 'block', marginBottom: 6 }}>TIME</label>
 273 |                       <input className="port-input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
 274 |                     </div>
 275 |                   </div>
 276 |                 </div>
 277 | 
 278 |                 <button className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', opacity: svc && date && time ? 1 : .45 }}
 279 |                   onClick={bookNow} disabled={!svc || !date || !time}>
 280 |                   Check Availability →
 281 |                 </button>
 282 |               </div>
 283 |             )}
 284 | 
 285 |             {(step === 'validating' || step === 'done') && (
 286 |               <div>
 287 |                 <div className="pc">
 288 |                   <div className="pc-h"><span className="pc-t">Agent Validation</span></div>
 289 |                   <div className="pc-b">
 290 |                     <AgentPanel agents={agents} result={result} running={step === 'validating'} />
 291 |                   </div>
 292 |                 </div>
 293 |                 {step === 'done' && result?.approved && (
 294 |                   <div style={{ textAlign: 'center', marginTop: 8 }}>
 295 |                     <a href={`https://wa.me/26879333760?text=${encodeURIComponent(`Booking ${result.bookingId}: ${svc} on ${date} at ${time}`)}`}
 296 |                       target="_blank" rel="noopener noreferrer"
 297 |                       className="btn-primary" style={{ display: 'inline-block', marginBottom: 10 }}>
 298 |                       Confirm on WhatsApp →
 299 |                     </a>
 300 |                     <br/>
 301 |                     <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--port-m)', fontSize: 11, cursor: 'pointer', minHeight: 'unset' }}>
 302 |                       Book another slot
 303 |                     </button>
 304 |                   </div>
 305 |                 )}
 306 |                 {step === 'done' && result && !result.approved && (
 307 |                   <div style={{ textAlign: 'center', marginTop: 8, padding: '16px', background: 'rgba(248,113,113,.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,.25)' }}>
 308 |                     <div style={{ color: '#f87171', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '.15em', marginBottom: 8 }}>
 309 |                       SLOT UNAVAILABLE
 310 |                     </div>
 311 |                     <div style={{ fontSize: 13, color: 'var(--port-m)', marginBottom: 14, lineHeight: 1.6 }}>
 312 |                       {result.reason ?? 'This time slot could not be booked. Please choose a different time.'}
 313 |                     </div>
 314 |                     <button onClick={reset} className="btn-outline" style={{ fontSize: 10 }}>
 315 |                       Try Another Slot
 316 |                     </button>
 317 |                   </div>
 318 |                 )}
 319 |               </div>
 320 |             )}
 321 |           </div>
 322 |         )}
 323 | 
 324 |         {/* History */}
 325 |         {section === 'history' && (
 326 |           <div>
 327 |             <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', marginBottom: 20, textTransform: 'uppercase' }}>Past Visits</div>
 328 |             {histLoading && (
 329 |               <div style={{ textAlign: 'center', padding: 32, color: 'var(--view-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 330 |             )}
 331 |             {!histLoading && history.length === 0 && (
 332 |               <div style={{ textAlign: 'center', padding: 32, color: 'var(--view-m)', fontSize: 13 }}>No bookings yet — book your first cut above.</div>
 333 |             )}
 334 |             {!histLoading && history.map((b, i) => {
 335 |               const d = new Date(b.scheduled_at);
 336 |               const dateStr = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
 337 |               const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 338 |               return (
 339 |                 <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--view-b)' }}>
 340 |                   <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 700, color: 'var(--view-b)', lineHeight: 1, width: 32, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</div>
 341 |                   <div style={{ flex: 1 }}>
 342 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--view-t)' }}>{b.service}</div>
 343 |                     <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--view-m)', marginTop: 3, letterSpacing: '.06em' }}>{b.barber} · {dateStr} {timeStr}</div>
 344 |                   </div>
 345 |                   <div style={{ textAlign: 'right' }}>
 346 |                     <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: 'var(--brass)', fontWeight: 600 }}>E{(b.price_swl / 100).toFixed(0)}</div>
 347 |                     <span className={`bkst ${b.status}`}>{b.status}</span>
 348 |                   </div>
 349 |                 </div>
 350 |               );
 351 |             })}
 352 |           </div>
 353 |         )}
 354 | 
 355 |       </div>
 356 |     </div>
 357 |   );
 358 | }
 359 | 
 360 | // ── Editor Portal ────────────────────────────────
 361 | 
 362 | interface Post {
 363 |   id: string;
 364 |   author_id: string;
 365 |   author_name: string;
 366 |   body: string;
 367 |   tag: string;
 368 |   likes: number;
 369 |   created_at: string;
 370 | }
 371 | 
 372 | const POST_TAGS = ['CULTURE', 'TIPS', 'UPDATE', 'PROMO', 'EVENT'] as const;
 373 | 
 374 | interface EditorPortalProps {
 375 |   user: UserProfile;
 376 |   onClose: () => void;
 377 |   onSignOut: () => void;
 378 | }
 379 | 
 380 | type EditorSection = 'posts' | 'services' | 'media';
 381 | 
 382 | export function EditorPortal({ user, onClose, onSignOut }: EditorPortalProps) {
 383 |   const [section, setSection]         = useState<EditorSection>('posts');
 384 |   const [posts, setPosts]             = useState<Post[]>([]);
 385 |   const [postsLoading, setPostsLoading] = useState(false);
 386 |   const [postsError, setPostsError]   = useState(false);
 387 |   const [newPostOpen, setNewPostOpen] = useState(false);
 388 |   const [newPostText, setNewPostText] = useState('');
 389 |   const [newPostTag, setNewPostTag]   = useState<typeof POST_TAGS[number]>('CULTURE');
 390 |   const [posting, setPosting]         = useState(false);
 391 |   const [editId, setEditId]           = useState<string | null>(null);
 392 |   const [editText, setEditText]       = useState('');
 393 |   const [bgIdx] = useState(1);
 394 |   const [mediaQueue, setMediaQueue]   = useState<GalleryItem[]>([]);
 395 |   const [mediaLoading, setMediaLoading] = useState(false);
 396 | 
 397 |   useEffect(() => {
 398 |     document.documentElement.style.setProperty('--port-bg',   'var(--edit-bg)');
 399 |     document.documentElement.style.setProperty('--port-side', 'var(--edit-s)');
 400 |     document.documentElement.style.setProperty('--port-bord', 'var(--edit-b)');
 401 |     document.documentElement.style.setProperty('--port-a',    'var(--edit-a)');
 402 |     document.documentElement.style.setProperty('--port-a2',   'var(--edit-a2)');
 403 |     document.documentElement.style.setProperty('--port-t',    'var(--edit-t)');
 404 |     document.documentElement.style.setProperty('--port-m',    'var(--edit-m)');
 405 | 
 406 |     setPostsLoading(true);
 407 |     Promise.resolve(
 408 |       supabase.from('announcements').select('id, author_id, author_name, body, tag, likes, created_at').order('created_at', { ascending: false }).limit(30)
 409 |     ).then(({ data, error }) => {
 410 |       if (error) { logger.warn('EditorPortal', 'posts fetch failed', { error: error.message }); setPostsError(true); }
 411 |       else setPosts((data ?? []).map(item => ({
 412 |         id: item.id,
 413 |         author_id: item.author_id,
 414 |         author_name: item.author_name,
 415 |         body: item.body,
 416 |         tag: item.tag,
 417 |         likes: item.likes,
 418 |         created_at: item.created_at,
 419 |       })));
 420 |       setPostsLoading(false);
 421 |     }).catch(() => { setPostsError(true); setPostsLoading(false); });
 422 | 
 423 |     setMediaLoading(true);
 424 |     Promise.resolve(
 425 |       supabase
 426 |         .from('gallery_items')
 427 |         .select('id, url, caption, approved, created_at')
 428 |         .eq('approved', false)
 429 |         .order('created_at', { ascending: false })
 430 |         .limit(30)
 431 |     ).then(({ data, error }) => {
 432 |         if (error) logger.warn('EditorPortal', 'media queue fetch failed', { error: error.message });
 433 |         else setMediaQueue((data ?? []) as GalleryItem[]);
 434 |         setMediaLoading(false);
 435 |       })
 436 |       .catch((e: unknown) => { logger.warn('EditorPortal', 'media queue error', { error: String(e) }); setMediaLoading(false); });
 437 | 
 438 |     return () => ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
 439 |       .forEach(v => document.documentElement.style.removeProperty(v));
 440 |   }, []);
 441 | 
 442 |   const submitPost = async () => {
 443 |     if (!newPostText.trim()) return;
 444 |     setPosting(true);
 445 |     const { data, error } = await supabase.from('announcements').insert({
 446 |       author_id: user.id, author_name: user.name ?? 'Editor',
 447 |       body: newPostText.trim(), tag: newPostTag,
 448 |     }).select().single();
 449 |     if (!error && data) {
 450 |       setPosts(prev => [{
 451 |         id: data.id,
 452 |         author_id: data.author_id,
 453 |         author_name: data.author_name,
 454 |         body: data.body,
 455 |         tag: data.tag,
 456 |         likes: data.likes,
 457 |         created_at: data.created_at,
 458 |       }, ...prev]);
 459 |       setNewPostText(''); setNewPostOpen(false);
 460 |     } else logger.error('EditorPortal', 'post insert failed', { error: error?.message });
 461 |     setPosting(false);
 462 |   };
 463 | 
 464 |   const saveEdit = async (id: string) => {
 465 |     if (!editText.trim()) return;
 466 |     const { error } = await supabase.from('announcements').update({ body: editText.trim() }).eq('id', id);
 467 |     if (!error) { setPosts(prev => prev.map(p => p.id === id ? { ...p, body: editText.trim() } : p)); setEditId(null); }
 468 |     else logger.error('EditorPortal', 'post update failed', { error: error.message });
 469 |   };
 470 | 
 471 |   const deletePost = async (id: string) => {
 472 |     const { error } = await supabase.from('announcements').delete().eq('id', id);
 473 |     if (!error) setPosts(prev => prev.filter(p => p.id !== id));
 474 |     else logger.error('EditorPortal', 'post delete failed', { error: error.message });
 475 |   };
 476 | 
 477 |   return (
 478 |     <div className="portal-enter" style={{ minHeight: 'calc(100vh - 80px)', background: 'var(--edit-bg)' }}>
 479 | 
 480 |       {/* Hero */}
 481 |       <div style={{ position: 'relative', minHeight: '38vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', borderBottom: '1px solid var(--edit-b)' }}>
 482 |         <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMGS[bgIdx]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .15 }}/>
 483 |         <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .6, pointerEvents: 'none' }}/>
 484 |         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--edit-bg) 0%, transparent 55%)', pointerEvents: 'none' }}/>
 485 |         <div style={{ position: 'relative', padding: '0 28px 36px', width: '100%', maxWidth: 700, margin: '0 auto' }}>
 486 |           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.45em', color: 'var(--brass)', marginBottom: 14, textTransform: 'uppercase' }}>Editor Portal · Studio P</div>
 487 |           <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 700, lineHeight: .9, color: 'var(--edit-t)' }}>
 488 |             Studio<br/>
 489 |             <em style={{ fontStyle: 'italic', color: 'var(--brass)' }}>Desk.</em>
 490 |           </h1>
 491 |           <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--edit-m)', marginTop: 14, letterSpacing: '.06em' }}>
 492 |             {user.name} · Content Creator
 493 |           </p>
 494 |           <div style={{ position: 'absolute', bottom: 36, right: 28, display: 'flex', gap: 8 }}>
 495 |             <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--edit-b)', color: 'var(--edit-m)', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 496 |               ← Home
 497 |             </button>
 498 |             <button onClick={onSignOut} style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', borderRadius: 8, padding: '6px 14px', fontSize: 10, minHeight: 'unset', fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer' }}>
 499 |               Sign Out
 500 |             </button>
 501 |           </div>
 502 |         </div>
 503 |       </div>
 504 | 
 505 |       {/* Content */}
 506 |       <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px' }}>
 507 | 
 508 |         {/* Section nav */}
 509 |         <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--edit-s)', borderRadius: 8, padding: 3 }}>
 510 |           {([['posts', '✏️ Posts'], ['services', '💈 Services'], ['media', '🖼 Media']] as const).map(([id, label]) => (
 511 |             <button key={id} onClick={() => setSection(id)} style={{
 512 |               flex: 1, background: section === id ? 'var(--edit-b)' : 'transparent',
 513 |               border: 'none', color: section === id ? 'var(--edit-a)' : 'var(--edit-m)',
 514 |               borderRadius: 6, padding: '9px 12px', fontSize: 10,
 515 |               fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 516 |               cursor: 'pointer', minHeight: 'unset', transition: 'all .15s',
 517 |             }}>{label}</button>
 518 |           ))}
 519 |         </div>
 520 | 
 521 |         {/* Posts */}
 522 |         {section === 'posts' && (
 523 |           <div>
 524 |             {/* New post form */}
 525 |             <div className="pc">
 526 |               <div className="pc-h">
 527 |                 <span className="pc-t">New Post</span>
 528 |                 <button className="pb" onClick={() => setNewPostOpen(v => !v)} style={{ fontSize: 9 }}>
 529 |                   {newPostOpen ? '✕ Cancel' : '+ Write'}
 530 |                 </button>
 531 |               </div>
 532 |               {newPostOpen && (
 533 |                 <div className="pc-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 534 |                   <textarea
 535 |                     className="port-input"
 536 |                     placeholder="What's happening at the barbershop…"
 537 |                     value={newPostText}
 538 |                     onChange={e => setNewPostText(e.target.value)}
 539 |                     maxLength={1000}
 540 |                     rows={4}
 541 |                     style={{ resize: 'vertical' }}
 542 |                   />
 543 |                   <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 544 |                     {POST_TAGS.map(t => (
 545 |                       <button key={t} onClick={() => setNewPostTag(t)} style={{
 546 |                         background: newPostTag === t ? 'var(--edit-a)' : 'transparent',
 547 |                         color: newPostTag === t ? 'var(--edit-bg)' : 'var(--edit-m)',
 548 |                         border: `1px solid ${newPostTag === t ? 'var(--edit-a)' : 'var(--edit-b)'}`,
 549 |                         borderRadius: 4, padding: '4px 10px', fontSize: 9,
 550 |                         fontFamily: 'DM Mono, monospace', letterSpacing: '.1em',
 551 |                         cursor: 'pointer', minHeight: 'unset',
 552 |                       }}>{t}</button>
 553 |                     ))}
 554 |                   </div>
 555 |                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 556 |                     <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-m)' }}>{newPostText.length}/1000</span>
 557 |                     <button className="pb" onClick={submitPost} disabled={posting || !newPostText.trim()} style={{ fontSize: 9 }}>
 558 |                       {posting ? 'Publishing…' : 'Publish Post'}
 559 |                     </button>
 560 |                   </div>
 561 |                 </div>
 562 |               )}
 563 |             </div>
 564 | 
 565 |             {/* Posts list */}
 566 |             <div className="pc">
 567 |               <div className="pc-h">
 568 |                 <span className="pc-t">Published Posts</span>
 569 |                 <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-m)' }}>{posts.length}</span>
 570 |               </div>
 571 |               <div style={{ padding: '4px 18px' }}>
 572 |                 {postsLoading && <div style={{ padding: '16px 0', color: 'var(--edit-m)', fontFamily: 'DM Mono, monospace', fontSize: 10, textAlign: 'center' }}>Loading…</div>}
 573 |                 {postsError && !postsLoading && (
 574 |                   <div style={{ padding: '16px 0', color: 'var(--stone)', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
 575 |                     Posts table not found. Apply migration 011 in Supabase SQL editor to enable this feature.
 576 |                   </div>
 577 |                 )}
 578 |                 {!postsLoading && !postsError && posts.length === 0 && (
 579 |                   <div style={{ padding: '16px 0', color: 'var(--edit-m)', fontSize: 12, textAlign: 'center' }}>No posts yet. Write the first one above.</div>
 580 |                 )}
 581 |                 {!postsLoading && posts.map(p => (
 582 |                   <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--edit-b)' }}>
 583 |                     {editId === p.id ? (
 584 |                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 585 |                         <textarea
 586 |                           className="port-input"
 587 |                           value={editText}
 588 |                           onChange={e => setEditText(e.target.value)}
 589 |                           maxLength={1000}
 590 |                           rows={3}
 591 |                           style={{ resize: 'vertical' }}
 592 |                         />
 593 |                         <div style={{ display: 'flex', gap: 6 }}>
 594 |                           <button className="pb" onClick={() => saveEdit(p.id)} style={{ fontSize: 9 }}>Save</button>
 595 |                           <button className="pbg" onClick={() => setEditId(null)} style={{ fontSize: 9 }}>Cancel</button>
 596 |                         </div>
 597 |                       </div>
 598 |                     ) : (
 599 |                       <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
 600 |                         <div className="bkav" style={{ background: 'var(--edit-b)', flexShrink: 0 }}>{(p.author_name ?? user.name)?.[0] ?? '?'}</div>
 601 |                         <div style={{ flex: 1, minWidth: 0 }}>
 602 |                           <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
 603 |                             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--brass)', letterSpacing: '.1em', border: '1px solid var(--brass-d)', padding: '2px 6px', borderRadius: 3 }}>{p.tag}</span>
 604 |                             <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--edit-m)' }}>{new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
 605 |                           </div>
 606 |                           <div className="bkn" style={{ lineHeight: 1.5, fontSize: 13 }}>{p.body}</div>
 607 |                           <div className="bkm" style={{ marginTop: 6 }}>♥ {p.likes} · {p.author_name}</div>
 608 |                         </div>
 609 |                         {p.author_id === user.id && (
 610 |                           <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
 611 |                             <button className="pbg" onClick={() => { setEditId(p.id); setEditText(p.body); }} style={{ minHeight: 'unset', padding: '4px 8px', fontSize: 8 }}>Edit</button>
 612 |                             <button onClick={() => deletePost(p.id)} style={{ minHeight: 'unset', padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171', borderRadius: 4, cursor: 'pointer' }}>✕</button>
 613 |                           </div>
 614 |                         )}
 615 |                       </div>
 616 |                     )}
 617 |                   </div>
 618 |                 ))}
 619 |               </div>
 620 |             </div>
 621 |           </div>
 622 |         )}
 623 | 
 624 |         {/* Services CRUD */}
 625 |         {section === 'services' && (
 626 |           <div className="pc">
 627 |             <div className="pc-h"><span className="pc-t">Pricelist Management</span></div>
 628 |             <div className="pc-b">
 629 |               <ServicesManager />
 630 |             </div>
 631 |           </div>
 632 |         )}
 633 | 
 634 |         {/* Media queue */}
 635 |         {section === 'media' && (
 636 |           <div>
 637 |             <div style={{ borderTop: '1px solid var(--edit-b)', paddingTop: 24 }}>
 638 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--stone)', marginBottom: 16, textTransform: 'uppercase' }}>
 639 |                 Pending Approval — {mediaQueue.length} item{mediaQueue.length !== 1 ? 's' : ''}
 640 |               </div>
 641 |               {mediaLoading && (
 642 |                 <div style={{ textAlign: 'center', padding: 32, color: 'var(--edit-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 643 |               )}
 644 |               {!mediaLoading && mediaQueue.length === 0 && (
 645 |                 <div style={{ textAlign: 'center', padding: 32, color: 'var(--edit-m)', fontSize: 13 }}>No items pending review.</div>
 646 |               )}
 647 |               {!mediaLoading && mediaQueue.length > 0 && (
 648 |                 <div className="gport">
 649 |                   {mediaQueue.map(item => (
 650 |                     <div key={item.id} className="gpimg">
 651 |                       {item.url.includes('/studio-media/') ? (
 652 |                         <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 653 |                       ) : (
 654 |                         <img src={item.url} alt={item.caption ?? 'pending media'} loading="lazy"/>
 655 |                       )}
 656 |                       <div className="gpov">
 657 |                         {item.caption && (
 658 |                           <div style={{ fontSize: 9, color: 'rgba(255,255,255,.8)', marginBottom: 4, fontFamily: 'DM Mono, monospace', letterSpacing: '.06em', padding: '0 4px' }}>
 659 |                             {item.caption}
 660 |                           </div>
 661 |                         )}
 662 |                         <div style={{ display: 'flex', gap: 5 }}>
 663 |                           <button aria-label="Approve media item" className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }} onClick={async () => {
 664 |                             const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
 665 |                             if (!error) setMediaQueue(q => q.filter(x => x.id !== item.id));
 666 |                             else logger.error('EditorPortal', 'approve failed', { error: error.message });
 667 |                           }}>✓</button>
 668 |                           <button aria-label="Reject media item" className="pb" style={{ padding: '4px 8px', fontSize: 8, background: 'rgba(248,113,113,.3)', color: '#f87171', minHeight: 'unset' }} onClick={async () => {
 669 |                             const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
 670 |                             if (!error) setMediaQueue(q => q.filter(x => x.id !== item.id));
 671 |                             else logger.error('EditorPortal', 'reject failed', { error: error.message });
 672 |                           }}>✗</button>
 673 |                         </div>
 674 |                       </div>
 675 |                     </div>
 676 |                   ))}
 677 |                 </div>
 678 |               )}
 679 |             </div>
 680 |           </div>
 681 |         )}
 682 | 
 683 |       </div>
 684 |     </div>
 685 |   );
 686 | }
 687 | 