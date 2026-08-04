import { useAgentLabels } from "../../hooks/useAgentLabels.js";

function resourceBits(t) {
  const bits = [];
  if (t.energy) bits.push(<span key="e" className="resource-energy">{t.energy} E</span>);
  if (t.water) bits.push(<span key="w" className="resource-water">{t.water} W</span>);
  if (t.compute) bits.push(<span key="c" className="resource-compute">{t.compute} C</span>);
  return bits;
}

function DealSnippets({ snippets }) {
  if (!snippets?.length) return null;
  return (
    <div className="deal-snippets">
      {snippets.slice(0, 5).map((s, i) => (
        <div key={i} className="deal-snippet">
          <span className="deal-snippet-meta">
            {s.taskType || "deal"}
            {s.channel ? ` · ${s.channel}` : ""}
            {s.holaVerified ? " · HOLA attested" : ""}
          </span>
          <span className="deal-snippet-excerpt">“{s.excerpt}”</span>
        </div>
      ))}
    </div>
  );
}

export function TradeTicker({ trades = [], agents = [], tradesTurn = null }) {
  const { labelOf } = useAgentLabels(agents);

  return (
    <div className="panel trade-ticker">
      <div className="ticker-header">
        <span>Trade ticker</span>
        <span className="tiny">
          {tradesTurn != null ? `cycle ${tradesTurn} · ` : ""}
          {trades.length} transfer{trades.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="ticker-track">
        {trades.length === 0 && (
          <div className="empty-state" style={{ padding: "1rem" }}>
            No transfers on this ledger yet.
          </div>
        )}
        {[...trades].reverse().map((t) => {
          const snippets = t.privateDealSnippets || [];
          const multi =
            t.transferCount != null && t.transferCount > 1
              ? `leg ${(t.transferIndex ?? 0) + 1}/${t.transferCount}`
              : null;
          return (
            <div key={t.id} className="ticker-row ticker-row-block">
              <div className="ticker-row-main">
                <span className="tag">{t.status}</span>
                {t.combinedWithInvest && <span className="tag">+invest</span>}
                {multi && <span className="tiny">{multi}</span>}
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
              <DealSnippets snippets={snippets} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
