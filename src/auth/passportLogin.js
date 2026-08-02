import { jwtDecode } from "jwt-decode";
import { Buffer } from "buffer";
import { env } from "../config/env.js";
import { getOperatorWallet } from "./nearWallet.js";

const JWT_STORAGE_KEY = "slc_operator_jwt";
const RODIT_STORAGE_KEY = "slc_operator_rodit_id";
const LOGIN_DATA_KEY = "slc_operator_loginData";

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBase64Url(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Missing NEP-413 signature");
  }
  // Wallet callbacks may return base64 or base64url; normalize to base64url.
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytesToBase64Url(bytes);
}

export function getStoredJwt() {
  return localStorage.getItem(JWT_STORAGE_KEY) || "";
}

export function getStoredRoditId() {
  return localStorage.getItem(RODIT_STORAGE_KEY) || "";
}

export function clearOperatorSession() {
  localStorage.removeItem(JWT_STORAGE_KEY);
  localStorage.removeItem(RODIT_STORAGE_KEY);
}

export function storeOperatorSession({ jwt, roditId }) {
  localStorage.setItem(JWT_STORAGE_KEY, jwt);
  if (roditId) {
    localStorage.setItem(RODIT_STORAGE_KEY, roditId);
  }
}

export function decodeJwtClaims(jwt) {
  if (!jwt) return null;
  try {
    return jwtDecode(jwt);
  } catch {
    return null;
  }
}

export function sessionFromJwt(jwt) {
  const claims = decodeJwtClaims(jwt);
  if (!claims) {
    return { jwt, roditId: "", expired: true };
  }
  const expMs = typeof claims.exp === "number" ? claims.exp * 1000 : 0;
  const expired = expMs > 0 ? Date.now() >= expMs : false;
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const subMatch = /(?:^|;)\s*sub=([A-Za-z][A-Za-z0-9]{11})\s*(?:;|$)/i.exec(sub);
  const roditId =
    subMatch?.[1] ||
    claims.roditId ||
    claims.rodit_id ||
    getStoredRoditId() ||
    "";
  return { jwt, claims, roditId, expired, expMs };
}

export function hasNep413CallbackHash(url = window.location.href) {
  const hash = String(url).split("#")[1] || "";
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  return Boolean(params.get("signature") && params.get("accountId"));
}

function parseCallbackHash(url) {
  const hashParams = String(url).split("#")[1];
  if (!hashParams) {
    throw new Error("No wallet callback hash found");
  }
  const params = new URLSearchParams(hashParams);
  const signature = params.get("signature");
  const publicKey = params.get("publicKey");
  const accountId = params.get("accountId");
  if (!signature || !accountId) {
    throw new Error("Wallet callback missing signature or accountId");
  }
  return {
    signature: decodeURIComponent(signature),
    publicKey: publicKey ? publicKey.replace(/^ed25519:/i, "") : "",
    accountId,
  };
}

function clearCallbackHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

/**
 * List IdentyClaw passports owned by the connected NEAR account.
 */
export async function listOwnedPassports(wallet = getOperatorWallet()) {
  if (!wallet.accountId) {
    throw new Error("Connect a NEAR wallet first");
  }
  if (!env.nearContractId) {
    throw new Error("REACT_APP_NEAR_CONTRACT_ID is not configured");
  }
  const tokens = await wallet.viewMethod({
    contractId: env.nearContractId,
    method: "rodit_tokens_for_owner",
    args: {
      account_id: wallet.accountId,
      from_index: null,
      limit: null,
    },
  });
  if (!Array.isArray(tokens)) {
    return [];
  }
  return tokens
    .filter((t) => t?.token_id)
    .map((t) => ({
      tokenId: t.token_id,
      ownerId: t.owner_id,
      metadata: t.metadata || null,
    }));
}

/**
 * Start mintserver-style NEP-413 login: sign the passport token id in the wallet.
 * Some wallets redirect to /operator#signature=…; others resolve signMessage in-place.
 * Returns a session when the signature is available immediately; otherwise null (redirect).
 */
export async function beginNep413Login({ roditId, wallet = getOperatorWallet() } = {}) {
  const tokenId = String(roditId || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9]{11}$/.test(tokenId)) {
    throw new Error("Passport token id must be a 12-character IdentyClaw RODiT id");
  }
  if (!wallet.accountId) {
    throw new Error("Connect a NEAR wallet that owns this passport");
  }
  if (!env.apiBase) {
    throw new Error("REACT_APP_API_BASE is not configured");
  }

  const owned = await listOwnedPassports(wallet);
  const match = owned.find((p) => p.tokenId === tokenId);
  if (!match) {
    throw new Error(
      `Wallet ${wallet.accountId} does not own passport ${tokenId}. Connect the owner account.`,
    );
  }

  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);
  const callbackUrl = `${window.location.origin}/operator`;
  const loginData = {
    message: tokenId,
    nonce: Array.from(nonce),
    accountId: wallet.accountId,
    recipient: env.apiBase,
    callbackUrl,
    ownrodit: {
      token_id: match.tokenId,
      owner_id: match.ownerId,
      metadata: match.metadata,
    },
  };
  sessionStorage.setItem(LOGIN_DATA_KEY, JSON.stringify(loginData));

  const signed = await wallet.signMessageWithNEP413({
    message: tokenId,
    recipient: env.apiBase,
    nonce: Buffer.from(nonce),
    callbackUrl,
  });

  // In-place wallets return { accountId, publicKey, signature } instead of redirecting.
  if (signed?.signature && signed?.accountId) {
    return exchangeNep413Signature({
      signature: signed.signature,
      accountId: signed.accountId,
      loginData,
    });
  }

  return null;
}

async function exchangeNep413Signature({ signature, accountId, loginData }) {
  if (loginData.accountId !== accountId) {
    throw new Error("Wallet account mismatch after signature");
  }

  const loginRes = await fetch(`${env.apiBase}/api/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signature: base64ToBase64Url(signature),
      message: loginData.message,
      nonce: loginData.nonce,
      recipient: loginData.recipient,
      callbackUrl: loginData.callbackUrl,
    }),
    credentials: "include",
  });

  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    const msg =
      loginBody?.error?.message ||
      loginBody?.message ||
      JSON.stringify(loginBody).slice(0, 180);
    throw new Error(`NEP-413 login failed (${loginRes.status}): ${msg}`);
  }

  const jwt = loginBody.jwt_token;
  if (!jwt) {
    throw new Error("Login succeeded but response had no jwt_token");
  }

  sessionStorage.removeItem(LOGIN_DATA_KEY);
  storeOperatorSession({ jwt, roditId: loginData.message });
  return sessionFromJwt(jwt);
}

/**
 * Finish NEP-413 login after wallet redirect (hash params).
 */
export async function completeNep413Login(url = window.location.href) {
  const { signature, accountId } = parseCallbackHash(url);
  const raw = sessionStorage.getItem(LOGIN_DATA_KEY);
  if (!raw) {
    throw new Error("Login session expired — start sign-in again");
  }
  const loginData = JSON.parse(raw);
  const session = await exchangeNep413Signature({ signature, accountId, loginData });
  clearCallbackHash();
  return session;
}
