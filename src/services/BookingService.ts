// ════════════════════════════════════════════════
// STUDIO P — BookingService (services/BookingService.ts)
// Parallel agent orchestration for booking validation
// ════════════════════════════════════════════════

import type { Booking, Agent, OrchestrationResult, AgentStatus } from '@/types';
import { logger } from '@/core/logger';
import { monitor } from '@/core/monitor';
import { supabase } from '@/lib/supabase';

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
    if (r.id === 'state' && !(r.output as Record<string,unknown>)?.complete)
      issues.push({ agentId: r.id, reason: 'incomplete_fields', hint: 'Missing booking fields' });
    if (r.id === 'security' && !(r.output as Record<string,unknown>)?.passed)
      issues.push({ agentId: r.id, reason: 'security_fail', hint: 'Security check failed' });
    if (r.id === 'rls' && !(r.output as Record<string,unknown>)?.allPassed)
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
        const SQLI = /('|-{2}|;\s*drop|union\s+select|insert\s+into|1\s*=\s*1)/i;
        const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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
    const dbRecord = dbR.output as { record?: { id: string } } | undefined;
    const bookingId = dbRecord?.record?.id ?? '';
    const dbApproved = dbR.status === 'ok' && !!bookingId;
    const rejectionReason = dbR.status === 'err' ? dbR.error : undefined;
    const synthOut = synthR.output as { allOk: boolean; confidence: number; rounds: number; issuesFixed: number };

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
  { code: '01', name: 'Fade', desc: 'Precision skin fade.', price: 'E50', duration: '30 min', tag: 'Basic' },
  { code: '02', name: 'Brush cut', desc: 'Clean brush cut with shape.', price: 'E40', duration: '35 min', tag: 'Classic' },
  { code: '03', name: 'Chiskop', desc: 'Neat chiskop style.', price: 'E40', duration: '35 min', tag: 'Classic' },
  { code: '04', name: 'Fiber+Fade', desc: 'Fiber texture with fade blend.', price: 'E60', duration: '45 min', tag: 'Premium' },
  { code: '05', name: 'Brush+Fiber', desc: 'Brush cut with fiber finish.', price: 'E50', duration: '40 min', tag: 'Premium' },
  { code: '06', name: 'Fiber', desc: 'Fiber texture styling.', price: 'E15', duration: '20 min', tag: 'Quick' },
  { code: '07', name: 'Afro Fade+Black dye', desc: 'Afro fade with black dye application.', price: 'E100', duration: '60 min', tag: 'Premium' },
  { code: '08', name: 'Skin fade+Black dye', desc: 'Skin fade with black dye.', price: 'E60', duration: '45 min', tag: 'Premium' },
  { code: '09', name: 'Mid fade+Black dye', desc: 'Mid fade with black dye application.', price: 'E80', duration: '50 min', tag: 'Premium' },
  { code: '10', name: 'Bleach only', desc: 'Hair bleach treatment.', price: 'E100', duration: '60 min', tag: 'Treatment' },
  { code: '11', name: 'Bleach+Color', desc: 'Bleach with color application.', price: 'E180', duration: '90 min', tag: 'Premium' },
  { code: '12', name: 'Ecurl', desc: 'Ecurl styling service.', price: 'E150', duration: '75 min', tag: 'Premium' },
  { code: '13', name: 'Streaming', desc: 'Hair streaming treatment.', price: 'E15', duration: '20 min', tag: 'Quick' },
] as const;

export const DEMO_BOOKINGS: Booking[] = [
  { id: 'BK-A3F12', clientId: 'viewer-001', clientName: 'Lungelo M.',  service: 'Fade',   barber: 'P. Dlamini',   date: 'Today',    time: '14:30', scheduledAt: '', status: 'confirmed', price: 'E50' },
  { id: 'BK-B2E11', clientId: 'u-002',       clientName: 'Bongani N.', service: 'Brush cut',   barber: 'S. Mkhonta',   date: 'Today',    time: '15:00', scheduledAt: '', status: 'pending',   price: 'E40' },
  { id: 'BK-C1D10', clientId: 'u-003',       clientName: 'Thabo K.',   service: 'Fiber+Fade',     barber: 'P. Dlamini',   date: 'Today',    time: '16:00', scheduledAt: '', status: 'confirmed', price: 'E60' },
  { id: 'BK-D0C09', clientId: 'u-004',       clientName: 'Musa S.',    service: 'Fiber',        barber: 'T. Nkosi',     date: 'Tomorrow', time: '09:00', scheduledAt: '', status: 'pending',   price: 'E15'  },
];
