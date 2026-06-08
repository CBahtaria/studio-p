   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — AdminPortal (portals/AdminPortal.tsx)
   3 | // Full system command centre for admin role
   4 | // ════════════════════════════════════════════════
   5 | 
   6 | import { useState, useEffect } from 'react';
   7 | import type { UserProfile, Agent, OrchestrationResult, HealthStatus } from '@/types';
   8 | import { bookingService } from '@/services/BookingService';
   9 | import { supabase } from '@/lib/supabase';
  10 | import { monitor } from '@/core/monitor';
  11 | import { logger } from '@/core/logger';
  12 | import { AgentPanel } from '@/components/AgentPanel';
  13 | import { BUSINESS } from '@/config/business';
  14 | 
  15 | interface RealBooking {
  16 |   id: string;
  17 |   client_name: string;
  18 |   service: string;
  19 |   barber: string;
  20 |   scheduled_at: string;
  21 |   price_swl: number;
  22 |   status: string;
  23 | }
  24 | 
  25 | interface RealUser {
  26 |   id: string;
  27 |   name: string;
  28 |   email: string;
  29 |   role: string;
  30 |   upload_count: number;
  31 |   provider: string;
  32 | }
  33 | 
  34 | interface PendingMedia {
  35 |   id: string;
  36 |   url: string;
  37 |   caption: string | null;
  38 |   created_at: string;
  39 |   uploader_id: string;
  40 | }
  41 | 
  42 | interface DailyReport {
  43 |   report_date: string;
  44 |   total_bookings: number;
  45 |   confirmed: number;
  46 |   pending_count: number;
  47 |   cancelled: number;
  48 |   completed: number;
  49 |   total_revenue_swl: number;
  50 |   appointments: Array<{ id: string; clientName: string; service: string; time: string; status: string; priceSWL: number }>;
  51 |   whatsapp_message: string | null;
  52 |   generated_at: string;
  53 | }
  54 | 
  55 | const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'%2F%3E%3C%2Ffilter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.06\'%2F%3E%3C%2Fsvg%3E")`;
  56 | const HERO_IMG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1400&q=70';
  57 | 
  58 | const NAV = [
  59 |   { id: 'dashboard', icon: '⚡', label: 'Dashboard',  badge: null },
  60 |   { id: 'reports',   icon: '📊', label: 'Reports',    badge: null },
  61 |   { id: 'bookings',  icon: '📅', label: 'Bookings',   badge: null },
  62 |   { id: 'users',     icon: '👥', label: 'Users',      badge: null },
  63 |   { id: 'gallery',   icon: '🖼️', label: 'Gallery',    badge: null },
  64 |   { id: 'agents',    icon: '🤖', label: 'Agents',     badge: null },
  65 |   { id: 'system',    icon: '🔧', label: 'System',     badge: null },
  66 |   { id: 'rls',       icon: '🛡️', label: 'RLS',        badge: null },
  67 | ];
  68 | 
  69 | 
  70 | const SYSTEM_LOGS = [
  71 |   { t: '14:32:05', type: 'ok',   msg: 'BK-A3F12 confirmed — Lungelo M.' },
  72 |   { t: '14:28:11', type: 'ok',   msg: 'RLS validated — agents:4 in 320ms' },
  73 |   { t: '14:15:44', type: 'warn', msg: 'Upload rate limit hit — viewer-001' },
  74 |   { t: '14:12:30', type: 'info', msg: 'Parallel agents: confidence 94%' },
  75 |   { t: '13:58:02', type: 'ok',   msg: 'Session created — admin@studiop.sz' },
  76 |   { t: '13:44:17', type: 'ok',   msg: 'Auto-backup snapshot v3 created' },
  77 |   { t: '13:10:55', type: 'err',  msg: 'CDN image load failure — m_1a2b' },
  78 | ];
  79 | 
  80 | const LOG_COLOR: Record<string, string> = {
  81 |   ok: '#52E89A', warn: '#FFB347', err: '#f87171', info: 'var(--port-a)',
  82 | };
  83 | 
  84 | const SECTION_META: Record<string, { eyebrow: string; title: string; sub?: string }> = {
  85 |   dashboard: { eyebrow: 'Command Centre',        title: 'Dashboard',         sub: 'Live operations overview for Fano Barbershop.' },
  86 |   reports:   { eyebrow: 'Daily Intelligence',    title: 'Reports & Briefing', sub: "Mfanomuhle's daily schedule, revenue summary, and one-tap WhatsApp briefings." },
  87 |   bookings:  { eyebrow: 'Appointment Management', title: 'Bookings',          sub: 'Manage, confirm, and track every chair.' },
  88 |   users:     { eyebrow: 'Member Directory',       title: 'Members' },
  89 |   gallery:   { eyebrow: 'Media Moderation',       title: 'Gallery',           sub: 'Approve or reject submitted photos and videos.' },
  90 |   agents:    { eyebrow: 'Parallel Processing',    title: 'Agent Engine',      sub: '4 validation agents run concurrently via Promise.all. A synthesiser agent reads all outputs and produces a final recommendation.' },
  91 |   system:    { eyebrow: 'System Status',          title: 'System' },
  92 |   rls:       { eyebrow: 'Row-Level Security',     title: 'RLS & Key Vault' },
  93 | };
  94 | 
  95 | function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  96 |   return (
  97 |     <div style={{ position: 'relative', padding: '44px 0 28px', marginBottom: 28, borderBottom: '1px solid var(--admin-b)', overflow: 'hidden' }}>
  98 |       <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: .08, pointerEvents: 'none' }}/>
  99 |       <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .5, pointerEvents: 'none' }}/>
 100 |       <div style={{ position: 'relative' }}>
 101 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</div>
 102 |         <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, lineHeight: .92, color: 'var(--admin-t)' }}>{title}</h1>
 103 |         {sub && <p style={{ fontSize: 13, color: 'var(--admin-m)', marginTop: 10, lineHeight: 1.6, maxWidth: 520 }}>{sub}</p>}
 104 |       </div>
 105 |     </div>
 106 |   );
 107 | }
 108 | 
 109 | interface AdminPortalProps {
 110 |   user: UserProfile;
 111 |   onClose: () => void;
 112 |   onSignOut: () => void;
 113 | }
 114 | 
 115 | export function AdminPortal({ user, onClose, onSignOut }: AdminPortalProps) {
 116 |   const [section, setSection]         = useState('dashboard');
 117 |   const [navOpen, setNavOpen]         = useState(false);
 118 |   const [agents, setAgents]           = useState<Agent[]>([]);
 119 |   const [agResult, setAgResult]       = useState<OrchestrationResult | null>(null);
 120 |   const [running, setRunning]         = useState(false);
 121 |   const [health, setHealth]           = useState<HealthStatus | null>(null);
 122 |   const [bookings, setBookings]         = useState<RealBooking[]>([]);
 123 |   const [users, setUsers]               = useState<RealUser[]>([]);
 124 |   const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
 125 |   const [dataLoading, setDataLoading]   = useState(false);
 126 |   const [todayReport, setTodayReport]   = useState<DailyReport | null>(null);
 127 |   const [reportHistory, setReportHistory] = useState<DailyReport[]>([]);
 128 |   const [reportLoading, setReportLoading] = useState(false);
 129 |   const [reportWaUrl, setReportWaUrl]   = useState<string | null>(null);
 130 | 
 131 |   useEffect(() => {
 132 |     document.documentElement.style.setProperty('--port-bg',   'var(--admin-bg)');
 133 |     document.documentElement.style.setProperty('--port-side', 'var(--admin-s)');
 134 |     document.documentElement.style.setProperty('--port-bord', 'var(--admin-b)');
 135 |     document.documentElement.style.setProperty('--port-a',    'var(--admin-a)');
 136 |     document.documentElement.style.setProperty('--port-a2',   'var(--admin-a2)');
 137 |     document.documentElement.style.setProperty('--port-t',    'var(--admin-t)');
 138 |     document.documentElement.style.setProperty('--port-m',    'var(--admin-m)');
 139 | 
 140 |     monitor.getHealth().then(setHealth).catch(e => logger.warn('AdminPortal', 'health check failed', { error: String(e) }));
 141 | 
 142 |     // Load today's report + last 7 days of history
 143 |     const todayStr = new Date().toISOString().slice(0, 10);
 144 |     Promise.resolve(
 145 |       supabase
 146 |         .from('daily_reports')
 147 |         .select('*')
 148 |         .gte('report_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
 149 |         .order('report_date', { ascending: false })
 150 |         .limit(8)
 151 |     ).then(({ data }) => {
 152 |         if (data && data.length > 0) {
 153 |           setReportHistory(data as DailyReport[]);
 154 |           const today = (data as DailyReport[]).find(r => r.report_date === todayStr);
 155 |           if (today) setTodayReport(today);
 156 |         }
 157 |       })
 158 |       .catch((e: unknown) => logger.warn('AdminPortal', 'reports fetch failed', { error: String(e) }));
 159 | 
 160 |     setDataLoading(true);
 161 |     Promise.all([
 162 |       supabase.from('bookings').select('id,client_name,service,barber,scheduled_at,price_swl,status').order('scheduled_at', { ascending: false }).limit(50),
 163 |       supabase.from('profiles').select('id,name,email,role,upload_count,provider').order('created_at', { ascending: false }).limit(100),
 164 |       supabase.from('gallery_items').select('id,url,caption,created_at,uploader_id').eq('approved', false).order('created_at', { ascending: false }).limit(50),
 165 |     ]).then(([bRes, uRes, mRes]) => {
 166 |       if (!bRes.error) setBookings((bRes.data ?? []) as RealBooking[]);
 167 |       else logger.warn('AdminPortal', 'bookings fetch failed', { error: bRes.error.message });
 168 |       if (!uRes.error) setUsers((uRes.data ?? []) as RealUser[]);
 169 |       else logger.warn('AdminPortal', 'users fetch failed', { error: uRes.error.message });
 170 |       if (!mRes.error) setPendingMedia((mRes.data ?? []) as PendingMedia[]);
 171 |       else logger.warn('AdminPortal', 'media fetch failed', { error: mRes.error.message });
 172 |       setDataLoading(false);
 173 |     }).catch(e => { logger.warn('AdminPortal', 'data fetch error', { error: String(e) }); setDataLoading(false); });
 174 | 
 175 |     return () => {
 176 |       ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
 177 |         .forEach(v => document.documentElement.style.removeProperty(v));
 178 |     };
 179 |   }, []);
 180 | 
 181 |   const runAgentTest = async () => {
 182 |     setRunning(true);
 183 |     setAgResult(null);
 184 |     logger.info('AdminPortal', 'Running live agent validation test');
 185 |     try {
 186 |       const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
 187 |       const res = await bookingService.validate(
 188 |         { service: 'Signature Fade', date: futureDate, time: '14:30', email: user.email, clientId: user.id },
 189 |         ({ agents }) => setAgents(agents ?? [])
 190 |       );
 191 |       setAgResult(res);
 192 |     } catch (e) {
 193 |       logger.error('AdminPortal', 'Agent test error', { error: String(e) });
 194 |     } finally {
 195 |       setRunning(false);
 196 |     }
 197 |   };
 198 | 
 199 |   const pendingBookings = bookings.filter(b => b.status === 'pending');
 200 | 
 201 |   const generateReport = async (dateStr?: string) => {
 202 |     setReportLoading(true);
 203 |     setReportWaUrl(null);
 204 |     try {
 205 |       const { data, error } = await supabase.functions.invoke('daily-report', {
 206 |         body: { trigger: 'manual', date: dateStr },
 207 |       });
 208 |       if (error) throw new Error(error.message);
 209 |       const result = data as { ok: boolean; reportDate: string; stats: Record<string, number>; whatsappUrl: string; message: string; appointments: DailyReport['appointments'] };
 210 |       if (result.ok) {
 211 |         const todayStr = new Date().toISOString().slice(0, 10);
 212 |         const newReport: DailyReport = {
 213 |           report_date: result.reportDate,
 214 |           total_bookings: result.stats.total,
 215 |           confirmed: result.stats.confirmed,
 216 |           pending_count: result.stats.pending,
 217 |           cancelled: result.stats.cancelled,
 218 |           completed: result.stats.completed,
 219 |           total_revenue_swl: result.stats.revenue,
 220 |           appointments: result.appointments,
 221 |           whatsapp_message: result.message,
 222 |           generated_at: new Date().toISOString(),
 223 |         };
 224 |         if (result.reportDate === todayStr) setTodayReport(newReport);
 225 |         setReportHistory(prev => [newReport, ...prev.filter(r => r.report_date !== result.reportDate)].slice(0, 8));
 226 |         setReportWaUrl(result.whatsappUrl);
 227 |         logger.info('AdminPortal', 'Daily report generated', { date: result.reportDate });
 228 |       }
 229 |     } catch (e) {
 230 |       logger.error('AdminPortal', 'Report generation failed', { error: String(e) });
 231 |     } finally {
 232 |       setReportLoading(false);
 233 |     }
 234 |   };
 235 | 
 236 |   const meta = SECTION_META[section] ?? { eyebrow: '', title: section };
 237 | 
 238 |   const navBadges: Record<string, number> = {
 239 |     bookings: pendingBookings.length,
 240 |     gallery:  pendingMedia.length,
 241 |   };
 242 | 
 243 |   const Sidebar = () => (
 244 |     <div style={{
 245 |       width: 200, flexShrink: 0,
 246 |       background: 'var(--admin-s)',
 247 |       borderRight: '1px solid var(--admin-b)',
 248 |       display: 'flex', flexDirection: 'column',
 249 |       position: 'sticky', top: 0, height: 'calc(100vh - 80px)',
 250 |     }}>
 251 |       <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid var(--admin-b)' }}>
 252 |         <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>P</div>
 253 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.28em', color: 'var(--admin-m)', marginTop: 3, textTransform: 'uppercase' }}>Admin</div>
 254 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
 255 |       </div>
 256 | 
 257 |       <button onClick={() => { onClose(); setNavOpen(false); }} style={{
 258 |         background: 'none', border: 'none', color: 'var(--stone)',
 259 |         textAlign: 'left', padding: '10px 20px', fontSize: 11,
 260 |         fontFamily: 'DM Mono, monospace', letterSpacing: '.08em',
 261 |         minHeight: 'unset', marginTop: 6, cursor: 'pointer',
 262 |       }}>← Public Site</button>
 263 | 
 264 |       <div style={{ flex: 1, padding: '4px 0', overflowY: 'auto' }}>
 265 |         {NAV.map(n => {
 266 |           const badge = navBadges[n.id] ?? 0;
 267 |           return (
 268 |             <button key={n.id} onClick={() => { setSection(n.id); setNavOpen(false); }} style={{
 269 |               background: section === n.id ? 'rgba(255,179,71,.07)' : 'none',
 270 |               border: 'none',
 271 |               borderLeft: section === n.id ? '2px solid var(--admin-a)' : '2px solid transparent',
 272 |               color: section === n.id ? 'var(--admin-a)' : 'var(--admin-m)',
 273 |               textAlign: 'left', padding: '10px 20px', fontSize: 13,
 274 |               display: 'flex', alignItems: 'center', gap: 10,
 275 |               cursor: 'pointer', minHeight: 'unset', width: '100%',
 276 |               transition: 'color .15s, background .15s',
 277 |             }}>
 278 |               <span>{n.icon}</span>
 279 |               <span>{n.label}</span>
 280 |               {badge > 0 && (
 281 |                 <span style={{ marginLeft: 'auto', background: 'var(--admin-a)', color: 'var(--admin-bg)', fontSize: 8, padding: '1px 6px', borderRadius: 10, fontFamily: 'DM Mono, monospace' }}>
 282 |                   {badge}
 283 |                 </span>
 284 |               )}
 285 |             </button>
 286 |           );
 287 |         })}
 288 |       </div>
 289 | 
 290 |       {health && (
 291 |         <div style={{ padding: '10px 20px', borderTop: '1px solid var(--admin-b)' }}>
 292 |           {[["API", health.api], ["DB", health.db]].map(([l, s]) => (
 293 |             <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
 294 |               <span style={{ color: 'var(--admin-m)' }}>{l}</span>
 295 |               <span style={{ color: s === 'up' ? '#52E89A' : '#f87171' }}>● {String(s).toUpperCase()}</span>
 296 |             </div>
 297 |           ))}
 298 |         </div>
 299 |       )}
 300 | 
 301 |       <div style={{ padding: '12px 20px', borderTop: '1px solid var(--admin-b)' }}>
 302 |         <button onClick={onSignOut} style={{
 303 |           width: '100%', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
 304 |           color: '#f87171', borderRadius: 6, padding: '8px 12px', fontSize: 10,
 305 |           fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', minHeight: 'unset',
 306 |         }}>Sign Out</button>
 307 |       </div>
 308 |     </div>
 309 |   );
 310 | 
 311 |   return (
 312 |     <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)', position: 'relative' }}>
 313 | 
 314 |       {/* Desktop sidebar */}
 315 |       <div className="admin-sidebar-desktop">
 316 |         <Sidebar />
 317 |       </div>
 318 | 
 319 |       {/* Mobile overlay */}
 320 |       {navOpen && (
 321 |         <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={() => setNavOpen(false)}>
 322 |           <div style={{ width: 220, background: 'var(--admin-s)', borderRight: '1px solid var(--admin-b)', zIndex: 201, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
 323 |             <Sidebar />
 324 |           </div>
 325 |           <div style={{ flex: 1, background: 'rgba(0,0,0,.5)' }} />
 326 |         </div>
 327 |       )}
 328 | 
 329 |       {/* Main */}
 330 |       <div style={{ flex: 1, overflowY: 'auto', background: 'var(--admin-bg)', color: 'var(--admin-t)', minWidth: 0 }}>
 331 |         {/* Mobile top bar */}
 332 |         <div className="admin-mobile-bar">
 333 |           <button onClick={() => setNavOpen(true)} aria-label="Open navigation menu" style={{ background: 'none', border: 'none', color: 'var(--admin-m)', fontSize: 18, cursor: 'pointer', minHeight: 'unset', padding: '12px 16px' }}>☰</button>
 334 |           <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--brass)' }}>P</div>
 335 |           <button onClick={onSignOut} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', minHeight: 'unset', padding: '12px 16px' }}>OUT</button>
 336 |         </div>
 337 |         <div style={{ padding: '0 20px 60px' }}>
 338 | 
 339 |           <SectionHead eyebrow={meta.eyebrow} title={meta.title} sub={section === 'agents' ? meta.sub : undefined} />
 340 | 
 341 |           {section === 'dashboard' && (
 342 |             <div style={{ animation: 'portIn .25s ease' }}>
 343 |               <div className="sg">
 344 |                 {[
 345 |                   { v: String(bookings.filter(b => { const d = new Date(b.scheduled_at); const now = new Date(); return d.toDateString() === now.toDateString(); }).length), l: "Today's Bookings", d: `${bookings.filter(b => b.status === 'pending').length} pending` },
 346 |                   { v: `E${(bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.price_swl, 0) / 100).toFixed(0)}`, l: 'Total Revenue', d: `${bookings.length} bookings` },
 347 |                   { v: String(pendingMedia.length), l: 'Media Queue', d: 'awaiting review' },
 348 |                   { v: String(users.length), l: 'Members', d: `${users.filter(u => u.role === 'editor').length} editors` },
 349 |                 ].map(s => (
 350 |                   <div key={s.l} className="sc">
 351 |                     <div className="sc-v">{s.v}</div>
 352 |                     <div className="sc-l">{s.l}</div>
 353 |                     <div className="sc-d">{s.d}</div>
 354 |                   </div>
 355 |                 ))}
 356 |               </div>
 357 |               <div className="g2">
 358 |                 <div className="pc">
 359 |                   <div className="pc-h"><span className="pc-t">Recent Bookings</span><button className="pb" onClick={() => setSection('bookings')}>View All</button></div>
 360 |                   <div style={{ padding: '4px 18px' }}>
 361 |                     {bookings.slice(0, 4).map(b => (
 362 |                       <div key={b.id} className="bki">
 363 |                         <div className="bkav">{b.client_name?.[0] ?? '?'}</div>
 364 |                         <div style={{ flex: 1 }}>
 365 |                           <div className="bkn">{b.client_name}</div>
 366 |                           <div className="bkm">{b.service} · {new Date(b.scheduled_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
 367 |                         </div>
 368 |                         <span className={`bkst ${b.status}`}>{b.status}</span>
 369 |                       </div>
 370 |                     ))}
 371 |                   </div>
 372 |                 </div>
 373 |                 <div className="pc">
 374 |                   <div className="pc-h"><span className="pc-t">Activity Log</span><button className="pbg">Export</button></div>
 375 |                   <div className="slog" style={{ padding: '10px 18px' }}>
 376 |                     {SYSTEM_LOGS.map(l => (
 377 |                       <div key={l.t + l.msg} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
 378 |                         <span style={{ color: 'var(--port-m)', flexShrink: 0 }}>{l.t}</span>
 379 |                         <span style={{ color: LOG_COLOR[l.type] }}>{l.msg}</span>
 380 |                       </div>
 381 |                     ))}
 382 |                   </div>
 383 |                 </div>
 384 |               </div>
 385 |               <div className="pc">
 386 |                 <div className="pc-h"><span className="pc-t">Service Performance</span></div>
 387 |                 <div className="pc-b">
 388 |                   {[{ n: 'Signature Fade', p: 82 }, { n: 'Taper & Define', p: 64 }, { n: 'Full Package', p: 57 }, { n: 'Beard Architecture', p: 48 }, { n: 'Edge & Line-Up', p: 35 }].map(s => (
 389 |                     <div key={s.n} style={{ marginBottom: 12 }}>
 390 |                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
 391 |                         <span style={{ color: 'var(--port-t)' }}>{s.n}</span>
 392 |                         <span style={{ color: 'var(--port-a)' }}>{s.p}%</span>
 393 |                       </div>
 394 |                       <div className="pbar"><div className="pbar-f" style={{ width: s.p + '%' }}/></div>
 395 |                     </div>
 396 |                   ))}
 397 |                 </div>
 398 |               </div>
 399 |             </div>
 400 |           )}
 401 | 
 402 |           {section === 'reports' && (
 403 |             <div style={{ animation: 'portIn .25s ease' }}>
 404 |               {/* Licence card */}
 405 |               <div className="pc" style={{ marginBottom: 16 }}>
 406 |                 <div className="pc-h"><span className="pc-t">Trading Licence {BUSINESS.licence.renewedYear()}</span><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: '#52E89A', letterSpacing: '.2em' }}>● ACTIVE</span></div>
 407 |                 <div className="pc-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
 408 |                   {[
 409 |                     { label: 'Issued To',     value: BUSINESS.licence.issuedTo },
 410 |                     { label: 'Business',      value: BUSINESS.licence.businessName },
 411 |                     { label: 'Type',          value: BUSINESS.licence.type },
 412 |                     { label: 'Area',          value: BUSINESS.licence.area },
 413 |                     { label: 'Address',       value: BUSINESS.address },
 414 |                     { label: 'Expires',       value: `31 Dec ${BUSINESS.licence.renewedYear()} · ${BUSINESS.licence.note}` },
 415 |                   ].map(item => (
 416 |                     <div key={item.label}>
 417 |                       <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: 'var(--port-m)', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
 418 |                       <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{item.value}</div>
 419 |                     </div>
 420 |                   ))}
 421 |                 </div>
 422 |               </div>
 423 | 
 424 |               {/* Today's briefing */}
 425 |               <div className="pc" style={{ marginBottom: 16 }}>
 426 |                 <div className="pc-h">
 427 |                   <span className="pc-t">Today's Briefing</span>
 428 |                   <div style={{ display: 'flex', gap: 8 }}>
 429 |                     <button className="pb" onClick={() => generateReport()} disabled={reportLoading}>
 430 |                       {reportLoading ? 'Generating…' : 'Generate Now'}
 431 |                     </button>
 432 |                     {reportWaUrl && (
 433 |                       <a href={reportWaUrl} target="_blank" rel="noopener noreferrer" className="pb"
 434 |                         style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
 435 |                         📲 Send via WhatsApp
 436 |                       </a>
 437 |                     )}
 438 |                   </div>
 439 |                 </div>
 440 |                 <div className="pc-b">
 441 |                   {todayReport ? (
 442 |                     <div>
 443 |                       <div className="sg" style={{ marginBottom: 16 }}>
 444 |                         {[
 445 |                           { v: String(todayReport.total_bookings),    l: 'Appointments' },
 446 |                           { v: String(todayReport.confirmed),         l: 'Confirmed' },
 447 |                           { v: String(todayReport.pending_count),     l: 'Pending' },
 448 |                           { v: `E${Math.round(todayReport.total_revenue_swl / 100)}`, l: 'Revenue' },
 449 |                         ].map(s => (
 450 |                           <div key={s.l} className="sc">
 451 |                             <div className="sc-v">{s.v}</div>
 452 |                             <div className="sc-l">{s.l}</div>
 453 |                           </div>
 454 |                         ))}
 455 |                       </div>
 456 |                       {todayReport.appointments.length > 0 ? (
 457 |                         <div>
 458 |                           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', marginBottom: 10, textTransform: 'uppercase' }}>Today's Schedule</div>
 459 |                           {todayReport.appointments.map(apt => (
 460 |                             <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--port-bord)' }}>
 461 |                               <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--port-a)', minWidth: 44 }}>{apt.time}</span>
 462 |                               <div style={{ flex: 1 }}>
 463 |                                 <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--port-t)' }}>{apt.clientName}</div>
 464 |                                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>{apt.service}</div>
 465 |                               </div>
 466 |                               <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-a)' }}>E{Math.round(apt.priceSWL / 100)}</span>
 467 |                               <span className={`bkst ${apt.status}`}>{apt.status}</span>
 468 |                             </div>
 469 |                           ))}
 470 |                         </div>
 471 |                       ) : (
 472 |                         <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>No appointments today.</div>
 473 |                       )}
 474 |                     </div>
 475 |                   ) : (
 476 |                     <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
 477 |                       No report yet. Click "Generate Now" to create today's briefing.
 478 |                     </div>
 479 |                   )}
 480 |                 </div>
 481 |               </div>
 482 | 
 483 |               {/* Operating Hours */}
 484 |               <div className="pc">
 485 |                 <div className="pc-h"><span className="pc-t">Operating Hours</span></div>
 486 |                 <div className="pc-b">
 487 |                   {[
 488 |                     { days: 'Monday – Thursday', hours: '08:00 – 17:00' },
 489 |                     { days: 'Friday – Saturday', hours: '08:00 – 19:00' },
 490 |                     { days: 'Sunday',            hours: 'Closed' },
 491 |                   ].map(row => (
 492 |                     <div key={row.days} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--port-bord)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
 493 |                       <span style={{ color: 'var(--port-t)' }}>{row.days}</span>
 494 |                       <span style={{ color: row.hours === 'Closed' ? 'var(--port-m)' : 'var(--port-a)' }}>{row.hours}</span>
 495 |                     </div>
 496 |                   ))}
 497 |                   <div style={{ marginTop: 12, fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>
 498 |                     Contact: {BUSINESS.phone.primaryDisplay} · {BUSINESS.phone.secondaryDisplay}
 499 |                   </div>
 500 |                 </div>
 501 |               </div>
 502 | 
 503 |               {/* Report history */}
 504 |               {reportHistory.length > 0 && (
 505 |                 <div className="pc" style={{ marginTop: 16 }}>
 506 |                   <div className="pc-h"><span className="pc-t">Report History</span></div>
 507 |                   <div style={{ overflowX: 'auto' }}>
 508 |                     <table className="pt">
 509 |                       <thead><tr><th>Date</th><th>Bookings</th><th>Confirmed</th><th>Revenue</th><th>Actions</th></tr></thead>
 510 |                       <tbody>
 511 |                         {reportHistory.map(r => (
 512 |                           <tr key={r.report_date}>
 513 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{r.report_date}</td>
 514 |                             <td style={{ textAlign: 'center' }}>{r.total_bookings}</td>
 515 |                             <td style={{ textAlign: 'center', color: '#52E89A' }}>{r.confirmed}</td>
 516 |                             <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>E{Math.round(r.total_revenue_swl / 100)}</td>
 517 |                             <td>
 518 |                               {r.whatsapp_message && (
 519 |                                 <a href={`https://wa.me/${BUSINESS.phone.primary}?text=${encodeURIComponent(r.whatsapp_message)}`}
 520 |                                   target="_blank" rel="noopener noreferrer" className="pb"
 521 |                                   style={{ textDecoration: 'none', padding: '3px 7px', fontSize: 8, minHeight: 'unset', display: 'inline-block' }}>
 522 |                                   📲 WA
 523 |                                 </a>
 524 |                               )}
 525 |                             </td>
 526 |                           </tr>
 527 |                         ))}
 528 |                       </tbody>
 529 |                     </table>
 530 |                   </div>
 531 |                 </div>
 532 |               )}
 533 |             </div>
 534 |           )}
 535 | 
 536 |           {section === 'bookings' && (
 537 |             <div style={{ animation: 'portIn .25s ease' }}>
 538 |               <div className="pc">
 539 |                 <div className="pc-h"><span className="pc-t">All Appointments</span></div>
 540 |                 {dataLoading ? (
 541 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 542 |                 ) : (
 543 |                   <div style={{ overflowX: 'auto' }}>
 544 |                     <table className="pt">
 545 |                       <thead><tr><th>Client</th><th>Service</th><th>Barber</th><th>Date</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
 546 |                       <tbody>{bookings.map(b => {
 547 |                         const d = new Date(b.scheduled_at);
 548 |                         const dateStr = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
 549 |                         const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 550 |                         const setStatus = async (status: string) => {
 551 |                           const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
 552 |                           if (!error) setBookings(bks => bks.map(x => x.id === b.id ? { ...x, status } : x));
 553 |                           else logger.error('AdminPortal', 'booking update failed', { error: error.message });
 554 |                         };
 555 |                         return (
 556 |                           <tr key={b.id}>
 557 |                             <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{b.client_name}</td>
 558 |                             <td>{b.service}</td>
 559 |                             <td>{b.barber}</td>
 560 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{dateStr} {timeStr}</td>
 561 |                             <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>E{(b.price_swl / 100).toFixed(0)}</td>
 562 |                             <td><span className={`bkst ${b.status}`}>{b.status}</span></td>
 563 |                             <td>
 564 |                               <div style={{ display: 'flex', gap: 4 }}>
 565 |                                 {b.status === 'pending' && (
 566 |                                   <button className="pb" style={{ padding: '3px 7px', fontSize: 8, minHeight: 'unset' }} onClick={() => setStatus('confirmed')}>✓ Confirm</button>
 567 |                                 )}
 568 |                                 {b.status !== 'cancelled' && (
 569 |                                   <button style={{ padding: '3px 7px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 4, cursor: 'pointer' }} onClick={() => setStatus('cancelled')}>✗ Cancel</button>
 570 |                                 )}
 571 |                               </div>
 572 |                             </td>
 573 |                           </tr>
 574 |                         );
 575 |                       })}</tbody>
 576 |                     </table>
 577 |                   </div>
 578 |                 )}
 579 |               </div>
 580 |             </div>
 581 |           )}
 582 | 
 583 |           {section === 'users' && (
 584 |             <div style={{ animation: 'portIn .25s ease' }}>
 585 |               <div className="pc">
 586 |                 <div className="pc-h"><span className="pc-t">All Members</span></div>
 587 |                 {dataLoading ? (
 588 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 589 |                 ) : (
 590 |                   <div style={{ overflowX: 'auto' }}>
 591 |                     <table className="pt">
 592 |                       <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Uploads</th><th>Provider</th><th>Actions</th></tr></thead>
 593 |                       <tbody>{users.map(u => {
 594 |                         const changeRole = async (role: string) => {
 595 |                           if (u.id === user.id) return; // can't change own role
 596 |                           const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
 597 |                           if (!error) setUsers(us => us.map(x => x.id === u.id ? { ...x, role } : x));
 598 |                           else logger.error('AdminPortal', 'role update failed', { error: error.message });
 599 |                         };
 600 |                         return (
 601 |                           <tr key={u.id}>
 602 |                             <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{u.name}</td>
 603 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{u.email}</td>
 604 |                             <td><span className={`rp ${u.role}`}>{u.role}</span></td>
 605 |                             <td style={{ textAlign: 'center' }}>{u.upload_count ?? 0}</td>
 606 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>{u.provider}</td>
 607 |                             <td>
 608 |                               {u.id !== user.id && (
 609 |                                 <select
 610 |                                   value={u.role}
 611 |                                   onChange={e => changeRole(e.target.value)}
 612 |                                   style={{ background: 'var(--admin-s)', color: 'var(--admin-t)', border: '1px solid var(--admin-b)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}
 613 |                                 >
 614 |                                   <option value="viewer">viewer</option>
 615 |                                   <option value="editor">editor</option>
 616 |                                   <option value="admin">admin</option>
 617 |                                 </select>
 618 |                               )}
 619 |                             </td>
 620 |                           </tr>
 621 |                         );
 622 |                       })}</tbody>
 623 |                     </table>
 624 |                   </div>
 625 |                 )}
 626 |               </div>
 627 |             </div>
 628 |           )}
 629 | 
 630 |           {section === 'gallery' && (
 631 |             <div style={{ animation: 'portIn .25s ease' }}>
 632 |               <div className="pc">
 633 |                 <div className="pc-h">
 634 |                   <span className="pc-t">Pending Media — {pendingMedia.length} item{pendingMedia.length !== 1 ? 's' : ''}</span>
 635 |                 </div>
 636 |                 {dataLoading ? (
 637 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 638 |                 ) : pendingMedia.length === 0 ? (
 639 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontSize: 13 }}>No items pending review.</div>
 640 |                 ) : (
 641 |                   <div className="gport" style={{ padding: 18 }}>
 642 |                     {pendingMedia.map(item => (
 643 |                       <div key={item.id} className="gpimg">
 644 |                         {item.url.includes('/studio-media/') ? (
 645 |                           <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 646 |                         ) : (
 647 |                           <img src={item.url} alt={item.caption ?? 'pending'} loading="lazy" />
 648 |                         )}
 649 |                         <div className="gpov">
 650 |                           {item.caption && (
 651 |                             <div style={{ fontSize: 9, color: 'rgba(255,255,255,.85)', marginBottom: 4, fontFamily: 'DM Mono, monospace', padding: '0 4px' }}>
 652 |                               {item.caption}
 653 |                             </div>
 654 |                           )}
 655 |                           <div style={{ display: 'flex', gap: 5 }}>
 656 |                             <button className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }} onClick={async () => {
 657 |                               const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
 658 |                               if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
 659 |                               else logger.error('AdminPortal', 'gallery approve failed', { error: error.message });
 660 |                             }}>✓ Approve</button>
 661 |                             <button style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.3)', color: '#f87171', border: '1px solid rgba(248,113,113,.4)', borderRadius: 4, cursor: 'pointer' }} onClick={async () => {
 662 |                               const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
 663 |                               if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
 664 |                               else logger.error('AdminPortal', 'gallery reject failed', { error: error.message });
 665 |                             }}>✗ Reject</button>
 666 |                           </div>
 667 |                         </div>
 668 |                       </div>
 669 |                     ))}
 670 |                   </div>
 671 |                 )}
 672 |               </div>
 673 |             </div>
 674 |           )}
 675 | 
 676 |           {section === 'agents' && (
 677 |             <div style={{ animation: 'portIn .25s ease' }}>
 678 |               <div className="pc">
 679 |                 <div className="pc-h">
 680 |                   <span className="pc-t">Live Agent Run</span>
 681 |                   <button className="pb" onClick={runAgentTest} disabled={running}>
 682 |                     {running ? 'Running…' : 'Test Live Booking'}
 683 |                   </button>
 684 |                 </div>
 685 |                 <div className="pc-b">
 686 |                   <AgentPanel agents={agents} result={agResult} running={running} />
 687 |                 </div>
 688 |               </div>
 689 |               <div className="pc">
 690 |                 <div className="pc-h"><span className="pc-t">Architecture</span></div>
 691 |                 <div className="pc-b">
 692 |                   {[
 693 |                     ['🧩 State Agent',     'Validates field completeness, consistency, data types'],
 694 |                     ['🔒 Security Agent',  'XSS detection, injection scan, format validation'],
 695 |                     ['🗃️ Database Agent',  'Normalises record for Postgres insertion via Supabase'],
 696 |                     ['🛡️ RLS Validator',   'Confirms anon key policies allow the operation'],
 697 |                     ['🧠 Fix Synthesiser', 'Reads all 4 upstream outputs, produces recommendation'],
 698 |                   ].map(([n, d]) => (
 699 |                     <div key={n} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--port-bord)' }}>
 700 |                       <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)', minWidth: 180 }}>{n}</div>
 701 |                       <div style={{ fontSize: 11, color: 'var(--port-m)', lineHeight: 1.6 }}>{d}</div>
 702 |                     </div>
 703 |                   ))}
 704 |                 </div>
 705 |               </div>
 706 |             </div>
 707 |           )}
 708 | 
 709 |           {section === 'system' && (
 710 |             <div style={{ animation: 'portIn .25s ease' }}>
 711 |               <div className="sg">
 712 |                 {(health
 713 |                   ? [{ v: '✓', l: 'API' }, { v: `${health.responseMs}ms`, l: 'Response' }, { v: '99.8%', l: 'Uptime' }, { v: `${monitor.getSessionUptime()}s`, l: 'Session' }]
 714 |                   : [{ v: '…', l: 'API' }, { v: '…', l: 'Response' }, { v: '…', l: 'Uptime' }, { v: '…', l: 'Session' }]
 715 |                 ).map(s => (
 716 |                   <div key={s.l} className="sc">
 717 |                     <div className="sc-v" style={{ fontSize: '1.6rem' }}>{s.v}</div>
 718 |                     <div className="sc-l">{s.l}</div>
 719 |                   </div>
 720 |                 ))}
 721 |               </div>
 722 |               <div className="pc">
 723 |                 <div className="pc-h"><span className="pc-t">System Log</span><button className="pbg">Clear</button></div>
 724 |                 <div className="slog" style={{ padding: '10px 18px', maxHeight: 300 }}>
 725 |                   {SYSTEM_LOGS.map(l => (
 726 |                     <div key={l.t + l.msg} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
 727 |                       <span style={{ color: 'var(--port-m)', flexShrink: 0 }}>{l.t}</span>
 728 |                       <span style={{ color: LOG_COLOR[l.type] }}>{l.msg}</span>
 729 |                     </div>
 730 |                   ))}
 731 |                 </div>
 732 |               </div>
 733 |             </div>
 734 |           )}
 735 | 
 736 |           {section === 'rls' && (
 737 |             <div style={{ animation: 'portIn .25s ease' }}>
 738 |               <div className="pc">
 739 |                 <div className="pc-h"><span className="pc-t">Environment Keys</span></div>
 740 |                 <div className="pc-b">
 741 |                   {[
 742 |                     { type: 'public', label: 'VITE_SUPABASE_URL',     val: 'https://[ref].supabase.co',               note: 'Safe to expose. Configure in .env.local' },
 743 |                     { type: 'public', label: 'VITE_SUPABASE_ANON_KEY', val: 'eyJ…[anon key]',                          note: 'Safe to expose. Subject to RLS policies' },
 744 |                     { type: 'danger', label: 'SUPABASE_SERVICE_KEY',   val: 'NEVER SENT TO CLIENT — server env only',  note: 'Bypasses RLS. Server-side only. Never in browser.' },
 745 |                     { type: 'server', label: 'GOOGLE_CLIENT_ID',       val: '1234…apps.googleusercontent.com',         note: 'OAuth 2.0 client ID from Google Console' },
 746 |                     { type: 'server', label: 'APPLE_SERVICE_ID',       val: 'com.studiop.auth',                        note: 'Apple Sign In Service ID from Developer portal' },
 747 |                   ].map(k => (
 748 |                     <div key={k.label} className="key-row">
 749 |                       <div className={`key-badge ${k.type}`}>{k.type.toUpperCase()}</div>
 750 |                       <div style={{ flex: 1 }}>
 751 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)', marginBottom: 2 }}>{k.label}</div>
 752 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.val}</div>
 753 |                         <div style={{ fontSize: 10, color: 'var(--port-m)', marginTop: 2 }}>{k.note}</div>
 754 |                       </div>
 755 |                     </div>
 756 |                   ))}
 757 |                 </div>
 758 |               </div>
 759 |               <div className="pc">
 760 |                 <div className="pc-h"><span className="pc-t">Active RLS Policies</span></div>
 761 |                 <div style={{ overflowX: 'auto' }}>
 762 |                   <table className="pt">
 763 |                     <thead><tr><th>Table</th><th>Policy</th><th>Role</th><th>Using Clause</th></tr></thead>
 764 |                     <tbody>
 765 |                       {[
 766 |                         { table: 'bookings',     policy: 'select_own',  role: 'authenticated', clause: 'client_id = auth.uid()' },
 767 |                         { table: 'bookings',     policy: 'insert_auth', role: 'authenticated', clause: 'auth.role() = authenticated' },
 768 |                         { table: 'user_profiles',policy: 'read_own',    role: 'authenticated', clause: 'id = auth.uid()' },
 769 |                         { table: 'gallery',      policy: 'public_read', role: 'anon',          clause: 'approved = true' },
 770 |                       ].map(r => (
 771 |                         <tr key={r.table + r.policy}>
 772 |                           <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{r.table}</td>
 773 |                           <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{r.policy}</td>
 774 |                           <td><span className="rp viewer" style={{ fontSize: 7 }}>{r.role}</span></td>
 775 |                           <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-a)' }}>{r.clause}</td>
 776 |                         </tr>
 777 |                       ))}
 778 |                     </tbody>
 779 |                   </table>
 780 |                 </div>
 781 |               </div>
 782 |             </div>
 783 |           )}
 784 | 
 785 |         </div>
 786 |       </div>
 787 |     </div>
 788 |   );
 789 | }
 790 | 