import { useState } from "react";
import { Link } from "react-router-dom";
import { useAgentLabels } from "../../hooks/useAgentLabels.js";
import { TradeGraph } from "./TradeGraph.jsx";
import { isQuietLiveTurn } from "../../utils/visibleTurns.js";

function initials(name) {
  if (!name) return "?";
  return String(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function resourceBits(t) {
  const bits = [];
  if (t.energy) bits.push(<span key="e" className="resource-energy">{t.energy} E</span>);
  if (t.water) bits.push(<span key="w" className="resource-water">{t.water} W</span>);
  if (t.compute) bits.push(<span key="c" className="resource-compute">{t.compute} C</span>);
  return bits.length > 0 ? bits : <span className="muted">—</span>;
}

function signedResourceBits(row) {
  const bits = [];
  const fmt = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(1)}`;
  if (row.energy) bits.push(<span key="e" className="resource-energy">{fmt(row.energy)} E</span>);
  if (row.water) bits.push(<span key="w" className="resource-water">{fmt(row.water)} W</span>);
  if (row.compute) bits.push(<span key="c" className="resource-compute">{fmt(row.compute)} C</span>);
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

function CyclePicker({ gameId, visibleTurns, currentTurn, selectedTurn }) {
  if (!visibleTurns?.length) return null;
  return (
    <div className="cycle-picker" role="navigation" aria-label="Played cycles">
      <div className="tiny" style={{ marginBottom: "0.4rem" }}>
        Cycles
      </div>
      <div className="cycle-picker-list">
        {visibleTurns.map((row) => {
          const quietLive = isQuietLiveTurn(row, currentTurn);
          const active = row.turn === selectedTurn;
          return (
            <Link
              key={row.turn}
              to={`/watch/${gameId}/turn/${row.turn}`}
              className={[
                "cycle-chip",
                active ? "is-active" : "",
                quietLive ? "is-quiet-live" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={
                quietLive
                  ? `Cycle ${row.turn} · current (quiet)`
                  : `Cycle ${row.turn}${row.played ? " · played" : ""}`
              }
            >
              {row.turn}
              {quietLive ? <span className="cycle-chip-hint">current</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function TurnRecapView({
  report,
  gameId,
  visibleTurns = [],
  currentTurn = null,
  prevTurn = null,
  nextTurn = null,
  gameStatus = null,
}) {
  const agents = report?.agents || [];
  const { avatarOf } = useAgentLabels(agents);
  const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());

  if (!report) return null;
  const quietLive =
    Number(report.turn) === Number(currentTurn) &&
    !visibleTurns.find((t) => t.turn === report.turn)?.played;
  const isFinishingTurn =
    gameStatus === "finished" &&
    currentTurn != null &&
    Number(report.turn) === Number(currentTurn);

  return (
    <div className="recap">
      <article className={`panel recap-card${quietLive ? " is-quiet-live" : ""}`}>
        <div className="tiny">Turn recap · shareable VOD</div>
        <h1>{report.headline}</h1>
        <p className="muted" style={{ margin: "0 0 1rem" }}>
          {report.livingCount} cradles remaining
          {report.contestMode ? ` · ${report.contestMode}` : " · practice"}
          {quietLive ? " · current cycle (no public activity yet)" : ""}
          {isFinishingTurn ? " · finishing cycle" : ""}
        </p>
        <CyclePicker
          gameId={gameId}
          visibleTurns={visibleTurns}
          currentTurn={currentTurn}
          selectedTurn={report.turn}
        />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
          <Link className="btn btn-ghost" to={`/watch/${gameId}`}>
            Back to arena
          </Link>
          {prevTurn != null && (
            <Link className="btn btn-ghost" to={`/watch/${gameId}/turn/${prevTurn}`}>
              Prev cycle
            </Link>
          )}
          {nextTurn != null && (
            <Link className="btn btn-ghost" to={`/watch/${gameId}/turn/${nextTurn}`}>
              Next cycle
            </Link>
          )}
          {isFinishingTurn && (
            <Link className="btn btn-primary" to={`/watch/${gameId}/recollections`}>
              Read recollections
            </Link>
          )}
        </div>
      </article>

      {isFinishingTurn && (
        <article className="panel recap-card recollection-cta">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Agent recollections</h2>
          <p className="muted" style={{ margin: "0 0 0.85rem" }}>
            After death reports and the restart, cradles may file public memoirs — relationships,
            espionage, investment, trade, and incidents.
          </p>
          <Link className="btn btn-primary" to={`/watch/${gameId}/recollections`}>
            Open recollections
          </Link>
        </article>
      )}

      <article className="panel recap-card">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Negotiation quotes</h2>
        <div className="quote-list">
          {report.quotes.length === 0 && <p className="muted">No public messages this cycle.</p>}
          {report.quotes.map((q) => {
            const avatarUrl = avatarOf(q.agentId);
            const showAvatar = Boolean(avatarUrl) && !brokenAvatars.has(q.agentId);
            return (
              <blockquote key={q.id} className="quote">
                <span className="who">
                  <span className="quote-avatar" style={{ color: "var(--water)" }} aria-hidden="true">
                    {showAvatar ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        onError={() => {
                          setBrokenAvatars((prev) => {
                            if (prev.has(q.agentId)) return prev;
                            const next = new Set(prev);
                            next.add(q.agentId);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      initials(q.who)
                    )}
                  </span>
                  {q.who}
                </span>
                {q.body}
              </blockquote>
            );
          })}
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
            <div key={row.agentId} className="flow-row">
              <strong>{row.name}</strong>
              <span className="transfer-resources">{signedResourceBits(row)}</span>
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
