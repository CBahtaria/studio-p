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

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;
const HERO_IMG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1400&q=70';

const NAV = [
  { id: 'dashboard', icon: '⚡', label: 'Dashboard',  badge: null },
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
  { t: '13:10:55', type: 'err',  msg: 'CDN image load failure — m_1a2b' },
];

const LOG_COLOR: Record<string, string> = {
  ok: '#52E89A', warn: '#FFB347', err: '#f87171', info: 'var(--port-a)',
};

const SECTION_META: Record<string, { eyebrow: string; title: string; sub?: string }> = {
  dashboard: { eyebrow: 'Command Centre',        title: 'Dashboard',         sub: 'Live operations overview for Studio P.' },
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
}

export function AdminPortal({ user, onClose }: AdminPortalProps) {
  const [section, setSection]         = useState('dashboard');
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [agResult, setAgResult]       = useState<OrchestrationResult | null>(null);
  const [running, setRunning]         = useState(false);
  const [health, setHealth]           = useState<HealthStatus | null>(null);
  const [bookings, setBookings]       = useState<RealBooking[]>([]);
  const [users, setUsers]             = useState<RealUser[]>([]);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--port-bg',   'var(--admin-bg)');
    document.documentElement.style.setProperty('--port-side', 'var(--admin-s)');
    document.documentElement.style.setProperty('--port-bord', 'var(--admin-b)');
    document.documentElement.style.setProperty('--port-a',    'var(--admin-a)');
    document.documentElement.style.setProperty('--port-a2',   'var(--admin-a2)');
    document.documentElement.style.setProperty('--port-t',    'var(--admin-t)');
    document.documentElement.style.setProperty('--port-m',    'var(--admin-m)');

    monitor.getHealth().then(setHealth).catch(e => logger.warn('AdminPortal', 'health check failed', { error: String(e) }));

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
    });

    return () => {
      ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
        .forEach(v => document.documentElement.style.removeProperty(v));
    };
  }, []);

  const runDemo = async () => {
    setRunning(true);
    setAgResult(null);
    logger.info('AdminPortal', 'Running demo agent orchestration');
    try {
      const res = await bookingService.validate(
        { service: 'Signature Fade', date: '2026-06-10', time: '14:30', email: user.email, clientId: user.id },
        ({ agents }) => setAgents(agents ?? [])
      );
      setAgResult(res);
    } catch (e) {
      logger.error('AdminPortal', 'Demo validation error', { error: String(e) });
    } finally {
      setRunning(false);
    }
  };

  const meta = SECTION_META[section] ?? { eyebrow: '', title: section };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)' }}>

      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0,
        background: 'var(--admin-s)',
        borderRight: '1px solid var(--admin-b)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid var(--admin-b)' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 700, color: 'var(--brass)', lineHeight: 1 }}>P</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '.28em', color: 'var(--admin-m)', marginTop: 3, textTransform: 'uppercase' }}>Studio P</div>
        </div>

        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--stone)',
          textAlign: 'left', padding: '10px 20px', fontSize: 11,
          fontFamily: 'DM Mono, monospace', letterSpacing: '.08em',
          minHeight: 'unset', marginTop: 6,
          cursor: 'pointer',
        }}>← Public Site</button>

        <div style={{ flex: 1, padding: '4px 0' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{
              background: section === n.id ? 'rgba(255,179,71,.07)' : 'none',
              border: 'none',
              borderLeft: section === n.id ? '2px solid var(--admin-a)' : '2px solid transparent',
              color: section === n.id ? 'var(--admin-a)' : 'var(--admin-m)',
              textAlign: 'left',
              padding: '10px 20px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', minHeight: 'unset', width: '100%',
              transition: 'color .15s, background .15s',
            }}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge && (
                <span style={{ marginLeft: 'auto', background: 'var(--admin-a)', color: 'var(--admin-bg)', fontSize: 8, padding: '1px 6px', borderRadius: 10 }}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Health */}
        {health && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--admin-b)' }}>
            {[['API', health.api], ['DB', health.db], ['CDN', health.cdn]].map(([l, s]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
                <span style={{ color: 'var(--admin-m)' }}>{l}</span>
                <span style={{ color: s === 'up' ? '#52E89A' : '#f87171' }}>● {String(s).toUpperCase()}</span>
              </div>
            ))}
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--admin-m)', marginTop: 4 }}>{health.responseMs}ms</div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--admin-bg)', color: 'var(--admin-t)' }}>
        <div style={{ padding: '0 28px 60px' }}>

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
                    {bookings.slice(0, 4).map(b => (
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
                    {SYSTEM_LOGS.map((l, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
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
                          const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
                          if (!error) setBookings(bks => bks.map(x => x.id === b.id ? { ...x, status } : x));
                          else logger.error('AdminPortal', 'booking update failed', { error: error.message });
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
                          if (u.id === user.id) return; // can't change own role
                          const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
                          if (!error) setUsers(us => us.map(x => x.id === u.id ? { ...x, role } : x));
                          else logger.error('AdminPortal', 'role update failed', { error: error.message });
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
                              const { error } = await supabase.from('gallery_items').update({ approved: true }).eq('id', item.id);
                              if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
                              else logger.error('AdminPortal', 'gallery approve failed', { error: error.message });
                            }}>✓ Approve</button>
                            <button style={{ padding: '4px 8px', fontSize: 8, minHeight: 'unset', background: 'rgba(248,113,113,.3)', color: '#f87171', border: '1px solid rgba(248,113,113,.4)', borderRadius: 4, cursor: 'pointer' }} onClick={async () => {
                              const { error } = await supabase.from('gallery_items').delete().eq('id', item.id);
                              if (!error) setPendingMedia(q => q.filter(x => x.id !== item.id));
                              else logger.error('AdminPortal', 'gallery reject failed', { error: error.message });
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
                  <button className="pb" onClick={runDemo} disabled={running}>
                    {running ? 'Running…' : 'Run Demo Booking'}
                  </button>
                </div>
                <div className="pc-b">
                  <AgentPanel agents={agents} result={agResult} running={running} />
                </div>
              </div>
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Architecture</span></div>
                <div className="pc-b">
                  {[
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
                  {SYSTEM_LOGS.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
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
                  {[
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
                      {[
                        { table: 'bookings',     policy: 'select_own',  role: 'authenticated', clause: 'client_id = auth.uid()' },
                        { table: 'bookings',     policy: 'insert_auth', role: 'authenticated', clause: 'auth.role() = authenticated' },
                        { table: 'user_profiles',policy: 'read_own',    role: 'authenticated', clause: 'id = auth.uid()' },
                        { table: 'gallery',      policy: 'public_read', role: 'anon',          clause: 'approved = true' },
                      ].map((r, i) => (
                        <tr key={i}>
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
