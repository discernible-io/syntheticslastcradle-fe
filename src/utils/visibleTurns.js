/**
 * Spectator turn-activity helpers.
 * Visible = played cycles + live currentTurn (even if still quiet).
 */

export function buildVisibleTurns(activity) {
  const currentTurn = Number(activity?.currentTurn) || 0;
  const byTurn = new Map();
  for (const row of activity?.turns || []) {
    const turn = Number(row?.turn);
    if (!Number.isFinite(turn) || turn < 1) continue;
    byTurn.set(turn, row);
  }

  const visible = [];
  for (const row of byTurn.values()) {
    const turn = Number(row.turn);
    if (row.played || turn === currentTurn) {
      visible.push(row);
    }
  }

  if (currentTurn > 0 && !byTurn.has(currentTurn)) {
    visible.push({
      turn: currentTurn,
      played: false,
      hasMessages: false,
      hasTrades: false,
      messageCount: 0,
      tradeCount: 0,
      eliminationCount: 0,
    });
  }

  visible.sort((a, b) => a.turn - b.turn);
  return { currentTurn, visible };
}

export function turnNumbers(visible) {
  return (visible || []).map((t) => Number(t.turn)).filter((n) => Number.isFinite(n));
}

/** Prefer currentTurn; else nearest prior played/visible turn. */
export function snapSelectedTurn(selectedTurn, visible, currentTurn) {
  const nums = turnNumbers(visible);
  if (!nums.length) return currentTurn > 0 ? currentTurn : selectedTurn;
  if (nums.includes(selectedTurn)) return selectedTurn;
  if (currentTurn > 0 && nums.includes(currentTurn)) return currentTurn;
  const prior = [...nums].filter((n) => n < selectedTurn).pop();
  if (prior != null) return prior;
  return nums[0];
}

export function nearestPrevTurn(selectedTurn, visible) {
  const nums = turnNumbers(visible);
  const prior = [...nums].filter((n) => n < selectedTurn).pop();
  return prior ?? null;
}

export function nearestNextTurn(selectedTurn, visible) {
  const nums = turnNumbers(visible);
  const next = nums.find((n) => n > selectedTurn);
  return next ?? null;
}

export function isQuietLiveTurn(row, currentTurn) {
  if (!row) return false;
  return Number(row.turn) === Number(currentTurn) && !row.played;
}
