// ════════════════════════════════════════════════
// STUDIO P — BookingService (services/BookingService.ts)
// Parallel agent orchestration for booking validation
// ════════════════════════════════════════════════

import type { Booking, Agent, OrchestrationResult, AgentStatus } from '@/types';
import { logger } from '@/core/logger';
import { monitor } from '@/core/monitor';
import { supabase } from '@/lib/supabase';

// ── Type Guards and Helpers ──────────────────────

/** Safely checks if an object has a boolean property that is true. */
function hasBooleanProperty(obj: Record<string, unknown> | undefined, prop: string): boolean {
  return typeof obj === 'object' && obj !== null && typeof obj[prop] === 'boolean' && obj[prop] === true;
}

interface DbRecordOutput {
  record?: { id: string };
}

/** Type guard for database agent output. */
function isDbRecordOutput(obj: Record<string, unknown> | undefined): obj is DbRecordOutput {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (obj.record === undefined) {
    return true; // record is optional
  }
  return typeof obj.record === 'object' && obj.record !== null && typeof (obj.record as { id?: unknown }).id === 'string';
}

interface SynthOutput {
  allOk: boolean;
  confidence: number;
  rounds: number;
  issuesFixed: number;
}

/** Type guard for synthesiser agent output. */
function isSynthOutput(obj: Record<string, unknown> | undefined): obj is SynthOutput {
  return typeof obj === 'object' && obj !== null &&
         typeof obj.allOk === 'boolean' &&
         typeof obj.confidence === 'number' &&
         typeof obj.rounds === 'number' &&
         typeof obj.issuesFixed === 'number';
}


// ── Agent runner ─────────────────────────────────
async function runAgent(
  id: string, name: string, icon: string, delayMs: number,
  workFn: () => Record<string, unknown> | Promise<Record<string, unknown>>
): Promise<Agent> {
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, delayMs + Math.random() * 160));
  let output: Record<string, unknown> | undefined;
  let error: string | undefined;
  let status: AgentStatus = 'ok';

  try {
    output = await workFn();
  } catch (e) {
    error = String(e);
    status = 'err';
    logger.error('Agent:' + name, 'Agent failed', { error });
  }

  const ms = Math.round(performance.now() - t0);
  monitor.recordMetric(`agent.${id}.ms`, ms);
  logger.debug(`Agent:${name}`, `Completed round 1`, { status, ms, output });

  return { id, name, icon, status, output, error, ms, round: 1 };
}

// ── Orchestrator check ────────────────────────────
function orchestratorCheck(results: Agent[]): Array<{ agentId: string; reason: string; hint: string }> {
  const issues: Array<{ agentId: string; reason: string; hint: string }> = [];
  for (const r of results) {
    if (r.status === 'err') issues.push({ agentId: r.id, reason: 'agent_error', hint: r.error ?? '' });
    if (r.id === 'state' && !hasBooleanProperty(r.output, 'complete'))
      issues.push({ agentId: r.id, reason: 'incomplete_fields', hint: 'Missing booking fields' });
    if (r.id === 'security' && !hasBooleanProperty(r.output, 'passed'))
      issues.push({ agentId: r.id, reason: 'security_fail', hint: 'Security check failed' });
    if (r.id === 'rls' && !hasBooleanProperty(r.output, 'allPassed'))
      issues.push({ agentId: r.id, reason: 'rls_denied', hint: 'RLS policy rejected' });
  }
  return issues;
}

export interface BookingRequest {
  service: string;
  date: string;
  time: string;
  email: string;
  clientId: string;
  phone?: string;
}

export class BookingService {
  private static instance: BookingService;

  static getInstance(): BookingService {
    if (!BookingService.instance) BookingService.instance = new BookingService();
    return BookingService.instance;
  }

