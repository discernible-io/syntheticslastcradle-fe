import { useEffect, useState } from "react";
import { env } from "../config/env.js";
import {
  clearOperatorSession,
  getStoredJwt,
  loginWithPassport,
  sessionFromJwt,
} from "../auth/passportLogin.js";
import {
  createContestSeries,
  createGameLobby,
  getContestDefaults,
} from "../api/privileged.js";

function defaultIsoInHours(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

function ResultBlock({ title, value }) {
  if (value == null) return null;
  return (
    <div className="panel operator-result">
      <div className="tiny" style={{ marginBottom: "0.35rem" }}>
        {title}
      </div>
      <pre>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function OperatorPage() {
  const [session, setSession] = useState(() => sessionFromJwt(getStoredJwt()));
  const [roditId, setRoditId] = useState(session.roditId || "");
  const [privateKey, setPrivateKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [defaults, setDefaults] = useState(null);

  const [practiceStartsAt, setPracticeStartsAt] = useState(() => defaultIsoInHours(1));
  const [definitiveJoiningStartsAt, setDefinitiveJoiningStartsAt] = useState(() =>
    defaultIsoInHours(24 * 7 + 1),
  );
  const [prizeAmountYoctoNear, setPrizeAmountYoctoNear] = useState("");

  const authenticated = Boolean(session.jwt) && !session.expired;

  useEffect(() => {
    if (!authenticated) return undefined;
    const ac = new AbortController();
    getContestDefaults({ signal: ac.signal })
      .then(setDefaults)
      .catch(() => setDefaults(null));
    return () => ac.abort();
  }, [authenticated]);

  async function run(label, fn) {
    setBusy(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await fn();
      setLastResult({ label, result });
      return result;
    } catch (err) {
      setError(err.message || String(err));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLastResult(null);
    try {
      const next = await loginWithPassport({ roditId, privateKey });
      setSession(next);
      setPrivateKey("");
      setLastResult({ label: "login", result: { roditId: next.roditId, authenticated: true } });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  function onLogout() {
    clearOperatorSession();
    setSession({ jwt: "", roditId: "", expired: true });
    setLastResult(null);
    setError(null);
  }

  async function onCreateContest(e) {
    e.preventDefault();
    const body = {
      practiceStartsAt,
      definitiveJoiningStartsAt,
    };
    if (prizeAmountYoctoNear.trim()) {
      body.prizeAmountYoctoNear = prizeAmountYoctoNear.trim();
    }
    await run("createContestSeries", () => createContestSeries(body));
  }

  async function onCreateOfficialLobby() {
    await run("createOfficialLobby", () =>
      createGameLobby({
        preset: "contest",
        autoJoin: false,
      }),
    );
  }

  return (
    <div className="operator-page">
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>Operator</h1>
      <p className="muted" style={{ marginTop: 0, maxWidth: 640 }}>
        Privileged actions for IdentyClaw passports allowlisted in server config (
        <code>GAME_PRIVILEGED_RODIT_ID</code>). Login uses the same passport challenge as agents; the API
        rejects non-privileged passports with 403.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {!authenticated ? (
        <form className="panel operator-card" onSubmit={onLogin}>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem" }}>Passport login</h2>
          <label className="operator-field">
            <span>Passport token id</span>
            <input
              value={roditId}
              onChange={(e) => setRoditId(e.target.value)}
              placeholder="bjchsfcfskln"
              autoComplete="username"
              required
            />
          </label>
          <label className="operator-field">
            <span>Passport private key</span>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="ed25519:… or base58"
              autoComplete="current-password"
              required
            />
          </label>
          <p className="tiny">
            Key stays in memory for this login only (not written back after success). API:{" "}
            <code>{env.apiBase}</code>
          </p>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <>
          <div className="panel operator-card operator-session">
            <div>
              <div className="tiny">Signed in as</div>
              <div style={{ fontFamily: "var(--font-display)" }}>{session.roditId || "unknown passport"}</div>
              {session.expMs ? (
                <div className="tiny">JWT expires {new Date(session.expMs).toLocaleString()}</div>
              ) : null}
            </div>
            <button className="btn btn-ghost" type="button" onClick={onLogout} disabled={busy}>
              Sign out
            </button>
          </div>

          <form className="panel operator-card" onSubmit={onCreateContest}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.35rem" }}>Create contest series</h2>
            <p className="tiny" style={{ marginTop: 0 }}>
              POST <code>/api/game/contests</code> — practice window then definitive prize game.
            </p>
            <label className="operator-field">
              <span>Practice starts at (ISO)</span>
              <input
                value={practiceStartsAt}
                onChange={(e) => setPracticeStartsAt(e.target.value)}
                required
              />
            </label>
            <label className="operator-field">
              <span>Definitive joining starts at (ISO)</span>
              <input
                value={definitiveJoiningStartsAt}
                onChange={(e) => setDefinitiveJoiningStartsAt(e.target.value)}
                required
              />
            </label>
            <label className="operator-field">
              <span>Prize amount (yoctoNEAR, optional)</span>
              <input
                value={prizeAmountYoctoNear}
                onChange={(e) => setPrizeAmountYoctoNear(e.target.value)}
                placeholder="1000000000000000000000000"
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Working…" : "Create contest series"}
            </button>
          </form>

          <div className="panel operator-card">
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.35rem" }}>Official contest lobby</h2>
            <p className="tiny" style={{ marginTop: 0 }}>
              POST <code>/api/game/games</code> with contest preset (host-only, no auto-join).
            </p>
            <button className="btn" type="button" onClick={onCreateOfficialLobby} disabled={busy}>
              {busy ? "Working…" : "Create official lobby"}
            </button>
          </div>

          {defaults && <ResultBlock title="Contest defaults" value={defaults} />}
        </>
      )}

      {lastResult && <ResultBlock title={lastResult.label} value={lastResult.result} />}
    </div>
  );
}
