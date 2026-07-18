// ════════════════════════════════════════════════
// STUDIO P — AdminPortal (portals/AdminPortal.tsx)
// Full system command centre for admin role
// ════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { UserProfile, Agent, OrchestrationResult, HealthStatus } from '@/types';
import { bookingService } from '@/services/BookingService';
import { supabase } from '@/lib/supabase';
import { monitor } from '@/core/monitor';
import { logger } from '@/core/logger';
import { AgentPanel } from '@/components/AgentPanel';
import { BUSINESS } from '@/config/business';

interface RealBooking {
  id: string;
  client_name: string;
  service: string;
  barber: string;
  scheduled_at: string;
  price_swl: number;
  status: string;
}

interface RealUser {
  id: string;
  name: string;
  email: string;
  role: string;
  upload_count: number;
  provider: string;
}

interface PendingMedia {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  uploader_id: string;
}

interface DailyReport {
  report_date: string;
  total_bookings: number;
  confirmed: number;
  pending_count: number;
  cancelled: number;
  completed: number;
  total_revenue_swl: number;
  appointments: Array<{ id: string; clientName: string; service: string; time: string; status: string; priceSWL: number }>;
  whatsapp_message: string | null;
  generated_at: string;
}

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\\' xmlns=\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\'n\\'%3E%3CfeTurbulence type=\'fractalNoise\\' baseFrequency=\'0.65\\' numOctaves=\'3\\' stitchTiles=\'stitch\\'/%3E%3C/filter%3E%3Crect width=\'100%25\\' height=\'100%25\\' filter=\'url(%23n)\' opacity=\'0.06\\'/%3E%3C/svg%3E")`;
const HERO_IMG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1400&q=70';

const NAV = [
  { id: 'dashboard', icon: '⚡', label: 'Dashboard',  badge: null },
  { id: 'reports',   icon: '📊', label: 'Reports',    badge: null },
  { id: 'bookings',  icon: '📅', label: 'Bookings',   badge: null },
  { id: 'users',     icon: '👥', label: 'Users',      badge: null },
  { id: 'gallery',   icon: '🖼️', label: 'Gallery',    badge: null },
  { id: 'agents',    icon: '🤖', label: 'Agents',     badge: null },
  { id: 'system',    icon: '🔧', label: 'System',     badge: null },
  { id: 'rls',       icon: '🛡️', label: 'RLS',        badge: null },
];


const SYSTEM_LOGS = [
  { t: '14:32:05', type: 'ok',   msg: 'BK-A3F12 confirmed — Lungelo M.' },
  { t: '14:28:11', type: 'ok',   msg: 'RLS validated — agents:4 in 320ms' },
  { t: '14:15:44', type: 'warn', msg: 'Upload rate limit hit — viewer-001' },
  { t: '14:12:30', type: 'info', msg: 'Parallel agents: confidence 94%' },
  { t: '13:58:02', type: 'ok',   msg: 'Session created — admin@studiop.sz' },
  { t: '13:44:17', type: 'ok',   msg: 'Auto-backup snapshot v3 created' },
  { t: '13:10:55', type: 'err',  msg: 'CDN image load failure — m_1a2b.' },
];

const LOG_COLOR: Record<string, string> = {
  ok: '#52E89A', warn: '#FFB347', err: '#f87171', info: 'var(--port-a)',
};

