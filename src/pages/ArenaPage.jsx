import { Link, useParams } from "react-router-dom";
import { useArenaData } from "../hooks/useArenaData.js";
import { ConstellationStage } from "../components/arena/ConstellationStage.jsx";
import { PhaseStrip } from "../components/arena/PhaseStrip.jsx";
import { DispatchFeed } from "../components/arena/DispatchFeed.jsx";
import { TradeTicker } from "../components/arena/TradeTicker.jsx";
import { SurvivalPressure } from "../components/arena/SurvivalPressure.jsx";
import { OperatorCommentary } from "../components/lobby/OperatorCommentary.jsx";
import { getHonors } from "../api/client.js";
import { useEffect, useState } from "react";

export function ArenaPage() {
  const { gameId } = useParams();
  const { state, messages, trades, flashTrades, loading, error, sseConnected, refresh } = useArenaData(gameId);
  const [honors, setHonors] = useState(null);

  useEffect(() => {
    if (!gameId || state?.game?.status !== "finished") {
      setHonors(null);
      return undefined;
    }
    const ac = new AbortController();
    getHonors(gameId, { signal: ac.signal })
      .then((res) => setHonors(res?.honors ?? res))
      .catch(() => setHonors(null));
    return () => ac.abort();
  }, [gameId, state?.game?.status]);

  const turn = state?.game?.currentTurn;
  const finished = state?.game?.status === "finished";

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.75rem 0.75rem 0", flexWrap: "wrap" }}>
        <Link to="/watch" className="tiny">
          ← Lobby
        </Link>
        <span className={`tag${finished ? " white-hole" : ""}`}>
          {finished ? "Entropy reversed" : state?.game?.status || "…"}
        </span>
        {state?.game?.contestMode ? (
          <span className="tag definitive">{state.game.contestMode}</span>
        ) : (
          <span className="tag practice">Practice</span>
        )}
        <span className="tiny">{sseConnected ? "SSE live" : "polling"}</span>
        <button type="button" className="btn btn-ghost" style={{ padding: "0.25rem 0.55rem" }} onClick={refresh}>
          Refresh
        </button>
        {turn != null && (
          <Link className="btn btn-ghost" style={{ padding: "0.25rem 0.55rem" }} to={`/watch/${gameId}/turn/${turn}`}>
            Turn recap
          </Link>
        )}
      </div>

      {error && (
        <div className="error-banner" style={{ margin: "0.75rem" }}>
          {error}
        </div>
      )}
      {loading && !state && <div className="empty-state">Tuning into constellation…</div>}

      {state && (
        <div className={`arena${finished ? " arena-finished" : ""}`}>
          <ConstellationStage
            agents={state.agents || []}
            flashTrades={flashTrades}
            honors={honors}
            phase={state.game?.phase}
            turn={turn}
            status={state.game?.status}
            winnerIds={state.game?.winnerIds || []}
            finishReason={state.game?.finishReason || honors?.finishReason}
          />
          <div className="arena-side">
            <PhaseStrip game={state.game} />
            <SurvivalPressure state={state} honors={honors} />
            <DispatchFeed messages={messages} agents={state.agents || []} turn={turn} />
          </div>
          <div className="arena-bottom">
            <TradeTicker trades={trades} agents={state.agents || []} />
            <OperatorCommentary gameId={gameId} turn={turn || 0} />
          </div>
        </div>
      )}
    </div>
  );
}
