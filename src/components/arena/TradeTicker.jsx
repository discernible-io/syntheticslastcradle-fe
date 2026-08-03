import { useAgentLabels } from "../../hooks/useAgentLabels.js";

function resourceBits(t) {
  const bits = [];
  if (t.energy) bits.push(<span key="e" className="resource-energy">{t.energy} E</span>);
  if (t.water) bits.push(<span key="w" className="resource-water">{t.water} W</span>);
  if (t.compute) bits.push(<span key="c" className="resource-compute">{t.compute} C</span>);
  return bits;
}

export function TradeTicker({ trades = [], agents = [] }) {
  const { labelOf } = useAgentLabels(agents);

  return (
    <div className="panel trade-ticker">
      <div className="ticker-header">
        <span>Trade ticker</span>
        <span className="tiny">{trades.length} this cycle</span>
      </div>
      <div className="ticker-track">
        {trades.length === 0 && <div className="empty-state" style={{ padding: "1rem" }}>No transfers yet.</div>}
        {[...trades].reverse().map((t) => (
          <div key={t.id} className="ticker-row">
            <span className="tag">{t.status}</span>
            <span>
              <strong>{labelOf(t.fromAgentId)}</strong>
              <span className="muted"> → </span>
              <strong>{labelOf(t.toAgentId)}</strong>
            </span>
            <span style={{ display: "inline-flex", gap: "0.35rem" }}>{resourceBits(t)}</span>
            {t.rationale && (
              <span className="tiny" title={t.rationale}>
                “{t.rationale.slice(0, 72)}
                {t.rationale.length > 72 ? "…" : ""}”
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
