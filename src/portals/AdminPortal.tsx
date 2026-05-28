// ════════════════════════════════════════════════
// STUDIO P — AdminPortal (portals/AdminPortal.tsx)
// Full system command centre for admin role
// ════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { UserProfile, Agent, OrchestrationResult, HealthStatus } from '@/types';
import { bookingService, DEMO_BOOKINGS } from '@/services/BookingService';
import { monitor } from '@/core/monitor';
import { logger } from '@/core/logger';
import { AgentPanel } from '@/components/AgentPanel';

const NAV = [
  { id: 'dashboard', icon: '⚡', label: 'Dashboard', badge: null },
  { id: 'bookings',  icon: '📅', label: 'Bookings',  badge: '8' },
  { id: 'users',     icon: '👥', label: 'Users',     badge: null },
  { id: 'agents',    icon: '🤖', label: 'Agents',    badge: null },
  { id: 'system',    icon: '🔧', label: 'System',    badge: null },
  { id: 'rls',       icon: '🛡️', label: 'RLS',       badge: null },
];

const DEMO_USERS = [
  { id: 'admin-001', name: 'Studio P Admin', email: 'admin@studiop.sz', role: 'admin', uploadCount: 0 },
  { id: 'editor-001', name: 'P. Dlamini', email: 'editor@studiop.sz', role: 'editor', uploadCount: 12 },
  { id: 'viewer-001', name: 'Sipho Dlamini', email: 'sipho@example.com', role: 'viewer', uploadCount: 2 },
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

interface AdminPortalProps {
  user: UserProfile;
  onClose: () => void;
}

export function AdminPortal({ user, onClose }: AdminPortalProps) {
  const [section, setSection] = useState('dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agResult, setAgResult] = useState<OrchestrationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Inject portal CSS vars
  useEffect(() => {
    document.documentElement.style.setProperty('--port-bg',   'var(--admin-bg)');
    document.documentElement.style.setProperty('--port-side', 'var(--admin-s)');
    document.documentElement.style.setProperty('--port-bord', 'var(--admin-b)');
    document.documentElement.style.setProperty('--port-a',    'var(--admin-a)');
    document.documentElement.style.setProperty('--port-a2',   'var(--admin-a2)');
    document.documentElement.style.setProperty('--port-t',    'var(--admin-t)');
    document.documentElement.style.setProperty('--port-m',    'var(--admin-m)');
    monitor.getHealth().then(setHealth);
    return () => {
      ['--port-bg','--port-side','--port-bord','--port-a','--port-a2','--port-t','--port-m']
        .forEach(v => document.documentElement.style.removeProperty(v));
    };
  }, []);

  const runDemo = async () => {
    setRunning(true);
    setAgResult(null);
    logger.info('AdminPortal', 'Running demo agent orchestration');
    const res = await bookingService.validate(
      { service: 'Signature Fade', date: '2025-06-10', time: '14:30', email: user.email, clientId: user.id },
      ({ agents }) => setAgents(agents ?? [])
    );
    setAgResult(res);
    setRunning(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', animation: 'portIn .32s cubic-bezier(.16,1,.3,1)' }}>
      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0,
        background: 'var(--admin-s)',
        borderRight: '1px solid var(--admin-b)',
        padding: '20px 0',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--stone)',
          textAlign: 'left', padding: '8px 20px', fontSize: 12, minHeight: 'unset', marginBottom: 8,
        }}>← Public Site</button>

        {NAV.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)} style={{
            background: section === n.id ? 'rgba(255,179,71,.08)' : 'none',
            border: 'none',
            borderLeft: section === n.id ? '2px solid var(--admin-a)' : '2px solid transparent',
            color: section === n.id ? 'var(--admin-a)' : 'var(--admin-m)',
            textAlign: 'left',
            padding: '10px 20px', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', minHeight: 'unset',
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

        {/* Health indicators */}
        {health && (
          <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--admin-b)' }}>
            {[['API', health.api], ['DB', health.db], ['CDN', health.cdn]].map(([l, s]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
                <span style={{ color: 'var(--admin-m)' }}>{l}</span>
                <span style={{ color: s === 'up' ? '#52E89A' : '#f87171' }}>● {String(s).toUpperCase()}</span>
              </div>
            ))}
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--admin-m)', marginTop: 4 }}>
              {health.responseMs}ms response
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: 'var(--admin-bg)', color: 'var(--admin-t)' }}>

        {section === 'dashboard' && (
          <div style={{ animation: 'portIn .25s ease' }}>
            <div className="ph">
              <div className="port-ey">Command Centre</div>
              <h1 className="port-title">Dashboard</h1>
            </div>
            <div className="sg">
              {[{ v: '8', l: "Today's Bookings", d: '↑ +2' }, { v: 'E2,640', l: 'Revenue', d: '↑ 18%' }, { v: '14', l: 'Queue Items', d: '3 pending' }, { v: '99.8%', l: 'Uptime', d: '✓ All green' }].map(s => (
                <div key={s.l} className="sc">
                  <div className="sc-v">{s.v}</div>
                  <div className="sc-l">{s.l}</div>
                  <div className={`sc-d${s.d.startsWith('↑') ? ' up' : ''}`}>{s.d}</div>
                </div>
              ))}
            </div>
            <div className="g2">
              <div className="pc">
                <div className="pc-h"><span className="pc-t">Today's Bookings</span><button className="pb">View All</button></div>
                <div style={{ padding: '4px 18px' }}>
                  {DEMO_BOOKINGS.slice(0, 4).map((b, i) => (
                    <div key={i} className="bki">
                      <div className="bkav">{b.clientName[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div className="bkn">{b.clientName}</div>
                        <div className="bkm">{b.service} · {b.time}</div>
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
            <div className="ph"><div className="port-ey">Appointment Management</div><h1 className="port-title">Bookings</h1></div>
            <div className="pc">
              <div className="pc-h"><span className="pc-t">All Appointments</span><div style={{ display: 'flex', gap: 7 }}><button className="pbg">Export</button><button className="pb">+ New</button></div></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="pt">
                  <thead><tr><th>Client</th><th>Service</th><th>Barber</th><th>Date</th><th>Price</th><th>Status</th></tr></thead>
                  <tbody>{DEMO_BOOKINGS.map((b, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{b.clientName}</td>
                      <td>{b.service}</td>
                      <td>{b.barber}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{b.date} {b.time}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--port-a)' }}>{b.price}</td>
                      <td><span className={`bkst ${b.status}`}>{b.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === 'users' && (
          <div style={{ animation: 'portIn .25s ease' }}>
            <div className="ph"><div className="port-ey">User Management</div><h1 className="port-title">Members</h1></div>
            <div className="pc">
              <div className="pc-h"><span className="pc-t">All Members</span><button className="pb">+ Invite</button></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="pt">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Uploads</th><th>Provider</th></tr></thead>
                  <tbody>{DEMO_USERS.map((u, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--port-t)', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{u.email}</td>
                      <td><span className={`rp ${u.role}`}>{u.role}</span></td>
                      <td style={{ textAlign: 'center' }}>{u.uploadCount}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)' }}>demo</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === 'agents' && (
          <div style={{ animation: 'portIn .25s ease' }}>
            <div className="ph">
              <div className="port-ey">Parallel Processing</div>
              <h1 className="port-title">Agent Engine</h1>
              <p style={{ fontSize: '.87rem', color: 'var(--port-m)', marginTop: 6, lineHeight: 1.6, maxWidth: 540 }}>
                4 validation agents run concurrently via Promise.all. A synthesiser agent reads all outputs and produces a final recommendation.
              </p>
            </div>
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
                  ['🧩 State Agent', 'Validates field completeness, consistency, data types'],
                  ['🔒 Security Agent', 'XSS detection, injection scan, format validation'],
                  ['🗃️ Database Agent', 'Normalises record for Postgres insertion via Supabase'],
                  ['🛡️ RLS Validator', 'Confirms anon key policies allow the operation'],
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
            <div className="ph"><div className="port-ey">System Status</div><h1 className="port-title">System</h1></div>
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
            <div className="ph"><div className="port-ey">Row-Level Security</div><h1 className="port-title">RLS & Key Vault</h1></div>
            <div className="pc">
              <div className="pc-h"><span className="pc-t">Environment Keys</span></div>
              <div className="pc-b">
                {[
                  { type: 'public', label: 'VITE_SUPABASE_URL', val: 'https://[ref].supabase.co', note: 'Safe to expose. Configure in .env.local' },
                  { type: 'public', label: 'VITE_SUPABASE_ANON_KEY', val: 'eyJ…[anon key]', note: 'Safe to expose. Subject to RLS policies' },
                  { type: 'danger', label: 'SUPABASE_SERVICE_KEY', val: 'NEVER SENT TO CLIENT — server env / Edge Fn only', note: 'Bypasses RLS. Server-side only. Never in browser.' },
                  { type: 'server', label: 'GOOGLE_CLIENT_ID', val: '1234…apps.googleusercontent.com', note: 'OAuth 2.0 client ID from Google Console' },
                  { type: 'server', label: 'APPLE_SERVICE_ID', val: 'com.studiop.auth', note: 'Apple Sign In Service ID from Developer portal' },
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
                      { table: 'bookings', policy: 'select_own', role: 'authenticated', clause: 'client_id = auth.uid()' },
                      { table: 'bookings', policy: 'insert_auth', role: 'authenticated', clause: 'auth.role() = authenticated' },
                      { table: 'user_profiles', policy: 'read_own', role: 'authenticated', clause: 'id = auth.uid()' },
                      { table: 'gallery', policy: 'public_read', role: 'anon', clause: 'approved = true' },
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
  );
}
