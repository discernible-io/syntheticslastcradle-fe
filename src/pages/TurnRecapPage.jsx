import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameState, getMessages, getTrades, getTurns } from "../api/client.js";
import { lookupPassportDisplayName } from "../api/roditLookup.js";
import { buildTurnReport } from "../api/turnReport.js";
import { TurnRecapView } from "../components/recap/TurnRecapView.jsx";
import { OperatorCommentary } from "../components/lobby/OperatorCommentary.jsx";
import { useGameEvents } from "../hooks/useGameEvents.js";
import { env } from "../config/env.js";
import {
  buildVisibleTurns,
  nearestNextTurn,
  nearestPrevTurn,
  snapSelectedTurn,
} from "../utils/visibleTurns.js";

export function TurnRecapPage() {
  const { gameId, turn: turnParam } = useParams();
  const navigate = useNavigate();
  const selectedTurn = Number(turnParam);
  const [report, setReport] = useState(null);
  const [activity, setActivity] = useState(null);
  const [gameStatus, setGameStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const { currentTurn, visible } = useMemo(() => buildVisibleTurns(activity), [activity]);
  const prevTurn = nearestPrevTurn(selectedTurn, visible);
  const nextTurn = nearestNextTurn(selectedTurn, visible);

  const load = useCallback(async () => {
    if (!gameId || !Number.isFinite(selectedTurn) || selectedTurn < 1) {
      setError("Invalid turn");
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const [state, msgRes, tradeRes, turnsRes] = await Promise.all([
        getGameState(gameId, { signal: ac.signal }),
        getMessages(gameId, selectedTurn, { signal: ac.signal }),
        getTrades(gameId, selectedTurn, { signal: ac.signal }),
        getTurns(gameId, { signal: ac.signal }).catch(() => null),
      ]);
      if (ac.signal.aborted) return;

      const nextActivity = turnsRes || {
        currentTurn: state?.game?.currentTurn ?? selectedTurn,
        // Without the activity index, keep the requested turn selectable (no snap).
        turns: [
          {
            turn: selectedTurn,
            played: true,
            hasMessages: (msgRes.messages || []).length > 0,
            hasTrades: (tradeRes.trades || []).length > 0,
            messageCount: (msgRes.messages || []).length,
            tradeCount: (tradeRes.trades || []).length,
            eliminationCount: 0,
          },
        ],
      };
      setActivity(nextActivity);
      setGameStatus(state?.game?.status ?? null);

      if (turnsRes) {
        const { currentTurn: liveTurn, visible: visibleTurns } = buildVisibleTurns(nextActivity);
        const snapped = snapSelectedTurn(selectedTurn, visibleTurns, liveTurn);
        if (snapped !== selectedTurn && Number.isFinite(snapped) && snapped >= 1) {
          navigate(`/watch/${gameId}/turn/${snapped}`, { replace: true });
          return;
        }
      }

      const agents = state?.agents || [];
      const roditIds = [...new Set(agents.map((a) => a.roditId).filter(Boolean))];
      const passportEntries = await Promise.all(
        roditIds.map(async (id) => {
          try {
            const name = await lookupPassportDisplayName(id, { signal: ac.signal });
            return name ? [String(id).toLowerCase(), name] : null;
          } catch {
            return null;
          }
        }),
      );
      if (ac.signal.aborted) return;
      const passportNameByRodit = Object.fromEntries(passportEntries.filter(Boolean));
      setReport(
        buildTurnReport({
          turn: selectedTurn,
          state,
          messages: msgRes.messages || [],
          trades: tradeRes.trades || [],
          passportNameByRodit,
        }),
      );
      setError(null);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [gameId, selectedTurn, navigate]);

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
    enabled: Boolean(gameId) && gameStatus === "running",
    onEvent: (ev) => {
      if (ev.type === "phase_change" || ev.type === "turn_advanced" || ev.type === "game_finished") {
        load();
      }
    },
  });

  return (
    <div>
      {loading && !report && <div className="muted">Building highlight reel…</div>}
      {error && <div className="error-banner">{error}</div>}
      {report && (
        <>
          <TurnRecapView
            report={report}
            gameId={gameId}
            visibleTurns={visible}
            currentTurn={currentTurn}
            prevTurn={prevTurn}
            nextTurn={nextTurn}
          />
          <div style={{ maxWidth: 820, margin: "1.25rem auto" }}>
            <OperatorCommentary gameId={gameId} turn={selectedTurn} />
          </div>
        </>
      )}
    </div>
  );
}
