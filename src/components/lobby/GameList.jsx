import { Link } from "react-router-dom";

function modeTag(game) {
  if (game.contestMode === "definitive" || game.contestSeriesId) {
    return <span className="tag definitive">Definitive</span>;
  }
  return <span className="tag practice">Practice</span>;
}

export function GameList({ games = [], empty = "No games yet." }) {
  if (!games.length) {
    return <div className="panel empty-state">{empty}</div>;
  }
  return (
    <div className="game-list">
      {games.map((g) => (
        <div key={g.id} className="panel game-row">
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
              {modeTag(g)}
              <span className="tag">{g.status}</span>
              <span className="tiny">{g.id}</span>
            </div>
            <div>
              Cycle {g.currentTurn ?? 0}
              {g.phase ? ` · ${g.phase}` : ""} · {g.agentCount ?? "?"} cradles
              {g.winnerIds?.length ? ` · ${g.winnerIds.length} survivors` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn btn-primary" to={`/watch/${g.id}`}>
              Watch
            </Link>
            {(g.currentTurn || 0) > 0 && (
              <Link className="btn btn-ghost" to={`/watch/${g.id}/turn/${g.currentTurn}`}>
                Recap
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