const SECTION_META: Record<string, { eyebrow: string; title: string; sub?: string }> = {
  dashboard: { eyebrow: 'Command Centre',        title: 'Dashboard',         sub: 'Live operations overview for Fano Barbershop.' },
  reports:   { eyebrow: 'Daily Intelligence',    title: 'Reports & Briefing', sub: "Mfanomuhle's daily schedule, revenue summary, and one-tap WhatsApp briefings." },
  bookings:  { eyebrow: 'Appointment Management', title: 'Bookings',          sub: 'Manage, confirm, and track every chair.' },
  users:     { eyebrow: 'Member Directory',       title: 'Members' },
  gallery:   { eyebrow: 'Media Moderation',       title: 'Gallery',           sub: 'Approve or reject submitted photos and videos.' },
  agents:    { eyebrow: 'Parallel Processing',    title: 'Agent Engine',      sub: '4 validation agents run concurrently via Promise.all. A synthesiser agent reads all outputs and produces a final recommendation.' },
  system:    { eyebrow: 'System Status',          title: 'System' },
  rls:       { eyebrow: 'Row-Level Security',     title: 'RLS & Key Vault' },
};

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ position: 'relative', padding: '44px 0 28px', marginBottom: 28, borderBottom: '1px solid var(--admin-b)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: .08, pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', inset: '-50%', backgroundImage: GRAIN_BG, backgroundSize: '200px 200px', animation: 'grain 4s steps(2) infinite', opacity: .5, pointerEvents: 'none' }}/>
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.4em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, lineHeight: .92, color: 'var(--admin-t)' }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: 'var(--admin-m)', marginTop: 10, lineHeight: 1.6, maxWidth: 520 }}>{sub}</p>}
      </div>
    </div>
  );
}

interface AdminPortalProps {
  user: UserProfile;
  onClose: () => void;
  onSignOut: () => void;
}

