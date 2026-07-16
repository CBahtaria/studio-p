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
  55 | interface DailyReportFunctionResult {
  56 |   ok: boolean;
  57 |   reportDate: string;
  58 |   stats: {
  59 |     total: number;
  60 |     confirmed: number;
  61 |     pending: number;
  62 |     cancelled: number;
  63 |     completed: number;
  64 |     revenue: number;
  65 |   };
  66 |   whatsappUrl: string;
  67 |   message: string;
  68 |   appointments: Array<{ id: string; clientName: string; service: string; time: string; status: string; priceSWL: number }>;
  69 | }
  70 | 
  71 | const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.06\'/%3E%3C/svg%3E")`;
  72 | const HERO_IMG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1400&q=70';
  73 | 
  74 | const NAV = [
  75 |   { id: 'dashboard', icon: '⚡', label: 'Dashboard',  badge: null },
  76 |   { id: 'reports',   icon: '📊', label: 'Reports',    badge: null },
  77 |   { id: 'bookings',  icon: '📅', label: 'Bookings',   badge: null },
  78 |   { id: 'users',     icon: '👥', label: 'Users',      badge: null },
  79 |   { id: 'gallery',   icon: '🖼️', label: 'Gallery',    badge: null },
  80 |   { id: 'agents',    icon: '🤖', label: 'Agents',     badge: null },
  81 |   { id: 'system',    icon: '🔧', label: 'System',     badge: null },
  82 |   { id: 'rls',       icon: '🛡️', label: 'RLS',        badge: null },
  83 | ];
  84 | 
  85 | 
  86 | const SYSTEM_LOGS = [
  87 |   { t: '14:32:05', type: 'ok',   msg: 'BK-A3F12 confirmed — Lungelo M.' },
  88 |   { t: '14:28:11', type: 'ok',   msg: 'RLS validated — agents:4 in 320ms' },
  89 |   { t: '14:15:44', type: 'warn', msg: 'Upload rate limit hit — viewer-001' },
  90 |   { t: '14:12:30', type: 'info', msg: 'Parallel agents: confidence 94%' },
  91 |   { t: '13:58:02', type: 'ok',   msg: 'Session created — admin@studiop.sz' },
  92 |   { t: '13:44:17', type: 'ok',   msg: 'Auto-backup snapshot v3 created' },
  93 |   { t: '13:10:55', type: 'err',  msg: 'CDN image load failure — m_1a2b' },
  94 | ];
  95 | 
  96 | const LOG_COLOR: Record<string, string> = {
  97 |   ok: '#52E89A', warn: '#FFB347', err: '#f87171', info: 'var(--port-a)',
  98 | };
  99 | 
 100 | const SECTION_META: Record<string, { eyebrow: string; title: string; sub?: string }> = {
 101 |   dashboard: { eyebrow: 'Command Centre',        title: 'Dashboard',         sub: 'Live operations overview for Fano Barbershop.' },
 102 |   reports:   { eyebrow: 'Daily Intelligence',    title: 'Reports & Briefing', sub: "Mfanomuhle's daily schedule, revenue summary, and one-tap WhatsApp briefings." },
 103 |   bookings:  { eyebrow: 'Appointment Management', title: 'Bookings',          sub: 'Manage, confirm, and track every chair.' },
 104 |   users:     { eyebrow: 'Member Directory',       title: 'Members' },
 105 |   gallery:   { eyebrow: 'Media Moderation',       title: 'Gallery',           sub: 'Approve or reject submitted photos and videos.' },
 106 |   agents:    { eyebrow: 'Parallel Processing',    title: 'Agent Engine',      sub: '4 validation agents run concurrently via Promise.all. A synthesiser agent reads all outputs and produces a final recommendation.' },
 107 |   system:    { eyebrow: 'System Status',          title: 'System' },
 108 |   rls:       { eyebrow: 'Row-Level Security',     title: 'RLS & Key Vault' },
 109 | };
 110 | 
 111 | function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
 112 |   return (
 113 |     <div style={{ position: 'relative', padding: '44px 0 28px', marginBottom: 28, borderBottom: '1px solid var(--admin-b)', overflow: 'hidden' }}>
 114 |       <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: .08, pointerEvents: 'none' }}/>
 115 |       <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .5, pointerEvents: 'none' }}/>
 116 |       <div style={{ position: 'relative' }}>
 117 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</div>
 118 |         <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, lineHeight: .92, color: 'var(--admin-t)' }}>{title}</h1>
 119 |         {sub && <p style={{ fontSize: 13, color: 'var(--admin-m)', marginTop: 10, lineHeight: 1.6, maxWidth: 520 }}>{sub}</p>}
 120 |       </div>
 121 |     </div>
 122 |   );
 123 | }
 124 | 
 125 | interface AdminPortalProps {
 126 |   user: UserProfile;
 127 |   onClose: () => void;
 128 |   onSignOut: () => void;
 129 | }
 130 | 
 131 | export function AdminPortal({ user, onClose, onSignOut }: AdminPortalProps) {
 132 |   const [section, setSection]         = useState('dashboard');
 133 |   const [navOpen, setNavOpen]         = useState(false);
 134 |   const [agents, setAgents]           = useState<Agent[]>([]);
 135 |   const [agResult, setAgResult]       = useState<OrchestrationResult | null>(null);
 136 |   const [running, setRunning]         = useState(false);
 137 |   const [health, setHealth]           = useState<HealthStatus | null>(null);
 138 |   const [bookings, setBookings]         = useState<RealBooking[]>([]);
 139 |   const [users, setUsers]               = useState<RealUser[]>([]);
 140 |   const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
 141 |   const [dataLoading, setDataLoading]   = useState(false);
 142 |   const [todayReport, setTodayReport]   = useState<DailyReport | null>(null);
 143 |   const [reportHistory, setReportHistory] = useState<DailyReport[]>([]);
 144 |   const [reportLoading, setReportLoading] = useState(false);
 145 |   const [reportWaUrl, setReportWaUrl]   = useState<string | null>(null);
 146 | 
 147 |   useEffect(() => {
 148 |     document.documentElement.style.setProperty('--port-bg',   'var(--admin-bg)');
 149 |     document.documentElement.style.setProperty('--port-side', 'var(--admin-s)');
 150 |     document.documentElement.style.setProperty('--port-bord', 'var(--admin-b)');
 151 |     document.documentElement.style.setProperty('--port-a',    'var(--admin-a)');
 152 |     document.documentElement.style.setProperty('--port-a2',   'var(--admin-a2)');
 153 |     document.documentElement.style.setProperty('--port-t',    'var(--admin-t)');
 154 |     document.documentElement.style.setProperty('--port-m',    'var(--admin-m)');
 155 | 
 156 |     monitor.getHealth().then(setHealth).catch(e => logger.warn('AdminPortal', 'health check failed', { error: String(e) }));
 157 | 
 158 |     // Load today's report + last 7 days of history
 159 |     const todayStr = new Date().toISOString().slice(0, 10);
 160 |     Promise.resolve(
 161 |       supabase
 162 |         .from('daily_reports')
 163 |         .select('report_date, total_bookings, confirmed, pending_count, cancelled, completed, total_revenue_swl, appointments, whatsapp_message, generated_at')
 164 |         .gte('report_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
 165 |         .order('report_date', { ascending: false })
 166 |         .limit(8)
 167 |     ).then(({ data }) => {
 168 |         if (data && data.length > 0) {
 169 |           const mappedData: DailyReport[] = data.map(item => ({ // Explicitly map to DailyReport
 170 |             report_date: item.report_date,
 171 |             total_bookings: item.total_bookings,
 172 |             confirmed: item.confirmed,
 173 |             pending_count: item.pending_count,
 174 |             cancelled: item.cancelled,
 175 |             completed: item.completed,
 176 |             total_revenue_swl: item.total_revenue_swl,
 177 |             appointments: item.appointments,
 178 |             whatsapp_message: item.whatsapp_message,
 179 |             generated_at: item.generated_at,
 180 |           }));
 181 |           setReportHistory(mappedData);
 182 |           const today = mappedData.find(r => r.report_date === todayStr);
 183 |           if (today) setTodayReport(today);
 184 |         }
 185 |       })
 186 |       .catch((e: unknown) => logger.warn('AdminPortal', 'reports fetch failed', { error: String(e) }));
 187 | 
 188 |     setDataLoading(true);
 189 |     Promise.all([
 190 |       supabase.from('bookings').select('id,client_name,service,barber,scheduled_at,price_swl,status').order('scheduled_at', { ascending: false }).limit(50),
 191 |       supabase.from('profiles').select('id,name,email,role,upload_count,provider').order('created_at', { ascending: false }).limit(100),
 192 |       supabase.from('gallery_items').select('id,url,caption,created_at,uploader_id').eq('approved', false).order('created_at', { ascending: false }).limit(50),
 193 |     ]).then(([bRes, uRes, mRes]) => {
 194 |       if (!bRes.error) setBookings((bRes.data ?? []) as RealBooking[]);
 195 |       else logger.warn('AdminPortal', 'bookings fetch failed', { error: bRes.error.message });
 196 |       if (!uRes.error) setUsers((uRes.data ?? []) as RealUser[]);
 197 |       else logger.warn('AdminPortal', 'users fetch failed', { error: uRes.error.message });
 198 |       if (!mRes.error) setPendingMedia((mRes.data ?? []) as PendingMedia[]);
 199 |       else logger.warn('AdminPortal', 'media fetch failed', { error: mRes.error.message });
 200 |       setDataLoading(false);
 201 |     }).catch(e => { logger.warn('AdminPortal', 'data fetch error', { error: String(e) }); setDataLoading(false); });
 202 | 
 203 |     return () => {
 204 |       ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
 205 |         .forEach(v => document.documentElement.style.removeProperty(v));
 206 |     };
 207 |   }, []);
 208 | 
 209 |   const runAgentTest = async () => {
 210 |     setRunning(true);
 211 |     setAgResult(null);
 212 |     logger.info('AdminPortal', 'Running live agent validation test');
 213 |     try {
 214 |       const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
 215 |       const res = await bookingService.validate(
 216 |         { service: 'Signature Fade', date: futureDate, time: '14:30', email: user.email, clientId: user.id },
 217 |         ({ agents }) => setAgents(agents ?? [])
 218 |       );
 219 |       setAgResult(res);
 220 |     } catch (e) {
 221 |       logger.error('AdminPortal', 'Agent test error', { error: String(e) });
 222 |     } finally {
 223 |       setRunning(false);
 224 |     }
 225 |   };
 226 | 
 227 |   const pendingBookings = bookings.filter(b => b.status === 'pending');
 228 | 
 229 |   const generateReport = async (dateStr?: string) => {
 230 |     setReportLoading(true);
 231 |     setReportWaUrl(null);
 232 |     try {
 233 |       const { data, error } = await supabase.functions.invoke('daily-report', {
 234 |         body: { trigger: 'manual', date: dateStr },
 235 |       });
 236 |       if (error) throw new Error(error.message);
 237 |       const result = data as DailyReportFunctionResult; // Use new interface
 238 |       if (result.ok) {
 239 |         const todayStr = new Date().toISOString().slice(0, 10);
 240 |         const newReport: DailyReport = {
 241 |           report_date: result.reportDate,
 242 |           total_bookings: result.stats.total,
 243 |           confirmed: result.stats.confirmed,
 244 |           pending_count: result.stats.pending,
 245 |           cancelled: result.stats.cancelled,
 246 |           completed: result.stats.completed,
 247 |           total_revenue_swl: result.stats.revenue,
 248 |           appointments: result.appointments,
 249 |           whatsapp_message: result.message,
 250 |           generated_at: new Date().toISOString(),
 251 |         };
 252 |         if (result.reportDate === todayStr) setTodayReport(newReport);
 253 |         setReportHistory(prev => [newReport, ...prev.filter(r => r.report_date !== result.reportDate)].slice(0, 8));
 254 |         setReportWaUrl(result.whatsappUrl);
 255 |         logger.info('AdminPortal', 'Daily report generated', { date: result.reportDate });
 256 |       }
 257 |     } catch (e) {
 258 |       logger.error('AdminPortal', 'Report generation failed', { error: String(e) });
 259 |     } finally {
 260 |       setReportLoading(false);
 261 |     }
 262 |   };
 263 | 
 264 |   const meta = SECTION_META[section] ?? { eyebrow: '', title: section };
 265 | 
 266 |   const navBadges: Record<string, number> = {
 267 |     bookings: pendingBookings.length,
 268 |     gallery:  pendingMedia.length,
 269 |   };
 270 | 
 271 |   const Sidebar = () => (
 272 |     <div style={{
 273 |       width: 200, flexShrink: 0,
 274 |       background: 'var(--admin-s)',
 275 |       borderRight: '1px solid var(--admin-b)',
 276 |       display: 'flex', flexDirection: 'column',
 277 |       position: 'sticky', top: 0, height: 'calc(100vh - 80px)',
 278 |     }}>
 279 |       <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid var(--admin-b)' }}>
 280 |         <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>P</div>
 281 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.28em', color: 'var(--admin-m)', marginTop: 3, textTransform: 'uppercase' }}>Admin</div>
 282 |         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
 283 |       </div>
 284 | 
 285 |       <button onClick={() => { onClose(); setNavOpen(false); }} style={{
 286 |         background: 'none', border: 'none', color: 'var(--stone)',
 287 |         textAlign: 'left', padding: '10px 20px', fontSize: 11,
 288 |         fontFamily: 'DM Mono, monospace', letterSpacing: '.08em',
 289 |         minHeight: 'unset', marginTop: 6, cursor: 'pointer',
 290 |       }}>← Public Site</button>
 291 | 
 292 |       <div style={{ flex: 1, padding: '4px 0', overflowY: 'auto' }}>
 293 |         {NAV.map(n => {
 294 |           const badge = navBadges[n.id] ?? 0;
 295 |           return (
 296 |             <button key={n.id} onClick={() => { setSection(n.id); setNavOpen(false); }} style={{
 297 |               background: section === n.id ? 'rgba(255,179,71,.07)' : 'none',
 298 |               border: 'none',
 299 |               borderLeft: section === n.id ? '2px solid var(--admin-a)' : '2px solid transparent',
 300 |               color: section === n.id ? 'var(--admin-a)' : 'var(--admin-m)',
 301 |               textAlign: 'left', padding: '10px 20px', fontSize: 13,
 302 |               display: 'flex', alignItems: 'center', gap: 10,
 303 |               cursor: 'pointer', minHeight: 'unset', width: '100%',
 304 |               transition: 'color .15s, background .15s',
 305 |             }}>
 306 |               <span>{n.icon}</span>
 307 |               <span>{n.label}</span>
 308 |               {badge > 0 && (
 309 |                 <span style={{ marginLeft: 'auto', background: 'var(--admin-a)', color: 'var(--admin-bg)', fontSize: 8, padding: '1px 6px', borderRadius: 10, fontFamily: 'DM Mono, monospace' }}>
 310 |                   {badge}
 311 |                 </span>
 312 |               )}
 313 |             </button>
 314 |           );
 315 |         })}
 316 |       </div>
 317 | 
 318 |       {health && (
 319 |         <div style={{ padding: '10px 20px', borderTop: '1px solid var(--admin-b)' }}>
 320 |           [['API', health.api], ['DB', health.db]].map(([l, s]) => (
 321 |             <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
 322 |               <span style={{ color: 'var(--admin-m)' }}>{l}</span>
 323 |               <span style={{ color: s === 'up' ? '#52E89A' : '#f87171' }}>● {String(s).toUpperCase()}</span>
 324 |             </div>
 325 |           ))}
 326 |         </div>
 327 |       )}
 328 | 
 329 |       <div style={{ padding: '12px 20px', borderTop: '1px solid var(--admin-b)' }}>
 330 |         <button onClick={onSignOut} style={{
 331 |           width: '100%', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
 332 |           color: '#f87171', borderRadius: 6, padding: '8px 12px', fontSize: 10,
 333 |           fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', minHeight: 'unset',
 334 |         }}>Sign Out</button>
 335 |       </div>
 336 |     </div>
 337 |   );
 338 | 
 339 |   return (
 340 |     <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)', position: 'relative' }}>
 341 | 
 342 |       {/* Desktop sidebar */}
 343 |       <div className="admin-sidebar-desktop">
 344 |         <Sidebar />
 345 |       </div>
 346 | 
 347 |       {/* Mobile overlay */}
 348 |       {navOpen && (
 349 |         <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={() => setNavOpen(false)}>
 350 |           <div style={{ width: 220, background: 'var(--admin-s)', borderRight: '1px solid var(--admin-b)', zIndex: 201, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
 351 |             <Sidebar />
 352 |           </div>
 353 |           <div style={{ flex: 1, background: 'rgba(0,0,0,.5)' }} />
 354 |         </div>
 355 |       )}
 356 | 
 357 |       {/* Main */}
 358 |       <div style={{ flex: 1, overflowY: 'auto', background: 'var(--admin-bg)', color: 'var(--admin-t)', minWidth: 0 }}>
 359 |         {/* Mobile top bar */}
 360 |         <div className="admin-mobile-bar">
 361 |           <button onClick={() => setNavOpen(true)} aria-label="Open navigation" style={{ background: 'none', border: 'none', color: 'var(--admin-m)', fontSize: 18, cursor: 'pointer', minHeight: 'unset', padding: '12px 16px' }}>☰</button>
 362 |           <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--brass)' }}>P</div>
 363 |           <button onClick={onSignOut} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', minHeight: 'unset', padding: '12px 16px' }}>OUT</button>
 364 |         </div>
 365 |         <div style={{ padding: '0 20px 60px' }}>
 366 | 
 367 |           <SectionHead eyebrow={meta.eyebrow} title={meta.title} sub={section === 'agents' ? meta.sub : undefined} />
 368 | 
 369 |           {section === 'dashboard' && (
 370 |             <div style={{ animation: 'portIn .25s ease' }}>
 371 |               <div className="sg">
 372 |                 {[
 373 |                   { v: String(bookings.filter(b => { const d = new Date(b.scheduled_at); const now = new Date(); return d.toDateString() === now.toDateString(); }).length), l: "Today's Bookings", d: `${bookings.filter(b => b.status === 'pending').length} pending` },
 374 |                   { v: `E${(bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.price_swl, 0) / 100).toFixed(0)}`, l: 'Total Revenue', d: `${bookings.length} bookings` },
 375 |                   { v: String(pendingMedia.length), l: 'Media Queue', d: 'awaiting review' },
 376 |                   { v: String(users.length), l: 'Members', d: `${users.filter(u => u.role === 'editor').length} editors` },
 377 |                 ].map(s => (
 378 |                   <div key={s.l} className="sc">
 379 |                     <div className="sc-v">{s.v}</div>
 380 |                     <div className="sc-l">{s.l}</div>
 381 |                     <div className="sc-d">{s.d}</div>
 382 |                   </div>
 383 |                 ))}
 384 |               </div>
 385 |               <div className="g2">
 386 |                 <div className="pc">
 387 |                   <div className="pc-h"><span className="pc-t">Recent Bookings</span><button className="pb" onClick={() => setSection('bookings')}>View All</button></div>
 388 |                   <div style={{ padding: '4px 18px' }}>
 389 |                     {bookings.slice(0, 4).map(b => (
 390 |                       <div key={b.id} className="bki">
 391 |                         <div className="bkav">{b.client_name?.[0] ?? '?'}</div>
 392 |                         <div style={{ flex: 1 }}>
 393 |                           <div className="bkn">{b.client_name}</div>
 394 |                           <div className="bkm">{b.service} · {new Date(b.scheduled_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
 395 |                         </div>
 396 |                         <span className={`bkst ${b.status}`}>{b.status}</span>
 397 |                       </div>
 398 |                     ))}
 399 |                   </div>
 400 |                 </div>
 401 |                 <div className="pc">
 402 |                   <div className="pc-h"><span className="pc-t">Activity Log</span><button className="pbg">Export</button></div>
 403 |                   <div className="slog" style={{ padding: '10px 18px' }}>
 404 |                     {SYSTEM_LOGS.map(l => (
 405 |                       <div key={l.t + l.msg} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
 406 |                         <span style={{ color: 'var(--port-m)', flexShrink: 0 }}>{l.t}</span>
 407 |                         <span style={{ color: LOG_COLOR[l.type] }}>{l.msg}</span>
 408 |                       </div>
 409 |                     ))}
 410 |                   </div>
 411 |                 </div>
 412 |               </div>
 413 |               <div className="pc">
 414 |                 <div className="pc-h"><span className="pc-t">Service Performance</span></div>
 415 |                 <div className="pc-b">
 416 |                   {[{ n: 'Signature Fade', p: 82 }, { n: 'Taper & Define', p: 64 }, { n: 'Full Package', p: 57 }, { n: 'Beard Architecture', p: 48 }, { n: 'Edge & Line-Up', p: 35 }].map(s => (
 417 |                     <div key={s.n} style={{ marginBottom: 12 }}>
 418 |                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
 419 |                         <span style={{ color: 'var(--port-t)' }}>{s.n}</span>
 420 |                         <span style={{ color: 'var(--port-a)' }}>{s.p}%</span>
 421 |                       </div>
 422 |                       <div className="pbar"><div className="pbar-f" style={{ width: s.p + '%' }}/></div>
 423 |                     </div>
 424 |                   ))}
 425 |                 </div>
 426 |               </div>
 427 |             </div>
 428 |           )}
 429 | 
 430 |           {section === 'reports' && (
 431 |             <div style={{ animation: 'portIn .25s ease' }}>
 432 |               {/* Licence card */}
 433 |               <div className="pc" style={{ marginBottom: 16 }}>
 434 |                 <div className="pc-h"><span className="pc-t">Trading Licence {BUSINESS.licence.renewedYear()}</span><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: '#52E89A', letterSpacing: '.2em' }}>● ACTIVE</span></div>
 435 |                 <div className="pc-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
 436 |                   {[
 437 |                     { label: 'Issued To',     value: BUSINESS.licence.issuedTo },
 438 |                     { label: 'Business',      value: BUSINESS.licence.businessName },
 439 |                     { label: 'Type',          value: BUSINESS.licence.type },
 440 |                     { label: 'Area',          value: BUSINESS.licence.area },
 441 |                     { label: 'Address',       value: BUSINESS.address },
 442 |                     { label: 'Expires',       value: `31 Dec ${BUSINESS.licence.renewedYear()} · ${BUSINESS.licence.note}` },
 443 |                   ].map(item => (
 444 |                     <div key={item.label}>
 445 |                       <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: 'var(--port-m)', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
 446 |                       <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{item.value}</div>
 447 |                     </div>
 448 |                   ))}
 449 |                 </div>
 450 |               </div>
 451 | 
 452 |               {/* Today's briefing */}
 453 |               <div className="pc" style={{ marginBottom: 16 }}>
 454 |                 <div className="pc-h">
 455 |                   <span className="pc-t">Today's Briefing</span>
 456 |                   <div style={{ display: 'flex', gap: 8 }}>
 457 |                     <button className="pb" onClick={() => generateReport()} disabled={reportLoading}>
 458 |                       {reportLoading ? 'Generating…' : 'Generate Now'}
 459 |                     </button>
 460 |                     {reportWaUrl && (
 461 |                       <a href={reportWaUrl} target="_blank" rel="noopener noreferrer" className="pb"
 462 |                         style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
 463 |                         📲 Send via WhatsApp
 464 |                       </a>
 465 |                     )}
 466 |                   </div>
 467 |                 </div>
 468 |                 <div className="pc-b">
 469 |                   {todayReport ? (
 470 |                     <div>
 471 |                       <div className="sg" style={{ marginBottom: 16 }}>
 472 |                         {[
 473 |                           { v: String(todayReport.total_bookings),    l: 'Appointments' },
 474 |                           { v: String(todayReport.confirmed),         l: 'Confirmed' },
 475 |                           { v: String(todayReport.pending_count),     l: 'Pending' },
 476 |                           { v: `E${Math.round(todayReport.total_revenue_swl / 100)}`, l: 'Revenue' },
 477 |                         ].map(s => (
 478 |                           <div key={s.l} className="sc">
 479 |                             <div className="sc-v">{s.v}</div>
 480 |                             <div className="sc-l">{s.l}</div>
 481 |                           </div>
 482 |                         ))}
 483 |                       </div>
 484 |                       {todayReport.appointments.length > 0 ? (
 485 |                         <div>
 486 |                           <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', marginBottom: 10, textTransform: 'uppercase' }}>Today's Schedule</div>
 487 |                           {todayReport.appointments.map(apt => (
 488 |                             <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--port-bord)' }}>
 489 |                               <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--port-a)', minWidth: 44 }}>{apt.time}</span>
 490 |                               <div style={{ flex: 1 }}>
 491 |                                 <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--port-t)' }}>{apt.clientName}</div>
 492 |                                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>{apt.service}</div>
 493 |                               </div>
 494 |                               <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-a)' }}>E{Math.round(apt.priceSWL / 100)}</span>
 495 |                               <span className={`bkst ${apt.status}`}>{apt.status}</span>
 496 |                             </div>
 497 |                           ))}
 498 |                         </div>
 499 |                       ) : (
 500 |                         <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>No appointments today.</div>
 501 |                       )}
 502 |                     </div>
 503 |                   ) : (
 504 |                     <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
 505 |                       No report yet. Click "Generate Now" to create today's briefing.
 506 |                     </div>
 507 |                   )}
 508 |                 </div>
 509 |               </div>
 510 | 
 511 |               {/* Operating Hours */}
 512 |               <div className="pc">
 513 |                 <div className="pc-h"><span className="pc-t">Operating Hours</span></div>
 514 |                 <div className="pc-b">
 515 |                   [
 516 |                     { days: 'Monday – Thursday', hours: '08:00 – 17:00' },
 517 |                     { days: 'Friday – Saturday', hours: '08:00 – 19:00' },
 518 |                     { days: 'Sunday',            hours: 'Closed' },
 519 |                   ].map(row => (
 520 |                     <div key={row.days} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--port-bord)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
 521 |                       <span style={{ color: 'var(--port-t)' }}>{row.days}</span>
 522 |                       <span style={{ color: row.hours === 'Closed' ? 'var(--port-m)' : 'var(--port-a)' }}>{row.hours}</span>
 523 |                     </div>
 524 |                   ))
 525 |                   <div style={{ marginTop: 12, fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>
 526 |                     Contact: {BUSINESS.phone.primaryDisplay} · {BUSINESS.phone.secondaryDisplay}
 527 |                   </div>
 528 |                 </div>
 529 |               </div>
 530 | 
 531 |               {/* Report history */}
 532 |               {reportHistory.length > 0 && (
 533 |                 <div className="pc" style={{ marginTop: 16 }}>
 534 |                   <div className="pc-h"><span className="pc-t">Report History</span></div>
 535 |                   <div style={{ overflowX: 'auto' }}>
 536 |                     <table className="pt">
 537 |                       <thead><tr><th>Date</th><th>Bookings</th><th>Confirmed</th><th>Revenue</th><th>Actions</th></tr></thead>
 538 |                       <tbody>
 539 |                         {reportHistory.map(r => (
 540 |                           <tr key={r.report_date}>
 541 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{r.report_date}</td>
 542 |                             <td style={{ textAlign: 'center' }}>{r.total_bookings}</td>
 543 |                             <td style={{ textAlign: 'center', color: '#52E89A' }}>{r.confirmed}</td>
 544 |                             <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>E{Math.round(r.total_revenue_swl / 100)}</td>
 545 |                             <td>
 546 |                               {r.whatsapp_message && (
 547 |                                 <a href={`https://wa.me/${BUSINESS.phone.primary}?text=${encodeURIComponent(r.whatsapp_message)}`}
 548 |                                   target="_blank" rel="noopener noreferrer" className="pb"
 549 |                                   style={{ textDecoration: 'none', padding: '3px 7px', fontSize: 8, minHeight: 'unset', display: 'inline-block' }}>
 550 |                                   📲 WA
 551 |                                 </a>
 552 |                               )}
 553 |                             </td>
 554 |                           </tr>
 555 |                         ))}
 556 |                       </tbody>
 557 |                     </table>
 558 |                   </div>
 559 |                 </div>
 560 |               )}
 561 |             </div>
 562 |           )}
 563 | 
 564 |           {section === 'bookings' && (
 565 |             <div style={{ animation: 'portIn .25s ease' }}>
 566 |               <div className="pc">
 567 |                 <div className="pc-h"><span className="pc-t">All Appointments</span></div>
 568 |                 {dataLoading ? (
 569 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 570 |                 ) : (
 571 |                   <div style={{ overflowX: 'auto' }}>
 572 |                     <table className="pt">
 573 |                       <thead><tr><th>Client</th><th>Service</th><th>Barber</th><th>Date</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
 574 |                       <tbody>{bookings.map(b => {
 575 |                         const d = new Date(b.scheduled_at);
 576 |                         const dateStr = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
 577 |                         const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
 578 |                         const setStatus = async (status: string) => {
 579 |                           const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
 580 |                           if (!error) setBookings(bks => bks.map(x => x.id === b.id ? { ...x, status } : x));
 581 |                           else logger.error('AdminPortal', 'booking update failed', { error: error.message });
 582 |                         };
 583 |                         return (
 584 |                           <tr key={b.id}>
 585 |                             <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{b.client_name}</td>
 586 |                             <td>{b.service}</td>
 587 |                             <td>{b.barber}</td>
 588 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{dateStr} {timeStr}</td>
 589 |                             <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>E{(b.price_swl / 100).toFixed(0)}</td>
 590 |                             <td><span className={`bkst ${b.status}`}>{b.status}</span></td>
 591 |                             <td>
 592 |                               <div style={{ display: 'flex', gap: 4 }}>
 593 |                                 {b.status === 'pending' && (
 594 |                                   <button className="pb" style={{ padding: '3px 7px', fontSize: 8, minHeight: 'unset' }} onClick={() => setStatus('confirmed')}>✓ Confirm</button>
 595 |                                 )}
 596 |                                 {b.status !== 'cancelled' && (
 597 |                                   <button style={{ padding: '3px 7px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 4, cursor: 'pointer' }} onClick={() => setStatus('cancelled')}>✗ Cancel</button>
 598 |                                 )}
 599 |                               </div>
 600 |                             </td>
 601 |                           </tr>
 602 |                         );
 603 |                       })}</tbody>
 604 |                     </table>
 605 |                   </div>
 606 |                 )}
 607 |               </div>
 608 |             </div>
 609 |           )}
 610 | 
 611 |           {section === 'users' && (
 612 |             <div style={{ animation: 'portIn .25s ease' }}>
 613 |               <div className="pc">
 614 |                 <div className="pc-h"><span className="pc-t">All Members</span></div>
 615 |                 {dataLoading ? (
 616 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 617 |                 ) : (
 618 |                   <div style={{ overflowX: 'auto' }}>
 619 |                     <table className="pt">
 620 |                       <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Uploads</th><th>Provider</th><th>Actions</th></tr></thead>
 621 |                       <tbody>{users.map(u => {
 622 |                         const changeRole = async (role: string) => {
 623 |                           if (u.id === user.id) return; // can't change own role
 624 |                           const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
 625 |                           if (!error) setUsers(us => us.map(x => x.id === u.id ? { ...x, role } : x));
 626 |                           else logger.error('AdminPortal', 'role update failed', { error: error.message });
 627 |                         };
 628 |                         return (
 629 |                           <tr key={u.id}>
 630 |                             <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{u.name}</td>
 631 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{u.email}</td>
 632 |                             <td><span className={`rp ${u.role}`}>{u.role}</span></td>
 633 |                             <td style={{ textAlign: 'center' }}>{u.upload_count ?? 0}</td>
 634 |                             <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>{u.provider}</td>
 635 |                             <td>
 636 |                               {u.id !== user.id && (
 637 |                                 <select
 638 |                                   value={u.role}
 639 |                                   onChange={e => changeRole(e.target.value)}
 640 |                                   aria-label="Change user role"
 641 |                                   style={{ background: 'var(--admin-s)', color: 'var(--admin-t)', border: '1px solid var(--admin-b)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}
 642 |                                 >
 643 |                                   <option value="viewer">viewer</option>
 644 |                                   <option value="editor">editor</option>
 645 |                                   <option value="admin">admin</option>
 646 |                                 </select>
 647 |                               )}
 648 |                             </td>
 649 |                           </tr>
 650 |                         );
 651 |                       })}</tbody>
 652 |                     </table>
 653 |                   </div>
 654 |                 )}
 655 |               </div>
 656 |             </div>
 657 |           )}
 658 | 
 659 |           {section === 'gallery' && (
 660 |             <div style={{ animation: 'portIn .25s ease' }}>
 661 |               <div className="pc">
 662 |                 <div className="pc-h">
 663 |                   <span className="pc-t">Pending Media — {pendingMedia.length} item{pendingMedia.length !== 1 ? 's' : ''}</span>
 664 |                 </div>
 665 |                 {dataLoading ? (
 666 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
 667 |                 ) : pendingMedia.length === 0 ? (
 668 |                   <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontSize: 13 }}>No items pending review.</div>
 669 |                 ) : (
 670 |                   <div className="gport" style={{ padding: 18 }}>
 671 |                     {pendingMedia.map(item => (
 672 |                       <div key={item.id} className="gpimg">
 673 |                         {item.url.includes('/studio-media/') ? (
 674 |                           <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
 675 |                         ) : (
 676 |                           <img src={item.url} alt={item.caption ?? 'pending'} loading="lazy" />
 677 |                         )}
 678 |                         <div className="gpov">
 679 |                           {item.caption && (
 680 |                             <div style={{ fontSize: 9, color: 'rgba(255,255,255,.85)', marginBottom: 4, fontFamily: 'DM Mono, monospace', padding: '0 4px' }}>
 681 |                               {item.caption}
 682 |                             </div>
 683 |                           )}
 684 |                           <div style={{ display: 'flex', gap: 5 }}>
 685 |                             <button className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }} onClick={async () => {
 686 |                               const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
 687 |                               if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
 688 |                               else logger.error('AdminPortal', 'gallery approve failed', { error: error.message });
 689 |                             }}>✓ Approve</button>
 690 |                             <button style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.3)', color: '#f87171', border: '1px solid rgba(248,113,113,.4)', borderRadius: 4, cursor: 'pointer' }} onClick={async () => {
 691 |                               const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
 692 |                               if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
 693 |                               else logger.error('AdminPortal', 'gallery reject failed', { error: error.message });
 694 |                             }}>✗ Reject</button>
 695 |                           </div>
 696 |                         </div>
 697 |                       </div>
 698 |                     ))}
 699 |                   </div>
 700 |                 )}
 701 |               </div>
 702 |             </div>
 703 |           )}
 704 | 
 705 |           {section === 'agents' && (
 706 |             <div style={{ animation: 'portIn .25s ease' }}>
 707 |               <div className="pc">
 708 |                 <div className="pc-h">
 709 |                   <span className="pc-t">Live Agent Run</span>
 710 |                   <button className="pb" onClick={runAgentTest} disabled={running}>
 711 |                     {running ? 'Running…' : 'Test Live Booking'}
 712 |                   </button>
 713 |                 </div>
 714 |                 <div className="pc-b">
 715 |                   <AgentPanel agents={agents} result={agResult} running={running} />
 716 |                 </div>
 717 |               </div>
 718 |               <div className="pc">
 719 |                 <div className="pc-h"><span className="pc-t">Architecture</span></div>
 720 |                 <div className="pc-b">
 721 |                   [
 722 |                     ['🧩 State Agent',     'Validates field completeness, consistency, data types'],
 723 |                     ['🔒 Security Agent',  'XSS detection, injection scan, format validation'],
 724 |                     ['🗃️ Database Agent',  'Normalises record for Postgres insertion via Supabase'],
 725 |                     ['🛡️ RLS Validator',   'Confirms anon key policies allow the operation'],
 726 |                     ['🧠 Fix Synthesiser', 'Reads all 4 upstream outputs, produces recommendation'],
 727 |                   ].map(([n, d]) => (
 728 |                     <div key={n} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--port-bord)' }}>
 729 |                       <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)', minWidth: 180 }}>{n}</div>
 730 |                       <div style={{ fontSize: 11, color: 'var(--port-m)', lineHeight: 1.6 }}>{d}</div>
 731 |                     </div>
 732 |                   ))
 733 |                 </div>
 734 |               </div>
 735 |             </div>
 736 |           )}
 737 | 
 738 |           {section === 'system' && (
 739 |             <div style={{ animation: 'portIn .25s ease' }}>
 740 |               <div className="sg">
 741 |                 {(health
 742 |                   ? [{ v: '✓', l: 'API' }, { v: `${health.responseMs}ms`, l: 'Response' }, { v: '99.8%', l: 'Uptime' }, { v: `${monitor.getSessionUptime()}s`, l: 'Session' }]
 743 |                   : [{ v: '…', l: 'API' }, { v: '…', l: 'Response' }, { v: '…', l: 'Uptime' }, { v: '…', l: 'Session' }]
 744 |                 ).map(s => (
 745 |                   <div key={s.l} className="sc">
 746 |                     <div className="sc-v" style={{ fontSize: '1.6rem' }}>{s.v}</div>
 747 |                     <div className="sc-l">{s.l}</div>
 748 |                   </div>
 749 |                 ))}
 750 |               </div>
 751 |               <div className="pc">
 752 |                 <div className="pc-h"><span className="pc-t">System Log</span><button className="pbg">Clear</button></div>
 753 |                 <div className="slog" style={{ padding: '10px 18px', maxHeight: 300 }}>
 754 |                   {SYSTEM_LOGS.map(l => (
 755 |                     <div key={l.t + l.msg} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
 756 |                       <span style={{ color: 'var(--port-m)', flexShrink: 0 }}>{l.t}</span>
 757 |                       <span style={{ color: LOG_COLOR[l.type] }}>{l.msg}</span>
 758 |                     </div>
 759 |                   ))}
 760 |                 </div>
 761 |               </div>
 762 |             </div>
 763 |           )}
 764 | 
 765 |           {section === 'rls' && (
 766 |             <div style={{ animation: 'portIn .25s ease' }}>
 767 |               <div className="pc">
 768 |                 <div className="pc-h"><span className="pc-t">Environment Keys</span></div>
 769 |                 <div className="pc-b">
 770 |                   [
 771 |                     { type: 'public', label: 'VITE_SUPABASE_URL',     val: 'https://[ref].supabase.co',               note: 'Safe to expose. Configure in .env.local' },
 772 |                     { type: 'public', label: 'VITE_SUPABASE_ANON_KEY', val: 'eyJ…[anon key]',                          note: 'Safe to expose. Subject to RLS policies' },
 773 |                     { type: 'danger', label: 'SUPABASE_SERVICE_KEY',   val: 'NEVER SENT TO CLIENT — server env only',  note: 'Bypasses RLS. Server-side only. Never in browser.' },
 774 |                     { type: 'server', label: 'GOOGLE_CLIENT_ID',       val: '1234…apps.googleusercontent.com',         note: 'OAuth 2.0 client ID from Google Console' },
 775 |                     { type: 'server', label: 'APPLE_SERVICE_ID',       val: 'com.studiop.auth',                        note: 'Apple Sign In Service ID from Developer portal' },
 776 |                   ].map(k => (
 777 |                     <div key={k.label} className="key-row">
 778 |                       <div className={`key-badge ${k.type}`}>{k.type.toUpperCase()}</div>
 779 |                       <div style={{ flex: 1 }}>
 780 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)', marginBottom: 2 }}>{k.label}</div>
 781 |                         <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.val}</div>
 782 |                         <div style={{ fontSize: 10, color: 'var(--port-m)', marginTop: 2 }}>{k.note}</div>
 783 |                     </div>
 784 |                   </div>
 785 |                   ))
 786 |                 </div>
 787 |               </div>
 788 |               <div className="pc">
 789 |                 <div className="pc-h"><span className="pc-t">Active RLS Policies</span></div>
 790 |                 <div style={{ overflowX: 'auto' }}>
 791 |                   <table className="pt">
 792 |                     <thead><tr><th>Table</th><th>Policy</th><th>Role</th><th>Using Clause</th></tr></thead>
 793 |                     <tbody>
 794 |                       [
 795 |                         { table: 'bookings',     policy: 'select_own',  role: 'authenticated', clause: 'client_id = auth.uid()' },
 796 |                         { table: 'bookings',     policy: 'insert_auth', role: 'authenticated', clause: 'auth.role() = authenticated' },
 797 |                         { table: 'user_profiles',policy: 'read_own',    role: 'authenticated', clause: 'id = auth.uid()' },
 798 |                         { table: 'gallery',      policy: 'public_read', role: 'anon',          clause: 'approved = true' },
 799 |                       ].map(r => (
 800 |                         <tr key={r.table + r.policy}>
 801 |                           <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{r.table}</td>
 802 |                           <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{r.policy}</td>
 803 |                           <td><span className="rp viewer" style={{ fontSize: 7 }}>{r.role}</span></td>
 804 |                           <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-a)' }}>{r.clause}</td>
 805 |                         </tr>
 806 |                       ))
 807 |                     </tbody>
 808 |                   </table>
 809 |                 </div>
 810 |               </div>
 811 |             </div>
 812 |           )}
 813 | 
 814 |         </div>
 815 |       </div>
 816 |     </div>
 817 |   );
 818 | }
 819 | 