import { env } from "../config/env.js";
import { displayNameFromUserselectedDn } from "../utils/passportDn.js";

const cache = new Map(); // roditId -> { status, name, promise? }

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

/** Cached passport display name from on-chain userselected_dn (NNSWF + NSWF). */
export async function lookupPassportDisplayName(roditId, { signal } = {}) {
  const id = normalizeRoditId(roditId);
  if (!id) return null;

  const hit = cache.get(id);
  if (hit?.status === "ready") return hit.name;
  if (hit?.promise) return hit.promise;

  const promise = (async () => {
    try {
      const token = await fetchRoditToken(id, { signal });
      const dn = token?.metadata?.userselected_dn || "";
      const name = displayNameFromUserselectedDn(dn);
      cache.set(id, { status: "ready", name });
      return name;
    } catch (err) {
      if (err?.name === "AbortError") {
        cache.delete(id);
        throw err;
      }
      cache.set(id, { status: "ready", name: null });
      return null;
    }
  })();

  cache.set(id, { status: "pending", name: null, promise });
  return promise;
}

export function getCachedPassportDisplayName(roditId) {
  const hit = cache.get(normalizeRoditId(roditId));
  return hit?.status === "ready" ? hit.name : null;
}
