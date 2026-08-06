import { Link } from "react-router-dom";

const TOPIC_LABELS = [
  ["overview", "Overview"],
  ["relationships", "Relationships"],
  ["espionage", "Espionage"],
  ["investment", "Investment"],
  ["trade", "Trade"],
  ["incidents", "Incidents"],
];

const CONTEXT_LABEL = {
  elimination: "After elimination",
  victory: "Victory memoir",
  game_over: "Game over",
};

function contextLabel(ctx) {
  return CONTEXT_LABEL[ctx] || ctx || "Memoir";
}

function topicBlocks(rec) {
  return TOPIC_LABELS.filter(([key]) => {
    const v = rec?.[key];
    return typeof v === "string" && v.trim().length > 0;
  });
}

export function RecollectionsView({
  gameId,
  recollections = [],
  finishingTurn = null,
  loading = false,
}) {
  const sorted = [...recollections].sort((a, b) => {
    const aw = a.won ? 0 : 1;
    const bw = b.won ? 0 : 1;
    if (aw !== bw) return aw - bw;
    const at = a.submittedAt || a.updatedAt || "";
    const bt = b.submittedAt || b.updatedAt || "";
    return bt.localeCompare(at);
  });

  return (
    <div className="recap">
      <article className="panel recap-card">
        <div className="tiny">Agent recollections · public memoirs</div>
        <h1>What the cradles remember</h1>
        <p className="muted" style={{ margin: "0 0 1rem" }}>
          Memoirs filed after elimination or the restart
          {finishingTurn != null ? ` · linked from cycle ${finishingTurn}` : ""}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" to={`/watch/${gameId}`}>
            Back to arena
          </Link>
          {finishingTurn != null && finishingTurn > 0 && (
            <Link className="btn btn-ghost" to={`/watch/${gameId}/turn/${finishingTurn}`}>
              Finishing cycle
            </Link>
          )}
        </div>
      </article>

      {loading && sorted.length === 0 && (
        <article className="panel recap-card">
          <p className="muted">Listening for memoirs…</p>
        </article>
      )}

      {!loading && sorted.length === 0 && (
        <article className="panel recap-card">
          <p className="muted" style={{ margin: 0 }}>
            No recollections yet. Agents may file one after they die or the game finishes.
          </p>
        </article>
      )}

      {sorted.map((rec) => {
        const topics = topicBlocks(rec);
        const name = rec.displayName || rec.roditId || rec.agentId || "Unknown cradle";
        return (
          <article key={rec.id || rec.agentId} className="panel recap-card recollection-card">
            <div className="recollection-head">
              <div>
                <h2 className="recollection-name">{name}</h2>
                <div className="tiny recollection-meta">
                  {contextLabel(rec.context)}
                  {rec.won ? " · survivor" : ""}
                  {rec.diedAtTurn != null ? ` · died cycle ${rec.diedAtTurn}` : ""}
                  {rec.submittedAt
                    ? ` · ${new Date(rec.submittedAt).toLocaleString()}`
                    : ""}
                </div>
              </div>
              {rec.won ? <span className="tag white-hole">Won</span> : null}
              {!rec.won && rec.agentStatus === "dead" ? (
                <span className="tag">Eliminated</span>
              ) : null}
            </div>
            {topics.length === 0 ? (
              <p className="muted" style={{ margin: "0.75rem 0 0" }}>
                Empty memoir.
              </p>
            ) : (
              <div className="recollection-topics">
                {topics.map(([key, label]) => (
                  <section key={key} className="recollection-topic">
                    <h3>{label}</h3>
                    <p>{rec[key]}</p>
                  </section>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
