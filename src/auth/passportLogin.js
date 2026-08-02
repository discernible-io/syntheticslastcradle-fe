import bs58 from "bs58";
import nacl from "tweetnacl";
import { jwtDecode } from "jwt-decode";
import { env } from "../config/env.js";

const JWT_STORAGE_KEY = "slc_operator_jwt";
const RODIT_STORAGE_KEY = "slc_operator_rodit_id";

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Accepts ed25519:BASE58 or bare BASE58. Returns a 64-byte nacl secret key.
 */
export function parsePassportPrivateKey(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Passport private key is required");
  }
  const trimmed = raw.trim().replace(/^ed25519:/i, "");
  let decoded;
  try {
    decoded = bs58.decode(trimmed);
  } catch {
    throw new Error("Private key must be base58 (optionally prefixed with ed25519:)");
  }
  if (decoded.length === 64) {
    return new Uint8Array(decoded);
  }
  if (decoded.length === 32) {
    return nacl.sign.keyPair.fromSeed(decoded).secretKey;
  }
  throw new Error(`Unexpected private key length ${decoded.length} (expected 32 or 64 bytes)`);
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

/**
 * IdentyClaw passport login against the SLC API (timestamp challenge-response).
 * Backend privilege is enforced by GAME_PRIVILEGED_RODIT_ID matching this passport.
 */
export async function loginWithPassport({ roditId, privateKey, signal } = {}) {
  const tokenId = String(roditId || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9]{11}$/.test(tokenId)) {
    throw new Error("Passport token id must be a 12-character IdentyClaw RODiT id");
  }
  const secretKey = parsePassportPrivateKey(privateKey);

  const tsRes = await fetch(`${env.apiBase}/api/login/timestamp`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!tsRes.ok) {
    const text = await tsRes.text().catch(() => "");
    throw new Error(`Timestamp challenge failed (${tsRes.status})${text ? `: ${text.slice(0, 160)}` : ""}`);
  }
  const tsBody = await tsRes.json();
  const timestampIso = tsBody.timestamp_iso;
  const timestamp = Number(tsBody.timestamp);
  if (!timestampIso || !Number.isFinite(timestamp)) {
    throw new Error("Login challenge missing timestamp / timestamp_iso");
  }

  const message = new TextEncoder().encode(tokenId + timestampIso);
  const signature = nacl.sign.detached(message, secretKey);

  const loginRes = await fetch(`${env.apiBase}/api/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roditid: tokenId,
      timestamp_iso: timestampIso,
      base64url_signature: bytesToBase64Url(signature),
    }),
    signal,
  });

  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    const msg = loginBody?.error?.message || loginBody?.message || JSON.stringify(loginBody).slice(0, 180);
    throw new Error(`Login failed (${loginRes.status}): ${msg}`);
  }

  const jwt = loginBody.jwt_token;
  if (!jwt) {
    throw new Error("Login succeeded but response had no jwt_token");
  }

  storeOperatorSession({ jwt, roditId: tokenId });
  return sessionFromJwt(jwt);
}