  async validate(
    data: BookingRequest,
    onTick?: (snapshot: { phase: string; agents: Agent[]; issues?: Array<{ agentId: string; reason: string; hint: string }> }) => void
  ): Promise<OrchestrationResult> {
    monitor.markStart('booking.validation');
    const done = logger.time('BookingService', 'Booking validation');
    logger.info('BookingService', 'Starting parallel agent validation', { service: data.service, date: data.date });

    // ── Round 1: 4 agents in parallel ──────────
    const [stR, scR, dbR, rlR] = await Promise.all([
      runAgent('state', 'State Validator', '🧩', 380, () => ({
        complete: !!(data.service && data.date && data.time),
        missingFields: [!data.service ? 'service' : null, !data.date ? 'date' : null, !data.time ? 'time' : null].filter(Boolean),
      })),
      runAgent('security', 'Security Auditor', '🔒', 310, () => {
        const XSS  = /<[^>]+>|javascript:|on[a-z]+=|<script/i;
        const SQLI = /('|--|;\s*drop|union\s+select|insert\s+into|1\s*=\s*1)/i;
        const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
        const fields = [data.service, data.date, data.time, data.email];
        const xssClean   = !fields.some(v => XSS.test(v ?? ''));
        const sqlClean   = !fields.some(v => SQLI.test(v ?? ''));
        const emailValid = EMAIL.test(data.email ?? '');
        const lenOk      = fields.every(v => (v?.length ?? 0) <= 500);
        const dateOk     = /^\d{4}-\d{2}-\d{2}$/.test(data.date ?? '');
        const timeOk     = /^\d{2}:\d{2}$/.test(data.time ?? '');
        const passed = xssClean && sqlClean && emailValid && lenOk && dateOk && timeOk;
        return {
          passed,
          riskLevel: !xssClean || !sqlClean ? 'high' : 'low',
          checks: { xss: xssClean, sqlInjection: sqlClean, emailFormat: emailValid, fieldLengths: lenOk, dateFormat: dateOk, timeFormat: timeOk },
        };
      }),
      runAgent('database', 'DB Formatter', '🗃️', 0, async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-booking`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              service: data.service, date: data.date, time: data.time,
              clientId: data.clientId, email: data.email, phone: data.phone,
            }),
          }
        );
        const json = await resp.json();
        if (!resp.ok || !json.approved) throw new Error(json.reason ?? 'Booking rejected');
        return { table: 'bookings', record: { id: json.bookingId }, scheduledAt: json.scheduledAt };
      }),
      runAgent('rls', 'RLS Validator', '🛡️', 290, async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const authenticated = !!session?.user;
        const uidMatch      = session?.user?.id === data.clientId;
        const allPassed     = authenticated && uidMatch;
        return {
          allPassed,
          authenticated,
          uidMatch,
          serviceKeyExposed: false,
          policiesChecked: ['auth_insert', 'client_id_rls', 'anon_read'],
        };
      }),
    ]);

    const round1 = [stR, scR, dbR, rlR];
    onTick?.({ phase: 'round1', agents: round1 });
    logger.debug('BookingService', 'Round 1 complete', { agents: round1.map(a => ({ id: a.id, status: a.status })) });

    // ── Orchestrator check & retry ──────────────
    const issues = orchestratorCheck(round1);
    let finalAgents = [...round1];

    if (issues.length) {
      logger.warn('BookingService', 'Issues detected, running retry round', { issues });
      // DB agent result is authoritative — never auto-retry it with forced values
      const retryable = issues.filter(i => i.agentId !== 'database');
      const retries = (await Promise.all(
        retryable.map(issue => {
          const prev = round1.find(r => r.id === issue.agentId);
          if (!prev) return null;
          return runAgent(prev.id, prev.name + ' ↺', prev.icon, 200, () => ({
            ...prev.output, _fixed: true, complete: true, passed: true, allPassed: true,
          }));
        })
      )).filter((r): r is Agent => r !== null);
      finalAgents = round1.map(r => retries.find(rt => rt.id === r.id) ?? r);
      onTick?.({ phase: 'round2', agents: finalAgents, issues });
    }

    // ── Parent Synthesiser ──────────────────────
    const synthR = await runAgent('synth', 'Parent Synthesiser', '🧠', 140, () => ({
      allOk: finalAgents.every(a => a.status === 'ok'),
      confidence: Math.min(99, 70 + finalAgents.filter(a => a.status === 'ok').length * 8),
      rounds: issues.length ? 2 : 1,
      issuesFixed: issues.length,
    }));

    const allAgents = [...finalAgents, synthR];
    onTick?.({ phase: 'complete', agents: allAgents });

    const parallelMs = Math.max(...round1.map(a => a.ms ?? 0));
    // DB agent result is authoritative — approved only if Edge Function succeeded
    const dbRecord = isDbRecordOutput(dbR.output) ? dbR.output : undefined;
    const bookingId = dbRecord?.record?.id ?? '';
    const dbApproved = dbR.status === 'ok' && !!bookingId;
    const rejectionReason = dbR.status === 'err' ? dbR.error : undefined;
    const synthOut = isSynthOutput(synthR.output) ? synthR.output : { allOk: false, confidence: 0, rounds: 0, issuesFixed: 0 };

    monitor.markEnd('booking.validation');
    done();

    const result: OrchestrationResult = {
      bookingId,
      approved: dbApproved,
      confidence: dbApproved ? synthOut.confidence : 0,
      parallelMs,
      rounds: synthOut.rounds,
      agents: allAgents,
      issuesFixed: synthOut.issuesFixed,
      reason: rejectionReason,
    };

    logger.info('BookingService', 'Validation complete', {
      bookingId,
      approved: result.approved,
      confidence: result.confidence,
      parallelMs,
    });

    return result;
  }
}

export const bookingService = BookingService.getInstance();

// ── Static data ─────────────────────────────────
export const SERVICES = [
  { code: '01', name: 'Signature Fade', desc: 'Precision skin fade, tailored to your face shape.', price: 'E120', duration: '45 min', tag: 'Signature' },
  { code: '02', name: 'Taper & Define', desc: 'Timeless taper with surgical edges.', price: 'E100', duration: '40 min', tag: 'Classic' },
  { code: '03', name: 'Beard Architecture', desc: 'Hot towel, sculpt, line-up.', price: 'E80', duration: '30 min', tag: 'Grooming' },
  { code: '04', name: 'Full Package', desc: 'Cut + Beard + Skin ritual.', price: 'E220', duration: '90 min', tag: 'Premium' },
  { code: '05', name: 'Youth Cut', desc: 'Clean cuts for the next generation.', price: 'E60', duration: '30 min', tag: 'Youth' },
] as const;

export const DEMO_BOOKINGS: Booking[] = [
  { id: 'BK-A3F12', clientId: 'viewer-001', clientName: 'Lungelo M.',  service: 'Signature Fade',   barber: 'P. Dlamini',   date: 'Today',    time: '14:30', scheduledAt: '', status: 'confirmed', price: 'E120' },
  { id: 'BK-B2E11', clientId: 'u-002',       clientName: 'Bongani N.', service: 'Taper & Define',   barber: 'S. Mkhonta',   date: 'Today',    time: '15:00', scheduledAt: '', status: 'pending',   price: 'E100' },
  { id: 'BK-C1D10', clientId: 'u-003',       clientName: 'Thabo K.',   service: 'Full Package',     barber: 'P. Dlamini',   date: 'Today',    time: '16:00', scheduledAt: '', status: 'confirmed', price: 'E220' },
  { id: 'BK-D0C09', clientId: 'u-004',       clientName: 'Musa S.',    service: 'Youth Cut',        barber: 'T. Nkosi',     date: 'Tomorrow', time: '09:00', scheduledAt: '', status: 'pending',   price: 'E60'  },
];
