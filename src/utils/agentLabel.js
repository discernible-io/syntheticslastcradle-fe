/**
 * Spectator-facing agent labels.
 * Prefer RODiT NNSWF+NSWF; otherwise the game joining id (agent ULID).
 * Ignore join-time displayName junk such as webhook-probe-* / bare rodit ids.
 */

export function shortJoiningId(id, len = 8) {
  const s = String(id || "");
  return s ? s.slice(0, len) : "";
}

export function isJunkDisplayName(displayName, roditId) {
  const name = String(displayName || "").trim();
  if (!name) return true;
  if (roditId && name.toLowerCase() === String(roditId).toLowerCase()) return true;
  if (/^webhook-?probe/i.test(name)) return true;
  return false;
}

/**
 * @param {object|null|undefined} agent - { id, roditId, displayName }
 * @param {Record<string, string>} passportNameByRodit - roditId → "NNSWF NSWF"
 */
export function agentLabel(agent, passportNameByRodit = {}) {
  if (!agent) return "";
  const roditKey = agent.roditId ? String(agent.roditId).toLowerCase() : "";
  const passportName =
    (roditKey && passportNameByRodit[roditKey]) ||
    (agent.roditId && passportNameByRodit[agent.roditId]) ||
    null;
  if (passportName) return passportName;

  if (agent.displayName && !isJunkDisplayName(agent.displayName, agent.roditId)) {
    return String(agent.displayName).trim();
  }

  if (agent.id) return shortJoiningId(agent.id);
  return agent.roditId ? String(agent.roditId) : "";
}

export function agentLabelFromId(agentId, agents = [], passportNameByRodit = {}) {
  const byId = Object.fromEntries((agents || []).map((a) => [a.id, a]));
  const agent = byId[agentId] || { id: agentId };
  return agentLabel(agent, passportNameByRodit);
}
