import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getGameState, getRecollections } from "../api/client.js";
import { RecollectionsView } from "../components/recap/RecollectionsView.jsx";
import { env } from "../config/env.js";
import { useGameEvents } from "../hooks/useGameEvents.js";

export function RecollectionsPage() {
  const { gameId } = useParams();
  const [recollections, setRecollections] = useState([]);
  const [finishingTurn, setFinishingTurn] = useState(null);
  const [gameStatus, setGameStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!gameId) {
      setError("Invalid game");
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const [state, recRes] = await Promise.all([
        getGameState(gameId, { signal: ac.signal }),
        getRecollections(gameId, { signal: ac.signal }),
      ]);
      if (ac.signal.aborted) return;
      setGameStatus(state?.game?.status ?? null);
      setFinishingTurn(state?.game?.currentTurn ?? null);
      setRecollections(recRes?.recollections || []);
      setError(null);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, env.pollIntervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [load]);

  useGameEvents(gameId, {
    enabled: Boolean(gameId) && (gameStatus === "running" || gameStatus === "finished"),
    onEvent: (ev) => {
      if (
        ev.type === "recollection_submitted" ||
        ev.type === "game_finished" ||
        ev.type === "phase_change" ||
        ev.type === "turn_advanced"
      ) {
        load();
      }
    },
  });

  return (
    <div>
      {loading && recollections.length === 0 && (
        <div className="muted">Gathering recollections…</div>
      )}
      {error && <div className="error-banner">{error}</div>}
      <RecollectionsView
        gameId={gameId}
        recollections={recollections}
        finishingTurn={finishingTurn}
        loading={loading}
      />
    </div>
  );
}
