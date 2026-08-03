import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGameState, getMessages, getTrades } from "../api/client.js";
import { lookupPassportDisplayName } from "../api/roditLookup.js";
import { buildTurnReport } from "../api/turnReport.js";
import { TurnRecapView } from "../components/recap/TurnRecapView.jsx";
import { OperatorCommentary } from "../components/lobby/OperatorCommentary.jsx";

export function TurnRecapPage() {
  const { gameId, turn: turnParam } = useParams();
  const turn = Number(turnParam);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !Number.isFinite(turn) || turn < 1) {
      setError("Invalid turn");
      setLoading(false);
      return undefined;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const [state, msgRes, tradeRes] = await Promise.all([
          getGameState(gameId, { signal: ac.signal }),
          getMessages(gameId, turn, { signal: ac.signal }),
          getTrades(gameId, turn, { signal: ac.signal }),
        ]);
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
        const passportNameByRodit = Object.fromEntries(passportEntries.filter(Boolean));
        setReport(
          buildTurnReport({
            turn,
            state,
            messages: msgRes.messages || [],
            trades: tradeRes.trades || [],
            passportNameByRodit,
          }),
        );
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [gameId, turn]);

  return (
    <div>
      {loading && <div className="muted">Building highlight reel…</div>}
      {error && <div className="error-banner">{error}</div>}
      {report && (
        <>
          <TurnRecapView report={report} gameId={gameId} />
          <div style={{ maxWidth: 820, margin: "1.25rem auto" }}>
            <OperatorCommentary gameId={gameId} turn={turn} />
          </div>
        </>
      )}
    </div>
  );
}
