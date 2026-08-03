import { Link } from "react-router-dom";
import { TradeGraph } from "./TradeGraph.jsx";

function resourceBits(t) {
  const bits = [];
  if (t.energy) bits.push(<span key="e" className="resource-energy">{t.energy} E</span>);
  if (t.water) bits.push(<span key="w" className="resource-water">{t.water} W</span>);
  if (t.compute) bits.push(<span key="c" className="resource-compute">{t.compute} C</span>);
  return bits.length > 0 ? bits : <span className="muted">—</span>;
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
            {report.edges.map((e) => (
              <div key={e.id} className="transfer-row">
                <span>
                  <strong>{e.fromName}</strong>
                  <span className="muted"> → </span>
                  <strong>{e.toName}</strong>
                </span>
                <span className="transfer-resources">{resourceBits(e)}</span>
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
