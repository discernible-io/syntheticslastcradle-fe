/**
 * Parse IdentyClaw userselected_dn and build a spectator display name
 * from NNSWF (given) + NSWF (family), matching public passport profiles.
 */

function splitDistinguishedName(rawDn) {
  const parts = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < rawDn.length; i += 1) {
    const ch = rawDn[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (ch === "," && !inQuotes) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseDnComponent(part) {
  const eq = part.indexOf("=");
  if (eq <= 0) return null;
  const attribute = part.slice(0, eq).trim();
  let value = part.slice(eq + 1).trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    value = value.slice(1, -1);
  }
  return { attribute, value };
}

export function parseUserselectedDn(rawDn) {
  if (typeof rawDn !== "string" || !rawDn.trim()) {
    return { NNSWF: null, NSWF: null, attributes: {} };
  }

  const components = splitDistinguishedName(rawDn.trim())
    .map(parseDnComponent)
    .filter(Boolean);

  const attributes = {};
  for (const component of components) {
    attributes[component.attribute] = component.value;
  }

  const find = (name) =>
    components.find((c) => c.attribute.toUpperCase() === name.toUpperCase())?.value || null;

  return {
    NNSWF: find("NNSWF"),
    NSWF: find("NSWF"),
    attributes,
  };
}

/** Prefer "NNSWF NSWF" (e.g. "Cornelius Drew"); null if neither is present. */
export function displayNameFromUserselectedDn(rawDn) {
  const { NNSWF, NSWF } = parseUserselectedDn(rawDn);
  const parts = [NNSWF, NSWF].filter(Boolean);
  return parts.length > 0 ? parts.join(" ").trim() : null;
}
