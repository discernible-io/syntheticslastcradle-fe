/** Shared copy for cradles that fail the survival payment. */
export const SURVIVAL_FAILURE_CAUSE = "Couldn’t pay survival";

const RESOURCE_ORDER = ["energy", "water", "compute"];

function normalizeShortfall(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const set = new Set(
    raw
      .map((r) => String(r || "").toLowerCase())
      .filter((r) => RESOURCE_ORDER.includes(r))
  );
  return RESOURCE_ORDER.filter((r) => set.has(r));
}

function joinResourceNames(resources) {
  if (resources.length === 1) return resources[0];
  if (resources.length === 2) return `${resources[0]} & ${resources[1]}`;
  return `${resources.slice(0, -1).join(", ")}, & ${resources[resources.length - 1]}`;
}

/** e.g. "Couldn’t pay water" / "Couldn’t pay energy & compute" */
export function formatSurvivalFailureCause(shortfall) {
  const resources = normalizeShortfall(shortfall);
  if (!resources.length) return SURVIVAL_FAILURE_CAUSE;
  return `Couldn’t pay ${joinResourceNames(resources)}`;
}

export function eliminationCause(agent) {
  if (agent?.deathCause) return agent.deathCause;
  if (agent?.eliminationReason) return agent.eliminationReason;
  return formatSurvivalFailureCause(agent?.deathShortfall);
}
