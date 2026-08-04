/**
 * Public trades ledger turn for spectators.
 *
 * After execution resolves, `game.currentTurn` has already advanced into the next
 * negotiation, so `GET .../trades` (default current_turn) is often empty.
 * Prefer the just-resolved execution turn during negotiation.
 */
export function publicTradesTurn(game) {
  const turn = game?.currentTurn;
  if (turn == null || Number.isNaN(Number(turn))) return null;
  const n = Number(turn);
  const phase = game?.phase;
  if (phase === "negotiation" && n > 1) return n - 1;
  return n;
}
