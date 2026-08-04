const read = (key, fallback = "") => {
  const value = import.meta.env[key];
  return value == null || value === "" ? fallback : String(value);
};

export const env = {
  deployLabel: read("REACT_APP_DEPLOY_LABEL", "@local"),
  publicOrigin: read("REACT_APP_PUBLIC_ORIGIN", "http://localhost:5173"),
  apiBase: read("REACT_APP_API_BASE", "https://slcapi.discernible.io:9443").replace(/\/$/, ""),
  verifyOrigin: read("REACT_APP_VERIFY_ORIGIN", "https://verify.identyclaw.com").replace(/\/$/, ""),
  enrollUrl: read("REACT_APP_ENROLL_URL", "https://purchase.identyclaw.com"),
  docsSiteUrl: read("REACT_APP_DOCS_SITE_URL", "https://www.discernible.io"),
  skillUrl: read("REACT_APP_SKILL_URL", "https://slcapi.discernible.io:9443/api/game/skill.md"),
  peerAuthUrl: read(
    "REACT_APP_PEER_AUTH_URL",
    "https://slcapi.discernible.io:9443/api/game/peer-auth.md",
  ),
  pollIntervalMs: Number(read("REACT_APP_POLL_INTERVAL_MS", "5000")) || 5000,
  title: read("REACT_APP_TITLE", "Synthetics' Last Cradle"),
  logLevel: read("REACT_APP_LOG_LEVEL", "info"),
  nearContractId: read("REACT_APP_NEAR_CONTRACT_ID", ""),
  nearNetwork: read("REACT_APP_NEAR_NETWORK", "mainnet"),
  nearRpcUrl: read("REACT_APP_NEAR_RPC_URL", ""),
};

export function verifyRoditUrl(roditId) {
  if (!roditId) return env.verifyOrigin;
  return `${env.verifyOrigin}/?tokenId=${encodeURIComponent(roditId)}`;
}
