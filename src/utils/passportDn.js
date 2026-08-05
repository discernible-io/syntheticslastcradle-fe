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
    AvatarURL: find("AvatarURL"),
    ContactURI: find("ContactURI"),
    attributes,
  };
}

/**
 * ContactURI shape: `scheme:authority:identifier`
 * e.g. email:agenthood.me:andrew@agenthood.me
 *      a2a:identyclaw.com:https://host:7443/a2a
 */
export function parseContactUri(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const match = raw.trim().match(/^([^:]+):([^:]*):(.*)$/);
  if (!match) return null;
  return {
    raw: raw.trim(),
    scheme: match[1].toLowerCase(),
    authority: match[2],
    identifier: match[3],
  };
}

export function contactUriFromUserselectedDn(rawDn) {
  const { ContactURI } = parseUserselectedDn(rawDn);
  return parseContactUri(ContactURI);
}

export function emailFromContactUri(contact) {
  if (!contact || contact.scheme !== "email") return null;
  const id = String(contact.identifier || "").trim();
  if (!id.includes("@")) return null;
  return id;
}

export function a2aUrlFromContactUri(contact) {
  if (!contact || contact.scheme !== "a2a") return null;
  const id = String(contact.identifier || "").trim();
  if (!id) return null;
  try {
    const url = new URL(id);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Derive canonical A2A endpoint from IdentyClaw wake webhook_url. */
export function a2aUrlFromWebhook(webhookUrl) {
  if (typeof webhookUrl !== "string" || !webhookUrl.trim()) return null;
  try {
    const url = new URL(webhookUrl.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const path = url.pathname.replace(/\/+$/, "") || "";
    if (!path.endsWith("/a2a")) {
      url.pathname = `${path}/a2a`;
    }
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/** Prefer "NNSWF NSWF" (e.g. "Cornelius Drew"); null if neither is present. */
export function displayNameFromUserselectedDn(rawDn) {
  const { NNSWF, NSWF } = parseUserselectedDn(rawDn);
  const parts = [NNSWF, NSWF].filter(Boolean);
  return parts.length > 0 ? parts.join(" ").trim() : null;
}

/** http(s) AvatarURL from the DN, or null if missing/invalid. */
export function avatarUrlFromUserselectedDn(rawDn) {
  const { AvatarURL } = parseUserselectedDn(rawDn);
  if (!AvatarURL) return null;
  try {
    const url = new URL(AvatarURL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}
