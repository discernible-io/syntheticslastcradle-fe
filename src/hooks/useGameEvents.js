import { useEffect, useRef, useState } from "react";
import { eventsUrl } from "../api/client.js";

/**
 * Subscribe to game SSE. Falls back silently if EventSource fails (self-signed TLS / CORS).
 * Events: phase_change, turn_advanced, game_finished, game_started, game_cancelled, ...
 */
export function useGameEvents(gameId, { enabled = true, onEvent } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!gameId || !enabled) return undefined;

    let es;
    let closed = false;

    try {
      es = new EventSource(eventsUrl(gameId));
    } catch (err) {
      setError(err?.message || "EventSource unavailable");
      return undefined;
    }

    const handle = (type) => (ev) => {
      let data = null;
      try {
        data = ev.data ? JSON.parse(ev.data) : null;
      } catch {
        data = { raw: ev.data };
      }
      const payload = { type: type || data?.type || "message", data, at: Date.now() };
      setLastEvent(payload);
      onEventRef.current?.(payload);
    };

    es.onopen = () => {
      if (!closed) {
        setConnected(true);
        setError(null);
      }
    };
    es.onerror = () => {
      if (!closed) {
        setConnected(false);
        setError("SSE disconnected — polling state instead");
      }
    };

    // Named event types from API + generic message
    for (const name of [
      "phase_change",
      "turn_advanced",
      "game_finished",
      "game_started",
      "game_cancelled",
      "prize_settlement",
      "recollection_submitted",
      "connected",
    ]) {
      es.addEventListener(name, handle(name));
    }
    es.onmessage = handle("message");

    return () => {
      closed = true;
      es.close();
      setConnected(false);
    };
  }, [gameId, enabled]);

  return { connected, lastEvent, error };
}
