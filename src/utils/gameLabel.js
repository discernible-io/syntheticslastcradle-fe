/** Prefer actual start, else joining open, else created. */
export function gameStartedAt(game) {
  return game?.startedAt || game?.joiningWindow?.startsAt || game?.createdAt || null;
}

export function formatGameStartedAt(game, { fallback = "Start time unknown" } = {}) {
  const raw = gameStartedAt(game);
  if (!raw) return fallback;
  const normalized = String(raw).includes("T") ? String(raw) : `${String(raw).replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status) {
  const s = String(status || "").trim();
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
