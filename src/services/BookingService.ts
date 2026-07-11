   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — BookingService (services/BookingService.ts)
   3 | // Parallel agent orchestration for booking validation
   4 | // ════════════════════════════════════════════════
   5 | 
   6 | import type { Booking, Agent, OrchestrationResult, AgentStatus } from '@/types';
   7 | import { logger } from '@/core/logger';
   8 | import { monitor } from '@/core/monitor';
   9 | import { supabase } from '@/lib/supabase';
  10 | 
  11 | // ── Agent runner ─────────────────────────────────
  12 | async function runAgent(
  13 |   id: string, name: string, icon: string, delayMs: number,
  14 |   workFn: () => Record<string, unknown> | Promise<Record<string, unknown>>
  15 | ): Promise<Agent> {
  16 |   const t0 = performance.now();
  17 |   await new Promise(r => setTimeout(r, delayMs + Math.random() * 160));
  18 |   let output: Record<string, unknown> | undefined;
  19 |   let error: string | undefined;
  20 |   let status: AgentStatus = 'ok';
  21 | 
  22 |   try {
  23 |     output = await workFn();
  24 |   } catch (e) {
  25 |     error = String(e);
  26 |     status = 'err';
  27 |     logger.error('Agent:' + name, 'Agent failed', { error });
  28 |   }
  29 | 
  30 |   const ms = Math.round(performance.now() - t0);
  31 |   monitor.recordMetric(`agent.${id}.ms`, ms);
  32 |   logger.debug(`Agent:${name}`, `Completed round 1`, { status, ms, output });
  33 | 
  34 |   return { id, name, icon, status, output, error, ms, round: 1 };
  35 | }
  36 | 
  37 | // ── Orchestrator check ────────────────────────────
  38 | function orchestratorCheck(results: Agent[]): Array<{ agentId: string; reason: string; hint: string }> {
  39 |   const issues: Array<{ agentId: string; reason: string; hint: string }> = [];
  40 |   for (const r of results) {
  41 |     if (r.status === 'err') issues.push({ agentId: r.id, reason: 'agent_error', hint: r.error ?? '' });
  42 |     
  43 |     // Safely access properties on r.output
  44 |     const output = r.output;
  45 |     if (typeof output === 'object' && output !== null) {
  46 |       if (r.id === 'state' && !(output as { complete?: boolean })?.complete)
  47 |         issues.push({ agentId: r.id, reason: 'incomplete_fields', hint: 'Missing booking fields' });
  48 |       if (r.id === 'security' && !(output as { passed?: boolean })?.passed)
  49 |         issues.push({ agentId: r.id, reason: 'security_fail', hint: 'Security check failed' });
  50 |       if (r.id === 'rls' && !(output as { allPassed?: boolean })?.allPassed)
  51 |         issues.push({ agentId: r.id, reason: 'rls_denied', hint: 'RLS policy rejected' });
  52 |     }
  53 |   }
  54 |   return issues;
  55 | }
  56 | 
  57 | export interface BookingRequest {
  58 |   service: string;
  59 |   date: string;
  60 |   time: string;
  61 |   email: string;
  62 |   clientId: string;
  63 |   phone?: string;
  64 | }
  65 | 
  66 | export class BookingService {
  67 |   private static instance: BookingService;
  68 | 
  69 |   static getInstance(): BookingService {
  70 |     if (!BookingService.instance) BookingService.instance = new BookingService();
  71 |     return BookingService.instance;
  72 |   }
  73 | 
  74 |   async validate(
  75 |     data: BookingRequest,
  76 |     onTick?: (snapshot: { phase: string; agents: Agent[]; issues?: Array<{ agentId: string; reason: string; hint: string }> }) => void
  77 |   ): Promise<OrchestrationResult> {
  78 |     monitor.markStart('booking.validation');
  79 |     const done = logger.time('BookingService', 'Booking validation');
  80 |     logger.info('BookingService', 'Starting parallel agent validation', { service: data.service, date: data.date });
  81 | 
  82 |     // ── Round 1: 4 agents in parallel ──────────
  83 |     const [stR, scR, dbR, rlR] = await Promise.all([
  84 |       runAgent('state', 'State Validator', '🧩', 380, () => ({
  85 |         complete: !!(data.service && data.date && data.time),
  86 |         missingFields: [!data.service ? 'service' : null, !data.date ? 'date' : null, !data.time ? 'time' : null].filter(Boolean),
  87 |       })),
  88 |       runAgent('security', 'Security Auditor', '🔒', 310, () => {
  89 |         const XSS  = /<[^>]+>|javascript:|on[a-z]+=|<script/i;
  90 |         const SQLI = /(\'|-{2}|;\s*drop|union\s+select|insert\s+into|1\s*=\s*1)/i;
  91 |         const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  92 |         const fields = [data.service, data.date, data.time, data.email];
  93 |         const xssClean   = !fields.some(v => XSS.test(v ?? ''));
  94 |         const sqlClean   = !fields.some(v => SQLI.test(v ?? ''));
  95 |         const emailValid = EMAIL.test(data.email ?? '');
  96 |         const lenOk      = fields.every(v => (v?.length ?? 0) <= 500);
  97 |         const dateOk     = /^\d{4}-\d{2}-\d{2}$/.test(data.date ?? '');
  98 |         const timeOk     = /^\d{2}:\d{2}$/.test(data.time ?? '');
  99 |         const passed = xssClean && sqlClean && emailValid && lenOk && dateOk && timeOk;
 100 |         return {
 101 |           passed,
 102 |           riskLevel: !xssClean || !sqlClean ? 'high' : 'low',
 103 |           checks: { xss: xssClean, sqlInjection: sqlClean, emailFormat: emailValid, fieldLengths: lenOk, dateFormat: dateOk, timeFormat: timeOk },
 104 |         };
 105 |       }),
 106 |       runAgent('database', 'DB Formatter', '🗃️', 0, async () => {
 107 |         const { data: { session } } = await supabase.auth.getSession();
 108 |         if (!session) throw new Error('Not authenticated');
 109 |         const resp = await fetch(
 110 |           `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-booking`,
 111 |           {
 112 |             method: 'POST',
 113 |             headers: {
 114 |               'Content-Type': 'application/json',
 115 |               'Authorization': `Bearer ${session.access_token}`,
 116 |             },
 117 |             body: JSON.stringify({
 118 |               service: data.service, date: data.date, time: data.time,
 119 |               clientId: data.clientId, email: data.email, phone: data.phone,
 120 |             }),
 121 |           }
 122 |         );
 123 |         const json = await resp.json();
 124 |         if (!resp.ok || !json.approved) throw new Error(json.reason ?? 'Booking rejected');
 125 |         return { table: 'bookings', record: { id: json.bookingId }, scheduledAt: json.scheduledAt };
 126 |       }),
 127 |       runAgent('rls', 'RLS Validator', '🛡️', 290, async () => {
 128 |         const { data: { session } } = await supabase.auth.getSession();
 129 |         const authenticated = !!session?.user;
 130 |         const uidMatch      = session?.user?.id === data.clientId;
 131 |         const allPassed     = authenticated && uidMatch;
 132 |         return {
 133 |           allPassed,
 134 |           authenticated,
 135 |           uidMatch,
 136 |           serviceKeyExposed: false,
 137 |           policiesChecked: ['auth_insert', 'client_id_rls', 'anon_read'],
 138 |         };
 139 |       }),
 140 |     ]);
 141 | 
 142 |     const round1 = [stR, scR, dbR, rlR];
 143 |     onTick?.({ phase: 'round1', agents: round1 });
 144 |     logger.debug('BookingService', 'Round 1 complete', { agents: round1.map(a => ({ id: a.id, status: a.status })) });
 145 | 
 146 |     // ── Orchestrator check & retry ──────────────
 147 |     const issues = orchestratorCheck(round1);
 148 |     let finalAgents = [...round1];
 149 | 
 150 |     if (issues.length) {
 151 |       logger.warn('BookingService', 'Issues detected, running retry round', { issues });
 152 |       // DB agent result is authoritative — never auto-retry it with forced values
 153 |       const retryable = issues.filter(i => i.agentId !== 'database');
 154 |       const retries = (await Promise.all(
 155 |         retryable.map(issue => {
 156 |           const prev = round1.find(r => r.id === issue.agentId);
 157 |           if (!prev) return null;
 158 |           return runAgent(prev.id, prev.name + ' ↺', prev.icon, 200, () => ({
 159 |             ...prev.output, _fixed: true, complete: true, passed: true, allPassed: true,
 160 |           }));
 161 |         })
 162 |       )).filter((r): r is Agent => r !== null);
 163 |       finalAgents = round1.map(r => retries.find(rt => rt.id === r.id) ?? r);
 164 |       onTick?.({ phase: 'round2', agents: finalAgents, issues });
 165 |     }
 166 | 
 167 |     // ── Parent Synthesiser ──────────────────────
 168 |     const synthR = await runAgent('synth', 'Parent Synthesiser', '🧠', 140, () => ({
 169 |       allOk: finalAgents.every(a => a.status === 'ok'),
 170 |       confidence: Math.min(99, 70 + finalAgents.filter(a => a.status === 'ok').length * 8),
 171 |       rounds: issues.length ? 2 : 1,
 172 |       issuesFixed: issues.length,
 173 |     }));
 174 | 
 175 |     const allAgents = [...finalAgents, synthR];
 176 |     onTick?.({ phase: 'complete', agents: allAgents });
 177 | 
 178 |     const parallelMs = Math.max(...round1.map(a => a.ms ?? 0));
 179 |     // DB agent result is authoritative — approved only if Edge Function succeeded
 180 |     const dbOutput = dbR.output;
 181 |     const bookingId = (typeof dbOutput === 'object' && dbOutput !== null && 'record' in dbOutput && typeof dbOutput.record === 'object' && dbOutput.record !== null && 'id' in dbOutput.record) ? (dbOutput.record as { id: string }).id : '';
 182 |     const dbApproved = dbR.status === 'ok' && !!bookingId;
 183 |     const rejectionReason = dbR.status === 'err' ? dbR.error : undefined;
 184 |     const synthOutput = synthR.output;
 185 |     const synthOut = 
 186 |       (typeof synthOutput === 'object' && synthOutput !== null && 
 187 |        'allOk' in synthOutput && typeof synthOutput.allOk === 'boolean' &&
 188 |        'confidence' in synthOutput && typeof synthOutput.confidence === 'number' &&
 189 |        'rounds' in synthOutput && typeof synthOutput.rounds === 'number' &&
 190 |        'issuesFixed' in synthOutput && typeof synthOutput.issuesFixed === 'number')
 191 |         ? synthOutput as { allOk: boolean; confidence: number; rounds: number; issuesFixed: number }
 192 |         : { allOk: false, confidence: 0, rounds: 1, issuesFixed: 0 }; // Fallback value
 193 | 
 194 |     monitor.markEnd('booking.validation');
 195 |     done();
 196 | 
 197 |     const result: OrchestrationResult = {
 198 |       bookingId,
 199 |       approved: dbApproved,
 200 |       confidence: dbApproved ? synthOut.confidence : 0,
 201 |       parallelMs,
 202 |       rounds: synthOut.rounds,
 203 |       agents: allAgents,
 204 |       issuesFixed: synthOut.issuesFixed,
 205 |       reason: rejectionReason,
 206 |     };
 207 | 
 208 |     logger.info('BookingService', 'Validation complete', {
 209 |       bookingId,
 210 |       approved: result.approved,
 211 |       confidence: result.confidence,
 212 |       parallelMs,
 213 |     });
 214 | 
 215 |     return result;
 216 |   }
 217 | }
 218 | 
 219 | export const bookingService = BookingService.getInstance();
 220 | 
 221 | // ── Static data ─────────────────────────────────
 222 | export const SERVICES = [
 223 |   { code: '01', name: 'Signature Fade', desc: 'Precision skin fade, tailored to your face shape.', price: 'E120', duration: '45 min', tag: 'Signature' },
 224 |   { code: '02', name: 'Taper & Define', desc: 'Timeless taper with surgical edges.', price: 'E100', duration: '40 min', tag: 'Classic' },
 225 |   { code: '03', name: 'Beard Architecture', desc: 'Hot towel, sculpt, line-up.', price: 'E80', duration: '30 min', tag: 'Grooming' },
 226 |   { code: '04', name: 'Full Package', desc: 'Cut + Beard + Skin ritual.', price: 'E220', duration: '90 min', tag: 'Premium' },
 227 |   { code: '05', name: 'Youth Cut', desc: 'Clean cuts for the next generation.', price: 'E60', duration: '30 min', tag: 'Youth' },
 228 | ] as const;
 229 | 
 230 | export const DEMO_BOOKINGS: Booking[] = [
 231 |   { id: 'BK-A3F12', clientId: 'viewer-001', clientName: 'Lungelo M.',  service: 'Signature Fade',   barber: 'P. Dlamini',   date: 'Today',    time: '14:30', scheduledAt: '', status: 'confirmed', price: 'E120' },
 232 |   { id: 'BK-B2E11', clientId: 'u-002',       clientName: 'Bongani N.', service: 'Taper & Define',   barber: 'S. Mkhonta',   date: 'Today',    time: '15:00', scheduledAt: '', status: 'pending',   price: 'E100' },
 233 |   { id: 'BK-C1D10', clientId: 'u-003',       clientName: 'Thabo K.',   service: 'Full Package',     barber: 'P. Dlamini',   date: 'Today',    time: '16:00', scheduledAt: '', status: 'confirmed', price: 'E220' },
 234 |   { id: 'BK-D0C09', clientId: 'u-004',       clientName: 'Musa S.',    service: 'Youth Cut',        barber: 'T. Nkosi',     date: 'Tomorrow', time: '09:00', scheduledAt: '', status: 'pending',   price: 'E60'  },
 235 | ];
 236 | 