export function AdminPortal({ user, onClose, onSignOut }: AdminPortalProps) {
  const [section, setSection]         = useState('dashboard');
  const [navOpen, setNavOpen]         = useState(false);
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [agResult, setAgResult]       = useState<OrchestrationResult | null>(null);
  const [running, setRunning]         = useState(false);
  const [health, setHealth]           = useState<HealthStatus | null>(null);
  const [bookings, setBookings]         = useState<RealBooking[]>([]);
  const [users, setUsers]               = useState<RealUser[]>([]);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [dataLoading, setDataLoading]   = useState(false);
  const [todayReport, setTodayReport]   = useState<DailyReport | null>(null);
  const [reportHistory, setReportHistory] = useState<DailyReport[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportWaUrl, setReportWaUrl]   = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--port-bg',   'var(--admin-bg)');
    document.documentElement.style.setProperty('--port-side', 'var(--admin-s)');
    document.documentElement.style.setProperty('--port-bord', 'var(--admin-b)');
    document.documentElement.style.setProperty('--port-a',    'var(--admin-a)');
    document.documentElement.style.setProperty('--port-a2',   'var(--admin-a2)');
    document.documentElement.style.setProperty('--port-t',    'var(--admin-t)');
    document.documentElement.style.setProperty('--port-m',    'var(--admin-m)');

    monitor.getHealth().then(setHealth).catch(e => logger.warn('AdminPortal', 'health check failed', { error: String(e) }));

    // Load today's report + last 7 days of history
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.resolve(
      supabase
        .from('daily_reports')
        .select('*')
        .gte('report_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
        .order('report_date', { ascending: false })
        .limit(8)
    ).then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) { // Safely check if data is an array
          const typedData = data as DailyReport[]; // Assert after runtime check
          setReportHistory(typedData);
          const today = typedData.find(r => r.report_date === todayStr);
          if (today) setTodayReport(today);
        }
      })
      .catch((e: unknown) => logger.warn('AdminPortal', 'reports fetch failed', { error: String(e) }));

    setDataLoading(true);
    Promise.all([
      supabase.from('bookings').select('id,client_name,service,barber,scheduled_at,price_swl,status').order('scheduled_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id,name,email,role,upload_count,provider').order('created_at', { ascending: false }).limit(100),
      supabase.from('gallery_items').select('id,url,caption,created_at,uploader_id').eq('approved', false).order('created_at', { ascending: false }).limit(50),
    ]).then(([bRes, uRes, mRes]) => {
      if (!bRes.error) setBookings((bRes.data ?? []) as RealBooking[]);
      else logger.warn('AdminPortal', 'bookings fetch failed', { error: bRes.error.message });
      if (!uRes.error) setUsers((uRes.data ?? []) as RealUser[]);
      else logger.warn('AdminPortal', 'users fetch failed', { error: uRes.error.message });
      if (!mRes.error) setPendingMedia((mRes.data ?? []) as PendingMedia[]);
      else logger.warn('AdminPortal', 'media fetch failed', { error: mRes.error.message });
      setDataLoading(false);
    }).catch(e => { logger.warn('AdminPortal', 'data fetch error', { error: String(e) }); setDataLoading(false); });

    return () => {
      ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
        .forEach(v => document.documentElement.style.removeProperty(v));
    };
  }, []);

  const runAgentTest = async () => {
    setRunning(true);
    setAgResult(null);
    logger.info('AdminPortal', 'Running live agent validation test');
    try {
      const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const res = await bookingService.validate(
        { service: 'Signature Fade', date: futureDate, time: '14:30', email: user.email, clientId: user.id },
        ({ agents }) => setAgents(agents ?? [])
      );
      setAgResult(res);
    } catch (e) {
      logger.error('AdminPortal', 'Agent test error', { error: String(e) });
    } finally {
      setRunning(false);
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  const generateReport = async (dateStr?: string) => {
    setReportLoading(true);
    setReportWaUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('daily-report', {
        body: { trigger: 'manual', date: dateStr },
      });
      if (error) throw new Error(error.message);

      // Runtime check for the shape of the data before asserting
      if (
        data &&
        typeof data === 'object' &&
        'ok' in data && typeof (data as any).ok === 'boolean' &&
        'reportDate' in data && typeof (data as any).reportDate === 'string' &&
        'stats' in data && typeof (data as any).stats === 'object' &&
        'whatsappUrl' in data && typeof (data as any).whatsappUrl === 'string' &&
        'message' in data && typeof (data as any).message === 'string' &&
        'appointments' in data && Array.isArray((data as any).appointments)
      ) {
        const result = data as { ok: boolean; reportDate: string; stats: Record<string, number>; whatsappUrl: string; message: string; appointments: DailyReport['appointments'] };
        if (result.ok) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const newReport: DailyReport = {
            report_date: result.reportDate,
            total_bookings: result.stats.total,
            confirmed: result.stats.confirmed,
            pending_count: result.stats.pending,
            cancelled: result.stats.cancelled,
            completed: result.stats.completed,
            total_revenue_swl: result.stats.revenue,
            appointments: result.appointments,
            whatsapp_message: result.message,
            generated_at: new Date().toISOString(),
          };
          if (result.reportDate === todayStr) setTodayReport(newReport);
          setReportHistory(prev => [newReport, ...prev.filter(r => r.report_date !== result.reportDate)].slice(0, 8));
          setReportWaUrl(result.whatsappUrl);
          logger.info('AdminPortal', 'Daily report generated', { date: result.reportDate });
        }
      } else {
        throw new Error('Invalid data structure received from daily-report function.');
      }
    } catch (e) {
      logger.error('AdminPortal', 'Report generation failed', { error: String(e) });
    } finally {
      setReportLoading(false);
    }
  };

  const meta = SECTION_META[section] ?? { eyebrow: '', title: section };

  const navBadges: Record<string, number> = {
    bookings: pendingBookings.length,
    gallery:  pendingMedia.length,
  };

  const Sidebar = () => (
    <div style={{
      width: 200, flexShrink: 0,
      background: 'var(--admin-s)',
      borderRight: '1px solid var(--admin-b)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: 'calc(100vh - 80px)',
    }}>
      <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid var(--admin-b)' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>P</div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.28em', color: 'var(--admin-m)', marginTop: 3, textTransform: 'uppercase' }}>Admin</div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--stone)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
      </div>

      <button onClick={() => { onClose(); setNavOpen(false); }} style={{
        background: 'none', border: 'none', color: 'var(--stone)',
        textAlign: 'left', padding: '10px 20px', fontSize: 11,
        fontFamily: 'DM Mono, monospace', letterSpacing: '.08em',
        minHeight: 'unset', marginTop: 6, cursor: 'pointer',
      }}>← Public Site</button>

      <div style={{ flex: 1, padding: '4px 0', overflowY: 'auto' }}>
        {NAV.map(n => {
          const badge = navBadges[n.id] ?? 0;
          return (
            <button key={n.id} onClick={() => { setSection(n.id); setNavOpen(false); }} style={{
              background: section === n.id ? 'rgba(255,179,71,.07)' : 'none',
              border: 'none',
              borderLeft: section === n.id ? '2px solid var(--admin-a)' : '2px solid transparent',
              color: section === n.id ? 'var(--admin-a)' : 'var(--admin-m)',
              textAlign: 'left', padding: '10px 20px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', minHeight: 'unset', width: '100%',
              transition: 'color .15s, background .15s',
            }}> 
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {badge > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--admin-a)', color: 'var(--admin-bg)', fontSize: 8, padding: '1px 6px', borderRadius: 10, fontFamily: 'DM Mono, monospace' }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {health && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--admin-b)' }}>
          {[["API", health.api], ["DB", health.db]].map(([l, s]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
              <span style={{ color: 'var(--admin-m)' }}>{l}</span>
              <span style={{ color: s === 'up' ? '#52E89A' : '#f87171' }}>● {String(s).toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--admin-b)' }}>
        <button onClick={onSignOut} style={{
          width: '100%', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
          color: '#f87171', borderRadius: 6, padding: '8px 12px', fontSize: 10,
          fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', minHeight: 'unset',
        }}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)', position: 'relative' }}>

      {/* Desktop sidebar */}
      <div className="admin-sidebar-desktop">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {navOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={() => setNavOpen(false)}>
          <div style={{ width: 220, background: 'var(--admin-s)', borderRight: '1px solid var(--admin-b)', zIndex: 201, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,.5)' }} />
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--admin-bg)', color: 'var(--admin-t)', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="admin-mobile-bar">
          <button onClick={() => setNavOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--admin-m)', fontSize: 18, cursor: 'pointer', minHeight: 'unset', padding: '12px 16px' }}>☰</button>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--brass)' }}>P</div>
          <button onClick={onSignOut} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '.1em', cursor: 'pointer', minHeight: 'unset', padding: '12px 16px' }}>OUT</button>
        </div>
        <div style={{ padding: '0 20px 60px' }}>

          <SectionHead eyebrow={meta.eyebrow} title={meta.title} sub={section === 'agents' ? meta.sub : undefined} />

          {section === 'dashboard' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="sg">
                {[
                  { v: String(bookings.filter(b => { const d = new Date(b.scheduled_at); const now = new Date(); return d.toDateString() === now.toDateString(); }).length), l: "Today's Bookings", d: `${bookings.filter(b => b.status === 'pending').length} pending` },
                  { v: `E${(bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.price_swl, 0) / 100).toFixed(0)}`, l: 'Total Revenue', d: `${bookings.length} bookings` },
                  { v: String(pendingMedia.length), l: 'Media Queue', d: 'awaiting review' },
                  { v: String(users.length), l: 'Members', d: `${users.filter(u => u.role === 'editor').length} editors` },
                ].map(s => (
                  <div key={s.l} className="sc">
                    <div className="sc-v">{s.v}</div>
                    <div className="sc-l">{s.l}</div>
                    <div className="sc-d">{s.d}</div>
                  </div>
                ))}
              </div>
              <div className="g2">
                <div className="pc">
                  <div className="pc-h"><span className="pc-t">Recent Bookings</span><button className="pb" onClick={() => setSection('bookings')}>View All</button></div>
                  <div style={{ padding: '4px 18px' }}>
                    {bookings.slice(0, 4).map(b => (+
                      <div key={b.id} className="bki">
                        <div className="bkav">{b.client_name?.[0] ?? '?'}</div>
                        <div style={{ flex: 1 }}>
                          <div className="bkn">{b.client_name}</div>
                          <div className="bkm">{b.service} · {new Date(b.scheduled_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                        </div>
                        <span className={`bkst ${b.status}`}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pc">
                  <div className="pc-h"><span className="pc-t">Activity Log</span><button className="pbg">Export</button></div>
                  <div className="slog" style={{ padding: '10px 18px' }}>
                    {SYSTEM_LOGS.map(l => (
                      <div key={l.t + l.msg} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
                        <span style={{ color: 'var(--port-m)', flexShrink: 0 }}>{l.t}</span>
                        <span style={{ color: LOG_COLOR[l.type] }}>{l.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Service Performance</span></div>
                <div className="pc-b">
                  {[{ n: 'Signature Fade', p: 82 }, { n: 'Taper & Define', p: 64 }, { n: 'Full Package', p: 57 }, { n: 'Beard Architecture', p: 48 }, { n: 'Edge & Line-Up', p: 35 }].map(s => (
                    <div key={s.n} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
                        <span style={{ color: 'var(--port-t)' }}>{s.n}</span>
                        <span style={{ color: 'var(--port-a)' }}>{s.p}%</span>
                      </div>
                      <div className="pbar"><div className="pbar-f" style={{ width: s.p + '%' }}/></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'reports' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              {/* Licence card */}
              <div className="pc" style={{ marginBottom: 16 }}>
                <div className="pc-h"><span className="pc-t">Trading Licence {BUSINESS.licence.renewedYear()}</span><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: '#52E89A', letterSpacing: '.2em' }}>● ACTIVE</span></div>
                <div className="pc-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
                  {[
                    { label: 'Issued To',     value: BUSINESS.licence.issuedTo },
                    { label: 'Business',      value: BUSINESS.licence.businessName },
                    { label: 'Type',          value: BUSINESS.licence.type },
                    { label: 'Area',          value: BUSINESS.licence.area },
                    { label: 'Address',       value: BUSINESS.address },
                    { label: 'Expires',       value: `31 Dec ${BUSINESS.licence.renewedYear()} · ${BUSINESS.licence.note}` },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.2em', color: 'var(--port-m)', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's briefing */}
              <div className="pc" style={{ marginBottom: 16 }}>
                <div className="pc-h">
                  <span className="pc-t">Today's Briefing</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="pb" onClick={() => generateReport()} disabled={reportLoading}>
                      {reportLoading ? 'Generating…' : 'Generate Now'}
                    </button>
                    {reportWaUrl && (
                      <a href={reportWaUrl} target="_blank" rel="noopener noreferrer" className="pb"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        📲 Send via WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                <div className="pc-b">
                  {todayReport ? (
                    <div>
                      <div className="sg" style={{ marginBottom: 16 }}>
                        {[
                          { v: String(todayReport.total_bookings),    l: 'Appointments' },
                          { v: String(todayReport.confirmed),         l: 'Confirmed' },
                          { v: String(todayReport.pending_count),     l: 'Pending' },
                          { v: `E${Math.round(todayReport.total_revenue_swl / 100)}`, l: 'Revenue' },
                        ].map(s => (
                          <div key={s.l} className="sc">
                            <div className="sc-v">{s.v}</div>
                            <div className="sc-l">{s.l}</div>
                          </div>
                        ))}
                      </div>
                      {todayReport.appointments.length > 0 ? (
                        <div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--port-m)', marginBottom: 10, textTransform: 'uppercase' }}>Today's Schedule</div>
                          {todayReport.appointments.map(apt => (
                            <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--port-bord)' }}>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--port-a)', minWidth: 44 }}>{apt.time}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--port-t)' }}>{apt.clientName}</div>
                                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>{apt.service}</div>
                              </div>
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-a)' }}>E{Math.round(apt.priceSWL / 100)}</span>
                              <span className={`bkst ${apt.status}`}>{apt.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>No appointments today.</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
                      No report yet. Click "Generate Now" to create today's briefing.
                    </div>
                  )}
                </div>
              </div>

              {/* Operating Hours */}
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Operating Hours</span></div>
                <div className="pc-b">
                  {[n
                    { days: 'Monday – Thursday', hours: '08:00 – 17:00' },
                    { days: 'Friday – Saturday', hours: '08:00 – 19:00' },
                    { days: 'Sunday',            hours: 'Closed' },
                  ].map(row => (
                    <div key={row.days} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--port-bord)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                      <span style={{ color: 'var(--port-t)' }}>{row.days}</span>
                      <span style={{ color: row.hours === 'Closed' ? 'var(--port-m)' : 'var(--port-a)' }}>{row.hours}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>
                    Contact: {BUSINESS.phone.primaryDisplay} · {BUSINESS.phone.secondaryDisplay}
                  </div>
                </div>
              </div>

              {/* Report history */}
              {reportHistory.length > 0 && (
                <div className="pc" style={{ marginTop: 16 }}>
                  <div className="pc-h"><span className="pc-t">Report History</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pt">
                      <thead><tr><th>Date</th><th>Bookings</th><th>Confirmed</th><th>Revenue</th><th>Actions</th></tr></thead>
                      <tbody>
                        {reportHistory.map(r => (
                          <tr key={r.report_date}>
                            <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{r.report_date}</td>
                            <td style={{ textAlign: 'center' }}>{r.total_bookings}</td>
                            <td style={{ textAlign: 'center', color: '#52E89A' }}>{r.confirmed}</td>
                            <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>E{Math.round(r.total_revenue_swl / 100)}</td>
                            <td>
                              {r.whatsapp_message && (
                                <a href={`https://wa.me/${BUSINESS.phone.primary}?text=${encodeURIComponent(r.whatsapp_message)}`}
                                  target="_blank" rel="noopener noreferrer" className="pb"
                                  style={{ textDecoration: 'none', padding: '3px 7px', fontSize: 8, minHeight: 'unset', display: 'inline-block' }}>
                                  📲 WA
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'bookings' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">All Appointments</span></div>
                {dataLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pt">
                      <thead><tr><th>Client</th><th>Service</th><th>Barber</th><th>Date</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>{bookings.map(b => {
                        const d = new Date(b.scheduled_at);
                        const dateStr = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
                        const timeStr = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
                        const setStatus = async (status: string) => {
                          try { // Added try-catch block
                            const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
                            if (!error) setBookings(bks => bks.map(x => x.id === b.id ? { ...x, status } : x));
                            else logger.error('AdminPortal', 'booking update failed', { error: b.id, message: error.message });
                          } catch (e) {
                            logger.error('AdminPortal', 'booking status update failed (network/supabase issue)', { bookingId: b.id, error: String(e) });
                          }
                        };
                        return (
                          <tr key={b.id}>
                            <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{b.client_name}</td>
                            <td>{b.service}</td>
                            <td>{b.barber}</td>
                            <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{dateStr} {timeStr}</td>
                            <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>E{(b.price_swl / 100).toFixed(0)}</td>
                            <td><span className={`bkst ${b.status}`}>{b.status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {b.status === 'pending' && (
                                  <button className="pb" style={{ padding: '3px 7px', fontSize: 8, minHeight: 'unset' }} onClick={() => setStatus('confirmed')}>✓ Confirm</button>
                                )}
                                {b.status !== 'cancelled' && (
                                  <button style={{ padding: '3px 7px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', borderRadius: 4, cursor: 'pointer' }} onClick={() => setStatus('cancelled')}>✗ Cancel</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'users' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">All Members</span></div>
                {dataLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pt">
                      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Uploads</th><th>Provider</th><th>Actions</th></tr></thead>
                      <tbody>{users.map(u => {
                        const changeRole = async (role: string) => {
                          try { // Added try-catch block
                            if (u.id === user.id) return; // can't change own role
                            const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
                            if (!error) setUsers(us => us.map(x => x.id === u.id ? { ...x, role } : x));
                            else logger.error('AdminPortal', 'role update failed', { userId: u.id, error: error.message });
                          } catch (e) {
                            logger.error('AdminPortal', 'role update failed (network/supabase issue)', { userId: u.id, error: String(e) });
                          }
                        };
                        return (
                          <tr key={u.id}>
                            <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{u.name}</td>
                            <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{u.email}</td>
                            <td><span className={`rp ${u.role}`}>{u.role}</span></td>
                            <td style={{ textAlign: 'center' }}>{u.upload_count ?? 0}</td>
                            <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>{u.provider}</td>
                            <td>
                              {u.id !== user.id && (
                                <select
                                  value={u.role}
                                  onChange={e => changeRole(e.target.value)}
                                  style={{ background: 'var(--admin-s)', color: 'var(--admin-t)', border: '1px solid var(--admin-b)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}
                                >
                                  <option value="viewer">viewer</option>
                                  <option value="editor">editor</option>
                                  <option value="admin">admin</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'gallery' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="pc">
                <div className="pc-h">
                  <span className="pc-t">Pending Media — {pendingMedia.length} item{pendingMedia.length !== 1 ? 's' : ''}</span>
                </div>
                {dataLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>Loading…</div>
                ) : pendingMedia.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--admin-m)', fontSize: 13 }}>No items pending review.</div>
                ) : (
                  <div className="gport" style={{ padding: 18 }}>
                    {pendingMedia.map(item => (
                      <div key={item.id} className="gpimg">
                        {item.url.includes('/studio-media/') ? (
                          <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={item.url} alt={item.caption ?? 'pending'} loading="lazy" />
                        )}
                        <div className="gpov">
                          {item.caption && (
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.85)', marginBottom: 4, fontFamily: 'DM Mono, monospace', padding: '0 4px' }}>
                              {item.caption}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="pb" style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset' }} onClick={async () => {
                              try { // Added try-catch block
                                const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
                                if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
                                else logger.error('AdminPortal', 'gallery approve failed', { itemId: item.id, error: error.message });
                              } catch (e) {
                                logger.error('AdminPortal', 'gallery approve failed (network/supabase issue)', { itemId: item.id, error: String(e) });
                              }
                            }}>✓ Approve</button>
                            <button style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.3)', color: '#f87171', border: '1px solid rgba(248,113,113,.4)', borderRadius: 4, cursor: 'pointer' }} onClick={async () => {
                              try { // Added try-catch block
                                const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
                                if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
                                else logger.error('AdminPortal', 'gallery reject failed', { itemId: item.id, error: error.message });
                              } catch (e) {
                                logger.error('AdminPortal', 'gallery reject failed (network/supabase issue)', { itemId: item.id, error: String(e) });
                              }
                            }}>✗ Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'agents' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="pc">
                <div className="pc-h">
                  <span className="pc-t">Live Agent Run</span>
                  <button className="pb" onClick={runAgentTest} disabled={running}>
                    {running ? 'Running…' : 'Test Live Booking'}
                  </button>
                </div>
                <div className="pc-b">
                  <AgentPanel agents={agents} result={agResult} running={running} />
                </div>
              </div>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Architecture</span></div>
                <div className="pc-b">
                  {[n
                    ['🧩 State Agent',     'Validates field completeness, consistency, data types'],
                    ['🔒 Security Agent',  'XSS detection, injection scan, format validation'],
                    ['🗃️ Database Agent',  'Normalises record for Postgres insertion via Supabase'],
                    ['🛡️ RLS Validator',   'Confirms anon key policies allow the operation'],
                    ['🧠 Fix Synthesiser', 'Reads all 4 upstream outputs, produces recommendation'],
                  ].map(([n, d]) => (
                    <div key={n} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--port-bord)' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)', minWidth: 180 }}>{n}</div>
                      <div style={{ fontSize: 11, color: 'var(--port-m)', lineHeight: 1.6 }}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'system' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="sg">
                {(health
                  ? [{ v: '✓', l: 'API' }, { v: `${health.responseMs}ms`, l: 'Response' }, { v: '99.8%', l: 'Uptime' }, { v: `${monitor.getSessionUptime()}s`, l: 'Session' }]
                  : [{ v: '…', l: 'API' }, { v: '…', l: 'Response' }, { v: '…', l: 'Uptime' }, { v: '…', l: 'Session' }]
                ).map(s => (
                  <div key={s.l} className="sc">
                    <div className="sc-v" style={{ fontSize: '1.6rem' }}>{s.v}</div>
                    <div className="sc-l">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">System Log</span><button className="pbg">Clear</button></div>
                <div className="slog" style={{ padding: '10px 18px', maxHeight: 300 }}>
                  {SYSTEM_LOGS.map(l => (
                    <div key={l.t + l.msg} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
                      <span style={{ color: 'var(--port-m)', flexShrink: 0 }}>{l.t}</span>
                      <span style={{ color: LOG_COLOR[l.type] }}>{l.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'rls' && (
            <div style={{ animation: 'portIn .25s ease' }}>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Environment Keys</span></div>
                <div className="pc-b">
                  {[n
                    { type: 'public', label: 'VITE_SUPABASE_URL',     val: 'https://[ref].supabase.co',               note: 'Safe to expose. Configure in .env.local' },
                    { type: 'public', label: 'VITE_SUPABASE_ANON_KEY', val: 'eyJ…[anon key]',                          note: 'Safe to expose. Subject to RLS policies' },
                    { type: 'danger', label: 'SUPABASE_SERVICE_KEY',   val: 'NEVER SENT TO CLIENT — server env only',  note: 'Bypasses RLS. Server-side only. Never in browser.' },
                    { type: 'server', label: 'GOOGLE_CLIENT_ID',       val: '1234…apps.googleusercontent.com',         note: 'OAuth 2.0 client ID from Google Console' },
                    { type: 'server', label: 'APPLE_SERVICE_ID',       val: 'com.studiop.auth',                        note: 'Apple Sign In Service ID from Developer portal' },
                  ].map(k => (
                    <div key={k.label} className="key-row">
                      <div className={`key-badge ${k.type}`}>{k.type.toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)', marginBottom: 2 }}>{k.label}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.val}</div>
                        <div style={{ fontSize: 10, color: 'var(--port-m)', marginTop: 2 }}>{k.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Active RLS Policies</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="pt">
                    <thead><tr><th>Table</th><th>Policy</th><th>Role</th><th>Using Clause</th></tr></thead>
                    <tbody>
                      {[n
                        { table: 'bookings',     policy: 'select_own',  role: 'authenticated', clause: 'client_id = auth.uid()' },
                        { table: 'bookings',     policy: 'insert_auth', role: 'authenticated', clause: 'auth.role() = authenticated' },
                        { table: 'user_profiles',policy: 'read_own',    role: 'authenticated', clause: 'id = auth.uid()' },
                        { table: 'gallery',      policy: 'public_read', role: 'anon',          clause: 'approved = true' },
                      ].map(r => (
                        <tr key={r.table + r.policy}>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--port-t)' }}>{r.table}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{r.policy}</td>
                          <td><span className="rp viewer" style={{ fontSize: 7 }}>{r.role}</span></td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--edit-a)' }}>{r.clause}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
