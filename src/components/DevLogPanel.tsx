// ════════════════════════════════════════════════
// STUDIO P — DevLogPanel (components/DevLogPanel.tsx)
// Live log stream, filterable, pinned to bottom-right
// Only renders in DEV mode (import.meta.env.DEV)
// ════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import type { LogEntry, LogLevel } from '@/types';
import { logger } from '@/core/logger';

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '#6B7BB8',
  info:  '#52E89A',
  warn:  '#FFB347',
  error: '#f87171',
};

export function DevLogPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to new log entries
    const unsub = logger.subscribe((entry) => {
      setEntries(prev => {
        const next = [...prev, entry];
        return next.slice(-200); // keep last 200
      });
      if (!open) setUnread(u => u + 1);
    });
    // Load existing entries
    setEntries(logger.getAll().slice(0, 100).reverse());
    return unsub;
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries, open]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.level === filter);

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        style={{
          position: 'fixed', bottom: 16, right: 16,
          background: 'rgba(6,8,15,.95)', border: '1px solid var(--admin-b)',
          color: 'var(--admin-a)', borderRadius: 8,
          padding: '6px 12px', fontFamily: 'DM Mono, monospace',
          fontSize: 9, letterSpacing: '.18em', cursor: 'pointer',
          zIndex: 998, minHeight: 'unset', display: 'flex', alignItems: 'center', gap: 6,
          animation: 'fadeIn .3s ease',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--admin-a)', animation: 'pulse 1.2s infinite', flexShrink: 0 }}/>
        DEV LOG
        {unread > 0 && (
          <span style={{
            background: 'var(--admin-a)', color: 'var(--admin-bg)',
            borderRadius: 10, padding: '1px 5px', fontSize: 8, fontWeight: 700,
          }}>{unread}</span>
        )}
      </button>
    );
  }

  return (
    <div className="dev-log">
      {/* Header */}
      <div className="dev-log-h">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--admin-a)', animation: 'pulse 1.2s infinite' }}/>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '.2em', color: 'var(--admin-a)' }}>
            DEV LOG
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--admin-m)' }}>
            [{entries.length}]
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Level filter */}
          {(['all', 'debug', 'info', 'warn', 'error'] as const).map(lvl => (
            <button key={lvl} onClick={() => setFilter(lvl)} style={{
              background: filter === lvl ? 'rgba(255,255,255,.08)' : 'transparent',
              border: '1px solid ' + (filter === lvl ? 'var(--admin-b)' : 'transparent'),
              color: lvl === 'all' ? 'var(--admin-m)' : LEVEL_COLOR[lvl as LogLevel],
              fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.1em',
              padding: '2px 5px', borderRadius: 3, cursor: 'pointer', minHeight: 'unset',
              textTransform: 'uppercase',
            }}>{lvl}</button>
          ))}
          <button onClick={() => logger.clear()} style={{
            background: 'none', border: '1px solid var(--bord)', color: 'var(--stone)',
            fontFamily: 'DM Mono, monospace', fontSize: 7, padding: '2px 5px',
            borderRadius: 3, cursor: 'pointer', minHeight: 'unset', letterSpacing: '.1em',
          }}>CLR</button>
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--stone)',
            fontSize: 12, cursor: 'pointer', minHeight: 'unset', padding: '2px',
          }}>×</button>
        </div>
      </div>

      {/* Log body */}
      <div ref={bodyRef} className="dev-log-body">
        {filtered.length === 0 && (
          <div style={{ padding: '12px 10px', color: 'var(--stone)', fontSize: 9 }}>No entries.</div>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className={`dev-log-row log-${entry.level}`}>
            <span className="log-t">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="log-mod">[{entry.module}]</span>
            <span style={{ color: entry.level === 'error' ? '#f87171' : entry.level === 'warn' ? '#FFB347' : 'var(--parch2)', flex: 1, wordBreak: 'break-word' }}>
              {entry.message}
              {entry.data && (
                <span style={{ color: 'var(--stone)', marginLeft: 4 }}>
                  {JSON.stringify(entry.data).slice(0, 80)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
