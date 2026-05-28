// ════════════════════════════════════════════════
// STUDIO P — Monitor (core/monitor.ts)
// Performance marks, health checks, metric store
// ════════════════════════════════════════════════

import type { PerfMark, HealthStatus } from '@/types';
import { logger } from './logger';

class Monitor {
  private static instance: Monitor;
  private marks: Map<string, PerfMark> = new Map();
  private metrics: Map<string, number[]> = new Map();
  private sessionStart = Date.now();

  static getInstance(): Monitor {
    if (!Monitor.instance) Monitor.instance = new Monitor();
    return Monitor.instance;
  }

  // ── Performance Marks ──────────────────────────
  markStart(name: string, tags?: Record<string, string>): void {
    this.marks.set(name, { name, startMs: performance.now(), tags });
  }

  markEnd(name: string): PerfMark | null {
    const mark = this.marks.get(name);
    if (!mark) {
      logger.warn('Monitor', `markEnd called for unknown mark: ${name}`);
      return null;
    }
    mark.endMs = performance.now();
    mark.durationMs = Math.round(mark.endMs - mark.startMs);
    logger.debug('Monitor', `Perf mark "${name}"`, { durationMs: mark.durationMs, tags: mark.tags });
    this.recordMetric(name, mark.durationMs);
    return mark;
  }

  // ── Metrics (rolling avg) ──────────────────────
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) this.metrics.set(name, []);
    const arr = this.metrics.get(name)!;
    arr.push(value);
    if (arr.length > 50) arr.shift(); // keep last 50
  }

  getMetric(name: string): { avg: number; p95: number; count: number } | null {
    const arr = this.metrics.get(name);
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    return { avg, p95, count: arr.length };
  }

  // ── Health Status ──────────────────────────────
  async getHealth(): Promise<HealthStatus> {
    const start = performance.now();
    // Simulate network health probes (replace with real endpoints)
    const responseMs = Math.round(performance.now() - start + Math.random() * 12);
    const uptime = Math.round((Date.now() - this.sessionStart) / 1000);

    const health: HealthStatus = {
      api: 'up',
      db: 'up',
      cdn: 'up',
      uptime,
      responseMs,
    };

    logger.debug('Monitor', 'Health check completed', health as unknown as Record<string, unknown>);
    return health;
  }

  // ── Uptime ─────────────────────────────────────
  getSessionUptime(): number {
    return Math.round((Date.now() - this.sessionStart) / 1000);
  }

  getAllMetrics(): Record<string, ReturnType<typeof this.getMetric>> {
    const result: Record<string, ReturnType<typeof this.getMetric>> = {};
    for (const key of this.metrics.keys()) {
      result[key] = this.getMetric(key);
    }
    return result;
  }
}

export const monitor = Monitor.getInstance();
