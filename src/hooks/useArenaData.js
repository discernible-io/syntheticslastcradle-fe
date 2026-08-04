import { useCallback, useEffect, useRef, useState } from "react";
import { getGameState, getMessages, getTrades } from "../api/client.js";
import { env } from "../config/env.js";
import { publicTradesTurn } from "../utils/tradeTurn.js";
import { useGameEvents } from "./useGameEvents.js";

export function useArenaData(gameId) {
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tradesTurn, setTradesTurn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flashTrades, setFlashTrades] = useState([]);
  const abortRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const nextState = await getGameState(gameId, { signal: ac.signal });
      const turn = nextState?.game?.currentTurn;
      const ledgerTurn = publicTradesTurn(nextState?.game);
      const [msgRes, tradeRes] = await Promise.all([
        getMessages(gameId, turn, { signal: ac.signal }).catch(() => ({ messages: [] })),
        getTrades(gameId, ledgerTurn, { signal: ac.signal }).catch(() => ({ trades: [] })),
      ]);
      if (ac.signal.aborted) return;
      setState(nextState);
      setMessages(msgRes.messages || []);
      setTrades(tradeRes.trades || []);
      setTradesTurn(tradeRes.turnNumber ?? ledgerTurn);
      setError(null);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Failed to load arena");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = setInterval(refresh, env.pollIntervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [refresh]);

  const { connected, lastEvent, error: sseError } = useGameEvents(gameId, {
    enabled: Boolean(gameId) && state?.game?.status === "running",
    onEvent: (ev) => {
      if (ev.type === "phase_change" || ev.type === "turn_advanced" || ev.type === "game_finished") {
        refresh();
      }
    },
  });

  useEffect(() => {
    const executed = (trades || []).filter((t) => t.status === "executed");
    if (executed.length === 0) return undefined;
    setFlashTrades(executed);
    const t = setTimeout(() => setFlashTrades([]), 4500);
    return () => clearTimeout(t);
  }, [trades]);

  return {
    state,
    messages,
    trades,
    tradesTurn,
    flashTrades,
    loading,
    error: error || sseError,
    sseConnected: connected,
    lastEvent,
    refresh,
  };
}
