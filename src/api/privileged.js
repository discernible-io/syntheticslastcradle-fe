import { env } from "../config/env.js";
import { getStoredJwt } from "../auth/passportLogin.js";

async function privilegedFetch(path, { method = "GET", body, signal, jwt } = {}) {
  const token = jwt || getStoredJwt();
  if (!token) {
    throw new Error("Not authenticated — log in with a privileged IdentyClaw passport first");
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${env.apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 400) };
    }
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      (typeof data?.raw === "string" ? data.raw : "") ||
      res.statusText;
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** Create an official contest series (practice week + definitive prize game). */
export function createContestSeries(payload, opts = {}) {
  return privilegedFetch("/api/game/contests", {
    method: "POST",
    body: payload,
    ...opts,
  });
}

/** Alias of createContestSeries. */
export function createContestSeriesAlias(payload, opts = {}) {
  return privilegedFetch("/api/game/contest-series", {
    method: "POST",
    body: payload,
    ...opts,
  });
}

/**
 * Create a lobby. Official contest presets require the privileged passport.
 * Pass preset: "contest" | "practice" | "default", or a raw config object.
 */
export function createGameLobby(payload = {}, opts = {}) {
  return privilegedFetch("/api/game/games", {
    method: "POST",
    body: payload,
    ...opts,
  });
}

export function getContestDefaults(opts = {}) {
  return privilegedFetch("/api/game/defaults/contest", {
    method: "GET",
    ...opts,
  });
}
