// ════════════════════════════════════════════════
// STUDIO P — AgentPanel (components/AgentPanel.tsx)
// Visualises parallel agent orchestration in real-time
// ════════════════════════════════════════════════

import type { Agent, OrchestrationResult } from "@/types";

interface AgentPanelProps {
  agents: Agent[];
  result: OrchestrationResult | null;
  running?: boolean;
}

export function AgentPanel({ agents, result, running }: AgentPanelProps) {
  const color = (a: Agent) => {
    if (a.status === "run") return "var(--port-a)";
    if (a.status === "ok") return "#4ade80";
    if (a.status === "err") return "#f87171";
    return "var(--stone)";
  };

  const fill = (a: Agent) => {
    if (a.status === "run") return "40%";
    if (a.status === "ok") return "100%";
    if (a.status === "err") return "60%";
    return "0%";
  };

  if (agents.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--port-m)", fontFamily: "DM Mono, monospace", fontSize: 10 }}>
        {running ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--port-a)", animation: "pulse 1.2s ease infinite" }}/>
            VALIDATING…
          </span>
        ) : "No agents running. Trigger a booking to start."}
      </div>
    );
  }

  return (
    <div>
      {/* Agent rows */}
      {agents.map((a) => (
        <div key={a.id + a.round} className="ag-row">
          <div className="ag-ic">{a.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ag-name">{a.name}</div>
            <div className="ag-info">
              {a.ms ? `${a.ms}ms` : "—"}
              {a.output && typeof a.output.confidence === "number"
                ? ` · ${a.output.confidence}% confidence`
                : ""}
            </div>
          </div>
          <div className="ag-track">
            <div className="ag-fill" style={{ width: fill(a), background: color(a) }}/>
          </div>
          <span className={`ag-st ${a.status}`}>{a.status.toUpperCase()}</span>
        </div>
      ))}

      {/* Result card */}
      {result && !running && (
        <div style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 10,
          border: `1px solid ${result.approved ? "rgba(74,222,128,.3)" : "rgba(248,113,113,.3)"}`,
          background: result.approved ? "rgba(74,222,128,.04)" : "rgba(248,113,113,.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{result.approved ? "✅" : "❌"}</span>
            <div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: result.approved ? "#4ade80" : "#f87171", letterSpacing: ".1em" }}>
                {result.approved ? "BOOKING APPROVED" : "BOOKING REJECTED"}
              </div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "var(--port-m)", marginTop: 2 }}>
                {result.bookingId}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Confidence", value: `${result.confidence}%` },
              { label: "Parallel ms", value: `${result.parallelMs}ms` },
              { label: "Rounds", value: result.rounds },
            ].map((m) => (
              <div key={m.label} style={{ background: "var(--port-bg)", border: "1px solid var(--port-bord)", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 13, fontWeight: 600, color: "var(--port-a)" }}>{m.value}</div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 7, letterSpacing: ".15em", color: "var(--port-m)", marginTop: 3, textTransform: "uppercase" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
