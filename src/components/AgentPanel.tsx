   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — AgentPanel (components/AgentPanel.tsx)
   3 | // Visualises parallel agent orchestration in real-time
   4 | // ════════════════════════════════════════════════
   5 | 
   6 | import type { Agent, OrchestrationResult } from '@/types';
   7 | 
   8 | interface AgentPanelProps {
   9 |   agents: Agent[];
  10 |   result: OrchestrationResult | null;
  11 |   running?: boolean;
  12 | }
  13 | 
  14 | export function AgentPanel({ agents, result, running }: AgentPanelProps) {
  15 |   const color = (a: Agent) => {
  16 |     if (a.status === 'run') return 'var(--port-a)';
  17 |     if (a.status === 'ok')  return '#4ade80';
  18 |     if (a.status === 'err') return '#f87171';
  19 |     return 'var(--stone)';
  20 |   };
  21 | 
  22 |   const fill = (a: Agent) => {
  23 |     if (a.status === 'run') return '40%';
  24 |     if (a.status === 'ok')  return '100%';
  25 |     if (a.status === 'err') return '60%';
  26 |     return '0%';
  27 |   };
  28 | 
  29 |   if (agents.length === 0) {
  30 |     return (
  31 |       <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--port-m)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
  32 |         {running ? (
  33 |           <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
  34 |             <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--port-a)', animation: 'pulse 1.2s ease infinite' }}/>
  35 |             VALIDATING…
  36 |           </span>
  37 |         ) : 'No agents running. Trigger a booking to start.'}
  38 |       </div>
  39 |     );
  40 |   }
  41 | 
  42 |   return (
  43 |     <div>
  44 |       {/* Agent rows */}
  45 |       {agents.map(a => (
  46 |         <div key={a.id + a.round} className="ag-row">
  47 |           <div className="ag-ic">{a.icon}</div>
  48 |           <div style={{ flex: 1, minWidth: 0 }}>
  49 |             <div className="ag-name">{a.name}</div>
  50 |             <div className="ag-info">
  51 |               {a.ms ? `${a.ms}ms` : '—'}
  52 |               {a.output && typeof a.output.confidence === 'number'
  53 |                 ? ` · ${a.output.confidence}% confidence`
  54 |                 : ''}
  55 |             </div>
  56 |           </div>
  57 |           <div className="ag-track">
  58 |             <div className="ag-fill" style={{ width: fill(a), background: color(a) }}/>
  59 |           </div>
  60 |           <span className={`ag-st ${a.status}`}>{a.status.toUpperCase()}</span>
  61 |         </div>
  62 |       ))}
  63 | 
  64 |       {/* Result card */}
  65 |       {result && !running && (
  66 |         <div style={{
  67 |           marginTop: 16,
  68 |           padding: 16,
  69 |           borderRadius: 10,
  70 |           border: `1px solid ${result.approved ? 'rgba(74,222,128,.3)' : 'rgba(248,113,113,.3)'}`,
  71 |           background: result.approved ? 'rgba(74,222,128,.04)' : 'rgba(248,113,113,.04)',
  72 |         }}>
  73 |           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
  74 |             <span style={{ fontSize: 22 }}>{result.approved ? '✅' : '❌'}</span>
  75 |             <div>
  76 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: result.approved ? '#4ade80' : '#f87171', letterSpacing: '.1em' }}>
  77 |                 {result.approved ? 'BOOKING APPROVED' : 'BOOKING REJECTED'}
  78 |               </div>
  79 |               <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--port-m)', marginTop: 2 }}>
  80 |                 {result.bookingId}
  81 |               </div>
  82 |             </div>
  83 |           </div>
  84 |           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
  85 |             {[
  86 |               { label: 'Confidence', value: `${result.confidence}%` },
  87 |               { label: 'Parallel ms', value: `${result.parallelMs}ms` },
  88 |               { label: 'Rounds', value: result.rounds },
  89 |             ].map(m => (
  90 |               <div key={m.label} style={{ background: 'var(--port-bg)', border: '1px solid var(--port-bord)', borderRadius: 6, padding: '8px 10px' }}>
  91 |                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--port-a)' }}>{m.value}</div>
  92 |                 <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '.15em', color: 'var(--port-m)', marginTop: 3, textTransform: 'uppercase' }}>{m.label}</div>
  93 |               </div>
  94 |             ))}
  95 |           </div>
  96 |         </div>
  97 |       )}
  98 |     </div>
  99 |   );
 100 | }
 101 | 