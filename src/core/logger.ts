// ════════════════════════════════════════════════
// STUDIO P — Logger (core/logger.ts)
// Structured logging: levels, modules, session ID,
// in-memory ring buffer, dev-console forwarding
// ════════════════════════════════════════════════

import type { LogLevel, LogEntry } from '@/types';

const RING_BUFFER_SIZE = 500;

// ── Singleton Logger ─────────────────────────────
class Logger {
  private static instance: Logger;
  private buffer: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private listeners: Array<(entry: LogEntry) => void> = [];
  private isDev: boolean;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.isDev = import.meta.env?.DEV ?? true;
    this.info('Logger', 'Session started', { sessionId: this.sessionId });
  }

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  // ── Public API ─────────────────────────────────
  setUser(userId: string) {
    this.userId = userId;
    this.info('Logger', 'User bound to session', { userId });
  }

  clearUser() {
    this.info('Logger', 'User unbound from session', { userId: this.userId });
    this.userId = undefined;
  }

  debug(module: string, message: string, data?: Record<string, unknown>) {
    if (!this.isDev) return; // strip debug in prod
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: Record<string, unknown>) {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, unknown>) {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, data?: Record<string, unknown>) {
    this.log('error', module, message, data);
  }

  // ── Timed operation ────────────────────────────
  time(module: string, label: string): () => void {
    const start = performance.now();
    return () => {
      const durationMs = Math.round(performance.now() - start);
      this.info(module, `${label} completed`, { durationMs });
    };
  }

  // ── Query ──────────────────────────────────────
  getEntries(level?: LogLevel, limit = 100): LogEntry[] {
    let entries = [...this.buffer];
    if (level) entries = entries.filter(e => e.level === level);
    return entries.slice(-limit).reverse();
  }

  getAll(): LogEntry[] {
    return [...this.buffer].reverse();
  }

  clear() {
    this.buffer = [];
    this.info('Logger', 'Log buffer cleared');
  }

  // ── Subscription ───────────────────────────────
  subscribe(fn: (entry: LogEntry) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  // ── Private ────────────────────────────────────
  private log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: Date.now(),
      level,
      module,
      message,
      data,
      sessionId: this.sessionId,
      userId: this.userId,
    };

    // Ring buffer
    if (this.buffer.length >= RING_BUFFER_SIZE) this.buffer.shift();
    this.buffer.push(entry);

    // Console forward (dev only)
    if (this.isDev) {
      const prefix = `[${module}]`;
      const style = this.levelStyle(level);
      if (data) {
        console[level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error'](
          `%c${entry.level.toUpperCase()} ${prefix}`, style, message, data
        );
      } else {
        console[level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error'](
          `%c${entry.level.toUpperCase()} ${prefix}`, style, message
        );
      }
    }

    // Notify listeners (React components)
    this.listeners.forEach(fn => fn(entry));
  }

  private levelStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color:#6B7BB8;font-weight:normal',
      info:  'color:#52E89A;font-weight:bold',
      warn:  'color:#FFB347;font-weight:bold',
      error: 'color:#f87171;font-weight:bold',
    };
    return styles[level];
  }

  private generateSessionId(): string {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

// ── Export singleton ─────────────────────────────
export const logger = Logger.getInstance();
