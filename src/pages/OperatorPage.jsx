import { useEffect, useState } from "react";
import { env } from "../config/env.js";
import {
  beginNep413Login,
  clearOperatorSession,
  completeNep413Login,
  getStoredJwt,
  hasNep413CallbackHash,
  listOwnedPassports,
  sessionFromJwt,
} from "../auth/passportLogin.js";
import { getOperatorWallet } from "../auth/nearWallet.js";
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
  const [walletReady, setWalletReady] = useState(false);
  const [walletAccount, setWalletAccount] = useState("");
  const [ownedPassports, setOwnedPassports] = useState([]);
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
    let cancelled = false;
    const wallet = getOperatorWallet();

    (async () => {
      try {
        if (hasNep413CallbackHash()) {
          setBusy(true);
          setError(null);
          const next = await completeNep413Login();
          if (!cancelled) {
            setSession(next);
            setRoditId(next.roditId || "");
            setLastResult({
              label: "nep413-login",
              result: { roditId: next.roditId, authenticated: true },
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || String(err));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }

      try {
        const signedIn = await wallet.startUp();
        if (cancelled) return;
        setWalletReady(true);
        if (signedIn && wallet.accountId) {
          setWalletAccount(wallet.accountId);
          const owned = await listOwnedPassports(wallet);
          if (!cancelled) {
            setOwnedPassports(owned);
            if (!roditId && owned[0]?.tokenId) {
              setRoditId(owned[0].tokenId);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setWalletReady(true);
          setError(err.message || String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally once on mount (wallet callback + startup).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    const ac = new AbortController();
    getContestDefaults({ signal: ac.signal })
      .then(setDefaults)
      .catch(() => setDefaults(null));
    return () => ac.abort();
  }, [authenticated]);

  async function refreshOwnedPassports() {
    const wallet = getOperatorWallet();
    if (!wallet.accountId) {
      setOwnedPassports([]);
      setWalletAccount("");
      return;
    }
    setWalletAccount(wallet.accountId);
    const owned = await listOwnedPassports(wallet);
    setOwnedPassports(owned);
    if (!roditId && owned[0]?.tokenId) {
      setRoditId(owned[0].tokenId);
    }
  }

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

  async function onConnectWallet() {
    setError(null);
    const wallet = getOperatorWallet();
    if (!walletReady) {
      await wallet.startUp();
      setWalletReady(true);
    }
    wallet.signIn();
    // Wallet selector updates asynchronously; poll briefly after modal.
    const started = Date.now();
    const timer = setInterval(async () => {
      if (wallet.accountId) {
        clearInterval(timer);
        try {
          await refreshOwnedPassports();
        } catch (err) {
          setError(err.message || String(err));
        }
      } else if (Date.now() - started > 120000) {
        clearInterval(timer);
      }
    }, 800);
  }

  async function onDisconnectWallet() {
    const wallet = getOperatorWallet();
    await wallet.signOut();
    setWalletAccount("");
    setOwnedPassports([]);
  }

  async function onLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLastResult(null);
    try {
      const next = await beginNep413Login({ roditId });
      if (next) {
        setSession(next);
        setLastResult({
          label: "nep413-login",
          result: { roditId: next.roditId, authenticated: true },
        });
      }
      // else: wallet redirected; completeNep413Login runs on return mount
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
        <code>GAME_PRIVILEGED_RODIT_ID</code>). Prove ownership with a NEAR wallet NEP-413
        signature — the private key never enters this page. Non-privileged passports get 403
        from the API.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {!authenticated ? (
        <form className="panel operator-card" onSubmit={onLogin}>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem" }}>NEP-413 passport login</h2>

          <div className="operator-wallet-row">
            {walletAccount ? (
              <>
                <div>
                  <div className="tiny">NEAR wallet</div>
                  <div style={{ fontFamily: "var(--font-display)", wordBreak: "break-all" }}>
                    {walletAccount}
                  </div>
                </div>
                <button className="btn btn-ghost" type="button" onClick={onDisconnectWallet} disabled={busy}>
                  Disconnect
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                onClick={onConnectWallet}
                disabled={busy || !walletReady}
              >
                {walletReady ? "Connect NEAR wallet" : "Preparing wallet…"}
              </button>
            )}
          </div>

          <label className="operator-field">
            <span>Privileged passport token id</span>
            {ownedPassports.length > 0 ? (
              <select
                value={roditId}
                onChange={(e) => setRoditId(e.target.value)}
                required
              >
                {ownedPassports.map((p) => (
                  <option key={p.tokenId} value={p.tokenId}>
                    {p.tokenId}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={roditId}
                onChange={(e) => setRoditId(e.target.value)}
                placeholder="bjchsfcfskln"
                autoComplete="username"
                required
              />
            )}
          </label>

          <p className="tiny">
            Signs <code>message = passport id</code> for recipient <code>{env.apiBase}</code>{" "}
            (mintserver-style NEP-413). Contract: <code>{env.nearContractId || "(unset)"}</code>
          </p>

          <button className="btn btn-primary" type="submit" disabled={busy || !walletAccount}>
            {busy ? "Waiting for wallet…" : "Sign in with wallet"}
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
