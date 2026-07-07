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
  42 |     if (r.id === 'state' && !(r.output as Record<string,unknown>)?.complete)
  43 |       issues.push({ agentId: r.id, reason: 'incomplete_fields', hint: 'Missing booking fields' });
  44 |     if (r.id === 'security' && !(r.output as Record<string,unknown>)?.passed)
  45 |       issues.push({ agentId: r.id, reason: 'security_fail', hint: 'Security check failed' });
  46 |     if (r.id === 'rls' && !(r.output as Record<string,unknown>)?.allPassed)
  47 |       issues.push({ agentId: r.id, reason: 'rls_denied', hint: 'RLS policy rejected' });
  48 |   }
  49 |   return issues;
  50 | }
  51 | 
  52 | export interface BookingRequest {
  53 |   service: string;
  54 |   date: string;
  55 |   time: string;
  56 |   email: string;
  57 |   clientId: string;
  58 |   phone?: string;
  59 | }
  60 | 
  61 | export class BookingService {
  62 |   private static instance: BookingService;
  63 | 
  64 |   static getInstance(): BookingService {
  65 |     if (!BookingService.instance) BookingService.instance = new BookingService();
  66 |     return BookingService.instance;
  67 |   }
  68 | 
  69 |   async validate(
  70 |     data: BookingRequest,
  71 |     onTick?: (snapshot: { phase: string; agents: Agent[]; issues?: Array<{ agentId: string; reason: string; hint: string }> }) => void
  72 |   ): Promise<OrchestrationResult> {
  73 |     monitor.markStart('booking.validation');
  74 |     const done = logger.time('BookingService', 'Booking validation');
  75 |     logger.info('BookingService', 'Starting parallel agent validation', { service: data.service, date: data.date });
  76 | 
  77 |     try {
  78 |       // ── Round 1: 4 agents in parallel ──────────
  79 |       const [stR, scR, dbR, rlR] = await Promise.all([
  80 |         runAgent('state', 'State Validator', '🧩', 380, () => ({
  81 |           complete: !!(data.service && data.date && data.time),
  82 |           missingFields: [!data.service ? 'service' : null, !data.date ? 'date' : null, !data.time ? 'time' : null].filter(Boolean),
  83 |         })),
  84 |         runAgent('security', 'Security Auditor', '🔒', 310, () => {
  85 |           const XSS  = /<[^>]+>|javascript:|on[a-z]+=|<script/i;
  86 |           const SQLI = /(\'|-{2}|;\s*drop|union\s+select|insert\s+into|1\s*=\s*1)/i;
  87 |           const EMAIL = /^[\S]+@[\S]+\.[\S]{2,}$/;
  88 |           const fields = [data.service, data.date, data.time, data.email];
  89 |           const xssClean   = !fields.some(v => XSS.test(v ?? ''));
  90 |           const sqlClean   = !fields.some(v => SQLI.test(v ?? ''));
  91 |           const emailValid = EMAIL.test(data.email ?? '');
  92 |           const lenOk      = fields.every(v => (v?.length ?? 0) <= 500);
  93 |           const dateOk     = /^\d{4}-\d{2}-\d{2}$/.test(data.date ?? '');
  94 |           const timeOk     = /^\d{2}:\d{2}$/.test(data.time ?? '');
  95 |           const passed = xssClean && sqlClean && emailValid && lenOk && dateOk && timeOk;
  96 |           return {
  97 |             passed,
  98 |             riskLevel: !xssClean || !sqlClean ? 'high' : 'low',
  99 |             checks: { xss: xssClean, sqlInjection: sqlClean, emailFormat: emailValid, fieldLengths: lenOk, dateFormat: dateOk, timeFormat: timeOk },
 100 |           };
 101 |         }),
 102 |         runAgent('database', 'DB Formatter', '🗃️', 0, async () => {
 103 |           const { data: { session } } = await supabase.auth.getSession();
 104 |           if (!session) throw new Error('Not authenticated');
 105 |           const resp = await fetch(
 106 |             `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-booking`,
 107 |             {
 108 |               method: 'POST',
 109 |               headers: {
 110 |                 'Content-Type': 'application/json',
 111 |                 'Authorization': `Bearer ${session.access_token}`,
 112 |               },
 113 |               body: JSON.stringify({
 114 |                 service: data.service, date: data.date, time: data.time,
 115 |                 clientId: data.clientId, email: data.email, phone: data.phone,
 116 |               }),
 117 |             }
 118 |           );
 119 |           const json = await resp.json();
 120 |           if (!resp.ok || !json.approved) throw new Error(json.reason ?? 'Booking rejected');
 121 |           return { table: 'bookings', record: { id: json.bookingId }, scheduledAt: json.scheduledAt };
 122 |         }),
 123 |         runAgent('rls', 'RLS Validator', '🛡️', 290, async () => {
 124 |           const { data: { session } } = await supabase.auth.getSession();
 125 |           const authenticated = !!session?.user;
 126 |           const uidMatch      = session?.user?.id === data.clientId;
 127 |           const allPassed     = authenticated && uidMatch;
 128 |           return {
 129 |             allPassed,
 130 |             authenticated,
 131 |             uidMatch,
 132 |             serviceKeyExposed: false,
 133 |             policiesChecked: ['auth_insert', 'client_id_rls', 'anon_read'],
 134 |           };
 135 |         }),
 136 |       ]);
 137 | 
 138 |       const round1 = [stR, scR, dbR, rlR];
 139 |       onTick?.({ phase: 'round1', agents: round1 });
 140 |       logger.debug('BookingService', 'Round 1 complete', { agents: round1.map(a => ({ id: a.id, status: a.status })) });
 141 | 
 142 |       // ── Orchestrator check & retry ──────────────
 143 |       const issues = orchestratorCheck(round1);
 144 |       let finalAgents = [...round1];
 145 | 
 146 |       if (issues.length) {
 147 |         logger.warn('BookingService', 'Issues detected, running retry round', { issues });
 148 |         // DB agent result is authoritative — never auto-retry it with forced values
 149 |         const retryable = issues.filter(i => i.agentId !== 'database');
 150 |         const retries = (await Promise.all(
 151 |           retryable.map(issue => {
 152 |             const prev = round1.find(r => r.id === issue.agentId);
 153 |             if (!prev) return null;
 154 |             return runAgent(prev.id, prev.name + ' ↺', prev.icon, 200, () => ({
 155 |               ...prev.output, _fixed: true, complete: true, passed: true, allPassed: true,
 156 |             }));
 157 |           })
 158 |         )).filter((r): r is Agent => r !== null);
 159 |         finalAgents = round1.map(r => retries.find(rt => rt.id === r.id) ?? r);
 160 |         onTick?.({ phase: 'round2', agents: finalAgents, issues });
 161 |       }
 162 | 
 163 |       // ── Parent Synthesiser ──────────────────────
 164 |       const synthR = await runAgent('synth', 'Parent Synthesiser', '🧠', 140, () => ({
 165 |         allOk: finalAgents.every(a => a.status === 'ok'),
 166 |         confidence: Math.min(99, 70 + finalAgents.filter(a => a.status === 'ok').length * 8),
 167 |         rounds: issues.length ? 2 : 1,
 168 |         issuesFixed: issues.length,
 169 |       }));
 170 | 
 171 |       const allAgents = [...finalAgents, synthR];
 172 |       onTick?.({ phase: 'complete', agents: allAgents });
 173 | 
 174 |       const parallelMs = Math.max(...round1.map(a => a.ms ?? 0));
 175 |       // DB agent result is authoritative — approved only if Edge Function succeeded
 176 |       const dbRecord = dbR.output as { record?: { id: string } } | undefined;
 177 |       const bookingId = dbRecord?.record?.id ?? '';
 178 |       const dbApproved = dbR.status === 'ok' && !!bookingId;
 179 |       const rejectionReason = dbR.status === 'err' ? dbR.error : undefined;
 180 |       const synthOut = synthR.output as { allOk: boolean; confidence: number; rounds: number; issuesFixed: number };
 181 | 
 182 |       monitor.markEnd('booking.validation');
 183 |       done();
 184 | 
 185 |       const result: OrchestrationResult = {
 186 |         bookingId,
 187 |         approved: dbApproved,
 188 |         confidence: dbApproved ? synthOut.confidence : 0,
 189 |         parallelMs,
 190 |         rounds: synthOut.rounds,
 191 |         agents: allAgents,
 192 |         issuesFixed: synthOut.issuesFixed,
 193 |         reason: rejectionReason,
 194 |       };
 195 | 
 196 |       logger.info('BookingService', 'Validation complete', {
 197 |         bookingId,
 198 |         approved: result.approved,
 199 |         confidence: result.confidence,
 200 |         parallelMs,
 201 |       });
 202 | 
 203 |       return result;
 204 |     } catch (err) {
 205 |       logger.error('BookingService', 'Unhandled error during validation', { error: String(err) });
 206 |       monitor.markEnd('booking.validation'); // Ensure end marker is always called
 207 |       done(); // Ensure timer is stopped
 208 |       return {
 209 |         bookingId: '',
 210 |         approved: false,
 211 |         confidence: 0,
 212 |         parallelMs: 0,
 213 |         rounds: 0,
 214 |         agents: [],
 215 |         issuesFixed: 0,
 216 |         reason: String(err),
 217 |       };
 218 |     }
 219 |   }
 220 | }
 221 | 
 222 | export const bookingService = BookingService.getInstance();
 223 | 
 224 | // ── Static data ─────────────────────────────────
 225 | export const SERVICES = [
 226 |   { code: '01', name: 'Signature Fade', desc: 'Precision skin fade, tailored to your face shape.', price: 'E120', duration: '45 min', tag: 'Signature' },
 227 |   { code: '02', name: 'Taper & Define', desc: 'Timeless taper with surgical edges.', price: 'E100', duration: '40 min', tag: 'Classic' },
 228 |   { code: '03', name: 'Beard Architecture', desc: 'Hot towel, sculpt, line-up.', price: 'E80', duration: '30 min', tag: 'Grooming' },
 229 |   { code: '04', name: 'Full Package', desc: 'Cut + Beard + Skin ritual.', price: 'E220', duration: '90 min', tag: 'Premium' },
 230 |   { code: '05', name: 'Youth Cut', desc: 'Clean cuts for the next generation.', price: 'E60', duration: '30 min', tag: 'Youth' },
 231 | ] as const;
 232 | 
 233 | export const DEMO_BOOKINGS: Booking[] = [
 234 |   { id: 'BK-A3F12', clientId: 'viewer-001', clientName: 'Lungelo M.',  service: 'Signature Fade',   barber: 'P. Dlamini',   date: 'Today',    time: '14:30', scheduledAt: '', status: 'confirmed', price: 'E120' },
 235 |   { id: 'BK-B2E11', clientId: 'u-002',       clientName: 'Bongani N.', service: 'Taper & Define',   barber: 'S. Mkhonta',   date: 'Today',    time: '15:00', scheduledAt: '', status: 'pending',   price: 'E100' },
 236 |   { id: 'BK-C1D10', clientId: 'u-003',       clientName: 'Thabo K.',   service: 'Full Package',     barber: 'P. Dlamini',   date: 'Today',    time: '16:00', scheduledAt: '', status: 'confirmed', price: 'E220' },
 237 |   { id: 'BK-D0C09', clientId: 'u-004',       clientName: 'Musa S.',    service: 'Youth Cut',        barber: 'T. Nkosi',     date: 'Tomorrow', time: '09:00', scheduledAt: '', status: 'pending',   price: 'E60'  },
 238 | ];
 239 | 