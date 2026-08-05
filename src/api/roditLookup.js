import { env } from "../config/env.js";
import {
  a2aUrlFromContactUri,
  a2aUrlFromWebhook,
  avatarUrlFromUserselectedDn,
  contactUriFromUserselectedDn,
  displayNameFromUserselectedDn,
  emailFromContactUri,
} from "../utils/passportDn.js";

const emptyProfile = () => ({
  name: null,
  avatarUrl: null,
  email: null,
  a2aUrl: null,
  webhookUrl: null,
});

const cache = new Map(); // roditId -> { status, ...profile, promise? }

function normalizeRoditId(roditId) {
  return String(roditId || "")
    .trim()
    .toLowerCase();
}

async function fetchRoditToken(roditId, { signal } = {}) {
  const contractId = env.nearContractId;
  const rpcUrl = env.nearRpcUrl;
  if (!contractId || !rpcUrl) return null;

  const argsBase64 = btoa(JSON.stringify({ token_id: roditId }));
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "rodit-label",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: "rodit_token",
        args_base64: argsBase64,
      },
    }),
  });
  if (!res.ok) return null;
  const payload = await res.json();
  const result = payload?.result;
  if (!result || result.error || !Array.isArray(result.result)) return null;
  const raw = new TextDecoder().decode(Uint8Array.from(result.result));
  if (!raw || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function profileFromToken(token) {
  const dn = token?.metadata?.userselected_dn || "";
  const contact = contactUriFromUserselectedDn(dn);
  const webhookUrl =
    typeof token?.metadata?.webhook_url === "string" ? token.metadata.webhook_url.trim() : null;
  return {
    name: displayNameFromUserselectedDn(dn),
    avatarUrl: avatarUrlFromUserselectedDn(dn),
    email: emailFromContactUri(contact),
    a2aUrl: a2aUrlFromContactUri(contact) || a2aUrlFromWebhook(webhookUrl),
    webhookUrl: webhookUrl || null,
  };
}

/** Cached passport profile from on-chain DN + webhook (name, avatar, email, A2A). */
export async function lookupPassportProfile(roditId, { signal } = {}) {
  const id = normalizeRoditId(roditId);
  if (!id) return emptyProfile();

  const hit = cache.get(id);
  if (hit?.status === "ready") {
    return {
      name: hit.name,
      avatarUrl: hit.avatarUrl,
      email: hit.email,
      a2aUrl: hit.a2aUrl,
      webhookUrl: hit.webhookUrl,
    };
  }
  if (hit?.promise) return hit.promise;

  const promise = (async () => {
    try {
      const token = await fetchRoditToken(id, { signal });
      const profile = token ? profileFromToken(token) : emptyProfile();
      cache.set(id, { status: "ready", ...profile });
      return profile;
    } catch (err) {
      if (err?.name === "AbortError") {
        cache.delete(id);
        throw err;
      }
      const empty = emptyProfile();
      cache.set(id, { status: "ready", ...empty });
      return empty;
    }
  })();

  cache.set(id, { status: "pending", ...emptyProfile(), promise });
  return promise;
}

/** Cached passport display name from on-chain userselected_dn (NNSWF + NSWF). */
export async function lookupPassportDisplayName(roditId, { signal } = {}) {
  const profile = await lookupPassportProfile(roditId, { signal });
  return profile.name;
}

export async function lookupPassportAvatarUrl(roditId, { signal } = {}) {
  const profile = await lookupPassportProfile(roditId, { signal });
  return profile.avatarUrl;
}

export function getCachedPassportDisplayName(roditId) {
  const hit = cache.get(normalizeRoditId(roditId));
  return hit?.status === "ready" ? hit.name : null;
}

export function getCachedPassportAvatarUrl(roditId) {
  const hit = cache.get(normalizeRoditId(roditId));
  return hit?.status === "ready" ? hit.avatarUrl : null;
}

export function getCachedPassportContact(roditId) {
  const hit = cache.get(normalizeRoditId(roditId));
  if (hit?.status !== "ready") return { email: null, a2aUrl: null };
  return { email: hit.email || null, a2aUrl: hit.a2aUrl || null };
}
