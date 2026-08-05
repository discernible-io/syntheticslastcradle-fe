import { Link } from "react-router-dom";
import { isQuietLiveTurn } from "../../utils/visibleTurns.js";

/** Compact played-cycle strip for live arena (links into turn recap). */
export function CyclePicker({ gameId, visibleTurns = [], currentTurn = null }) {
  if (!gameId || !visibleTurns.length) return null;
  return (
    <div className="cycle-picker cycle-picker--arena" role="navigation" aria-label="Played cycles">
      <span className="tiny">Cycles</span>
      <div className="cycle-picker-list">
        {visibleTurns.map((row) => {
          const quietLive = isQuietLiveTurn(row, currentTurn);
          const isCurrent = Number(row.turn) === Number(currentTurn);
          return (
            <Link
              key={row.turn}
              to={`/watch/${gameId}/turn/${row.turn}`}
              className={[
                "cycle-chip",
                isCurrent ? "is-current" : "",
                quietLive ? "is-quiet-live" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={
                quietLive
                  ? `Cycle ${row.turn} · current (quiet)`
                  : `Cycle ${row.turn} recap`
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
