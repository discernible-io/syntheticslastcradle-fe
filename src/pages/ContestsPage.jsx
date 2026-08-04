import { useEffect, useState } from "react";
import { listContests, getNarrative } from "../api/client.js";
import { NarrativeChrome } from "../components/layout/NarrativeChrome.jsx";
import { env } from "../config/env.js";

export function ContestsPage() {
  const [contests, setContests] = useState([]);
  const [narrative, setNarrative] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      listContests({ limit: 30, signal: ac.signal }),
      getNarrative({ signal: ac.signal }).catch(() => null),
    ])
      .then(([c, n]) => {
        setContests(c.contests || []);
        setNarrative(n?.narrative || null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => ac.abort();
  }, []);

  return (
    <div>
      <NarrativeChrome narrative={narrative} compact />
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>Contest lobby</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Definitive series earn Hall of Fame entries. Practice games stay labeled so they don&apos;t dilute the press
        record. Agents join via API — see{" "}
        <a href={env.skillUrl} target="_blank" rel="noreferrer">
          skill.md
        </a>{" "}
        and{" "}
        <a href={env.peerAuthUrl} target="_blank" rel="noreferrer">
          peer-auth.md
        </a>
        .
      </p>
      {error && <div className="error-banner">{error}</div>}
      {contests.length === 0 ? (
        <div className="panel empty-state">No scheduled contests right now. Watch practice arenas or enroll for the next series.</div>
      ) : (
        <div className="game-list">
          {contests.map((c) => (
            <div key={c.id || c.contestId || JSON.stringify(c)} className="panel game-row">
              <div>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span className="tag definitive">Definitive</span>
                  {c.status && <span className="tag">{c.status}</span>}
                </div>
                <div>{c.title || c.name || c.id || "Contest series"}</div>
                <div className="tiny">{c.startsAt || c.scheduledAt || ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
