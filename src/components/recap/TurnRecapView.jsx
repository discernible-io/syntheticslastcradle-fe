import { Link } from "react-router-dom";
import { TradeGraph } from "./TradeGraph.jsx";

function resourceBits(t) {
  const bits = [];
  if (t.energy) bits.push(<span key="e" className="resource-energy">{t.energy} E</span>);
  if (t.water) bits.push(<span key="w" className="resource-water">{t.water} W</span>);
  if (t.compute) bits.push(<span key="c" className="resource-compute">{t.compute} C</span>);
  return bits.length > 0 ? bits : <span className="muted">—</span>;
}

function pairKey(a, b) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/** Group transfers so mutual pairs (A→B and B→A) sit together. */
function groupTransfers(edges) {
  const order = [];
  const groups = new Map();
  for (const e of edges) {
    const key = pairKey(e.fromName, e.toName);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(e);
  }
  return order.map((key) => {
    const items = groups.get(key);
    const dirs = new Set(items.map((e) => `${e.fromName}->${e.toName}`));
    const mutual = dirs.size > 1;
    return { key, items, mutual };
  });
}

export function TurnRecapView({ report, gameId }) {
  if (!report) return null;
  return (
    <div className="recap">
      <article className="panel recap-card">
        <div className="tiny">Turn recap · shareable VOD</div>
        <h1>{report.headline}</h1>
        <p className="muted" style={{ margin: "0 0 1rem" }}>
          {report.livingCount} cradles remaining
          {report.contestMode ? ` · ${report.contestMode}` : " · practice"}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" to={`/watch/${gameId}`}>
            Back to arena
          </Link>
          {report.turn > 1 && (
            <Link className="btn btn-ghost" to={`/watch/${gameId}/turn/${report.turn - 1}`}>
              Prev cycle
            </Link>
          )}
          <Link className="btn btn-ghost" to={`/watch/${gameId}/turn/${report.turn + 1}`}>
            Next cycle
          </Link>
        </div>
      </article>

      <article className="panel recap-card">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Negotiation quotes</h2>
        <div className="quote-list">
          {report.quotes.length === 0 && <p className="muted">No public messages this cycle.</p>}
          {report.quotes.map((q) => (
            <blockquote key={q.id} className="quote">
              <span className="who">{q.who}</span>
              {q.body}
            </blockquote>
          ))}
        </div>
      </article>

      <article className="panel recap-card">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Who funded whom</h2>
        <TradeGraph edges={report.edges} />
        {report.edges.length > 0 && (
          <div className="transfer-list">
            {groupTransfers(report.edges).map((group) => (
              <div
                key={group.key}
                className={group.mutual ? "transfer-group is-mutual" : "transfer-group"}
              >
                {group.mutual && (
                  <div className="transfer-group-label">
                    Mutual · {group.items[0].fromName} ⇄ {group.items[0].toName}
                  </div>
                )}
                {group.items.map((e) => (
                  <div key={e.id} className="transfer-row-block">
                    <div className="transfer-row">
                      <span className="transfer-direction">
                        <strong>{e.fromName}</strong>
                        <span className="transfer-arrow" aria-hidden="true">
                          →
                        </span>
                        <strong>{e.toName}</strong>
                        {e.combinedWithInvest && <span className="tag">+invest</span>}
                        {e.transferCount > 1 && (
                          <span className="tiny">
                            leg {(e.transferIndex ?? 0) + 1}/{e.transferCount}
                          </span>
                        )}
                      </span>
                      <span className="transfer-resources">{resourceBits(e)}</span>
                    </div>
                    {e.rationale && <p className="transfer-rationale">“{e.rationale}”</p>}
                    {e.snippets?.length > 0 && (
                      <div className="deal-snippets">
                        {e.snippets.slice(0, 5).map((s, i) => (
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
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel recap-card">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Net resource flow</h2>
        <div className="flow-list">
          {report.netArrows.length === 0 && <p className="muted">No net flow.</p>}
          {report.netArrows.map((row) => (
            <div key={row.agentId}>
              <strong>{row.name}</strong>{" "}
              <span className={row.net >= 0 ? "resource-compute" : "resource-energy"}>
                {row.net >= 0 ? "+" : ""}
                {row.net.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </article>

      {report.eliminations.length > 0 && (
        <article className="panel recap-card">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Eliminations</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {report.eliminations.map((e) => (
              <li key={e.id}>
                <strong>{e.name}</strong> — {e.cause}
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  );
}
