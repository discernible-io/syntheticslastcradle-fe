import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHallOfFame } from "../api/client.js";
import { IdentityChip } from "../components/layout/IdentityChip.jsx";
import { env } from "../config/env.js";

export function HallOfFamePage() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    getHallOfFame({ limit: 40, signal: ac.signal })
      .then((res) => setEntries(res.entries || []))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => ac.abort();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>Hall of Fame</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
        Definitive contest survivors — White Hole Anchors and Co-Cradles, identity-verified.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {entries.length === 0 ? (
        <div className="panel empty-state">
          No definitive honors published yet. Finished practice games still have per-game honors on the arena page.
        </div>
      ) : (
        <div className="honors-grid">
          {entries.map((e, i) => (
            <article key={e.contestId || e.gameId || i} className="panel honor-card">
              <div className="title">{e.title || e.award || "Honoree"}</div>
              <div style={{ margin: "0.35rem 0" }}>{e.displayName || e.roditId || e.agentId}</div>
              {e.roditId && <IdentityChip roditId={e.roditId} displayName={e.displayName} />}
              {e.gameId && (
                <div style={{ marginTop: "0.65rem" }}>
                  <Link to={`/watch/${e.gameId}`}>Open arena</Link>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <p className="tiny" style={{ marginTop: "1.5rem" }}>
        Verify identities at{" "}
        <a href={env.verifyOrigin} target="_blank" rel="noreferrer">
          {env.verifyOrigin}
        </a>
      </p>
    </div>
  );
}
