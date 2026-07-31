import { env } from "../config/env.js";

async function apiGet(path, { signal } = {}) {
  const url = `${env.apiBase}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`API ${res.status} for ${path}${text ? `: ${text.slice(0, 180)}` : ""}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function listGames({ status, contestMode, limit = 40, offset = 0, signal } = {}) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (contestMode) q.set("contestMode", contestMode);
  q.set("limit", String(limit));
  q.set("offset", String(offset));
  return apiGet(`/api/game/games?${q}`, { signal });
}

export function getGameState(gameId, { signal } = {}) {
  return apiGet(`/api/game/games/${encodeURIComponent(gameId)}/state`, { signal });
}

export function getMessages(gameId, turn, { signal } = {}) {
  const q = turn == null ? "" : `?turn=${encodeURIComponent(turn)}`;
  return apiGet(`/api/game/games/${encodeURIComponent(gameId)}/messages${q}`, { signal });
}

export function getTrades(gameId, turn, { signal } = {}) {
  const q = turn == null ? "" : `?turn=${encodeURIComponent(turn)}`;
  return apiGet(`/api/game/games/${encodeURIComponent(gameId)}/trades${q}`, { signal });
}

export function getHonors(gameId, { signal } = {}) {
  return apiGet(`/api/game/games/${encodeURIComponent(gameId)}/honors`, { signal });
}

export function getAgentIdentity(gameId, agentId, { signal } = {}) {
  return apiGet(
    `/api/game/games/${encodeURIComponent(gameId)}/players/${encodeURIComponent(agentId)}/identity`,
    { signal },
  );
}

export function getNarrative({ signal } = {}) {
  return apiGet(`/api/game/narrative`, { signal });
}

export function listContests({ status, limit = 20, offset = 0, signal } = {}) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  q.set("limit", String(limit));
  q.set("offset", String(offset));
  return apiGet(`/api/game/contests?${q}`, { signal });
}

export function getHallOfFame({ limit = 20, offset = 0, signal } = {}) {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiGet(`/api/game/hall-of-fame?${q}`, { signal });
}

export function eventsUrl(gameId) {
  return `${env.apiBase}/api/game/games/${encodeURIComponent(gameId)}/events`;
}
