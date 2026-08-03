import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGameState } from "../../api/client.js";
import { useAgentLabels } from "../../hooks/useAgentLabels.js";
import { participantInitials } from "../../utils/agentLabel.js";
import { formatGameStartedAt, statusLabel } from "../../utils/gameLabel.js";

function modeTag(game) {
  if (game.contestMode === "definitive" || game.contestSeriesId) {
    return <span className="tag definitive">Definitive</span>;
  }
  return <span className="tag practice">Practice</span>;
}

function GameRow({ game: g }) {
  const [agents, setAgents] = useState(g.agents || []);
  const { passportNameByRodit } = useAgentLabels(agents);
  const when = formatGameStartedAt(g);
  const whenVerb = g.startedAt ? "Started" : "Opened";
  const initials = participantInitials(agents, passportNameByRodit);

  useEffect(() => {
    if (Array.isArray(g.agents) && g.agents.length) {
      setAgents(g.agents);
      return undefined;
    }
    if (!g.id) return undefined;
    const ac = new AbortController();
    (async () => {
      try {
        const state = await getGameState(g.id, { signal: ac.signal });
        if (!ac.signal.aborted) setAgents(state?.agents || []);
      } catch (err) {
        if (err?.name !== "AbortError") setAgents([]);
      }
    })();
    return () => ac.abort();
  }, [g.id, g.agents]);

  const titleBits = [`${whenVerb} ${when}`];
  if (initials.length) titleBits.push(initials.join(" · "));
  else if (g.agentCount) titleBits.push(`${g.agentCount} cradles`);

  return (
    <div className="panel game-row" title={`Game ${g.id}`}>
      <div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
          {modeTag(g)}
          <span className="tag">{statusLabel(g.status)}</span>
        </div>
        <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{titleBits.join(" · ")}</div>
        <div className="muted" style={{ fontSize: "0.9rem" }}>
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
  );
}

export function GameList({ games = [], empty = "No games yet." }) {
  if (!games.length) {
    return <div className="panel empty-state">{empty}</div>;
  }
  return (
    <div className="game-list">
      {games.map((g) => (
        <GameRow key={g.id} game={g} />
      ))}
    </div>
  );
}
