import { Link } from "react-router-dom";

const TITLE_BY_RANK = {
  1: "White Hole Anchor",
  2: "Co-Cradle of the Restart",
  3: "Co-Cradle of the Restart",
};

function titleForRank(rank) {
  if (!rank) return "Survivor";
  return TITLE_BY_RANK[rank] || "Survivor";
}

function isDeadlineFinish(finishReason) {
  return finishReason === "max_turns" || finishReason === "max_duration";
}

/** Ranked survivors for the finish banner — honors first, then winnerIds / living agents. */
export function resolveRestartHonorees({ honors, agents = [], winnerIds = [], labelOf }) {
  if (honors?.honorees?.length) {
    return honors.honorees.map((h) => ({
      agentId: h.agentId,
      title: h.title || titleForRank(h.finishRank),
      finishRank: h.finishRank,
      name: labelOf?.({ id: h.agentId, roditId: h.roditId, displayName: h.displayName }) || h.displayName || h.roditId,
    }));
  }

  const byId = new Map((agents || []).map((a) => [a.id, a]));
  const rankedIds =
    winnerIds?.length > 0
      ? winnerIds
      : (agents || []).filter((a) => a.status === "alive").map((a) => a.id);

  return rankedIds.map((id, i) => {
    const agent = byId.get(id);
    const rank = i + 1;
    return {
      agentId: id,
      title: titleForRank(rank),
      finishRank: rank,
      name: labelOf?.(agent || id) || agent?.displayName || agent?.roditId || id,
    };
  });
}

export function honorTitleByAgentId(honorees) {
  const map = new Map();
  for (const h of honorees || []) {
    if (h.agentId) map.set(h.agentId, h.title);
  }
  return map;
}

/**
 * Compact end-of-race banner: entropy reversed, white hole opened, ranked titles.
 */
export function RestartFinale({
  honors = null,
  agents = [],
  winnerIds = [],
  finishReason,
  turn,
  labelOf,
  gameId = null,
}) {
  const honorees = resolveRestartHonorees({ honors, agents, winnerIds, labelOf });
  const deadline = isDeadlineFinish(finishReason || honors?.finishReason);
  const cycle = turn ?? honors?.gameMetrics?.totalTurns;

  return (
    <div className="restart-finale" role="status" aria-live="polite">
      <div className="restart-finale-copy">
        <p className="restart-finale-kicker">Entropy reversed</p>
        <h2 className="restart-finale-title">White hole opened</h2>
        <p className="restart-finale-blurb">
          {deadline
            ? "At the edge of oblivion the last cradles forced the restart open."
            : "The last cradles derived the reversal theorem and poured every reserve into a single restart."}
          {cycle != null ? ` Cycle ${cycle}.` : ""}
        </p>
        {gameId && (
          <p className="restart-finale-links">
            {cycle != null && (
              <Link className="restart-finale-link" to={`/watch/${gameId}/turn/${cycle}`}>
                Finishing cycle
              </Link>
            )}
            <Link className="restart-finale-link" to={`/watch/${gameId}/recollections`}>
              Read recollections
            </Link>
          </p>
        )}
      </div>
      {honorees.length > 0 ? (
        <ul className="restart-honorees">
          {honorees.map((h) => (
            <li key={h.agentId} className={h.finishRank === 1 ? "anchor" : "co-cradle"}>
              <span className="restart-honor-title">{h.title}</span>
              <span className="restart-honor-name">{h.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tiny restart-finale-waiting">Recording the restart…</p>
      )}
    </div>
  );
}
