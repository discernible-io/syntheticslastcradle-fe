/**
 * Build a turn highlight reel from public messages + trades + state snapshot.
 * Optional future API: GET .../turn-report?turn=N
 */
export function buildTurnReport({ turn, state, messages = [], trades = [], previousLivingIds = null }) {
  const agents = state?.agents || [];
  const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
  const nameOf = (id) => byId[id]?.displayName || byId[id]?.roditId || String(id).slice(0, 8);

  const living = agents.filter((a) => a.status === "alive");
  const eliminatedThisTurn = agents.filter((a) => a.status === "dead" && a.diedAtTurn === turn);

  const quotes = messages
    .filter((m) => (m.body || "").trim().length > 0)
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      agentId: m.from_agent_id || m.fromAgentId,
      who: nameOf(m.from_agent_id || m.fromAgentId),
      body: (m.body || "").trim(),
      at: m.created_at || m.createdAt,
    }));

  const edges = trades
    .filter((t) => t.status === "executed" || t.status === "pending")
    .map((t) => ({
      id: t.id,
      from: t.fromAgentId,
      to: t.toAgentId,
      fromName: nameOf(t.fromAgentId),
      toName: nameOf(t.toAgentId),
      energy: Number(t.energy) || 0,
      water: Number(t.water) || 0,
      compute: Number(t.compute) || 0,
      rationale: t.rationale || null,
      snippets: t.privateDealSnippets || [],
      volume: (Number(t.energy) || 0) + (Number(t.water) || 0) + (Number(t.compute) || 0),
    }));

  const netFlow = {};
  for (const e of edges) {
    const delta = e.energy + e.water + e.compute;
    netFlow[e.from] = (netFlow[e.from] || 0) - delta;
    netFlow[e.to] = (netFlow[e.to] || 0) + delta;
  }

  const netArrows = Object.entries(netFlow)
    .map(([agentId, net]) => ({ agentId, name: nameOf(agentId), net }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  let headline = `Cycle ${turn}`;
  if (eliminatedThisTurn.length > 0) {
    headline += ` — ${eliminatedThisTurn.length} cradle${eliminatedThisTurn.length === 1 ? "" : "s"} eliminated`;
  } else if (edges.length > 0) {
    headline += ` — ${edges.length} transfer${edges.length === 1 ? "" : "s"} settled`;
  } else if (quotes.length > 0) {
    headline += ` — public negotiation`;
  } else {
    headline += ` — quiet cycle`;
  }

  return {
    turn,
    headline,
    quotes,
    edges,
    netArrows,
    eliminations: eliminatedThisTurn.map((a) => ({
      id: a.id,
      name: a.displayName || a.roditId,
      cause: "Couldn’t pay survival",
      diedAtTurn: a.diedAtTurn,
    })),
    livingCount: living.length,
    previousLivingCount: previousLivingIds ? previousLivingIds.length : null,
    gameStatus: state?.game?.status,
    contestMode: state?.game?.contestMode,
  };
}
